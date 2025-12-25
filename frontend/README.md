# FHE Memo - Frontend

A sleek, modern web interface for interacting with the FHE Memo smart contract. Built with React, TypeScript, and
Tailwind CSS.

## Features

- **Wallet Integration**: Securely connect with MetaMask on the Sepolia Testnet.
- **FHE-Powered Privacy**: Uses Zama's `fhevmjs` to encrypt data locally before submission and decrypt it securely for
  viewing.
- **Dynamic UI**:
  - Auto-switching to the correct network (Sepolia).
  - Modern, responsive sidebar for memo management.
  - Real-time search and filtering.
  - Visual encryption/decryption indicators.
- **Security First**: No sensitive data is ever processed or stored in plaintext.

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Webpack
- **Blockchain Interface**: Ethers.js v6
- **FHE Library**: `fhevmjs` (by Zama)

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MetaMask extension installed in your browser

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

To start the development server:

```bash
npm start
```

The application will be available at `http://localhost:3000`.

### Building for Production

To create a production build in the `dist` folder:

```bash
npm run build
```

## How it Works

1. **Connect**: Link your Ethereum wallet.
2. **Encrypt**: When you write a memo, the frontend generates an encrypted input using FHEVM.
3. **Store**: The encrypted payload is sent to the `FHEMemo` contract.
4. **Decrypt**: When viewing, the app requests a re-encryption via the Zama relayer and decrypts the result locally
   using your private key.

## License

MIT
