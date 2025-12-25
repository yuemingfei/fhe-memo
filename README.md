# FHE Memo - Smart Contracts

Secure, end-to-end encrypted memo storage powered by Fully Homomorphic Encryption (FHE) on the Sepolia Testnet.

## Overview

This project implements a Fully Homomorphic Encryption (FHE) based memo storage system. Unlike traditional encrypted
storage where the server or contract might see the data during processing, FHE allows the contract to perform operations
on encrypted data without ever decrypting it.

### Core Features

- **Privacy by Design**: Your memos are encrypted on the client-side and remain encrypted even when stored and processed
  on-chain.
- **On-chain Integrity**: Standard CRUD operations (Create, Read, Update, Delete) are supported while maintaining strict
  data privacy.
- **Access Control**: Only the owner of the memo can request decryption via the FHEVM relayer.

## Smart Contract Details

The main contract is `FHEMemo.sol`, which leverages `fhevm` to handle encrypted `euint256` data types.

- **Contract Address**: `0x7896431e53E6593b48231EAA73Be30D2F6B8F07a`
- **Network**: Sepolia Testnet

### Main Functions

- `addMemo(bytes32 handle, bytes proof)`: Adds a new encrypted memo.
- `updateMemo(uint256 index, bytes32 handle, bytes proof)`: Updates an existing encrypted memo.
- `deleteMemo(uint256 index)`: Removes a memo from the user's storage.
- `getAllMemos()`: Retrieves all encrypted handles and existence status for the caller.

## Getting Started

### Prerequisites

- Node.js & npm
- Hardhat

### Installation

```bash
npm install
```

### Deployment

To deploy the contracts to Sepolia:

```bash
npx hardhat deploy --network sepolia
```

### Testing

Run the test suite:

```bash
npx hardhat test
```

## Security

This project uses the `fhevm` library by Zama. Security is maintained through:

1. Client-side encryption of data before sending to the blockchain.
2. Homomorphic operations within the EVM.
3. Secure relayer-based decryption requests.
