# Product Authentication System

A decentralized product authentication system built on Polygon blockchain that enables brands and manufacturers to create, verify, and track authentic products using NFTs.

## 🌐 Why Polygon?

This system is specifically built for the Polygon network, offering several advantages:
- **Low Transaction Costs**: Significantly reduced gas fees compared to Ethereum mainnet
- **High Speed**: Fast block confirmation times (~2 seconds)
- **Ethereum Compatibility**: Full EVM compatibility while maintaining scalability
- **Enterprise Ready**: Suitable for high-volume product authentication
- **Green Blockchain**: Energy-efficient Proof of Stake consensus
- **Network Stability**: High uptime and robust infrastructure

## 🔧 Tech Stack

- **Smart Contract Development**
  - Solidity ^0.8.26
  - Hardhat for compilation and testing
  - OpenZeppelin contracts

- **Deployment & Interaction**
  - Ethers.js v6
  - TypeScript

- **Frontend**
  - Next.js
  - React
  - TailwindCSS
  - Web3 wallet integration

- **Storage**
  - IPFS via Web3.Storage (Storacha)
  - Decentralized metadata storage
  - Product images and details
  - Immutable content addressing

## ⚠️ Frontend Notice
The current frontend implementation interfaces with the deprecated `ProductValidation.sol` contract. A new frontend implementation that works with the Registry system is under development.

## 🏗️ Contract Architecture

The system consists of four main smart contracts that work together to provide a complete product authentication solution:

### Registry Contracts

1. **BrandRegistry.sol**
   - Manages brand registration and ownership
   - Stores brand metadata on IPFS
   - Enables brand ownership transfer
   - Provides brand verification endpoints

2. **ManufacturerRegistry.sol**
   - Handles manufacturer registration
   - Stores manufacturer credentials and metadata
   - Manages manufacturer verification
   - Supports ownership transfer

3. **ProductRegistry.sol**
   - Creates and tracks authentic products
   - Links products to their respective brands
   - Maintains product verification records
   - Stores product metadata and specifications

4. **ProductToken.sol**
   - Implements ERC1155 token standard
   - Manages batch production requests
   - Handles token minting and distribution
   - Provides complete verification chain

## 🔄 System Flow

The system implements a secure flow for product authentication:

![Contract Flow Diagram](./docs/contract-flow.png)

## 🚀 Deployment

The system uses a factory-based deployment approach through the `CoreRegistryDeployer` contract, which handles the deployment of all core registries in a single transaction.

### Prerequisites

Before deploying, ensure you have:

1. Installed all dependencies:
```bash
npm install
```

2. Set up your environment variables (see Environment Setup section below)
3. Have enough MATIC for deployment (testnet MATIC for Amoy, mainnet MATIC for production)

### CoreRegistryDeployer Contract

The `CoreRegistryDeployer` contract:
- Deploys three core registries: BrandRegistry, ManufacturerRegistry, and ProductRegistry
- Emits a `RegistriesDeployed` event with the addresses of all deployed registries
- Includes safety checks to prevent redeployment and unauthorized access
- Handles deployment failures gracefully with detailed error messages

### Deployment Flow

The deployment script (`ethers-deploy-all.ts`) follows these steps:

1. **Compilation**: 
   - Automatically runs `npx hardhat compile`
   - Compiles all Solidity contracts
   - Generates contract artifacts and TypeScript typings
   - No need to run compilation separately

2. **Network Connection**: 
   - Tests the connection to the specified network (testnet/mainnet)
   - Verifies RPC endpoint connectivity
   - Validates wallet configuration

3. **Deployment Steps**:
   - Deploys the CoreRegistryDeployer contract
   - Calls deployRegistries() to deploy all core registries
   - Listens for the RegistriesDeployed event to capture registry addresses
   - Deploys the ProductToken contract with the registry addresses

4. **Verification**: 
   - Waits for contract deployments to be confirmed
   - Outputs deployed contract addresses
   - Verifies contract deployment success

### Commands

