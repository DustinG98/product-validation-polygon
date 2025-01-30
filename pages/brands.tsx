import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext/AuthContext';
import { ethers, formatUnits, FeeData } from 'ethers';
import BrandRegistryArtifact from '../artifacts/contracts/BrandRegistry.sol/BrandRegistry.json';
import AddBrandForm from '../components/CreateBrandForm';
import MyBrands from '../components/MyBrands';

const BrandsPage: React.FC = () => {
    const { storachaClient, isStorachaAuthenticated } = useAuth();
    const [provider, setProvider] = useState<ethers.Provider | null>(null);
    const [providerContract, setProviderContract] = useState<any>(null);
    const [signerContract, setSignerContract] = useState<ethers.Contract | null>(null);
    const [signer, setSigner] = useState<any>(null);
    const [contractAddress, setContractAddress] = useState<string>(process.env.NEXT_PUBLIC_BRAND_REGISTRY_ADDRESS ?? '');
    const [account, setAccount] = useState<string>('');

    const [error, setError] = useState<string>('');
    const [brands, setBrands] = useState<any[]>([]);

    const [formData, setFormData] = useState({ name: '', description: '', image: null });
    const [loading, setLoading] = useState<boolean>(false);

    const [showModal, setShowModal] = useState(false);
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
    
            const contractAddress = process.env.NEXT_PUBLIC_BRAND_REGISTRY_ADDRESS ?? '';
            setContractAddress(contractAddress);

            const providerContractInstance = new ethers.Contract(
              contractAddress,
              BrandRegistryArtifact.abi,
              browserProvider
            );
    
            const signerContractInstance = new ethers.Contract(
              contractAddress,
              BrandRegistryArtifact.abi,
              signerInstance
            );

            setProviderContract(providerContractInstance);
            setSignerContract(signerContractInstance);
    
            // Verify contract instance
            try {
              const code = await browserProvider.getCode(contractAddress);
              if (code === '0x' || code === '0x0') {
                throw new Error('No contract code found at the specified address');
              }
    
              try {
                await fetchMyBrands();
              } catch (countError) {
                console.error('Could not get initial brands:', countError);
              }
            } catch (contractError: any) {
              console.error('Contract verification failed:', contractError);
              throw new Error(`Contract verification failed: ${contractError.message}`);
            }
    
          } catch (error: any) {
            console.error('Initialization error:', error);
            setError('Failed to initialize: ' + error.message);
          }
        };
    
        init();
    }, []);

    const handleInputChange = (e: any) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: any) => {
        setFormData({ ...formData, image: e.target.files[0] });
    };
    
    const fetchMyBrands = async () => {
        // Then get the full brand details
        if(!signerContract) {
            throw new Error('Contract not initialized');
        }
        const result = await signerContract.getMyBrands();

        // Result will be an object with numeric keys if it's an array of structs
        const brandsFiltered = Object.values(result).filter((item: any) => 
            typeof item === 'object' && item.ipfsHash && item.owner && item.timestamp
        );

        const brandsWithMetadata = await Promise.all(
            brandsFiltered.map(async (brand: any) => {
                try {
                // Access the struct fields directly
                const ipfsHash = brand.ipfsHash;
                const owner = brand.owner;
                const timestamp = brand.timestamp;
                
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
                    console.error('Error processing brand:', error);
                    return brand;
                }
            })
        );
        
        setBrands(brandsWithMetadata);
    }

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
                const methods = Object.keys(providerContract);
                
                if (!signerContract.addBrand) {
                throw new Error('Required contract method addBrand not found');
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

            const ipfsHash = await uploadToIPFS(metadata);

            // Send the transaction
            try {
                // Calculate the required fee based on BaseRegistry contract
                const baseRegistrationFee = BigInt("1000000000000000"); // 0.001 ETH base fee
                const perByteRegistrationFee = BigInt("100000000000000"); // 0.0001 ETH per byte
                const ipfsBytes = new TextEncoder().encode(ipfsHash).length;
                const totalFee = baseRegistrationFee + (perByteRegistrationFee * BigInt(ipfsBytes));

                // Get the gas estimate first
                const gasEstimate = await signerContract.addBrand.estimateGas(ipfsHash, {
                    value: totalFee
                });
                // Add 20% buffer to gas estimate
                const gasLimit = Math.floor(Number(gasEstimate) * 1.2);
                
                const tx = await signerContract.addBrand(ipfsHash, {
                    value: totalFee, // Include the required fee
                    gasLimit
                });

                await tx.wait();
                
                // Clear form and reload products
                setFormData({ name: '', description: '', image: null });

                // close the modal
                setShowModal(false);
                await fetchMyBrands();

                alert('Brand added successfully!');
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
        <div className="w-full max-w-6xl mx-auto h-[calc(100vh-4rem)]">
            {showModal ? (
                <div className="bg-white p-8 rounded-lg shadow-lg w-full h-[calc(100vh-4rem)] relative overflow-y-auto">
                    <button
                        onClick={() => setShowModal(false)}
                        className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 mt-4"
                    >
                        &larr; Back
                    </button>
                    <div className="flex justify-center w-full">
                        <AddBrandForm
                            formData={formData}
                            handleInputChange={handleInputChange}
                            handleFileChange={handleFileChange}
                            handleSubmit={handleSubmit}
                            loading={loading}
                            account={account}
                            isStorachaLoggedIn={isStorachaAuthenticated}
                        />
                    </div>
                </div>
            ) : (
                <div className="bg-white p-8 rounded-lg shadow-lg w-full h-[calc(100vh-4rem)] overflow-y-auto">
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
                                    Add Brand
                                </button>
                            </div>
                            {showDetails && (
                                <div className="absolute top-full right-3 mt-1 bg-white p-4 rounded shadow-lg z-10 text-sm min-w-[300px]">
                                    <div className="space-y-2 text-left">
                                        <p className="text-gray-600">
                                            <span className="font-semibold">Contract Address:</span>{' '}
                                            <span className="font-mono">{providerContract?.target || 'Not connected'}</span>
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
                            Brand Management
                        </h1>
                    </div>
                    <div className="w-full">
                        {brands.length > 0 ? (
                            <MyBrands myBrands={brands} />
                        ) : (
                            <div className="bg-gray-50 p-6 rounded-lg shadow min-h-[400px] w-full flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                    <p className="text-xl mb-4">No brands found</p>
                                    <p className="text-sm">Click the "Add Brand" button to create your first brand</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 

export default BrandsPage