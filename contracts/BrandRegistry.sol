// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./BaseRegistry.sol";
import "./interfaces/IBrandRegistry.sol";

contract BrandRegistry is BaseRegistry, IBrandRegistry {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    function addBrand(string memory ipfsHash) external override returns (uint256) {
        return _addEntity(ipfsHash);
    }

    function getBrand(uint256 brandId) external view override validEntityId(brandId) returns (Brand memory) {
        BaseEntity memory entity = getEntity(brandId);
        return Brand(entity.owner, entity.ipfsHash, entity.timestamp);
    }

    function transferBrand(uint256 brandId, address newOwner) external override onlyEntityOwner(brandId) {
        _transferEntity(brandId, newOwner);
    }
}