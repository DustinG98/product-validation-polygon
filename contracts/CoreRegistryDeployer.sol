// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./BrandRegistry.sol";
import "./ManufacturerRegistry.sol";
import "./ProductRegistry.sol";

contract CoreRegistryDeployer {
    address public immutable deployer;
    
    // Deployed addresses
    address public brandRegistry;
    address public manufacturerRegistry;
    address public productRegistry;

    error NotDeployer();
    error DeploymentFailed(string reason);
    error AlreadyDeployed();

    event RegistriesDeployed(
        address indexed brandRegistry,
        address indexed manufacturerRegistry,
        address indexed productRegistry
    );

    constructor() {
        deployer = msg.sender;
    }

    modifier onlyDeployer() {
        if (msg.sender != deployer) revert NotDeployer();
        _;
    }

    function deployRegistries() external onlyDeployer {
        if (brandRegistry != address(0)) revert AlreadyDeployed();
        
        address _brandRegistry;
        address _manufacturerRegistry;
        address _productRegistry;

        // Deploy Brand Registry
        try new BrandRegistry(deployer) returns (BrandRegistry brand) {
            _brandRegistry = address(brand);
        } catch Error(string memory reason) {
            revert DeploymentFailed(string.concat("BR:", reason));
        }

        // Deploy Manufacturer Registry
        try new ManufacturerRegistry(deployer) returns (ManufacturerRegistry manufacturer) {
            _manufacturerRegistry = address(manufacturer);
        } catch Error(string memory reason) {
            revert DeploymentFailed(string.concat("MR:", reason));
        }

        // Deploy Product Registry
        try new ProductRegistry(_brandRegistry, deployer) returns (ProductRegistry product) {
            _productRegistry = address(product);
        } catch Error(string memory reason) {
            revert DeploymentFailed(string.concat("PR:", reason));
        }

        // Set all addresses at once
        brandRegistry = _brandRegistry;
        manufacturerRegistry = _manufacturerRegistry;
        productRegistry = _productRegistry;

        // Emit event after all deployments are successful
        emit RegistriesDeployed(_brandRegistry, _manufacturerRegistry, _productRegistry);
    }

    function getAddresses() external view returns (
        address _brandRegistry,
        address _manufacturerRegistry,
        address _productRegistry
    ) {
        return (brandRegistry, manufacturerRegistry, productRegistry);
    }

    function isDeployed() public view returns (bool) {
        return brandRegistry != address(0) &&
            manufacturerRegistry != address(0) &&
            productRegistry != address(0);
    }
}
