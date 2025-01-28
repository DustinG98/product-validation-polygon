// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IBrandRegistry {
    struct Brand {
        address owner;
        string ipfsHash;
        uint256 timestamp;
    }

    function getBrand(uint256 brandId) external view returns (Brand memory);
    function addBrand(string memory ipfsHash) external returns (uint256);
    function transferBrand(uint256 brandId, address newOwner) external;
}
