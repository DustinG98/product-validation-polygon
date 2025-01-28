import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext/AuthContext';
import { ethers, formatUnits } from 'ethers';
import contractArtifact from '../artifacts/ProductVerification.json';
import MyProducts from '../components/MyProducts';
import AddProductForm from '../components/AddProductForm';
import ViewProductDetails from '../components/ViewProductDetails';

const Dashboard: React.FC = () => {
  const { storachaClient, isStorachaAuthenticated } = useAuth();
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [providerContract, setProviderContract] = useState<any>(null);
  const [signerContract, setSignerContract] = useState<any>(null);
  const [signer, setSigner] = useState<any>(null);
  const [contractAddress, setContractAddress] = useState<string>('');
  const [account, setAccount] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [productDetails, setProductDetails] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', image: null });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!storachaClient) {
        console.error('Storacha client not initialized');
        return;
      }

      try {
        if (typeof window.ethereum === 'undefined') {
          throw new Error('Please install MetaMask to use this application');
        }

        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);

        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(browserProvider);
        const signerInstance = await browserProvider.getSigner(0);
        setSigner(signerInstance);

        const contractAddress = '0x7329c3d9c78f603cbd8e36C65917c7E4b49EBaCd';
        setContractAddress(contractAddress);
        
        const providerContractInstance = new ethers.Contract(
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
            const count = await providerContractInstance.getProductCount();
            console.log('Initial product count:', count);
          } catch (countError) {
            console.error('Could not get initial product count:', countError);
          }
        } catch (contractError: any) {
          console.error('Contract verification failed:', contractError);
          throw new Error(`Contract verification failed: ${contractError.message}`);
        }

        setProviderContract(providerContractInstance);
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
  }, []);

  const handleAddProduct = (newProduct: any) => {
    setMyProducts([...myProducts, newProduct]);
    setShowModal(false);
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

  const handleInputChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: any) => {
    setFormData({ ...formData, image: e.target.files[0] });
  };

  const uploadToIPFS = async (data: any): Promise<string> => {
    if (!storachaClient) {
      throw new Error('Storacha client not initialized');
    }

    if (!isStorachaAuthenticated) {
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!isStorachaAuthenticated) {
        throw new Error('Please login to Storacha first');
      }

      if (!signerContract) {
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
        
        if (!signerContract.addProduct) {
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

      // Send the transaction
      try {
        console.log('Preparing transaction with:', {
          method: 'addProduct',
          ipfsHash,
          from: account,
          contractAddress: providerContract.target
        });

        // Get the gas estimate first
        const gasEstimate = await signerContract.addProduct.estimateGas(ipfsHash);
        console.log('Gas estimate:', formatUnits(gasEstimate, 'wei'));

        // Add 20% buffer to gas estimate
        const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
        
        console.log('Sending transaction with gas limit:', gasLimit);
        
        const tx = await signerContract.addProduct.send(ipfsHash);
        
        console.log('Transaction sent:', tx.hash);
        console.log('Waiting for confirmation...');
        
        // Clear form and reload products
        setFormData({ name: '', description: '', image: null });
        await loadMyProducts(signerContract, account);
        setShowModal(false);
        alert('Product added successfully!');
      } catch (txError: any) {
        console.error('Transaction error:', txError);
        
        // Enhanced error handling
        let errorMessage = 'Transaction failed';
        
        if (txError.code === 'ACTION_REJECTED') {
          errorMessage = 'Transaction was rejected by user';
        } else if (txError.code === 'UNPREDICTABLE_GAS_LIMIT') {
          errorMessage = 'Unable to estimate gas. The transaction may fail or the contract may be incorrect.';
        } else if (txError.error?.message) {
          errorMessage = txError.error.message;
        } else if (txError.message) {
          errorMessage = txError.message;
        }
        
        throw new Error(`Failed to add product: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('Add product error:', error);
      setError('Failed to add product: ' + (error.message || error.toString()));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex items-center justify-center h-screen 
      bg-gradient-to-r
      from-[#020024]
      via-[#0088a3]
      to-[#090979]
      animate-[background-animate_20s_infinite]
      pt-8 pb-8 flex-col"
    >
      {showModal ? (
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-6xl relative h-full overflow-y-auto flex justify-center">
          <button
            onClick={() => setShowModal(false)}
            className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 mt-4"
          >
            &larr; Back
          </button>
          <AddProductForm
            formData={formData}
            handleInputChange={handleInputChange}
            handleFileChange={handleFileChange}
            handleSubmit={handleSubmit}
            loading={loading}
            account={account}
            isStorachaLoggedIn={isStorachaAuthenticated}
          />
        </div>
      ) : (
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-6xl h-full overflow-y-auto">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error.slice(0, 150).concat('...')}
            </div>
          )}
          <div className="relative mb-8 mt-4">
            <div className="absolute top-0 right-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-sm bg-white px-3 py-1 rounded hover:bg-gray-100 flex items-center"
                >
                  Connection Details {showDetails ? '▼' : '▶'}
                </button>
                <button
                  onClick={() => setShowModal(!showModal)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                  Add Product
                </button>
              </div>
              {showDetails && (
                <div className="absolute top-full right-3 mt-1 bg-white p-4 rounded shadow-lg z-10 text-sm min-w-[300px]">
                  <div className="space-y-2 text-left">
                    <p className="text-gray-600">
                      <span className="font-semibold">Contract Address:</span>{' '}
                      <span className="font-mono">{contractAddress || 'Not connected'}</span>
                    </p>
                    <p className="text-gray-600">
                      <span className="font-semibold">Network:</span>{' '}
                      {process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'Polygon Mainnet' : 'Polygon Amoy Testnet'}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-semibold">Account:</span>{' '}
                      <span className="font-mono">{account || 'Not connected'}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
            <h1 className="text-3xl font-bold mb-4 text-left">
              Decentralized Product Storage 
            </h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          </div>
          <MyProducts myProducts={myProducts} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
