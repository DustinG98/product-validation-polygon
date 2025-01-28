import React from 'react';

interface ViewProductDetailsProps {
  productId: string;
  setProductId: (id: string) => void;
  getProductDetails: () => void;
  loading: boolean;
  productDetails: {
    ipfsHash: string;
    owner: string;
    timestamp: string;
    metadata?: {
      name: string;
      description: string;
      image?: string;
    };
  } | null;
}

const ViewProductDetails: React.FC<ViewProductDetailsProps> = ({
  productId,
  setProductId,
  getProductDetails,
  loading,
  productDetails,
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">View Product Details</h2>
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Product ID</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="flex-1 px-3 py-2 border rounded"
            min="1"
          />
          <button
            onClick={getProductDetails}
            disabled={loading || !productId}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Get Details'}
          </button>
        </div>
      </div>

      {productDetails && productDetails.metadata && (
        <div className="border-t pt-4 mt-4">
          <h3 className="font-semibold mb-2">{productDetails.metadata.name}</h3>
          {productDetails.metadata.image && (
            <img
              src={productDetails.metadata.image}
              alt={productDetails.metadata.name}
              className="w-full h-48 object-cover rounded mb-4"
            />
          )}
          <p className="text-gray-600 mb-2">{productDetails.metadata.description}</p>
          <p className="text-sm text-gray-500 mb-1">IPFS: {productDetails.ipfsHash}</p>
          <p className="text-sm text-gray-500 mb-1">Owner: {productDetails.owner}</p>
          <p className="text-sm text-gray-500">Added: {productDetails.timestamp}</p>
        </div>
      )}
    </div>
  );
};

export default ViewProductDetails;
