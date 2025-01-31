const { expect } = require("chai");
const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("BaseRegistry", function () {
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
  });

  it("Should not allow deployment by itself", async function () {
    const BaseRegistry = await hre.ethers.getContractFactory("BaseRegistry");
    await expect(
      BaseRegistry.connect(owner).deploy(owner.address)
    ).to.be.revertedWith("BaseRegistry cannot be deployed directly");
  });

  describe("Mock Implementation Tests", function () {
    beforeEach(async function () {
      // Deploy the mock implementation
      const MockBaseRegistry = await hre.ethers.getContractFactory("MockBaseRegistry");
      mockRegistry = await MockBaseRegistry.deploy(feeCollector.address);
    });

    describe("Constructor", function () {
      it("Should set the fee collector correctly", async function () {
        expect(await mockRegistry.feeCollector()).to.equal(feeCollector.address);
      });

      it("Should revert if fee collector is zero address", async function () {
        const MockBaseRegistry = await hre.ethers.getContractFactory("MockBaseRegistry");
        await expect(
          MockBaseRegistry.deploy(hre.ethers.ZeroAddress)
        ).to.be.revertedWith("Fee collector cannot be zero address");
      });
    });

    describe("Entity Management", function () {
      const testIpfsHash = "QmTest123";

      it("Should add an entity correctly", async function () {
        const fee = await mockRegistry.calculateRegistrationFee(testIpfsHash);
        
        await expect(
          mockRegistry.connect(user1).exposed_addEntity(testIpfsHash, { value: fee })
        )
          .to.emit(mockRegistry, "EntityAdded")
          .withArgs(BigInt(1), user1.address, testIpfsHash)
          .and.to.emit(mockRegistry, "FeeCollected")
          .withArgs(user1.address, fee, "registration");
      });

      it("Should revert if fee is insufficient", async function () {
        const fee = await mockRegistry.calculateRegistrationFee(testIpfsHash);
        
        await expect(
          mockRegistry.connect(user1).exposed_addEntity(testIpfsHash, { 
            value: fee - BigInt(1)
          })
        ).to.be.revertedWith("Insufficient fee");
      });

      it("Should transfer entity correctly", async function () {
        // First create an entity
        const regFee = await mockRegistry.calculateRegistrationFee(testIpfsHash);
        await mockRegistry.connect(user1).exposed_addEntity(testIpfsHash, { 
          value: regFee 
        });

        // Then transfer it
        const transferFee = await mockRegistry.transferFee();
        
        await expect(
          mockRegistry.connect(user1).exposed_transferEntity(BigInt(1), user2.address, {
            value: transferFee,
          })
        )
          .to.emit(mockRegistry, "EntityTransferred")
          .withArgs(BigInt(1), user1.address, user2.address)
          .and.to.emit(mockRegistry, "FeeCollected")
          .withArgs(user1.address, transferFee, "transfer");
      });

      it("Should revert unauthorized transfer", async function () {
        const regFee = await mockRegistry.calculateRegistrationFee(testIpfsHash);
        await mockRegistry.connect(user1).exposed_addEntity(testIpfsHash, { 
          value: regFee 
        });

        const transferFee = await mockRegistry.transferFee();
        
        await expect(
          mockRegistry.connect(user2).exposed_transferEntity(BigInt(1), user2.address, {
            value: transferFee,
          })
        ).to.be.revertedWith("Only entity owner can perform this action");
      });

      it("Should revert transfer to zero address", async function () {
        const regFee = await mockRegistry.calculateRegistrationFee(testIpfsHash);
        await mockRegistry.connect(user1).exposed_addEntity(testIpfsHash, { 
          value: regFee 
        });

        const transferFee = await mockRegistry.transferFee();
        
        await expect(
          mockRegistry.connect(user1).exposed_transferEntity(BigInt(1), hre.ethers.ZeroAddress, {
            value: transferFee,
          })
        ).to.be.revertedWith("Invalid new owner address");
      });
    });

    describe("Fee Calculations", function () {
      it("Should calculate registration fee correctly", async function () {
        const ipfsHash = "QmTest123";
        const baseFee = await mockRegistry.baseRegistrationFee();
        const perByteFee = await mockRegistry.perByteRegistrationFee();
        const expectedFee = baseFee + (perByteFee * BigInt(Buffer.from(ipfsHash).length));

        const calculatedFee = await mockRegistry.calculateRegistrationFee(ipfsHash);
        expect(calculatedFee).to.equal(expectedFee);
      });

      it("Should revert on empty IPFS hash", async function () {
        const fee = await mockRegistry.baseRegistrationFee();
        await expect(
          mockRegistry.connect(user1).exposed_addEntity("", { value: fee })
        ).to.be.revertedWith("IPFS hash cannot be empty");
      });
    });

    describe("IPFS Hash Validation", function () {
      it("Should validate correct IPFS hash", async function () {
        const validHash = "QmTest123";
        expect(await mockRegistry.exposed_validateIpfsHash(validHash)).to.be.true;
      });

      it("Should revert on empty IPFS hash", async function () {
        await expect(
          mockRegistry.exposed_validateIpfsHash("")
        ).to.be.revertedWith("IPFS hash cannot be empty");
      });
    });
  });
});