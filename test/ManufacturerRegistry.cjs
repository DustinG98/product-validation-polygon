const { expect } = require("chai");
const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("ManufacturerRegistry", function () {
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
            const MockManufacturerRegistry = await hre.ethers.getContractFactory("ManufacturerRegistry");
            mockRegistry = await MockManufacturerRegistry.deploy(feeCollector.address);
        })

        describe("Constructor", function () {
            it("Should set the fee collector correctly", async function () {
                expect(await mockRegistry.feeCollector()).to.equal(feeCollector.address);
            })

            it("Should revert if fee collector is zero address", async function () {
                const MockManufacturerRegistry = await hre.ethers.getContractFactory("ManufacturerRegistry");
                await expect(
                    MockManufacturerRegistry.deploy(hre.ethers.ZeroAddress)
                ).to.be.revertedWith("Fee collector cannot be zero address");
            });
        })

        describe("Methods", function () {
            const testIpfsHash = "QmTest123";

           describe("addManufacturer", function () {
               let fee;
               beforeEach(async function () {
                   fee = await mockRegistry.calculateRegistrationFee(testIpfsHash);
               })
                it("Should add a manufacturer correctly with sufficient fee", async function () {
                    await expect(
                        mockRegistry.connect(user1).addManufacturer(testIpfsHash, { value: fee })
                    )
                        .to.emit(mockRegistry, "EntityAdded")
                        .withArgs(BigInt(1), user1.address, testIpfsHash)
                        .and.to.emit(mockRegistry, "FeeCollected")
                        .withArgs(user1.address, fee, "registration");
                })

                it("Should revert if fee is insufficient", async function () {
                    await expect(
                        mockRegistry.connect(user1).addManufacturer(testIpfsHash, { 
                            value: fee - BigInt(1)
                        })
                    ).to.be.revertedWith("Insufficient fee");
                })
           })

           describe("transferManufacturer", function () {
               let transferFee;
               let manufacturerId;
               beforeEach(async function () {
                   // First add a manufacturer
                   const regFee = await mockRegistry.calculateRegistrationFee(testIpfsHash);
                   await mockRegistry.connect(user1).addManufacturer(testIpfsHash, { value: regFee });
                   manufacturerId = BigInt(1);
                   
                   // Get transfer fee
                   transferFee = await mockRegistry.transferFee();
               })
               
               it("Should transfer manufacturer correctly with sufficient fee", async function () {
                   await expect(
                       mockRegistry.connect(user1).transferManufacturer(manufacturerId, user2.address, { value: transferFee })
                   )
                       .to.emit(mockRegistry, "EntityTransferred")
                       .withArgs(manufacturerId, user1.address, user2.address)
                       .and.to.emit(mockRegistry, "FeeCollected")
                       .withArgs(user1.address, transferFee, "transfer");
               })

               it("Should revert if transfer fee is insufficient", async function () {
                   await expect(
                       mockRegistry.connect(user1).transferManufacturer(manufacturerId, user2.address, { 
                           value: transferFee - BigInt(1) 
                       })
                   ).to.be.revertedWith("Insufficient fee");
               })

               it("Should revert if non-owner tries to transfer", async function () {
                   await expect(
                       mockRegistry.connect(user2).transferManufacturer(manufacturerId, user2.address, { 
                           value: transferFee 
                       })
                   ).to.be.revertedWith("Only entity owner can perform this action");
               })
           })

           describe("getManufacturer", function () {
               let manufacturerId;
               let timestamp;
               beforeEach(async function () {
                   // First add a manufacturer
                   const regFee = await mockRegistry.calculateRegistrationFee(testIpfsHash);
                   const tx = await mockRegistry.connect(user1).addManufacturer(testIpfsHash, { value: regFee });
                   const receipt = await tx.wait();
                   timestamp = (await hre.ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                   manufacturerId = BigInt(1);
               })

               it("Should return the correct manufacturer", async function () {
                   const manufacturer = await mockRegistry.getManufacturer(manufacturerId);
                   expect(manufacturer.owner).to.equal(user1.address);
                   expect(manufacturer.ipfsHash).to.equal(testIpfsHash);
                   expect(manufacturer.timestamp).to.equal(timestamp);
               })

               it("Should revert if manufacturer does not exist", async function () {
                   await expect(mockRegistry.getManufacturer(manufacturerId + BigInt(1))).to.be.revertedWith("Entity does not exist");
               })
           })

           describe("getMyManufacturers", function () {
               let manufacturerId;
               let timestamp;
               beforeEach(async function () {
                   // First add a manufacturer
                   const regFee = await mockRegistry.calculateRegistrationFee(testIpfsHash);
                   const tx = await mockRegistry.connect(user1).addManufacturer(testIpfsHash, { value: regFee });
                   const receipt = await tx.wait();
                   timestamp = (await hre.ethers.provider.getBlock(receipt.blockNumber)).timestamp;
                   manufacturerId = BigInt(1);
               })
               
               it("Should return the correct manufacturers for owner", async function () {
                   const manufacturers = await mockRegistry.connect(user1).getMyManufacturers();
                   expect(manufacturers.length).to.equal(1);
                   expect(manufacturers[0].owner).to.equal(user1.address);
                   expect(manufacturers[0].ipfsHash).to.equal(testIpfsHash);
                   expect(manufacturers[0].timestamp).to.equal(timestamp);
               })
               
               it("Should return empty array for address with no manufacturers", async function () {
                   const manufacturers = await mockRegistry.connect(user2).getMyManufacturers();
                   expect(manufacturers.length).to.equal(0);
               })
           })
        })
    })
})