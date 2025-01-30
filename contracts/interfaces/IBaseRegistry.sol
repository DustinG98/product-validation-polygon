// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBaseRegistry {
    struct BaseEntity {
        address owner;
        string ipfsHash;
        uint256 timestamp;
    }

    // Core entity management functions
    function addEntity(string memory ipfsHash) external payable returns (uint256);
    function transferEntity(uint256 entityId, address newOwner) external payable;
    function getEntity(uint256 entityId) external view returns (BaseEntity memory);
    function getEntityCount() external view returns (uint256);
    
    // Entity ownership functions
    function getEntitiesByOwner(address owner) external view returns (uint256[] memory);
    function getMyEntities() external view returns (uint256[] memory);
    
    // Fee related functions
    function calculateRegistrationFee(string memory ipfsHash) external view returns (uint256);
    function setBaseRegistrationFee(uint256 _fee) external;
    function setPerByteRegistrationFee(uint256 _fee) external;
    function setTransferFee(uint256 _fee) external;
    
    // Events
    event EntityAdded(uint256 indexed entityId, address indexed owner, string ipfsHash);
    event EntityTransferred(uint256 indexed entityId, address indexed oldOwner, address indexed newOwner);
    event FeeUpdated(string feeType, uint256 newAmount);
    event FeeCollected(address from, uint256 amount, string feeType);
}
