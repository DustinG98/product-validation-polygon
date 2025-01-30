// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./BaseRegistry.sol";
import "./interfaces/IBrandRegistry.sol";
import "./interfaces/IProductRegistry.sol";

contract ProductRegistry is BaseRegistry, IProductRegistry {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public immutable brandRegistry;

    constructor(
        address _brandRegistry,
        address _feeCollector
    ) BaseRegistry(_feeCollector) {
        require(_brandRegistry != address(0), "Brand registry cannot be zero address");
        brandRegistry = _brandRegistry;
    }

    // Mapping: productId => verification record
    mapping(uint256 => VerificationRecord) public verificationRecords;

    function addProduct(string memory ipfsHash, uint256 brandId) external payable returns (uint256) {
        // Verify caller is brand owner
        require(IBrandRegistry(brandRegistry).getBrand(brandId).owner == msg.sender, "Not brand owner");
        
        uint256 productId = addEntity(ipfsHash);
        
        // Auto-verify product for brand
        verificationRecords[productId] = VerificationRecord({
            brandId: brandId,
            manufacturerId: 0,  // Will be set when batch is created
            batchId: 0,        // Will be set when batch is created
            timestamp: block.timestamp,
            signature: "",
            isValid: true
        });

        emit ProductVerified(productId, brandId, 0, 0);
        
        return productId;
    }

    function getProduct(uint256 productId) public view override validEntityId(productId) returns (Product memory) {
        BaseEntity memory entity = getEntity(productId);
        return Product(entity.owner, entity.ipfsHash, entity.timestamp, verificationRecords[productId].isValid);
    }

    function getMyProducts() external view returns (Product[] memory) {
        uint256[] memory productIds = getMyEntities();
        Product[] memory products = new Product[](productIds.length);
        for (uint256 i = 0; i < productIds.length; i++) {
            products[i] = getProduct(productIds[i]);
        }
        return products;
    }

    function transferProduct(uint256 productId, address newOwner) external payable override onlyEntityOwner(productId) {
        transferEntity(productId, newOwner);
    }

    function verifyProduct(
        uint256 productId,
        uint256 brandId,
        uint256 manufacturerId,
        uint256 batchId,
        bytes memory signature
    ) external onlyEntityOwner(productId) {
        require(productId > 0 && productId <= getEntityCount(), "Invalid product ID");
        require(!verificationRecords[productId].isValid, "Product already verified");
        
        verificationRecords[productId] = VerificationRecord({
            brandId: brandId,
            manufacturerId: manufacturerId,
            batchId: batchId,
            timestamp: block.timestamp,
            signature: signature,
            isValid: true
        });

        emit ProductVerified(productId, brandId, manufacturerId, batchId);
    }

    function setProductionDetails(
        uint256 productId,
        uint256 manufacturerId,
        uint256 batchId
    ) external onlyEntityOwner(productId) {
        require(productId > 0 && productId <= getEntityCount(), "Invalid product ID");
        VerificationRecord storage record = verificationRecords[productId];
        require(record.isValid, "Product not verified");
        require(record.manufacturerId == 0, "Production details already set");
        require(record.batchId == 0, "Production details already set");
        
        record.manufacturerId = manufacturerId;
        record.batchId = batchId;
        record.timestamp = block.timestamp;

        emit ProductVerified(productId, record.brandId, manufacturerId, batchId);
    }

    function revokeVerification(uint256 productId) external onlyEntityOwner(productId) {
        require(productId > 0 && productId <= getEntityCount(), "Invalid product ID");
        require(verificationRecords[productId].isValid, "Product not verified");

        verificationRecords[productId].isValid = false;
        emit VerificationRevoked(productId);
    }

    function verifyProductSignature(
        uint256 productId,
        bytes32 messageHash
    ) public view returns (bool) {
        require(productId > 0 && productId <= getEntityCount(), "Invalid product ID");
        
        VerificationRecord memory record = verificationRecords[productId];
        if (!record.isValid) {
            return false;
        }

        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(ethSignedMessageHash, record.signature);
        
        return signer == _entities[productId].owner;
    }

    function getVerificationRecord(uint256 productId) 
        external 
        view 
        override
        validEntityId(productId) 
        returns (VerificationRecord memory) 
    {
        return verificationRecords[productId];
    }

    function getVerificationDetails(uint256 productId) 
        external 
        view
        validEntityId(productId) 
        returns (
            uint256 brandId,
            uint256 manufacturerId,
            uint256 batchId,
            uint256 timestamp,
            bool isValid
        ) 
    {
        VerificationRecord memory record = verificationRecords[productId];
        return (
            record.brandId,
            record.manufacturerId,
            record.batchId,
            record.timestamp,
            record.isValid
        );
    }

    function getContractType() internal pure override returns (bytes32) {
        return keccak256(abi.encodePacked("ProductRegistry"));
    }
}
