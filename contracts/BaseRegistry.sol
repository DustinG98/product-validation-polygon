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

    // Fee configuration
    uint256 public registrationFee;
    uint256 public transferFee;
    address public feeCollector;

    // Events
    event EntityAdded(uint256 indexed entityId, address indexed owner, string ipfsHash);
    event EntityTransferred(uint256 indexed entityId, address indexed oldOwner, address indexed newOwner);
    event FeeUpdated(string feeType, uint256 newAmount);
    event FeeCollected(address from, uint256 amount, string feeType);

    // Modifiers
    modifier onlyEntityOwner(uint256 entityId) {
        require(msg.sender == _entities[entityId].owner, "Only entity owner can perform this action");
        _;
    }

    modifier validEntityId(uint256 entityId) {
        require(entityId > 0 && entityId <= _entityCount, "Invalid entity ID");
        _;
    }

    // Constructor
    constructor(address _feeCollector) {
        feeCollector = _feeCollector;
        registrationFee = 0.001 ether;  // Default 0.001 ETH (around $2-3)
        transferFee = 0.0005 ether;     // Default 0.0005 ETH (around $1-1.5)
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

    function _collectFee(uint256 fee) internal {
        require(msg.value >= fee, "Insufficient fee");
        (bool sent, ) = feeCollector.call{value: fee}("");
        require(sent, "Failed to send fee");
        emit FeeCollected(msg.sender, fee, "registration");
    }

    // Public payable functions
    function addEntity(string memory ipfsHash) public virtual payable returns (uint256) {
        _collectFee(registrationFee);
        return _addEntity(ipfsHash);
    }

    function transferEntity(uint256 entityId, address newOwner) public virtual payable {
        _collectFee(transferFee);
        _transferEntity(entityId, newOwner);
    }

    // Public view functions
    function getEntity(uint256 entityId) public view validEntityId(entityId) returns (BaseEntity memory) {
        return _entities[entityId];
    }

    function getEntityCount() public view returns (uint256) {
        return _entityCount;
    }

    // Fee management functions
    function setRegistrationFee(uint256 _fee) external {
        require(msg.sender == feeCollector, "Only fee collector can update fees");
        registrationFee = _fee;
        emit FeeUpdated("registration", _fee);
    }

    function setTransferFee(uint256 _fee) external {
        require(msg.sender == feeCollector, "Only fee collector can update fees");
        transferFee = _fee;
        emit FeeUpdated("transfer", _fee);
    }

    function setFeeCollector(address _newCollector) external {
        require(msg.sender == feeCollector, "Only current fee collector can update");
        feeCollector = _newCollector;
    }
}