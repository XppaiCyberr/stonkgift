# StonkGift 🎁📈

> **Time-Locked Tokenized Stock Gifting Protocol on Base**

StonkGift is an on-chain protocol and decentralized application built on **Base Mainnet** that allows anyone to gift tokenized equities (such as Coinbase tokenized stocks) to friends, family, or communities. Senders can either lock gifts until a future date or send them as instant, unlocked gifts.

---

## 🚀 Base Mainnet Deployments

| Contract | Address | Explorer |
| :--- | :--- | :--- |
| **StonkGift Protocol** | `0xb804AAaA4702C9Fd31D1Adc04925d45B69537736` | [Basescan](https://basescan.org/address/0xb804AAaA4702C9Fd31D1Adc04925d45B69537736) |

### Whitelisted Coinbase Tokenized Stocks (B20 Precompiles on Base)

| Ticker | Asset Name | Contract Address | Decimals |
| :--- | :--- | :--- | :--- |
| **NVDAc** | NVIDIA Tokenized Stock | `0xb20000000000000000000078ee7ce2fE4908108C` | 8 |
| **AAPLc** | Apple Tokenized Stock | `0xb200000000000000000000C2e324d24d7eEcd1fb` | 8 |
| **GOOGLc** | Alphabet (Google) Tokenized Stock | `0xb2000000000000000000002D0BA3164cc74f58B7` | 8 |
| **METAc** | Meta Tokenized Stock | `0xb2000000000000000000008bC8786B856E61707C` | 8 |

---

## ✨ Features & Architecture

### Smart Contract (`contracts/StonkGift.sol`)
- **Non-Custodial Escrow**: Tokens are safely custodied by the verified StonkGift smart contract.
- **Time-Locked Gifting**: Senders can specify an exact future timestamp when the recipient can claim the gift.
- **Instant Gifts (`NO_LOCK`)**: Option to create immediate gifts (`unlockTime = 0`) that can be claimed instantly without waiting.
- **Sender Cancellation Protection**: Senders can cancel and retrieve their tokens anytime before the unlock time. Instant gifts cannot be cancelled once created.
- **180-Day Reclaim Grace Period**: If an unlocked gift remains unclaimed 180 days after its unlock timestamp, the original sender can safely reclaim the tokens to prevent permanently stuck funds.
- **Balance Invariance Guard**: Accurately measures contract token balances before and after transfer to protect against fee-on-transfer shortfalls.
- **Bound Storage**: On-chain gift messages are capped at 500 bytes (`MAX_MESSAGE_LENGTH`).
- **Owner Whitelist Management**: The protocol owner can add or remove supported stock tokens.

### Web Application (`components/`)
- **Modern Web3 Stack**: Built with Next.js 14 App Router, Tailwind CSS, RainbowKit, Wagmi v2, and Viem.
- **Direct 1-Click Admin Whitelisting**: Automated on-chain whitelist detection with 1-click whitelist button for the contract owner.
- **Interactive Gift Status**: Dynamic countdown timers, claim expiration banners, and shareable gift links (`/gift/[id]`).
- **Celebration UX**: Interactive confetti animations upon gift creation and claiming.

---

## 🛠️ Development & Testing

Always use `pnpm`:

```bash
# Install dependencies
pnpm install

# Run automated smart contract unit tests (25 tests)
pnpm test

# Build production application
pnpm build

# Run local development server
pnpm dev
```

---

## 📜 Scripts

```bash
# Deploy StonkGift to Base Mainnet
pnpm exec hardhat run scripts/deploy.js --network base

# Whitelist Coinbase tokenized stocks on deployed contract
pnpm exec hardhat run scripts/whitelist.js --network base
```

---

## 📄 License
MIT
