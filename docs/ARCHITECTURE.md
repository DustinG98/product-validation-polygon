# Brand Product Verification System Architecture

## Overview
This document outlines the architecture for a decentralized brand and product verification system using smart contracts and IPFS. The system consists of three main components: Brand Registry, Product Registry, and Product Tokens.

## Smart Contract Architecture

### 1. Brand Registry (BrandRegistry.sol)
- Brand registration with IPFS metadata
- Brand ownership and transfer capabilities
- Brand verification system
- Product management capabilities
- Administrator management

### 2. Manufacturer Registry (ManufacturerRegistry.sol)
- Manufacturer registration
- Manufacturer credentials and metadata
- Manufacturer verification system
- Product creation and management

### 3. Product Registry (ProductRegistry.sol)
- Product creation and management
- Version history tracking
- Batch operations
- Product categorization
- Status management
- Product verification

### 4. Product Token (ProductToken.sol)
- ERC1155 implementation
- Serial number generation
- Warranty information
- Transfer restrictions
- Token lifecycle management
- Batch production
- Product ownership transfer

## Gas Optimization Strategies

### 1. Storage Optimization
```solidity
// Instead of storing full data
struct Product {
    string name;        // Expensive: stores full string
    string description; // Expensive: stores full string
    uint256 price;
}

// Store IPFS hash instead
struct Product {
    bytes32 ipfsHash;  // Cheaper: fixed size
    uint256 price;
}
```

### 2. Batch Operations
```solidity
// Gas-efficient batch product creation
function batchCreateProducts(
    bytes32[] calldata ipfsHashes,
    uint256[] calldata prices
) external {
    uint256 length = ipfsHashes.length;
    for (uint256 i = 0; i < length;) {
        _createProduct(ipfsHashes[i], prices[i]);
        unchecked { ++i; } // Gas optimization for increment
    }
}
```

### 3. Proxy Pattern Implementation
```solidity
contract BrandRegistryProxy is UUPSUpgradeable {
    // Implementation stored in a single storage slot
    bytes32 private constant IMPLEMENTATION_SLOT = 
        bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1);
        
    // Delegate calls to implementation
    fallback() external payable {
        _delegate(_getImplementation());
    }
}
```

### 4. Memory vs Storage Usage
```solidity
// Expensive: Multiple SLOAD operations
function getProductInfo(uint256 productId) external view returns (
    bytes32 ipfsHash,
    uint256 price
) {
    Product storage product = products[productId];
    ipfsHash = product.ipfsHash;
    price = product.price;
}

// Cheaper: Single SLOAD operation
function getProductInfo(uint256 productId) external view returns (
    Product memory
) {
    return products[productId];
}
```

## Access Control Implementation

### 1. Role-Based Access Control (RBAC) - phase 1
```solidity
contract BrandRegistry is AccessControlEnumerable {
    bytes32 public constant BRAND_ADMIN = keccak256("BRAND_ADMIN");
    bytes32 public constant PRODUCT_MANAGER = keccak256("PRODUCT_MANAGER");
    bytes32 public constant VERIFIER = keccak256("VERIFIER");

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyBrandAdmin(uint256 brandId) {
        require(
            hasRole(BRAND_ADMIN, msg.sender) || 
            brandToOwner[brandId] == msg.sender,
            "Caller is not brand admin"
        );
        _;
    }
}
```

### 2. Multi-Signature Implementation - phase 1 (implemented within flow instead, brand can approve transactions)

### 3. Time-Locked Operations - phase 2
```solidity
contract TimeLock {
    uint256 public constant MINIMUM_DELAY = 2 days;
    uint256 public constant MAXIMUM_DELAY = 30 days;

    mapping(bytes32 => bool) public queuedTransactions;

    function queueTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) public returns (bytes32) {
        // Implementation
    }

    function executeTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) public payable returns (bytes32) {
        // Implementation
    }
}
```

## Anti-Counterfeit Measures

### 1. Unique Product Identification and QR Code Generation (ProductIdentification.sol) - phase 1
```solidity
contract ProductIdentification {
    function generateUniqueId(
        uint256 brandId,
        uint256 productId,
        uint256 serialNumber
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                brandId,
                productId,
                serialNumber,
                block.timestamp
            )
        );
    }
    function generateQRData(
        bytes32 productId,
        uint256 timestamp,
        bytes memory signature
    ) public pure returns (bytes memory) {
        return abi.encodePacked(
            productId,
            timestamp,
            signature
        );
    }
}
```

### 2. Verification System (ProductRegistry.sol) - phase 1
```solidity
contract ProductRegistry is ERC1155 {
    mapping(bytes32 => bool) public verifiedProducts;
    mapping(bytes32 => uint256) public verificationCount;

    event ProductVerified(bytes32 indexed productId, address verifier);
    event SuspiciousActivity(bytes32 indexed productId, string reason);

    function verifyProduct(
        bytes32 productId,
        bytes memory signature
    ) public {
        require(isAuthorizedVerifier(msg.sender), "Unauthorized verifier");
        require(
            recoverSigner(productId, signature) == getProductManufacturer(productId),
            "Invalid signature"
        );

        if (verificationCount[productId] > 1) {
            emit SuspiciousActivity(productId, "Multiple verification attempts");
        }

        verifiedProducts[productId] = true;
        verificationCount[productId]++;
        emit ProductVerified(productId, msg.sender);
    }

    function isProductVerified(bytes32 productId) public view returns (bool) {
        return verifiedProducts[productId];
    }
}
```

### 3. NFC/RFID Integration (PhysicalVerification.sol) - phase 2
```solidity
contract PhysicalVerification {
    struct PhysicalTag {
        bytes32 uid;
        bytes32 productId;
        uint256 timestamp;
        bool isValid;
    }

    mapping(bytes32 => PhysicalTag) public physicalTags;

    function registerPhysicalTag(
        bytes32 tagUid,
        bytes32 productId
    ) external onlyManufacturer {
        physicalTags[tagUid] = PhysicalTag({
            uid: tagUid,
            productId: productId,
            timestamp: block.timestamp,
            isValid: true
        });
    }

    function verifyPhysicalTag(
        bytes32 tagUid,
        bytes32 productId
    ) external view returns (bool) {
        PhysicalTag memory tag = physicalTags[tagUid];
        return tag.isValid && tag.productId == productId;
    }
}
```

## Best Practices

1. **Regular Security Audits**
   - Conduct thorough code audits
   - Implement automated testing
   - Use formal verification tools

2. **Emergency Procedures**
   - Implement circuit breakers
   - Have upgrade mechanisms
   - Maintain incident response plans

3. **Monitoring**
   - Track suspicious activities
   - Monitor gas usage
   - Implement alerting systems

## Future Considerations

1. **Scalability**
   - Cross-chain compatibility
   - Sharding support

2. **Integration**
   - Supply chain management systems
   - E-commerce platforms
   - Mobile applications

3. **Governance**
   - DAO implementation
   - Community voting
   - Decentralized dispute resolution
