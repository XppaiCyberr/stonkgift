# StonkGift

> Programmable Tokenized Stock Gifting Protocol on Base

StonkGift is an on-chain protocol and decentralized application built on Base Mainnet that enables users to gift Coinbase tokenized equities (such as NVIDIA, Apple, Google, and Meta) with programmable time locks or instant delivery.

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
| StonkGift Protocol | `0xb804AAaA4702C9Fd31D1Adc04925d45B69537736` | [Basescan](https://basescan.org/address/0xb804AAaA4702C9Fd31D1Adc04925d45B69537736) |

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

### Smart Contract (`contracts/StonkGift.sol`)
- **Non-Custodial Escrow:** Deposited stocks are custodied transparently by the verified protocol contract on Base.
- **Time-Locked Gifting:** Senders can lock stock gifts until a specified future unix timestamp.
- **Instant Gifting (`NO_LOCK = 0`):** Option to send immediately claimable gifts without time restrictions.
- **Sender Cancellation Protection:** Senders can cancel and retrieve their tokens at any point prior to the unlock timestamp. Instant gifts cannot be cancelled.
- **180-Day Grace Period Reclaim:** If a time-locked gift remains unclaimed 180 days after its unlock timestamp, the original sender can reclaim the tokens, preventing permanently locked funds.
- **Balance Invariance Verification:** Measures contract balances before and after transfers to guarantee exact custody amounts.
- **Bound Storage:** Gift messages are strictly capped at 500 bytes to prevent unbounded storage costs.
- **Owner Token Management:** Owner can whitelist or remove supported equity tokens on-chain.

### Frontend Application (`components/`)
- **Modern Next.js 15 Stack:** Powered by Next.js 15.5.25 App Router, Tailwind CSS, RainbowKit 2, Wagmi v2, and Viem.
- **Interactive Success Dialog:** Interactive modal dialog displays upon gift creation with one-click link copying and celebration effects.
- **Compact Stock Selector:** Horizontal pill selector designed for minimal vertical footprint on desktop and mobile.
- **Precise Amount Controls:** Number input sanitization, decimal clamping (8 decimals), one-click MAX button, and live balance verification.
- **Base Builder Code Attribution:** Integrated with Base Builder Code `bc_1hvd8159` via ERC-8021 data suffixes across all transactions.

---

## Upcoming Roadmap: Address-Agnostic Gifting & Web3 Onboarding

A primary obstacle to mainstream adoption of tokenized stocks is that senders must know the recipient's wallet address in advance. Most non-crypto users do not yet have an on-chain wallet.

### Ephemeral Keypair Claim Links (Detailed in `ephemeral.md`)
To solve this, StonkGift is introducing address-agnostic claim links:

1. **Client-Side Key Generation:** The sender generates a disposable cryptographic keypair in their browser.
2. **On-Chain Commitment:** The smart contract stores only the public address (`claimSigner`).
3. **Secure Link Sharing:** The private key is embedded solely within the URL hash fragment (`https://stonkgift.com/gift/claim#id=1&key=0x...`). In accordance with web standards, hash fragments are never sent to web servers.
4. **MEV-Proof Claim Flow:** The recipient opens the link, connects any wallet (or creates one instantly via passkey smart wallets), and the browser signs an authorization payload tying the claim to their specific address (`msg.sender`).
5. **Educational Impact:** Non-crypto recipients can receive an equity gift via WhatsApp, Telegram, email, or a physical greeting card QR code, creating a seamless first interaction with tokenized assets on Base.

---

## Development & Testing

Always use `pnpm`:

```bash
# Install dependencies
pnpm install

# Run smart contract unit tests (25 passing tests)
pnpm test

# Build production Next.js application
pnpm build

# Start production server
pnpm start

# Run local development server
pnpm dev
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
