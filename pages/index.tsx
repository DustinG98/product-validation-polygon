import { useState, useEffect } from 'react';
// import { HttpProvider, Web3, WebSocketProvider } from 'web3';
import { ethers, hexlify, formatUnits } from 'ethers';
import type { NextPage } from 'next';
import { create } from '@web3-storage/w3up-client';
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory';
import contractArtifact from '../artifacts/ProductVerification.json';
import StorachaLogin from '../components/StorachaLogin';
import AddProductForm from '../components/AddProductForm';
import ViewProductDetails from '../components/ViewProductDetails';
import MyProducts from '../components/MyProducts';

interface ProductDetails {
  ipfsHash: string;
  owner: string;
  timestamp: string;
  metadata?: {
    name: string;
    description: string;
    image?: string;
  };
}

interface FormData {
  name: string;
  description: string;
  image?: File;
}

const Home: NextPage = () => {
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [providerContract, setProviderContract] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);
  const [signerContract, setSignerContract] = useState<any>(null);
  const [account, setAccount] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [myProducts, setMyProducts] = useState<ProductDetails[]>([]);
  const [storachaClient, setStorachaClient] = useState<any>(null);
  const [storachaEmail, setStorachaEmail] = useState<string>('');
  const [isStorachaLoggedIn, setIsStorachaLoggedIn] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
  });

  // Initialize Storacha client in a separate useEffect
  useEffect(() => {
    const initStoracha = async () => {
      try {
        console.log('Initializing Storacha client...');
        const store = new StoreMemory();
        const client = await create({ store });
        console.log('Client created:', client);
        
        if (!client) {
          throw new Error('Failed to create Storacha client');
        }

        setStorachaClient(client);
        console.log('Storacha client initialized and set in state');
      } catch (storachaError: any) {
        console.error('Failed to initialize Storacha client:', storachaError);
        setError(`Failed to initialize Storacha client: ${storachaError.message}`);
      }
    };

    initStoracha();
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    const init = async () => {
      try {
        if (typeof window.ethereum === 'undefined') {
          throw new Error('Please install MetaMask to use this application');
        }

        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);

        // Create Web3 instances
        const targetNetwork = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
        const providerUrl = targetNetwork === 'mainnet' ? process.env.POLYGON_MAINNET_WS_URL : 'https://rpc-amoy.polygon.technology';
        if (!providerUrl) {
          throw new Error('Provider URL not found');
        }
        // const providerInstance = new Web3(new HttpProvider(providerUrl));
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(browserProvider);
        const signerInstance = await browserProvider.getSigner(0);
        setSigner(signerInstance);

        // Check if we're on the correct network
        const chainId = (await browserProvider.getNetwork()).chainId;
        const targetChainId = BigInt(targetNetwork === 'mainnet' ? 137 : 80002); // Amoy testnet
        const targetChainHex = targetNetwork === 'mainnet' ? '0x89' : '0x13882';
        const networkName = targetNetwork === 'mainnet' ? 'Polygon Mainnet' : 'Polygon Amoy Testnet';
        const rpcUrl = targetNetwork === 'mainnet' 
          ? 'https://polygon-rpc.com' 
          : 'https://rpc-amoy.polygon.technology';
        const explorerUrl = targetNetwork === 'mainnet'
          ? 'https://polygonscan.com/'
          : 'https://amoy.polygonscan.com/';

        console.log('Target network:', {
          name: networkName,
          chainId: targetChainId.toString(),
          chainHex: targetChainHex,
          rpcUrl,
          explorerUrl
        });
        
        if (chainId !== targetChainId) {
          // First try to remove Mumbai testnet if it exists
          try {
            console.log('Attempting to remove Mumbai testnet...');
            await window.ethereum.request({
              method: 'wallet_removeEthereumChain',
              params: [{ chainId: '0x13881' }], // Mumbai chainId
            });
            console.log('Successfully removed Mumbai testnet');
          } catch (removeError) {
            console.log('Could not remove Mumbai testnet:', removeError);
            // Continue even if removal fails
          }

          // Try to switch to target network
          try {
            console.log('Attempting to switch to network:', targetChainHex);
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: targetChainHex }],
            });
          } catch (switchError: any) {
            console.log('Switch failed:', switchError.code, switchError.message);
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
              try {
                console.log('Adding network to MetaMask...');
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    {
                      chainId: targetChainHex,
                      chainName: networkName,
                      nativeCurrency: {
                        name: 'MATIC',
                        symbol: 'MATIC',
                        decimals: 18
                      },
                      rpcUrls: [rpcUrl],
                      blockExplorerUrls: [explorerUrl]
                    },
                  ],
                });
                console.log('Network added successfully');
                
                // Try switching again after adding
                await window.ethereum.request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: targetChainHex }],
                });
              } catch (addError) {
                console.error('Failed to add network:', addError);
                throw new Error(`Please switch to ${networkName} in your wallet`);
              }
            } else {
              throw new Error(`Please switch to ${networkName} in your wallet`);
            }
          }
        }

        // Create contract instance with web3ForSigning for transaction signing
        const contractAddress = '0x7329c3d9c78f603cbd8e36C65917c7E4b49EBaCd';

        const contractInstance = new ethers.Contract(
          contractAddress,
          contractArtifact.abi,
          browserProvider
        );

        const signerContractInstance = new ethers.Contract(
          contractAddress,
          contractArtifact.abi,
          signerInstance
        );

        // Verify contract instance
        try {
          const code = await browserProvider.getCode(contractAddress);
          if (code === '0x' || code === '0x0') {
            throw new Error('No contract code found at the specified address');
          }
          console.log('Contract code verified at address:', contractAddress);

          // Test contract methods
          try {
            const count = await contractInstance.getProductCount();
            console.log('Initial product count:', count);
          } catch (countError) {
            console.error('Could not get initial product count:', countError);
          }
        } catch (contractError: any) {
          console.error('Contract verification failed:', contractError);
          throw new Error(`Contract verification failed: ${contractError.message}`);
        }

        setProviderContract(contractInstance);
        setSignerContract(signerContractInstance);

        if (accounts[0]) {
          await loadMyProducts(signerContractInstance, accounts[0]);
        }
      } catch (error: any) {
        console.error('Initialization error:', error);
        setError('Failed to initialize: ' + error.message);
      }
    };

    init();
  }, []); // Empty dependency array means this runs once on mount

  const handleStorachaLogin = async () => {
    console.log('Current Storacha client:', storachaClient);
    
    if (!storachaClient) {
      console.error('Storacha client is null, attempting to reinitialize...');
      try {
        const store = new StoreMemory();
        const client = await create({ store });
        if (!client) {
          throw new Error('Failed to create Storacha client');
        }
        setStorachaClient(client);
        console.log('Successfully reinitialized Storacha client');
      } catch (initError: any) {
        console.error('Failed to reinitialize Storacha client:', initError);
        setError('Failed to initialize Storacha client. Please refresh the page and try again.');
        return;
      }
    }

    const email = storachaEmail.trim();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      console.log('Attempting to log in to Storacha with email:', email);
      
      // Start the login process and wait for email confirmation
      const loginResult = await storachaClient.login(email);
      console.log('Login result:', loginResult);
      
      // Get available spaces
      const spaces = await storachaClient.spaces();
      console.log('Available spaces:', spaces);
      
      if (spaces.length === 0) {
        setError('No spaces found. Please create a space using the w3 CLI first: w3 space create product-storage');
        return;
      }

      // Use the first available space
      const space = spaces[0];
      console.log('Using space:', space.did());
      await storachaClient.setCurrentSpace(space.did());
      
      setIsStorachaLoggedIn(true);
      setError('');
    } catch (error: any) {
      console.error('Storacha login error:', error);
      if (error.message.includes('missing current space')) {
        setError('Please create a space using the w3 CLI first: w3 space create product-storage');
      } else {
        setError('Failed to login to Storacha: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadToIPFS = async (data: any): Promise<string> => {
    if (!storachaClient) {
      throw new Error('Storacha client not initialized');
    }

    if (!isStorachaLoggedIn) {
      throw new Error('Please login to Storacha first');
    }

    try {
      let imageUrl = '';
      
      // If there's an image, upload it first
      if (data.image instanceof File) {
        const imageCid = await storachaClient.uploadFile(data.image);
        imageUrl = `https://${imageCid}.ipfs.w3s.link`;
        console.log('Image uploaded to Storacha, URL:', imageUrl);
      }

      // Create metadata without the File object
      const metadata = {
        ...data,
        image: imageUrl || undefined // Only include if we have an image
      };

      // Upload metadata
      const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const file = new File([blob], 'metadata.json', { type: 'application/json' });

      const cid = await storachaClient.uploadFile(file);
      const cidString = cid.toString();
      console.log('Metadata uploaded to Storacha, CID:', cidString);

      return cidString;
    } catch (error) {
      console.error('Error uploading to Storacha:', error);
      throw error;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        image: e.target.files![0]
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!isStorachaLoggedIn) {
        throw new Error('Please login to Storacha first');
      }

      if (!providerContract) {
        throw new Error('Contract not properly initialized');
      }

      if (!account) {
        throw new Error('No account connected');
      }

      // Verify contract methods
      try {
        console.log('Verifying contract methods...');
        const methods = Object.keys(providerContract);
        console.log('Available contract methods:', methods);
        
        if (!providerContract.addProduct) {
          throw new Error('Required contract method addProduct not found');
        }
      } catch (methodError: any) {
        console.error('Contract method verification failed:', methodError);
        throw new Error(`Contract not properly initialized: ${methodError.message}`);
      }

      // Prepare metadata for IPFS
      const metadata = {
        name: formData.name,
        description: formData.description,
        image: formData.image, // Pass the File object to uploadToIPFS
        timestamp: new Date().toISOString()
      };

      console.log('Uploading to IPFS:', metadata);
      const ipfsHash = await uploadToIPFS(metadata);
      console.log('IPFS hash:', ipfsHash);

      // Add product to blockchain
      console.log('Calling addProduct with account:', account);
      
      // Get contract's productCount before the transaction
      try {
        const currentCount = await providerContract.getProductCount();
        console.log('Current product count:', currentCount);
      } catch (countError: any) {
        console.error('Failed to get product count:', countError);
        // Continue even if we can't get the count
        console.log('Continuing without product count...');
      }

      // Send the transaction
      try {
        console.log('Preparing transaction with:', {
          method: 'addProduct',
          ipfsHash,
          from: account,
          contractAddress: providerContract._address
        });

        // Get the gas estimate first
        const gasEstimate = await providerContract.addProduct.estimateGas(ipfsHash);
        console.log('Gas estimate:', gasEstimate);
        
        // Convert gas estimate to number and add buffer
        const gasWithBuffer = Math.floor(Number(gasEstimate) * 1.2);
        // Convert the gasWithBuffer to a hex string
        const gasHex = formatUnits(gasWithBuffer, 'wei');
        
        // Prepare transaction parameters
        const txParams = {
          from: account,
          to: providerContract._address,
          data: providerContract.interface.encodeFunctionData('addProduct', [ipfsHash]),
          gas: gasHex,
        };

        console.log('Transaction parameters:', txParams);

        // Send transaction through MetaMask
        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [txParams],
        });
        
        console.log('Transaction hash:', txHash);

        // Wait for transaction confirmation using provider (RPC)
        console.log('Waiting for transaction confirmation...');
        const receipt = await new Promise((resolve) => {
          const checkReceipt = async () => {
            try {
              if (!provider) {
                console.warn('Provider not initialized');
                setTimeout(checkReceipt, 1000);
                return;
              }
              const result = await provider.getTransactionReceipt(txHash);
              if (result) {
                resolve(result);
              } else {
                setTimeout(checkReceipt, 1000); // Check again in 1 second
              }
            } catch (error) {
              console.warn('Error checking receipt:', error);
              setTimeout(checkReceipt, 1000);
            }
          };
          checkReceipt();
        });

        console.log('Transaction confirmed! Receipt:', receipt);
        
        // Clear form and reload products
        setFormData({ name: '', description: '' });
        await loadMyProducts(providerContract, account);
        alert('Product added successfully!');
      } catch (txError: any) {
        console.error('Transaction error:', txError);
        
        // Try to get a more detailed error message
        const errorString = txError.toString().toLowerCase();
        if (errorString.includes('revert')) {
          const revertReason = errorString.split('revert:')[1]?.trim() || 
                             errorString.split('reverted with reason string')[1]?.trim() || 
                             'Unknown reason';
          throw new Error(`Transaction reverted: ${revertReason}`);
        }
        
        throw txError;
      }
    } catch (error: any) {
      console.error('Add product error:', error);
      setError('Failed to add product: ' + (error.message || error.toString()));
    } finally {
      setLoading(false);
    }
  };

  const loadMyProducts = async (contractInstance: any, userAccount: string) => {
    try {
      console.log('Calling getMyProducts with account:', userAccount);
      const result = await contractInstance.getMyProducts();
      console.log('Raw products response:', result);
      
      // Result will be an object with numeric keys if it's an array of structs
      const products = Object.values(result).filter((item: any) => 
        typeof item === 'object' && item.ipfsHash && item.owner && item.timestamp
      );
      
      console.log('Processed products:', products);
      
      if (!products.length) {
        console.log('No valid products found');
        setMyProducts([]);
        return;
      }

      const productsWithMetadata = await Promise.all(
        products.map(async (product: any) => {
          try {
            console.log('Processing product:', product);
            // Access the struct fields directly
            const ipfsHash = product.ipfsHash;
            const owner = product.owner;
            const timestamp = product.timestamp;
            
            // Use Storacha gateway to fetch metadata
            const response = await fetch(`https://${ipfsHash}.ipfs.w3s.link`);
            const metadata = await response.json();
            return {
              ipfsHash,
              owner,
              timestamp: timestamp.toString(),
              metadata
            };
          } catch (error) {
            console.error('Error processing product:', error);
            return product;
          }
        })
      );
      setMyProducts(productsWithMetadata);
    } catch (error) {
      console.error('Failed to load products:', error);
      setMyProducts([]);
    }
  };

  const getProductDetails = async () => {
    if (!productId) return;
    setLoading(true);
    setError('');

    try {
      const [ipfsHash, owner, timestamp] = await providerContract.getProduct(productId);
      
      // Fetch metadata from IPFS using Storacha gateway
      const response = await fetch(`https://${ipfsHash}.ipfs.w3s.link`);
      const metadata = await response.json();
      
      setProductDetails({
        ipfsHash,
        owner,
        timestamp: new Date(Number(timestamp) * 1000).toLocaleString(),
        metadata
      });
    } catch (error: any) {
      setError('Failed to fetch product details: ' + error.message);
      setProductDetails(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Product Verification System</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {!isStorachaLoggedIn && (
        <StorachaLogin
          storachaEmail={storachaEmail}
          setStorachaEmail={setStorachaEmail}
          handleStorachaLogin={handleStorachaLogin}
          loading={loading}
        />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <AddProductForm
          formData={formData}
          handleInputChange={handleInputChange}
          handleFileChange={handleFileChange}
          handleSubmit={handleSubmit}
          loading={loading}
          account={account}
          isStorachaLoggedIn={isStorachaLoggedIn}
        />
        <ViewProductDetails
          productId={productId}
          setProductId={setProductId}
          getProductDetails={getProductDetails}
          loading={loading}
          productDetails={productDetails}
        />
      </div>
      <MyProducts myProducts={myProducts} />
    </div>
  );
};

export default Home;
