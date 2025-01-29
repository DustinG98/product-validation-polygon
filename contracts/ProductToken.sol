// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./interfaces/IProductRegistry.sol";
import "./interfaces/IBrandRegistry.sol";
import "./interfaces/IManufacturerRegistry.sol";

contract ProductToken is ERC1155 {
    IProductRegistry public productRegistry;
    IBrandRegistry public brandRegistry;
    IManufacturerRegistry public manufacturerRegistry;

    // Fee configuration
    uint256 public batchRequestFee;
    uint256 public mintFee;
    address public feeCollector;

    event FeeUpdated(string feeType, uint256 newAmount);
    event FeeCollected(address from, uint256 amount, string feeType);

    constructor(
        address _productRegistry,
        address _brandRegistry,
        address _manufacturerRegistry,
        address _feeCollector
    ) ERC1155("") {
        productRegistry = IProductRegistry(_productRegistry);
        brandRegistry = IBrandRegistry(_brandRegistry);
        manufacturerRegistry = IManufacturerRegistry(_manufacturerRegistry);
        
        feeCollector = _feeCollector;
        batchRequestFee = 0.001 ether;  // Default 0.001 ETH (around $2-3)
        mintFee = 0.0002 ether;         // Default 0.0002 ETH (around $0.50)
    }

    struct BatchInfo {
        string ipfsHash;
        uint256 totalSupply;
        uint256 remainingSupply;
        bool isVerified;
        bool isRequested;  // New field to track if batch is requested
    }

    uint256 private _batchIds;
    uint256 private _productIds;

    // Batch tracking
    mapping(uint256 => BatchInfo) public batchInfo;
    mapping(uint256 => uint256) public batchManufacturer;
    mapping(uint256 => uint256) public batchBrand;
    mapping(uint256 => uint256) public batchProduct;  // Links batch to product registry ID
    mapping(uint256 => uint256) public productBatch;
    mapping(uint256 => uint256) public tokenProduct;  // Direct link from token to product registry ID

    event BatchRequested(uint256 indexed batchId, uint256 indexed manufacturerId, uint256 indexed productId);
    event BatchApproved(uint256 indexed batchId, uint256 indexed brandId);
    event ProductMinted(uint256 indexed tokenId, uint256 indexed batchId, address indexed recipient);

    // Fee management functions
    function setBatchRequestFee(uint256 _fee) external {
        require(msg.sender == feeCollector, "Only fee collector can update fees");
        batchRequestFee = _fee;
        emit FeeUpdated("batchRequest", _fee);
    }

    function setMintFee(uint256 _fee) external {
        require(msg.sender == feeCollector, "Only fee collector can update fees");
        mintFee = _fee;
        emit FeeUpdated("mint", _fee);
    }

    function setFeeCollector(address _newCollector) external {
        require(msg.sender == feeCollector, "Only current fee collector can update");
        feeCollector = _newCollector;
    }

    function _collectFee(uint256 fee, string memory feeType) internal {
        require(msg.value >= fee, "Insufficient fee");
        (bool sent, ) = feeCollector.call{value: fee}("");
        require(sent, "Failed to send fee");
        emit FeeCollected(msg.sender, fee, feeType);
    }

    function requestBatch(
        uint256 manufacturerId,
        uint256 productId,
        uint256 quantity,
        string memory ipfsHash
    ) external payable returns (uint256) {
        // Collect batch request fee
        _collectFee(batchRequestFee, "batchRequest");
        
        // Verify caller is manufacturer owner
        require(manufacturerRegistry.getManufacturer(manufacturerId).owner == msg.sender, "Not manufacturer owner");
        
        // Verify product exists and is verified
        IProductRegistry.Product memory product = productRegistry.getProduct(productId);
        require(product.isVerified, "Product not verified");
        
        _batchIds++;
        uint256 batchId = _batchIds;
        
        batchInfo[batchId] = BatchInfo({
            ipfsHash: ipfsHash,
            totalSupply: quantity,
            remainingSupply: quantity,
            isVerified: false,
            isRequested: true
        });
        
        batchManufacturer[batchId] = manufacturerId;
        batchProduct[batchId] = productId;
        
        emit BatchRequested(batchId, manufacturerId, productId);
        return batchId;
    }

    function approveBatch(uint256 batchId) external {
        uint256 productId = batchProduct[batchId];
        require(productId > 0, "Batch not found");
        require(batchInfo[batchId].isRequested, "Batch not requested");
        require(!batchInfo[batchId].isVerified, "Batch already verified");
        
        // Verify caller is the brand that owns the product
        IProductRegistry.Product memory product = productRegistry.getProduct(productId);
        require(msg.sender == product.owner, "Not product owner");
        
        // Get brand ID from verification record
        IProductRegistry.VerificationRecord memory record = productRegistry.getVerificationRecord(productId);
        uint256 brandId = record.brandId;
        require(brandId > 0, "Product not verified by brand");
        
        // Update verification record with manufacturer and batch
        uint256 manufacturerId = batchManufacturer[batchId];
        productRegistry.setProductionDetails(productId, manufacturerId, batchId);
        
        batchBrand[batchId] = brandId;
        batchInfo[batchId].isVerified = true;
        
        emit BatchApproved(batchId, brandId);
    }

    function mintProduct(
        uint256 batchId,
        address recipient
    ) external payable returns (uint256) {
        // Collect minting fee
        _collectFee(mintFee, "mint");
        
        require(batchInfo[batchId].isVerified, "Batch not verified");
        require(batchInfo[batchId].remainingSupply > 0, "Batch depleted");
        
        // Verify caller is the brand that owns the product
        uint256 productId = batchProduct[batchId];
        IProductRegistry.Product memory product = productRegistry.getProduct(productId);
        require(msg.sender == product.owner, "Not product owner");
        
        _productIds++;
        uint256 tokenId = _productIds;
        
        // Decrease remaining supply
        batchInfo[batchId].remainingSupply--;
        
        // Mint token directly to recipient
        _mint(recipient, tokenId, 1, "");
        
        // Link token to batch and product
        productBatch[tokenId] = batchId;
        tokenProduct[tokenId] = productId;
        
        emit ProductMinted(tokenId, batchId, recipient);
        return tokenId;
    }

    // View functions
    function getBatchInfo(uint256 batchId) external view returns (
        BatchInfo memory info,
        uint256 manufacturerId,
        uint256 brandId,
        uint256 productId
    ) {
        info = batchInfo[batchId];
        manufacturerId = batchManufacturer[batchId];
        brandId = batchBrand[batchId];
        productId = batchProduct[batchId];
    }

    function getTokenDetails(uint256 tokenId) external view returns (
        uint256 batchId,
        uint256 productId,
        IProductRegistry.Product memory product,
        uint256 brandId,
        uint256 manufacturerId,
        uint256 verificationTimestamp,
        bool isValid
    ) {
        batchId = productBatch[tokenId];
        productId = tokenProduct[tokenId];
        product = productRegistry.getProduct(productId);
        (brandId, manufacturerId, batchId, verificationTimestamp, isValid) = productRegistry.getVerificationDetails(productId);
    }

    // Override uri function to handle both batch and product metadata
    function uri(uint256 tokenId) public view override returns (string memory) {
        uint256 productId = tokenProduct[tokenId];
        require(productId > 0, "Token does not exist");
        
        IProductRegistry.Product memory product = productRegistry.getProduct(productId);
        return string(abi.encodePacked("ipfs://", product.ipfsHash));
    }

    // Required override for ERC1155
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