#### Test Network Connection
```bash
# Test Polygon Mainnet connection
npm run test-connection:mainnet

# Test Polygon Amoy Testnet connection
npm run test-connection:amoy
```

#### Deploy Using Single Command
```bash
# Deploy to Polygon Mainnet
npm run deploy-all:mainnet

# Deploy to Polygon Amoy Testnet
npm run deploy-all:amoy
```

The deployment script will:
1. Compile all contracts automatically (no need to run compile separately)
2. Deploy the CoreRegistryDeployer
3. Automatically deploy BrandRegistry, ManufacturerRegistry, and ProductRegistry
4. Deploy the ProductToken with the correct registry addresses
5. Output all contract addresses for future reference

### Environment Setup

Required environment variables:
```env
FEE_COLLECTOR_ADDRESS=    # Fee collector address
POLYGON_MAINNET_WS_URL=    # Mainnet WS RPC URL
POLYGON_TESTNET_URL=    # Amoy testnet RPC URL
NEXT_PUBLIC_WEB3_STORAGE_TOKEN=    # Web3 Storage API token (Storacha)
NEXT_PUBLIC_NETWORK=    # 'mainnet' or 'testnet'
PRIVATE_KEY=           # Deployment wallet private key
```

## 🔑 Key Features

- **Decentralized Authentication**: Leverages blockchain for immutable product records
- **Multi-Party Verification**: Involves both brands and manufacturers in the authentication process
- **Batch Production**: Supports bulk manufacturing with batch tracking
- **Token-Based Ownership**: Uses ERC1155 tokens for product ownership representation
- **Complete Verification Chain**: Maintains full product history from creation to current ownership
- **Decentralized Storage**: Uses IPFS for permanent, content-addressed storage of:
  - Product metadata and specifications
  - Brand and manufacturer information
  - Product images and documentation
  - Batch production details

## 💡 Use Cases

1. **Luxury Goods Authentication**
   - Verify authentic products
   - Track ownership history
   - Prevent counterfeiting

2. **Supply Chain Tracking**
   - Monitor manufacturing process
   - Track batch production
   - Verify authorized manufacturers

3. **Digital Ownership**
   - Transfer product ownership
   - Maintain product history
   - Verify product authenticity

## 🛠️ Technical Implementation

### Smart Contract Integration
- Brands register and create products
- Manufacturers request production rights
- Brands approve production batches
- Tokens minted for verified products
- End users can verify authenticity

### Storage
- Contract data stored on blockchain
- Metadata stored on IPFS
- Complete verification records maintained

### Security
- Role-based access control
- Ownership verification
- Multi-step authentication process
- Immutable record keeping

## 💰 Fee Structure

The system implements a modest fee structure to maintain sustainability and prevent spam while keeping costs reasonable for legitimate users.

### Registry Operations

All registry contracts (Brand, Manufacturer, Product) include the following fees:

- **Registration Fee**: 0.001 ETH (~$2-3)
  - Charged when registering new brands, manufacturers, or products
  - One-time fee per entity

- **Transfer Fee**: 0.0005 ETH (~$1-1.5)
  - Charged when transferring ownership of any entity
  - Applied to brand transfers, manufacturer transfers, and product transfers

### Product Token Operations

The ProductToken contract includes additional fees for batch and minting operations:

- **Batch Request Fee**: 0.001 ETH (~$2-3)
  - Charged when manufacturers request a new batch of products
  - One-time fee per batch, regardless of quantity

- **Minting Fee**: 0.0002 ETH (~$0.50)
  - Charged when minting individual product tokens
  - Per-token fee that scales with quantity

### Fee Management

- Fees are collected by a designated fee collector address
- Fee amounts can be adjusted by the fee collector to respond to market conditions
- All fee collections and updates are tracked through blockchain events
- Fees are denominated in ETH but paid in MATIC on the Polygon network

### Benefits

- Low fees encourage legitimate usage while deterring spam
- Per-operation pricing ensures fair cost distribution
- Scaling fees (like minting) align costs with system usage
- Transparent fee structure with on-chain verification
- Fee collector role enables future DAO governance

## 📝 License

MIT License - see LICENSE file for details
