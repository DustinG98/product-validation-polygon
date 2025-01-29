//ethers v6 deploy script

import { ethers, resolveAddress } from 'ethers';
import {testConnection} from './test-connection';

const deploy = async (testnet: boolean = false, contractName: string, args: any[] = []) => {
    console.log(`Deploying ${contractName} with args: ${args}...`);
    await testConnection(testnet)
    const testNetProvider = new ethers.JsonRpcProvider(process.env.POLYGON_TESTNET_URL as string);

    const mainNetProvider = new ethers.WebSocketProvider(process.env.POLYGON_MAINNET_WS_URL as string);
    const provider = testnet ? testNetProvider : mainNetProvider;
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string, provider);

    // get contracts artifacts
    const contractArtifacts = require(`../artifacts/contracts/${contractName}.sol/${contractName}.json`);
    const contractFactory = new ethers.ContractFactory(contractArtifacts.abi, contractArtifacts.bytecode, wallet);

    const contract = await contractFactory.deploy(...args, process.env.FEE_COLLECTOR_ADDRESS as string);
    await contract.waitForDeployment();
    console.log(`Contract deployed to address: ${await contract.getAddress()}`);
    return contract;
}


// Run as standalone script if called directly
if (require.main === module) {
    const isTestnet = process.argv.includes('--testnet');
    // indexOf --testnet if found, or 2
    const split = process.argv.indexOf('--testnet') !== -1 ? process.argv.indexOf('--testnet') + 1 : 2;
    console.log({args: process.argv});
    const args = process.argv.slice(split, process.argv.length - 1);
    const contractName = process.argv[process.argv.length - 1];
    if (!contractName) {
        console.error('Please provide a contract name');
        console.log('Usage: npm run ethers-deploy [ContractName]');
        process.exit(1);
    }
    deploy(isTestnet, contractName, args);
}
export {deploy};