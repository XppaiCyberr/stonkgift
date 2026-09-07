# StonkGift

> Programmable Tokenized Stock Gifting Protocol on Base

StonkGift is an on-chain protocol and decentralized application built on Base Mainnet that enables users to gift Coinbase tokenized equities (such as NVIDIA, Apple, Google, and Meta) with programmable time locks, instant delivery, or address-agnostic gasless claim links.

---

## Base Builder Quest - September 2026

StonkGift is built for the **Base Builder Quest (September 2026)**:
- **Challenge:** Build a project that helps people trade or use Coinbase Tokenized Stocks on Base.
- **Announcement:** https://x.com/buildonbase/status/2095105184120664122
- **Mission:** Move beyond speculative trading by turning tokenized equities into a practical medium for gifting and financial onboarding. StonkGift allows parents, friends, employers, and communities to gift real-world equity that matures on-chain, introducing a tangible reason for everyday users to hold assets on Base.

---

## Current State of the Project

### Base Mainnet Deployment

| Contract | Address | Explorer |
| :--- | :--- | :--- |
| StonkGift Protocol (Latest) | `0x5522248Ab918315DDE146dBE9b8346E04F305803` | [Basescan](https://basescan.org/address/0x5522248Ab918315DDE146dBE9b8346E04F305803) |
| StonkGift Protocol (V1) | `0xb804AAaA4702C9Fd31D1Adc04925d45B69537736` | [Basescan](https://basescan.org/address/0xb804AAaA4702C9Fd31D1Adc04925d45B69537736) |

### Supported Coinbase Tokenized Stocks (Base B20 Precompiles)

The protocol whitelists official Coinbase tokenized stock assets on Base Mainnet (8 decimals):

| Ticker | Asset Name | Contract Address | Decimals |
| :--- | :--- | :--- | :--- |
| NVDAc | NVIDIA Tokenized Stock | `0xb20000000000000000000078ee7ce2fE4908108C` | 8 |
| AAPLc | Apple Tokenized Stock | `0xb200000000000000000000C2e324d24d7eEcd1fb` | 8 |
| GOOGLc | Alphabet (Google) Tokenized Stock | `0xb2000000000000000000002D0BA3164cc74f58B7` | 8 |
| METAc | Meta Tokenized Stock | `0xb2000000000000000000008bC8786B856E61707C` | 8 |

---

## Key Features & Architecture

### 1. Smart Contract (`contracts/StonkGift.sol`)
- **Non-Custodial Escrow:** Deposited stocks are custodied transparently by verified protocol contracts on Base.
- **Address-Agnostic Link Gifting (`createLinkGift`):** Senders can deposit equity gifts without knowing the recipient's wallet address in advance. The contract registers a disposable public key (`claimSigner`).
- **Frontrunning-Immune Claiming (`claimGiftWithSignature`):** Recipients claim via an ephemeral ECDSA signature. The signed message strictly binds `keccak256(giftId, msg.sender, block.chainid)`. Any attempt by an MEV bot or stranger to submit the signature with their own address reverts immediately.
- **Time-Locked Gifting:** Senders can lock stock gifts until a specified future unix timestamp.
- **Instant Gifting (`NO_LOCK = 0`):** Option to send immediately claimable gifts without time restrictions.
- **Sender Cancellation Protection:** Senders can cancel and retrieve their deposited tokens at any point prior to the unlock timestamp. Instant gifts cannot be cancelled.
- **180-Day Grace Period Reclaim:** If a time-locked gift remains unclaimed 180 days after its unlock timestamp, the original sender can reclaim the tokens, preventing permanently locked funds.
- **Balance Invariance Verification:** Measures contract balances before and after transfers to guarantee exact custody amounts received.
- **Bound Storage:** Gift messages are strictly capped at 500 bytes to prevent unbounded storage growth.
- **Owner Token Management:** Contract owner can whitelist or remove supported equity tokens on-chain.

### 2. Coinbase Smart Wallet & Passkey Onboarding
- **Passkey / Face ID Authentication:** Integrated with Coinbase Smart Wallet via RainbowKit (`coinbaseWallet.preference = 'smartWalletOnly'`). Non-crypto recipients can create a smart account in 5 seconds using biometrics, without seed phrases, passwords, or extension downloads.
- **Recommended Wallet Section:** Prominently featured in the wallet connection list for zero-friction access.

### 3. Gasless Claiming via Base CDP Paymaster
- **100% Sponsored Gas:** Recipients pay exactly $0 in gas fees to claim their tokenized stock.
- **Secure Reverse Proxy (`app/api/paymaster/route.ts`):** Client UserOperations route through a server-side Next.js proxy that keeps Coinbase Developer Platform API keys private and validates requests before forwarding them to the CDP Paymaster.
- **Fallback Compatibility:** Standard EOA wallets that do not support ERC-7677 can still claim using traditional transaction signing.

### 4. Recipient Landing Page (`app/claim/page.tsx`)
- **RFC 3986 URL Hash Fragment:** The ephemeral private key lives solely after the `#` fragment (`/claim#id=1&key=0x...`), ensuring it is never transmitted to web servers, reverse proxies, or CDN logs.
- **Automated Claim Execution:** Computes the authorization signature client-side and triggers a gas-sponsored claim via Coinbase Smart Wallet.
- **Celebration & Portfolio Redirect:** Confetti animation and direct link to view received equity.

### 5. Sharing UX & QR Generator (`components/ShareGiftModal.tsx`)
- **High-Resolution QR Codes:** Scannable QR codes generated via `qrcode.react`.
- **One-Click Share Buttons:** Direct sharing links for WhatsApp, Telegram, X (Twitter), and iMessage.
- **Save QR Card:** Downloadable PNG image for physical greeting cards or printables.
- **Delivery Method Toggle (`components/CreateGift.tsx`):** Easily switch between "Share via Link / QR" (non-crypto friendly) and "Direct to 0x Address".

---

## Application Routes

| Route | Type | Description |
| :--- | :--- | :--- |
| `/` | Static | Main dashboard, supported stock chips, protocol explainer, and gift creation form. |
| `/claim` | Static | Recipient claim page with URL hash credential parsing and gasless passkey claiming. |
| `/gift/[id]` | Dynamic | Gift inspection page with live countdown timer, status badges, and cancel/reclaim controls. |
| `/api/paymaster` | Dynamic (API) | Secure server-side proxy route for CDP Paymaster RPC requests. |

---

## Development & Testing

Always use `pnpm`:

```bash
# Install dependencies
pnpm install

# Run smart contract unit tests (32 passing tests)
pnpm test

# Build production Next.js application
pnpm build

# Start production server
pnpm start

# Run local development server
pnpm dev
```

---

## Environment Variables

Copy `.env.example` to `.env.local` to configure local settings:

```bash
# Coinbase Developer Platform (CDP) Paymaster URL
# Obtain from https://cdp.coinbase.com -> Onchain Tools -> Paymaster
CDP_PAYMASTER_URL="https://api.developer.coinbase.com/rpc/v1/base/YOUR_CDP_API_KEY"

# Base RPC URL
BASE_RPC_URL="https://mainnet.base.org"

# WalletConnect / RainbowKit Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="609c3f719017e2f84355ce230448a9f5"
```

---

## Scripts

```bash
# Deploy StonkGift contract to Base Mainnet
pnpm exec hardhat run scripts/deploy.js --network base

# Whitelist Coinbase tokenized stocks on deployed contract
pnpm exec hardhat run scripts/whitelist.js --network base
```

---

## Attribution

- **Base Builder Code:** `bc_1hvd8159`
- **ERC-8021 Data Suffix:** Integrated into Wagmi configuration and transaction calls via `ox/erc8021`.

---

## License

MIT
