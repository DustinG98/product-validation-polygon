//ethers v6 deploy script

import { ethers } from 'ethers';
import { testConnection } from './test-connection';
import { execSync } from 'child_process';

const deploySystem = async (testnet: boolean = false) => {
    console.log('Compiling contracts...');
    execSync('npx hardhat compile', { stdio: 'inherit' });

    console.log('Deploying Core Product Verification System...');
    await testConnection(testnet);

    const testNetProvider = new ethers.JsonRpcProvider(process.env.POLYGON_TESTNET_URL as string);
    const mainNetProvider = new ethers.WebSocketProvider(process.env.POLYGON_MAINNET_WS_URL as string);
    const provider = testnet ? testNetProvider : mainNetProvider;
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

    // Get contract artifacts
    const coreDeployerArtifacts = require('../artifacts/contracts/CoreRegistryDeployer.sol/CoreRegistryDeployer.json');
    const ProductTokenArtifact = require('../artifacts/contracts/ProductToken.sol/ProductToken.json');

    // Deploy registry deployer
    console.log('Deploying registry deployer...');
    const registryDeployerFactory = new ethers.ContractFactory(coreDeployerArtifacts.abi, coreDeployerArtifacts.bytecode, wallet);
    const registryDeployer = await registryDeployerFactory.deploy();
    const registryDeployerAddress = await registryDeployer.getAddress();
    const registryDeployerContract = new ethers.Contract(
        registryDeployerAddress,
        coreDeployerArtifacts.abi,
        wallet
    );
    await registryDeployerContract.waitForDeployment();
    console.log(`Registry deployer deployed.`);
    // Deploy core registries
    console.log('Deploying core registries: Brand, Manufacturer, and Product...');
    const registriesPromise = new Promise<[string, string, string]>((resolve) => {
        registryDeployerContract.once('RegistriesDeployed', (brandRegistry, manufacturerRegistry, productRegistry) => {
            resolve([brandRegistry, manufacturerRegistry, productRegistry]);
        });
    });
    await registryDeployerContract.deployRegistries();
    const [brandRegistry, manufacturerRegistry, productRegistry] = await registriesPromise;
    console.log('Core registries deployed.');

    // Deploy token directly
    console.log('Deploying product token...');
    const tokenFactory = new ethers.ContractFactory(ProductTokenArtifact.abi, ProductTokenArtifact.bytecode, wallet);
    const token = await tokenFactory.deploy(
        productRegistry,
        brandRegistry,
        manufacturerRegistry,
        wallet.address // fee collector
    );
    const tokenAddress = await token.getAddress();
    const productTokenContract = new ethers.Contract(tokenAddress, ProductTokenArtifact.abi, wallet);
    await productTokenContract.waitForDeployment();
    console.log('Product token deployed');

    return {
        registryDeployer: registryDeployerAddress,
        brandRegistry,
        manufacturerRegistry,
        productRegistry,
        productToken: tokenAddress
    };
}

// Run as standalone script if called directly
if (require.main === module) {
    const isTestnet = process.argv.includes('--testnet');
    const network = isTestnet ? 'Amoy Testnet' : 'Mainnet';
    deploySystem(isTestnet)
        .then((result) => {
            console.log('\nDeployment completed successfully!');
            console.log(`Network: '${network}'\n`);
            console.log('Deployed addresses:', result);
            process.exit(0);
        })
        .catch((error) => {
            console.error('Deployment failed:', error);
            process.exit(1);
        });
}