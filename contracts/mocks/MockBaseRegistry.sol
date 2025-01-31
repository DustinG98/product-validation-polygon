// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../BaseRegistry.sol";

contract MockBaseRegistry is BaseRegistry {
    constructor(address _feeCollector) BaseRegistry(_feeCollector) {}

    // Override getContractType to bypass deployment check
    function getContractType() internal pure override returns (bytes32) {
        return keccak256(abi.encodePacked("MockBaseRegistry"));
    }

    // Expose internal functions for testing
    function exposed_addEntity(string memory ipfsHash) external payable returns (uint256) {
        uint256 fee = calculateRegistrationFee(ipfsHash);
        _collectFee(fee, "registration");
        return _addEntity(ipfsHash);
    }

    function exposed_transferEntity(uint256 entityId, address newOwner) external payable onlyEntityOwner(entityId) {
        _collectFee(transferFee, "transfer");
        _transferEntity(entityId, newOwner);
    }

    function exposed_validateIpfsHash(string memory hash) external pure returns (bool) {
        return _validateIpfsHash(hash);
    }
}
