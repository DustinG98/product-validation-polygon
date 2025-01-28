// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

abstract contract BaseRegistry {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct BaseEntity {
        address owner;
        string ipfsHash;
        uint256 timestamp;
    }

    // Base storage for entities
    mapping(uint256 => BaseEntity) internal _entities;
    uint256 internal _entityCount;

    // Events
    event EntityAdded(uint256 indexed entityId, address indexed owner, string ipfsHash);
    event EntityTransferred(uint256 indexed entityId, address indexed oldOwner, address indexed newOwner);

    // Modifiers
    modifier onlyEntityOwner(uint256 entityId) {
        require(msg.sender == _entities[entityId].owner, "Only entity owner can perform this action");
        _;
    }

    modifier validEntityId(uint256 entityId) {
        require(entityId > 0 && entityId <= _entityCount, "Invalid entity ID");
        _;
    }

    // Internal functions
    function _validateIpfsHash(string memory hash) internal pure returns (bool) {
        bytes memory hashBytes = bytes(hash);
        require(hashBytes.length > 0, "IPFS hash cannot be empty");
        return true;
    }

    function _addEntity(string memory ipfsHash) internal returns (uint256) {
        require(_validateIpfsHash(ipfsHash), "Invalid IPFS hash");
        _entityCount++;
        
        _entities[_entityCount] = BaseEntity({
            owner: msg.sender,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp
        });

        emit EntityAdded(_entityCount, msg.sender, ipfsHash);
        return _entityCount;
    }

    function _transferEntity(uint256 entityId, address newOwner) internal {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address oldOwner = _entities[entityId].owner;
        _entities[entityId].owner = newOwner;
        
        emit EntityTransferred(entityId, oldOwner, newOwner);
    }

    // Public view functions
    function getEntity(uint256 entityId) public view validEntityId(entityId) returns (BaseEntity memory) {
        return _entities[entityId];
    }

    function getEntityCount() public view returns (uint256) {
        return _entityCount;
    }
}