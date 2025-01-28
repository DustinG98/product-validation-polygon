import React, { createContext, useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { create } from '@web3-storage/w3up-client';
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory';

interface AuthContextProps {
  storachaClient: any | null;
  isStorachaAuthenticated: boolean;
  isMetaMaskAuthenticated: boolean;
  loginStoracha: (email: string) => Promise<void>;
  loginMetaMask: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storachaClient, setStorachaClient] = useState<any | null>(null);
  const [isStorachaAuthenticated, setIsStorachaAuthenticated] = useState<boolean>(false);
  const [isMetaMaskAuthenticated, setIsMetaMaskAuthenticated] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const initializeStorachaClient = async () => {
      try {
        const store = new StoreMemory();
        const client = await create({ store });
        if (!client) {
          throw new Error('Failed to create Storacha client');
        }
        setStorachaClient(client);
        console.log('Storacha client initialized');
      } catch (error) {
        console.error('Failed to initialize Storacha client:', error);
      }
    };

    initializeStorachaClient();
  }, []);

  const loginStoracha = async (email: string) => {
    if (!storachaClient) throw new Error('Storacha client not initialized');
    const emailTrimmed = email.trim();
    if (!emailTrimmed) throw new Error('Please enter your email address');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) throw new Error('Please enter a valid email address');

    try {
      console.log('Attempting to log in to Storacha with email:', emailTrimmed);
      const loginResult = await storachaClient.login(emailTrimmed);
      console.log('Login result:', loginResult);
      const spaces = await storachaClient.spaces();
      console.log('Available spaces:', spaces);
      if (spaces.length === 0) throw new Error('No spaces found. Please create a space using the w3 CLI first: w3 space create product-storage');

      const space = spaces[0];
      await storachaClient.setCurrentSpace(space.did());
      setIsStorachaAuthenticated(true);
    } catch (error) {
      console.error('Storacha login error:', error);
      throw error;
    }
  };

  const loginMetaMask = async () => {
    if (typeof window.ethereum === 'undefined') {
      console.error('Please install MetaMask to use this application');
      return;
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('Connected account:', accounts[0]);

      const targetNetwork = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
      const targetChainId = targetNetwork === 'mainnet' ? '0x89' : '0x13882';
      const networkName = targetNetwork === 'mainnet' ? 'Polygon Mainnet' : 'Polygon Amoy Testnet';
      const rpcUrl = targetNetwork === 'mainnet' 
        ? 'https://polygon-rpc.com' 
        : 'https://rpc-amoy.polygon.technology';
      const explorerUrl = targetNetwork === 'mainnet'
        ? 'https://polygonscan.com/'
        : 'https://amoy.polygonscan.com/';

      // Check if we're on the correct network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== targetChainId) {
        try {
          console.log('Attempting to switch to network:', targetChainId);
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetChainId }],
          });
        } catch (switchError: any) {
          console.log('Switch failed:', switchError.code, switchError.message);
          if (switchError.code === 4902) {
            try {
              console.log('Adding network to MetaMask...');
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: targetChainId,
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
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: targetChainId }],
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

      setIsMetaMaskAuthenticated(true);
    } catch (error) {
      console.error('MetaMask login failed:', error);
    }
  };

  useEffect(() => {
    if (!isStorachaAuthenticated || !isMetaMaskAuthenticated) {
      router.push('/login');
    }
  }, [isStorachaAuthenticated, isMetaMaskAuthenticated, router]);

  return (
    <AuthContext.Provider value={{ storachaClient, isStorachaAuthenticated, isMetaMaskAuthenticated, loginStoracha, loginMetaMask }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};