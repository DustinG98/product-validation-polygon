// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./interfaces/IBaseRegistry.sol";


contract BaseRegistry is IBaseRegistry {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Base storage for entities
    mapping(uint256 => BaseEntity) internal _entities;
    uint256 internal _entityCount;

    // Fee configuration
    uint256 public baseRegistrationFee = 0.001 ether;  // Minimum registration fee (0.001 ETH)
    uint256 public perByteRegistrationFee = 0.0001 ether;  // Additional fee per byte (0.0001 ETH)
    uint256 public transferFee = 0.0005 ether;     // Fixed transfer fee
    address public immutable feeCollector;

    // Modifiers
    modifier onlyEntityOwner(uint256 entityId) {
        require(msg.sender == _entities[entityId].owner, "Only entity owner can perform this action");
        _;
    }

    modifier validEntityId(uint256 entityId) {
        require(entityId > 0, "Entity ID must be greater than 0");
        require(entityId <= _entityCount, "Entity ID exceeds total count");
        _;
    }

    // Constructor
    constructor(address _feeCollector) {
        require(_feeCollector != address(0), "Fee collector cannot be zero address");
        feeCollector = _feeCollector;
        // Prevent direct deployment of base contract
        require(getContractType() != keccak256(abi.encodePacked("BaseRegistry")), "BaseRegistry cannot be deployed directly");
    }

    // Helper function to get contract type
    function getContractType() internal pure virtual returns (bytes32) {
        return keccak256(abi.encodePacked("BaseRegistry"));
    }

    // Internal functions
    function _validateIpfsHash(string memory hash) internal pure returns (bool) {
        bytes memory hashBytes = bytes(hash);
        require(hashBytes.length > 0, "IPFS hash cannot be empty");
        return true;
    }

    function _addEntity(string memory ipfsHash) internal virtual returns (uint256) {
        require(_validateIpfsHash(ipfsHash), "Invalid IPFS hash");
        
        uint256 entityId = _entityCount + 1;
        _entities[entityId] = BaseEntity({
            owner: msg.sender,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp
        });
        _entityCount = entityId;
        
        emit EntityAdded(entityId, msg.sender, ipfsHash);
        return entityId;
    }

    function _transferEntity(uint256 entityId, address newOwner) internal virtual {
        require(newOwner != address(0), "Invalid new owner address");
        require(_entities[entityId].owner != address(0), "Entity does not exist");
        
        address oldOwner = _entities[entityId].owner;
        _entities[entityId].owner = newOwner;
        
        emit EntityTransferred(entityId, oldOwner, newOwner);
    }

    function calculateRegistrationFee(string memory ipfsHash) public view returns (uint256) {
        uint256 dataSize = bytes(ipfsHash).length;
        uint256 sizeFee = dataSize * perByteRegistrationFee;
        return baseRegistrationFee + sizeFee;
    }

    function _collectFee(uint256 fee, string memory feeType) internal {
        require(msg.value >= fee, string(abi.encodePacked("Insufficient fee. Required: ", uint2str(fee))));
        payable(feeCollector).transfer(fee);
        emit FeeCollected(msg.sender, fee, feeType);
    }

    // Helper function to convert uint to string
    function uint2str(uint256 _i) internal pure returns (string memory str) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        str = string(bstr);
    }

    // Public payable functions
    function addEntity(string memory ipfsHash) public virtual payable returns (uint256) {
        uint256 fee = calculateRegistrationFee(ipfsHash);
        _collectFee(fee, "registration");
        return _addEntity(ipfsHash);
    }

    function transferEntity(uint256 entityId, address newOwner) public virtual payable {
        _collectFee(transferFee, "transfer");
        _transferEntity(entityId, newOwner);
    }

    // Public view functions
    function getEntity(uint256 entityId) public view validEntityId(entityId) returns (BaseEntity memory) {
        require(_entities[entityId].owner != address(0), "Entity does not exist");
        return _entities[entityId];
    }

    function getEntityCount() public view returns (uint256) {
        return _entityCount;
    }

    function getEntitiesByOwner(address owner) public view returns (uint256[] memory) {
        uint256[] memory entityIds = new uint256[](_entityCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= _entityCount; i++) {
            if (_entities[i].owner != address(0) && _entities[i].owner == owner) {
                entityIds[index++] = i;
            }
        }
        
        // Create a new array with the exact size needed
        uint256[] memory result = new uint256[](index);
        for (uint256 i = 0; i < index; i++) {
            result[i] = entityIds[i];
        }
        return result;
    }

    function getMyEntities() public view returns (uint256[] memory) {
        return getEntitiesByOwner(msg.sender);
    }

    // Fee management functions
    function setBaseRegistrationFee(uint256 _fee) external {
        require(msg.sender == feeCollector, "Only fee collector can update fees");
        baseRegistrationFee = _fee;
        emit FeeUpdated("baseRegistration", _fee);
    }

    function setPerByteRegistrationFee(uint256 _fee) external {
        require(msg.sender == feeCollector, "Only fee collector can update fees");
        perByteRegistrationFee = _fee;
        emit FeeUpdated("perByteRegistration", _fee);
    }

    function setTransferFee(uint256 _fee) external {
        require(msg.sender == feeCollector, "Only fee collector can update fees");
        transferFee = _fee;
        emit FeeUpdated("transfer", _fee);
    }
}