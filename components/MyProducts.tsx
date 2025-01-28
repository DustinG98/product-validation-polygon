import React from 'react';

interface MyProductsProps {
  myProducts: {
    ipfsHash: string;
    owner: string;
    timestamp: string;
    metadata?: {
      name: string;
      description: string;
      image?: string;
    };
  }[];
}

const MyProducts: React.FC<MyProductsProps> = ({ myProducts }) => {
  return (
    <div className="bg-white p-6 rounded-lg">
      <h2 className="text-2xl font-semibold mb-6">My Products</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {myProducts.map((product, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow h-full">
            {product.metadata?.image && (
              <div className="w-full h-64 overflow-hidden">
                <img 
                  src={product.metadata.image}
                  alt={product.metadata?.name || 'Product Image'}
                  className="w-full h-full object-contain bg-gray-50"
                />
              </div>
            )}
            <div className="p-4">
              {product.metadata && (
                <>
                  <h3 className="text-xl font-semibold mb-2 truncate">
                    {product.metadata.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {product.metadata.description}
                  </p>
                </>
              )}
              <div className="text-xs text-gray-500 space-y-1">
                <p className="truncate">
                  <span className="font-medium">Owner:</span> {product.owner}
                </p>
                <p>
                  <span className="font-medium">Created:</span> {new Date(Number(product.timestamp) * 1000).toLocaleString()}
                </p>
                <p className="truncate">
                  <span className="font-medium">IPFS:</span> {product.ipfsHash}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyProducts;
