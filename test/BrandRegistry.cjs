const { expect } = require("chai");
const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("BrandRegistry", function () {
    let mockRegistry;
    let feeCollector;
    let owner;
    let user1;
    let user2;

    beforeEach(async function () {
        [owner, feeCollector, user1, user2] = await hre.ethers.getSigners();

        // Fund users with ETH
        await owner.sendTransaction({
            to: user1.address,
            value: hre.ethers.parseEther("100"),
        });
        await owner.sendTransaction({
            to: user2.address,
            value: hre.ethers.parseEther("100"),
        });
    })
    describe("Mock Implementation Tests", function () {
        beforeEach(async function () {
            // Deploy the mock implementation
            const MockBrandRegistry = await hre.ethers.getContractFactory("BrandRegistry");
            mockRegistry = await MockBrandRegistry.deploy(feeCollector.address);
        })

        describe("Constructor", function () {
            it("Should set the fee collector correctly", async function () {
                expect(await mockRegistry.feeCollector()).to.equal(feeCollector.address);
            })

            it("Should revert if fee collector is zero address", async function () {
                const MockBrandRegistry = await hre.ethers.getContractFactory("BrandRegistry");
                await expect(
                    MockBrandRegistry.deploy(hre.ethers.ZeroAddress)
                ).to.be.revertedWith("Fee collector cannot be zero address");
            });
        })

        describe("Methods", function () {
            const testIpfsHash = "QmTest123";

           describe("addBrand", function () {
               let fee;
               beforeEach(async function () {
                   fee = await mockRegistry.calculateRegistrationFee(testIpfsHash);
               })
                it("Should add a brand correctly with sufficient fee", async function () {
                    await expect(
                        mockRegistry.connect(user1).addBrand(testIpfsHash, { value: fee })
                    )
                        .to.emit(mockRegistry, "EntityAdded")
                        .withArgs(BigInt(1), user1.address, testIpfsHash)
                        .and.to.emit(mockRegistry, "FeeCollected")
                        .withArgs(user1.address, fee, "registration");
                })

                it("Should revert if fee is insufficient", async function () {
                    await expect(
                        mockRegistry.connect(user1).addBrand(testIpfsHash, { 
                            value: fee - BigInt(1)
                        })
                    ).to.be.revertedWith("Insufficient fee");
                })
           })

           describe("transferBrand", function () {
               let transferFee;
               let brandId;
               beforeEach(async function () {
                   // First add a brand
                   const regFee = await mockRegistry.calculateRegistrationFee(testIpfsHash);
                   await mockRegistry.connect(user1).addBrand(testIpfsHash, { value: regFee });
                   brandId = BigInt(1);
                   
                   // Get transfer fee
                   transferFee = await mockRegistry.transferFee();
               })
               
               it("Should transfer brand correctly with sufficient fee", async function () {
                   await expect(
                       mockRegistry.connect(user1).transferBrand(brandId, user2.address, { value: transferFee })
                   )
                       .to.emit(mockRegistry, "EntityTransferred")
                       .withArgs(brandId, user1.address, user2.address)
                       .and.to.emit(mockRegistry, "FeeCollected")
                       .withArgs(user1.address, transferFee, "transfer");
               })

               it("Should revert if transfer fee is insufficient", async function () {
                   await expect(
                       mockRegistry.connect(user1).transferBrand(brandId, user2.address, { 
                           value: transferFee - BigInt(1) 
                       })
                   ).to.be.revertedWith("Insufficient fee");
               })

               it("Should revert if non-owner tries to transfer", async function () {
                   await expect(
                       mockRegistry.connect(user2).transferBrand(brandId, user2.address, { 
                           value: transferFee 
                       })
                   ).to.be.revertedWith("Only entity owner can perform this action");
               })
           })

           describe("getBrand", function () {
               let brandId;
               let timestamp;
               beforeEach(async function () {
                   // First add a brand
                   const regFee = await mockRegistry.calculateRegistrationFee(testIpfsHash);
                   const tx = await mockRegistry.connect(user1).addBrand(testIpfsHash, { value: regFee });
                   const receipt = await tx.wait();
                   timestamp = (await hre.ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                   brandId = BigInt(1);
               })

               it("Should return the correct brand", async function () {
                   const brand = await mockRegistry.getBrand(brandId);
                   expect(brand.owner).to.equal(user1.address);
                   expect(brand.ipfsHash).to.equal(testIpfsHash);
                   expect(brand.timestamp).to.equal(timestamp);
               })

               it("Should revert if brand does not exist", async function () {
                   await expect(mockRegistry.getBrand(brandId + BigInt(1))).to.be.revertedWith("Entity does not exist");
               })
           })

           describe("getMyBrands", function () {
               let brandId;
               let timestamp;
               beforeEach(async function () {
                   // First add a brand
                   const regFee = await mockRegistry.calculateRegistrationFee(testIpfsHash);
                   const tx = await mockRegistry.connect(user1).addBrand(testIpfsHash, { value: regFee });
                   const receipt = await tx.wait();
                   timestamp = (await hre.ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                   brandId = BigInt(1);
               })
               
               it("Should return the correct brands for owner", async function () {
                   const brands = await mockRegistry.connect(user1).getMyBrands();
                   expect(brands.length).to.equal(1);
                   expect(brands[0].owner).to.equal(user1.address);
                   expect(brands[0].ipfsHash).to.equal(testIpfsHash);
                   expect(brands[0].timestamp).to.equal(timestamp);
               })
               
               it("Should return empty array for address with no brands", async function () {
                   const brands = await mockRegistry.connect(user2).getMyBrands();
                   expect(brands.length).to.equal(0);
               })
           })
        })
    })
})