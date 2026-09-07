# StonkGift: Non-Crypto User Onboarding Plan 🎁

> **Goal:** Let anyone claim a tokenized stock gift with zero crypto knowledge — no wallet app, no seed phrase, no ETH for gas. Just tap a link or scan a QR code.

---

## The Problem Today

| Issue | Current State |
| :--- | :--- |
| Sender must know recipient wallet address | Can't gift to non-crypto friends/family |
| Recipient needs ETH on Base for gas | New user drop-off is ~95% |
| No shareable claim link | `GiftSuccessModal` has copy-URL but no dedicated claim flow |
| No QR code generation | No `qrcode` package installed |
| No smart wallet / passkey support | Only traditional EOA wallets via RainbowKit |
| No paymaster integration | Every user pays their own gas |

---

## The Solution: 3-Layer Stack

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: EPHEMERAL KEYPAIR (address-agnostic gifting)  │
│  → Sender doesn't need recipient's address              │
│  → Gift is protected by cryptographic claim key         │
│  → Key lives only in URL #hash (never hits servers)     │
├─────────────────────────────────────────────────────────┤
│  Layer 2: COINBASE SMART WALLET (instant onboarding)    │
│  → Recipient creates wallet with Face ID / Passkey      │
│  → No seed phrase, no app download                      │
│  → 5-second account creation                            │
├─────────────────────────────────────────────────────────┤
│  Layer 3: CDP PAYMASTER (gasless claiming)               │
│  → StonkGift sponsors the claim transaction gas          │
│  → Recipient pays exactly $0                            │
│  → Proxied through /api/paymaster for security          │
└─────────────────────────────────────────────────────────┘
```

---

## User Journey

### Sender Flow (existing user with wallet + stock tokens)

```
1. Connect wallet → Select stock (NVDAc, AAPLc, etc.) → Enter amount
2. Choose "Send via Link" (instead of entering a wallet address)
3. App generates ephemeral keypair in-browser:
   - privKey → goes into the share URL hash fragment
   - claimSigner → goes on-chain in the Gift struct
4. Sender calls createLinkGift(token, amount, claimSigner, unlockTime, msg)
5. App shows share modal with:
   - QR code (scannable)
   - Copy link button
   - 1-tap share to WhatsApp, Telegram, X, iMessage
   - Printable QR card for physical greeting cards
```

### Recipient Flow (non-crypto person who received a link/QR)

```
1. Opens link: stonkgift.vercel.app/claim#id=42&key=0xabc...
2. Sees beautiful gift card with stock details + personal note
3. Taps "Claim Your Gift" → Coinbase Smart Wallet popup
4. Creates account with Face ID / Passkey (5 seconds, zero ETH)
5. App signs claim hash with ephemeral key + submits via paymaster
6. Gas is 100% sponsored → recipient gets stock tokens → confetti 🎉
```

> [!IMPORTANT]
> The entire claim flow is **zero-cost** for the recipient. No ETH, no gas, no fees.
> The ephemeral key in the URL hash is **never sent to any server** (RFC 3986).

---

## Implementation Plan

### Phase 1: Smart Contract Upgrade

**File:** `contracts/StonkGift.sol`

Add `claimSigner` to the Gift struct and two new functions:

```solidity
// New field in Gift struct
address claimSigner;   // address(0) = direct gift, non-zero = link gift

// New function: sender creates a link-based gift
function createLinkGift(
    address token,
    uint256 amount,
    address claimSigner,  // ephemeral pubkey
    uint256 unlockTime,
    string calldata message
) external nonReentrant returns (uint256 giftId);

// New function: anyone with the ephemeral key can claim
function claimGiftWithSignature(
    uint256 giftId,
    bytes calldata signature  // signed by ephemeral privKey
) external nonReentrant;
```

**How the signature prevents front-running:**
```
messageHash = keccak256(abi.encodePacked(giftId, msg.sender, block.chainid))
                                         ↑          ↑              ↑
                                    which gift  claimer's addr   Base (8453)
