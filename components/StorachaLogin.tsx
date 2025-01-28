import React from 'react';

interface StorachaLoginProps {
  storachaEmail: string;
  setStorachaEmail: (email: string) => void;
  handleStorachaLogin: () => void;
  loading: boolean;
}

const StorachaLogin: React.FC<StorachaLoginProps> = ({
  storachaEmail,
  setStorachaEmail,
  handleStorachaLogin,
  loading,
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow mb-8">
      <h2 className="text-xl font-semibold mb-4">Login to Storacha</h2>
      <div className="flex gap-2">
        <input
          type="email"
          value={storachaEmail}
          onChange={(e) => setStorachaEmail(e.target.value)}
          placeholder="Enter your email"
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={handleStorachaLogin}
          disabled={loading || !storachaEmail}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </div>
      <p className="text-sm text-gray-500 mt-2">
        You'll receive an email to confirm your login. Please check your inbox.
      </p>
    </div>
  );
};

export default StorachaLogin;
