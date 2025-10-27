const { expect } = require("chai");

   describe("Storage", function() {
     let storage;
     let owner;

     beforeEach(async function() {
       const Storage = await ethers.getContractFactory("Storage");
       storage = await Storage.deploy();
       [owner] = await ethers.getSigners();
     });

     it("Should store and retrieve a number", async function() {
       await storage.store(42);
       expect(await storage.retrieve()).to.equal(42);
     });

     it("Should emit event when storing number", async function() {
       await expect(storage.store(42))
         .to.emit(storage, "NumberChanged")
         .withArgs(42);
     });
   });