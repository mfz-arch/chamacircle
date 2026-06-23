# ChamaCircle 🔗💸

**Track 1: Financial Inclusion & Payments**

## 🛑 The Problem
Traditional savings groups (Chamas) are an essential part of the African economy, but they rely heavily on physical cash and manual trust. If a chairman mismanages funds or members fail to track contributions accurately, the entire group suffers. There is a lack of transparency, security, and automated accountability.

## 💡 The Solution
**ChamaCircle** is a decentralized, transparent savings group platform built on Avalanche. Instead of trusting a human to hold the money, funds are securely locked in a Smart Contract. Once the minimum member threshold is met, members contribute AVAX, and an automated backend bot seamlessly routes the payout to the correct member in a mathematically guaranteed round-robin cycle. 

## ⚙️ Features
- **Decentralized Escrow:** Smart Contracts hold all group funds, eliminating the risk of human theft.
- **Automated Payouts:** A custom Python automation bot listens to the Avalanche blockchain and triggers payouts the exact second a cycle finishes and the pot is full.
- **Transparent History:** Every payout and contribution is permanently recorded on the blockchain.
- **Chairman Dashboard:** Group admins can easily accept members and monitor group health in a beautiful, responsive UI.

## 🛠️ Tech Stack
- **Frontend:** Next.js, React, TailwindCSS
- **Backend Automation:** Python, Web3.py
- **Smart Contracts:** Solidity
- **Blockchain:** Avalanche Fuji Testnet
- **Deployment:** Vercel

## 📜 Smart Contract
Deployed on Avalanche Fuji Testnet:
`0x7e95a47e10eBC0605b3ce04294a3324670C420Bd`

## 🚀 How to Run Locally

### 1. Start the Frontend
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### 2. Start the Automation Bot
```bash
cd bot
pip install web3 python-dotenv
python3 bot.py
```
*Note: You must have a `.env` file with your `PRIVATE_KEY` and an Avalanche Fuji RPC URL.*

## 🌍 How Avalanche is Used
Avalanche Fuji is the core backend for our application. We use it to deploy our `ChainChama.sol` smart contract, which handles the complex logic of group minimums, cycle durations, and round-robin indexing. Avalanche allows us to process these Chama payouts with incredibly low gas fees and sub-second finality, which is crucial for financial inclusion applications in Africa.

## 🔮 Future Improvements
- Implement Stablecoin (USDC) support to protect members from crypto volatility.
- Implement SMS/WhatsApp notifications when it is a member's turn to get paid.
- Add reputation scoring based on on-time contributions.