```
- Bots can't frontrun because `msg.sender` is baked into the hash
- Replay attacks fail because `block.chainid` differs between networks
- The `claimSigner` on-chain is the only key that can produce a valid signature

**New errors to add:**
```solidity
error NotLinkGift();
error InvalidClaimSignature();
```

**Tests to write:** (Hardhat)
- ✅ Valid claim with correct ephemeral signature
- ✅ Revert when bot tries to frontrun (different msg.sender)
- ✅ Revert with forged/invalid signature
- ✅ Time-lock enforcement still works on link gifts
- ✅ Sender cancel/reclaim still works on link gifts
- ✅ Direct gifts (`claimSigner = address(0)`) still work via original `claimGift()`

---

### Phase 2: Coinbase Smart Wallet + Paymaster Setup

#### 2a. Switch wallet config to support Smart Wallets

**File:** `components/Providers.tsx`

```typescript
import { coinbaseWallet } from 'wagmi/connectors';

const config = createConfig({
  appName: 'StonkGift',
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'StonkGift',
      preference: 'smartWalletOnly',  // forces passkey-based smart wallet
    }),
    // Keep RainbowKit connectors for existing users
  ],
  transports: {
    [base.id]: http(),
  },
});
```

> [!NOTE]
> The claim page uses `smartWalletOnly` to guarantee gasless compatibility.
> The main create-gift page keeps RainbowKit for existing crypto users.
> We may need **two separate provider configs** — one for senders (RainbowKit) and one for the claim page (Coinbase Smart Wallet only).

#### 2b. CDP Paymaster proxy route

**File:** `app/api/paymaster/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';

const CDP_PAYMASTER_URL = process.env.CDP_PAYMASTER_URL; // server-only!
const STONKGIFT_ADDRESS = '0xb804AAaA4702C9Fd31D1Adc04925d45B69537736';
const CLAIM_SELECTOR = '0x...'; // bytes4 of claimGiftWithSignature(uint256,bytes)

