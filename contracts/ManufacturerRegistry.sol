// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./BaseRegistry.sol";
import "./interfaces/IManufacturerRegistry.sol";

contract ManufacturerRegistry is BaseRegistry, IManufacturerRegistry {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    constructor(address _feeCollector) BaseRegistry(_feeCollector) {}

    function addManufacturer(string memory ipfsHash) external payable override returns (uint256) {
        return addEntity(ipfsHash);
    }

    function getManufacturer(uint256 manufacturerId) public view override validEntityId(manufacturerId) returns (ManufacturerStruct memory) {
        BaseEntity memory entity = getEntity(manufacturerId);
        return ManufacturerStruct(entity.owner, entity.ipfsHash, entity.timestamp);
    }

    function getMyManufacturers() external view returns (ManufacturerStruct[] memory) {
        uint256[] memory manufacturerIds = getMyEntities();
        ManufacturerStruct[] memory manufacturers = new ManufacturerStruct[](manufacturerIds.length);
        for (uint256 i = 0; i < manufacturerIds.length; i++) {
            manufacturers[i] = getManufacturer(manufacturerIds[i]);
        }
        return manufacturers;
    }

    function transferManufacturer(uint256 manufacturerId, address newOwner) external payable override onlyEntityOwner(manufacturerId) {
        transferEntity(manufacturerId, newOwner);
    }
}
