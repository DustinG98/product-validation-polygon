// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// INITIAL CONTRACT - DEPRECATED - DO NOT USE
// Use Registry contracts instead

contract ProductVerification {
    struct Product {
        string ipfsHash;      // Contains hash of JSON with {name, description, image}
        address owner;
        uint256 timestamp;
    }

    mapping(uint256 => Product) public products;
    uint256 private _productCount = 0;
    
    // Mapping to track product IDs owned by each address
    mapping(address => uint256[]) private userProducts;

    event ProductAdded(uint256 indexed productId, address indexed owner, string ipfsHash);

    function _validateIpfsHash(string memory hash) private pure returns (bool) {
        bytes memory hashBytes = bytes(hash);
        require(hashBytes.length > 0, "IPFS hash cannot be empty");
        return true;
    }

    function getProductCount() public view returns (uint256) {
        return _productCount;
    }

    function addProduct(string memory _ipfsHash) public {
        // Validate IPFS hash is not empty
        require(_validateIpfsHash(_ipfsHash), "Invalid IPFS hash");
        
        // Increment counter and store product
        _productCount++;
        products[_productCount] = Product({
            ipfsHash: _ipfsHash,
            owner: msg.sender,
            timestamp: block.timestamp
        });
        
        // Add product ID to user's products array
        userProducts[msg.sender].push(_productCount);
        
        emit ProductAdded(_productCount, msg.sender, _ipfsHash);
    }

    function getProduct(uint256 _productId) public view returns (string memory, address, uint256) {
        require(_productId > 0 && _productId <= _productCount, "Invalid product ID");
        Product memory product = products[_productId];
        return (product.ipfsHash, product.owner, product.timestamp);
    }

    function getMyProducts() public view returns (Product[] memory) {
        uint256[] memory productIds = userProducts[msg.sender];
        // If user has no products, return empty array
        if (productIds.length == 0) {
            return new Product[](0);
        }
        
        Product[] memory myProducts = new Product[](productIds.length);
        for (uint256 i = 0; i < productIds.length; i++) {
            myProducts[i] = products[productIds[i]];
        }
        
        return myProducts;
    }
}