export async function POST(req: NextRequest) {
  if (!CDP_PAYMASTER_URL) {
    return NextResponse.json({ error: 'Paymaster not configured' }, { status: 500 });
  }

  const body = await req.json();

  // Validate: only sponsor calls to StonkGift.claimGiftWithSignature
  // (prevents attackers from draining gas credits on arbitrary txs)

  const response = await fetch(CDP_PAYMASTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return NextResponse.json(await response.json());
}
```

#### 2c. CDP Portal setup (manual, one-time)

1. Go to [cdp.coinbase.com](https://cdp.coinbase.com)
2. Create project → Onchain Tools → Paymaster
3. Select **Base Mainnet**
4. Add StonkGift contract (`0xb804AAaA4702C9Fd31D1Adc04925d45B69537736`) to allowlist
5. Add `claimGiftWithSignature` function to allowed selectors
6. Set spend policy (e.g. max 0.001 ETH per UserOp, $500/month cap)
7. Copy the Paymaster URL → set as `CDP_PAYMASTER_URL` env var (server-side only!)
8. Apply for **Base Gasless Campaign** (up to $15k/month gas credits)

---

### Phase 3: Claim Link Page

**File:** `app/claim/page.tsx` (NEW) — or `app/gift/claim/page.tsx`

This is the page recipients land on when they open the shared link.

```
URL: https://stonkgift.vercel.app/claim#id=42&key=0xabc123...
                                        ↑ hash fragment (client-only, never hits server)
```

**Page flow:**
1. Parse `id` and `key` from `window.location.hash`
2. Fetch gift details from contract (`getGift(id)`) → show stock name, amount, personal note
3. Prompt wallet connection (Coinbase Smart Wallet via passkey)
4. On "Claim" button:
   - Compute `messageHash = keccak256(giftId, connectedAddress, chainId)`
   - Sign with ephemeral `privateKey` from URL → produces `signature`
   - Call `writeContracts` with `paymasterService` capability pointing to `/api/paymaster`
5. Show success + confetti + link to portfolio

**Key hook usage:**
```typescript
import { useWriteContracts, useCapabilities } from 'wagmi/experimental';

// Check if connected wallet supports paymaster
const { data: caps } = useCapabilities({ account: address });
const canSponsor = caps?.[base.id]?.paymasterService?.supported;

// Execute gasless claim
writeContracts({
  contracts: [{
    address: STONKGIFT_ADDRESS,
    abi: STONK_GIFT_ABI,
    functionName: 'claimGiftWithSignature',
    args: [BigInt(giftId), signature],
  }],
  capabilities: {
    paymasterService: {
      url: '/api/paymaster',
    },
  },
});
```

---

### Phase 4: Share UX (QR + Social)

**File:** `components/ShareGiftModal.tsx` (NEW)

After a link-gift is created, show a modal with:

1. **QR Code** — scannable, generated with `qrcode.react`
2. **Copy Link** — 1-click copy to clipboard
3. **Social Share Buttons:**
   - WhatsApp: `https://wa.me/?text=...`
   - Telegram: `https://t.me/share/url?url=...`
   - X/Twitter: `https://twitter.com/intent/tweet?text=...`
   - iMessage: `sms:?body=...`
4. **Printable QR Card** — downloadable PNG/PDF for physical greeting cards

**Package to install:**
```bash
pnpm add qrcode.react
```

---

### Phase 5: Modified Create Gift Form

**File:** `components/CreateGift.tsx` (MODIFY)

Add a toggle between two modes:

```
┌──────────────────────────────────────────────┐
│  How do you want to send this gift?          │
│                                              │
│  [🎯 Direct to Wallet]  [🔗 Share via Link] │
│                                              │
│  Direct: Enter recipient 0x address          │
│  Link: Generate shareable QR/link            │
└──────────────────────────────────────────────┘
```

When "Share via Link" is selected:
- Hide the recipient address input
- Generate ephemeral keypair client-side via `generatePrivateKey()` from `viem/accounts`
- Call `createLinkGift` instead of `createGift`
- On success, open `ShareGiftModal` with the claim URL

---

## New Dependencies

```bash
pnpm add qrcode.react
# wagmi experimental hooks are already available in wagmi@2.12.19
# viem/accounts is already available in viem@2.21.26
```

---

## File Change Summary

| File | Action | Purpose |
| :--- | :--- | :--- |
| `contracts/StonkGift.sol` | MODIFY | Add `claimSigner`, `createLinkGift`, `claimGiftWithSignature` |
| `test/StonkGift.test.js` | MODIFY | Add ephemeral key claim tests |
| `components/Providers.tsx` | MODIFY | Add Coinbase Smart Wallet connector for claim page |
| `app/api/paymaster/route.ts` | NEW | Secure CDP Paymaster proxy |
| `app/claim/page.tsx` | NEW | Claim landing page (parses URL hash, gasless claim) |
| `components/ShareGiftModal.tsx` | NEW | QR code + social share modal |
| `components/CreateGift.tsx` | MODIFY | Add "Share via Link" mode with ephemeral key gen |
| `lib/contract.ts` | MODIFY | Export new ABI entries |
| `lib/abi.ts` | MODIFY | Add `createLinkGift` + `claimGiftWithSignature` ABI |
| `.env.local` | MODIFY | Add `CDP_PAYMASTER_URL` (server-side only) |

---

## Security Checklist

| Threat | Mitigation |
| :--- | :--- |
| MEV front-running | Signature binds `msg.sender` — invalid for any other address |
| Paymaster gas draining | Proxy validates target contract + function selector |
| URL key leakage to server | Key is in `#hash` fragment — never sent in HTTP requests (RFC 3986) |
| Replay across chains | `block.chainid` is part of the signed hash |
| Unclaimed / lost gifts | Sender can cancel (before unlock) or reclaim (after 180-day grace) |
| Sybil claim flooding | Pre-flight check: gift exists + not yet claimed before sponsoring |

---

## Execution Order

```
1. ✏️  Contract upgrade (add claimSigner + new functions)
2. 🧪  Write + run Hardhat tests
3. 🚀  Deploy upgraded contract to Base Sepolia → test
4. 🔧  CDP Portal: setup Paymaster + allowlist contract
5. 🖥️  Build /api/paymaster proxy route
6. 📱  Build /claim page with Smart Wallet + gasless flow
7. 🎨  Build ShareGiftModal (QR + social buttons)
8. ✏️  Modify CreateGift to support "Share via Link" mode
9. 🧪  End-to-end test on Base Sepolia
10. 🚀  Deploy to Base Mainnet + apply for Gasless Campaign
```

---

## Result: The "Mom Test"

After implementation, this is what it looks like when you gift stock to someone who has never used crypto:

1. **You** pick NVDA stock, enter $50, tap "Share via Link"
2. **You** send the link to Mom via WhatsApp
3. **Mom** taps link → sees "You received $50 of NVIDIA stock! 🎉"
4. **Mom** taps "Claim" → Face ID popup → done
5. **Mom** now owns tokenized NVIDIA stock on Base. Zero apps installed. Zero ETH spent.

**That's the bar. If Mom can do it, we shipped it right.**
