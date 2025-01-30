import React from 'react';

interface MyBrandsProps {
  myBrands: {
    ipfsHash: string;
    owner: string;
    timestamp: string;
    metadata?: {
      name: string;
      description: string;
      image?: string;
      website?: string;
    };
  }[];
}

const MyBrands: React.FC<MyBrandsProps> = ({ myBrands }) => {
  return (
    <div className="w-full">
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-6">My Brands</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myBrands.map((brand, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow h-full">
              {brand.metadata?.image && (
                <div className="w-full h-48 overflow-hidden bg-gray-50">
                  <img 
                    src={brand.metadata.image}
                    alt={brand.metadata?.name || 'Brand Logo'}
                    className="w-full h-full object-contain p-4"
                  />
                </div>
              )}
              <div className="p-4">
                {brand.metadata && (
                  <>
                    <h3 className="text-xl font-semibold mb-2 truncate">
                      {brand.metadata.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {brand.metadata.description}
                    </p>
                    {brand.metadata.website && (
                      <a 
                        href={brand.metadata.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm mb-4 block"
                      >
                        Visit Website
                      </a>
                    )}
                  </>
                )}
                <div className="text-xs text-gray-500 space-y-1 mt-4 pt-4 border-t">
                  <p className="truncate">
                    <span className="font-medium">Owner:</span> {brand.owner}
                  </p>
                  <p>
                    <span className="font-medium">Created:</span> {new Date(Number(brand.timestamp) * 1000).toLocaleString()}
                  </p>
                  <p className="truncate">
                    <span className="font-medium">IPFS:</span> {brand.ipfsHash}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyBrands;
