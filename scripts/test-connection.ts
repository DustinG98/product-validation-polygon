import * as dotenv from 'dotenv';
dotenv.config();
// import { Web3 } from 'web3';
import { ethers } from 'ethers';

export const testConnection = async (isTestnet: boolean = false): Promise<boolean> => {
  const network = isTestnet ? 'Amoy Testnet' : 'Mainnet';
  
  // Use HTTP for testnet and WebSocket for mainnet
  const url = isTestnet 
    ? process.env.POLYGON_TESTNET_URL 
    : process.env.POLYGON_MAINNET_WS_URL;

  if (!url) {
    console.error(`Error: Polygon ${network} URL not found in environment variables`);
    return false;
  }

  try {
    // Create appropriate provider based on URL type
    const testNetProvider = new ethers.JsonRpcProvider(process.env.POLYGON_TESTNET_URL as string);

    const mainNetProvider = new ethers.WebSocketProvider(process.env.POLYGON_MAINNET_WS_URL as string);

    const blockNumber = isTestnet ? await testNetProvider.getBlockNumber() : await mainNetProvider.getBlockNumber();

    if(!isTestnet) {
      // close connection
      mainNetProvider.destroy();
    }
    console.log(`Connected to Polygon ${network}. Latest Block Number:`, blockNumber);
    return true;
  } catch (error) {
    console.error(`Failed to connect to Polygon ${network}:`, error);
    return false;
  }
};

// Run as standalone script if called directly
if (require.main === module) {
  const isTestnet = process.argv.includes('--testnet');
  testConnection(isTestnet);
}