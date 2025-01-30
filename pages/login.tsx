import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import StorachaLogin from '../components/StorachaLogin';
import { useAuth } from './AuthContext/AuthContext';
import Image from 'next/image';

const Login: React.FC = () => {
  const [storachaEmail, setStorachaEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [storachaSuccess, setStorachaSuccess] = useState<boolean>(false);
  const [metaMaskSuccess, setMetaMaskSuccess] = useState<boolean>(false);
  const { loginStoracha, loginMetaMask, isStorachaAuthenticated, isMetaMaskAuthenticated } = useAuth();
  const router = useRouter();

  const handleStorachaLogin = async () => {
    try {
      setLoading(true);
      await loginStoracha(storachaEmail);
      setStorachaSuccess(true);
      setLoading(false);
    } catch (error: any) {
      console.error('Storacha login error:', error);
      setError(error.message || 'Failed to login to Storacha');
      setLoading(false);
    }
  };

  const handleMetaMaskLogin = async () => {
    try {
      await loginMetaMask();
      setMetaMaskSuccess(true);
    } catch (error) {
      console.error('MetaMask login error:', error);
    }
  };

  useEffect(() => {
    // Always try to connect MetaMask first
    handleMetaMaskLogin();
  }, []);

  useEffect(() => {
    if (isStorachaAuthenticated && isMetaMaskAuthenticated) {
      router.push('/brands');
    }
  }, [isStorachaAuthenticated, isMetaMaskAuthenticated, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-8 text-center">Login</h1>
        {!isStorachaAuthenticated ? (
          <>
            <StorachaLogin
              storachaEmail={storachaEmail}
              setStorachaEmail={setStorachaEmail}
              handleStorachaLogin={handleStorachaLogin}
              loading={loading}
            />
            {storachaSuccess && <p className="text-green-500 mt-2 text-center">Storacha login successful!</p>}
          </>
        ) : (
          <p className="text-green-500 mb-4 text-center"> Storacha Connected</p>
        )}
        <button
          onClick={handleMetaMaskLogin}
          className="flex items-center justify-center bg-white border border-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-100 mt-4 w-full"
          disabled={metaMaskSuccess}
        >
          <Image src="/metamask_icon.svg" alt="MetaMask" width={24} height={24} className="mr-2" />
          {metaMaskSuccess ? ' Connected' : 'Login with MetaMask'}
        </button>
        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
      </div>
    </div>
  );
};

export default Login;
