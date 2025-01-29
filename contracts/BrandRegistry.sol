// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./BaseRegistry.sol";
import "./interfaces/IBrandRegistry.sol";

contract BrandRegistry is BaseRegistry, IBrandRegistry {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    constructor(address _feeCollector) BaseRegistry(_feeCollector) {}

    function addBrand(string memory ipfsHash) external payable override returns (uint256) {
        return addEntity(ipfsHash);
    }

    function getBrand(uint256 brandId) external view override validEntityId(brandId) returns (Brand memory) {
        BaseEntity memory entity = getEntity(brandId);
        return Brand(entity.owner, entity.ipfsHash, entity.timestamp);
    }

    function transferBrand(uint256 brandId, address newOwner) external payable override onlyEntityOwner(brandId) {
        transferEntity(brandId, newOwner);
    }
}