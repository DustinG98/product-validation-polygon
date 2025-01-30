// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./IBaseRegistry.sol";

interface IProductRegistry is IBaseRegistry {
    struct Product {
        address owner;
        string ipfsHash;      // Contains JSON with {name, description, specifications, etc}
        uint256 timestamp;
        bool isVerified;
    }

    struct VerificationRecord {
        uint256 brandId;          // Reference to the brand that verified this product
        uint256 manufacturerId;    // Reference to the manufacturer that produced this product
        uint256 batchId;          // Reference to the production batch
        uint256 timestamp;
        bytes signature;
        bool isValid;
    }

    function getProduct(uint256 productId) external view returns (Product memory);
    function addProduct(string memory ipfsHash, uint256 brandId) external payable returns (uint256);
    function transferProduct(uint256 productId, address newOwner) external payable;
    function getMyProducts() external view returns (Product[] memory);
    function verifyProduct(
        uint256 productId,
        uint256 brandId,
        uint256 manufacturerId,
        uint256 batchId,
        bytes memory signature
    ) external;
    function setProductionDetails(
        uint256 productId,
        uint256 manufacturerId,
        uint256 batchId
    ) external;
    function revokeVerification(uint256 productId) external;
    function verifyProductSignature(uint256 productId, bytes32 messageHash) external view returns (bool);
    function getVerificationRecord(uint256 productId) external view returns (VerificationRecord memory);
    function getVerificationDetails(uint256 productId) external view returns (
        uint256 brandId,
        uint256 manufacturerId,
        uint256 batchId,
        uint256 timestamp,
        bool isValid
    );

    event ProductVerified(
        uint256 indexed productId, 
        uint256 indexed brandId, 
        uint256 indexed manufacturerId, 
        uint256 batchId
    );
    event VerificationRevoked(uint256 indexed productId);
}
