// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IManufacturerRegistry {
    struct ManufacturerStruct {
        address owner;
        string ipfsHash;
        uint256 timestamp;
    }

    function getManufacturer(uint256 manufacturerId) external view returns (ManufacturerStruct memory);
    function addManufacturer(string memory ipfsHash) external payable returns (uint256);
    function transferManufacturer(uint256 manufacturerId, address newOwner) external payable;
}
