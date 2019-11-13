const fs = require('fs');
const expect = require('chai').expect;
const utils = require('./lib/utils');
const mongo_utils = require('./lib/mongo-utils');
const db = mongo_utils.ArmadilloDB;
const mainchain = mongo_utils.ArmadilloMainchain;
const stateTracker = mongo_utils.ArmadilloStateTracker;
const firstBtcBlock = 8704;
const heightOfNoRskTags = firstBtcBlock + 0;
const heightOfConsecutiveRskTags = firstBtcBlock + 3;
const heightOfDistancedRskTags = firstBtcBlock + 5;
const apiPoolingTime = 1000;
const loadingTime = 700;
const rskBlockHeightsWithBtcBlock = utils.rskBlockHeightsWithBtcBlock();
const dataInputPath = "test/integration-tests/data/";
const consecutive2RskBlocks = "testInput_consecutive2RSKtags.json";
const consecutive3RskBlocks = "testInput_consecutive3RSKtags.json";
const jump3BtcBlocksToRskBlocks = "testInput_RskJumpOf3btcBlocks.json";

describe.only("Tests for mainchain only BTC RSK interaction, no forks", () => {
    it("should not generate any mainchain if BTC doesn't present RSK tags, end to end", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);

        await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
        //Validate no response in monitor for mainchain
        //Wait until the monitor can read the new block (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        await utils.getNextBlockInMockBTCApi();
        //Wait until the monitor can read the new block (pooling every 5s)
        await utils.sleep(apiPoolingTime + loadingTime);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
        await utils.validateMainchain(1000, 0);
    }).timeout(2 * 2 * apiPoolingTime);
    it("should not generate any mainchain if BTC doesn't present RSK tags, mongo input validation", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
        //Validate no response in monitor for mainchain
        //Wait until the monitor can read the new block (pooling every 5s)
        await utils.getNextBlockInMockBTCApi(apiPoolingTime);
        //Wait until the monitor can read the new block (pooling every 5s)
        await utils.sleep(apiPoolingTime + loadingTime);
        const mongoBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(mongoBlocks).to.be.an('array').that.is.empty;
    }).timeout(2 * 2 * apiPoolingTime);
    it("should generate a mainchain connection between 2 consecutive BTC blocks with RSK tags, end to end", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfConsecutiveRskTags);
        await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
        await utils.getNextBlockInMockBTCApi(apiPoolingTime);
        //Wait until the monitor can read the new block and process of getting 
        //the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime + loadingTime);
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
        await utils.validateMainchain(1000, 21);
    }).timeout(2 * 2 * apiPoolingTime);
    it.skip("should generate a mainchain connection between 2 consecutive BTC blocks with RSK tags, mongo input validation", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfConsecutiveRskTags);
        await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
        const blocksToAdvance = 1;
        for (let i = 0; i < blocksToAdvance; i++) {
            await utils.getNextBlockInMockBTCApi(apiPoolingTime);
        }
        //Wait until the monitor can read the new block and process of getting 
        //the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime + loadingTime);
        const mongoBlocks = await mongo_utils.findBlocks(db, mainchain);
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(mongoBlocks).to.be.an('array').that.is.not.empty;
        expect(mongoBlocks.length).to.be.equal(21);
        for (let block in mongoBlocks) {
            await utils.validateRskBlockNodeVsArmadilloMonitorMongoDB(mongoBlocks[block]);
            await utils.validateBtcBlockNodeVsArmadilloMonitorMongoDB(mongoBlocks[block], rskBlockHeightsWithBtcBlock);
        }
    }).timeout(2 * 2 * apiPoolingTime);
    it.skip("should generate a mainchain connection between 2 consecutive BTC blocks with RSK tags, mongo output validation", async () => {
        await mongo_utils.DeleteCollection(db, mainchain);
        await utils.sleep(loadingTime);
        const insertDataText = fs.readFileSync(dataInputPath + consecutive2RskBlocks);
        const insertDataJSON = JSON.parse(insertDataText);
        expect(insertDataJSON).to.be.an('array').that.is.not.empty;
        await mongo_utils.insertDocuments(db, mainchain, insertDataJSON);
        const mongoBlocks = await mongo_utils.findBlocks(db, mainchain);
        expect(mongoBlocks).to.be.an('array').that.is.not.empty;
        expect(mongoBlocks.length).to.be.equal(21);
        const mainchainResponse = await utils.getMainchainBlocks(1000);
        const blocks = mainchainResponse.data;
        expect(blocks).to.be.an('array').that.is.not.empty;
        expect(blocks.length).to.be.equal(21);
        expect(blocks).to.be.eql(mongoBlocks.reverse());
    });
    it("should generate a mainchain connection among 3 consecutive BTC blocks with RSK, end to end", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfConsecutiveRskTags);
        await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
        const blocksToAdvance = 2;
        for (let i = 0; i < blocksToAdvance; i++) {
            await utils.getNextBlockInMockBTCApi(apiPoolingTime);
        }
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime + loadingTime);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
        await utils.validateMainchain(1000, 41);
    }).timeout(3 * 2 * apiPoolingTime);
    it("should generate a mainchain connection among 3 consecutive BTC blocks with RSK, mongo input validation", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfConsecutiveRskTags);
        await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
        const blocksToAdvance = 2;
        for (let i = 0; i < blocksToAdvance; i++) {
            await utils.getNextBlockInMockBTCApi(apiPoolingTime);
        }
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime + loadingTime);
        const mongoBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(mongoBlocks).to.be.an('array').that.is.not.empty;
        expect(mongoBlocks.length).to.be.equal(41);
        for (let block in mongoBlocks) {
            utils.validateRskBlockNodeVsArmadilloMonitorMongoDB(mongoBlocks[block]);
            utils.validateBtcBlockNodeVsArmadilloMonitorMongoDB(mongoBlocks[block], rskBlockHeightsWithBtcBlock);
        }
    }).timeout(3 * 2 * apiPoolingTime);
    it("should generate a mainchain connection among 3 consecutive BTC blocks with RSK, mongo output validation", async () => {
        await mongo_utils.DeleteCollection(db, mainchain);
        await utils.sleep(loadingTime);
        const insertDataText = fs.readFileSync(dataInputPath + consecutive3RskBlocks);
        const insertDataJSON = JSON.parse(insertDataText);
        expect(insertDataJSON).to.be.an('array').that.is.not.empty;
        await mongo_utils.insertDocuments(db, mainchain, insertDataJSON);
        const mongoBlocks = await mongo_utils.findBlocks(db, mainchain);
        expect(mongoBlocks).to.be.an('array').that.is.not.empty;
        expect(mongoBlocks.length).to.be.equal(41);
        const mainchainResponse = await utils.getMainchainBlocks(1000);
        const blocks = mainchainResponse.data;
        expect(blocks).to.be.an('array').that.is.not.empty;
        expect(blocks.length).to.be.equal(41);
        expect(blocks).to.be.eql(mongoBlocks.reverse());
    });
    it("should generate a mainchain connection between 2 BTC blocks with RSK tags, separated by 3 without RSK tags, end to end", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfDistancedRskTags);
        await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
        const blocksToAdvance = 4;
        for (let i = 0; i < blocksToAdvance; i++) {
            await utils.getNextBlockInMockBTCApi(apiPoolingTime);
        }
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime + loadingTime);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
        await utils.validateMainchain(1000, 81);
    }).timeout(5 * 2 * apiPoolingTime);
    it.skip("should generate a mainchain connection between 2 BTC blocks with RSK tags, separated by 3 without RSK tags, mongo input validation", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfDistancedRskTags);//P5,H956
        await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
        const blocksToAdvance = 4;
        for (let i = 0; i < blocksToAdvance; i++) {
            await utils.getNextBlockInMockBTCApi(apiPoolingTime);
        }
        await utils.sleep(apiPoolingTime + loadingTime);
        const mongoBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(mongoBlocks).to.be.an('array').that.is.not.empty;
        expect(mongoBlocks.length).to.be.equal(81);
        for (let block in mongoBlocks) {
            utils.validateRskBlockNodeVsArmadilloMonitorMongoDB(mongoBlocks[block]);
            utils.validateBtcBlockNodeVsArmadilloMonitorMongoDB(mongoBlocks[block], rskBlockHeightsWithBtcBlock);
        }
    }).timeout(5 * 2 * apiPoolingTime);
    it.skip("should generate a mainchain connection between 2 BTC blocks with RSK tags, separated by 3 without RSK tags, mongo output validation", async () => {
        await mongo_utils.DeleteCollection(db, mainchain);
        await utils.sleep(loadingTime);
        const insertDataText = fs.readFileSync(dataInputPath + jump3BtcBlocksToRskBlocks);
        const insertDataJSON = JSON.parse(insertDataText);
        expect(insertDataJSON).to.be.an('array').that.is.not.empty;
        await mongo_utils.insertDocuments(db, mainchain, insertDataJSON);
        const mongoBlocks = await mongo_utils.findBlocks(db, mainchain);
        expect(mongoBlocks).to.be.an('array').that.is.not.empty;
        expect(mongoBlocks.length).to.be.equal(81);
        const mainchainResponse = await utils.getMainchainBlocks(1000);
        const blocks = mainchainResponse.data;
        expect(blocks).to.be.an('array').that.is.not.empty;
        expect(blocks.length).to.be.equal(81);
        expect(blocks).to.be.eql(mongoBlocks.reverse());
    });
});