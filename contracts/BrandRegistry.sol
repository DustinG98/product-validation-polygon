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

    function getBrand(uint256 brandId) public view override validEntityId(brandId) returns (Brand memory) {
        BaseEntity memory entity = getEntity(brandId);
        return Brand(entity.owner, entity.ipfsHash, entity.timestamp);
    }

    function getMyBrands() external view returns (Brand[] memory) {
        uint256[] memory brandIds = getMyEntities();
        Brand[] memory brands = new Brand[](brandIds.length);
        for (uint256 i = 0; i < brandIds.length; i++) {
            brands[i] = getBrand(brandIds[i]);
        }
        return brands;
    }


    function transferBrand(uint256 brandId, address newOwner) external payable override onlyEntityOwner(brandId) {
        transferEntity(brandId, newOwner);
    }

    function getContractType() internal pure override returns (bytes32) {
        return keccak256(abi.encodePacked("BrandRegistry"));
    }
}