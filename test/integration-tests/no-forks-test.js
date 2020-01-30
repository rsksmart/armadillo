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
const rskheightOfConsecutiveRskTags = 470;
const heightOfDistancedRskTags = firstBtcBlock + 5;
const heightForSiblingRskTag = firstBtcBlock + 137;
const rskHeightWithSibling = 6480;
const apiPoolingTime = utils.apiPoolingTime;
const loadingTime = utils.loadingTime;
const rskBlockHeightsWithBtcBlock = utils.rskBlockHeightsWithBtcBlock();
const dataInputPath = "test/integration-tests/data/";
const consecutive2RskBlocks = "testInput_consecutive2RSKtags.json";
const consecutive3RskBlocks = "testInput_consecutive3RSKtags.json";
const jump3BtcBlocksToRskBlocks = "testInput_RskJumpOf3btcBlocks.json";
const timeoutTests = utils.timeoutTests;
describe("Tests for mainchain only BTC RSK interaction, no forks", () => {
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
        
    }).timeout(timeoutTests);
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
    }).timeout(timeoutTests);
    it("should generate a mainchain connection between 2 consecutive BTC blocks with RSK tags, end to end", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfConsecutiveRskTags);
        await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
        await utils.setBlockAsLastChecked(heightOfConsecutiveRskTags - 1);
        await utils.getNextBlockInMockBTCApi();
        //Wait until the monitor can read the new block and process of getting 
        //the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime + loadingTime);
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
        await utils.validateMainchain(1000, 21);
    }).timeout(timeoutTests);
    it("should generate a mainchain connection between 2 consecutive BTC blocks with RSK tags, mongo input validation", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfConsecutiveRskTags);
        await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
        await utils.setBlockAsLastChecked(heightOfConsecutiveRskTags - 1);
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

    }).timeout(timeoutTests);
    it("should generate a mainchain connection between 2 consecutive BTC blocks with RSK tags, mongo output validation", async () => {
        await mongo_utils.DeleteDB(db, mainchain);
        await utils.sleep(loadingTime);
        const consecutive2RskBlocks = "testInput_consecutive2RSKtags.json";
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
    it("should generate a mainchain connection among 3 consecutive BTC blocks with RSK tags, end to end", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfConsecutiveRskTags);
        await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
        await utils.setBlockAsLastChecked(heightOfConsecutiveRskTags - 1);
        const blocksToAdvance = 2;
        for (let i = 0; i < blocksToAdvance; i++) {
            await utils.getNextBlockInMockBTCApi(apiPoolingTime);
        }
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(10000);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
        await utils.validateMainchain(1000, 41);
    }).timeout(timeoutTests);
    it("should generate a mainchain connection among 3 consecutive BTC blocks with RSK, mongo input validation", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfConsecutiveRskTags);
        await utils.setBlockAsLastChecked(heightOfConsecutiveRskTags - 1);
        await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
        const blocksToAdvance = 2;
        for (let i = 0; i < blocksToAdvance; i++) {
            await utils.getNextBlockInMockBTCApi(apiPoolingTime);
        }
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(10000);
        const mongoBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(mongoBlocks).to.be.an('array').that.is.not.empty;
        expect(mongoBlocks.length).to.be.equal(41);
        for (let block in mongoBlocks) {
            utils.validateRskBlockNodeVsArmadilloMonitorMongoDB(mongoBlocks[block]);
            utils.validateBtcBlockNodeVsArmadilloMonitorMongoDB(mongoBlocks[block], rskBlockHeightsWithBtcBlock);
        }
    }).timeout(timeoutTests);
    it("should generate a mainchain connection among 3 consecutive BTC blocks with RSK, mongo output validation", async () => {
        await mongo_utils.DeleteDB(db);
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
        await utils.setBlockAsLastChecked(heightOfDistancedRskTags - 1);
        const blocksToAdvance = 4;
        for (let i = 0; i < blocksToAdvance; i++) {
            await utils.getNextBlockInMockBTCApi(apiPoolingTime);
        }
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime + loadingTime);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
        await utils.validateMainchain(1000, 81);
    }).timeout(timeoutTests);
    it("should generate a mainchain connection between 2 BTC blocks with RSK tags, separated by 3 without RSK tags, mongo input validation", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfDistancedRskTags);//P5,H956
        await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
        await utils.setBlockAsLastChecked(heightOfDistancedRskTags - 1);
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
    }).timeout(timeoutTests);

    it("should generate a mainchain connection between 2 BTC blocks with RSK tags, separated by 3 without RSK tags, mongo output validation", async () => {
        await mongo_utils.DeleteDB(db, mainchain);
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
    it("should generate a mainchain connection between 2 BTC blocks with RSK tags, second RSK tag is of a sibling block, end to end", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightForSiblingRskTag);
        await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
        await utils.setBlockAsLastChecked(heightForSiblingRskTag - 1);
        const blocksToAdvance = 1;
        for (let i = 0; i < blocksToAdvance; i++) {
            await utils.getNextBlockInMockBTCApi(apiPoolingTime);
        }
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime + loadingTime);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
        await utils.validateMainchain(2, 11);
        await utils.validateMainchain(100, 11);
    }).timeout(timeoutTests);

    it("should generate a mainchain connection between 3 BTC blocks with RSK tags, reorganization happens on second btc checkpoint, end to end", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfConsecutiveRskTags);
        await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
        await utils.setBlockAsLastChecked(heightOfConsecutiveRskTags - 1);
        await utils.sleep(apiPoolingTime + loadingTime);
        await utils.getNextBlockInMockBTCApi(apiPoolingTime);
        await utils.sleep(loadingTime);
        const reorgBlockInfo = await utils.fakeMainchainBlock(rskheightOfConsecutiveRskTags, true);
        await utils.getNextBlockInMockBTCApi(apiPoolingTime);
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(loadingTime+apiPoolingTime);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
        let reorgBlocks = {};
        reorgBlocks[reorgBlockInfo.rskInfo.height] = reorgBlockInfo;
        await utils.validateMainchain(2, 41, reorgBlocks);
        await utils.validateMainchain(100, 41, reorgBlocks);
    }).timeout(timeoutTests);

    it("should generate a mainchain connection between 3 BTC blocks with RSK tags, reorganization happens on second btc checkpoint and 2 previous rsk blocks, end to end", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfConsecutiveRskTags);
        await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
        await utils.setBlockAsLastChecked(heightOfConsecutiveRskTags - 1);
        await utils.sleep(apiPoolingTime + loadingTime);
        await utils.getNextBlockInMockBTCApi(apiPoolingTime);
        await utils.sleep(loadingTime);
        let reorgBlocks = {};
        let reorgBlockInfo = await utils.fakeMainchainBlock(rskheightOfConsecutiveRskTags, true);
        reorgBlocks[reorgBlockInfo.rskInfo.height] = reorgBlockInfo;
        reorgBlockInfo = await utils.fakeMainchainBlock(rskheightOfConsecutiveRskTags-1, true);
        reorgBlocks[reorgBlockInfo.rskInfo.height] = reorgBlockInfo;
        reorgBlockInfo = await utils.fakeMainchainBlock(rskheightOfConsecutiveRskTags-2, true);
        reorgBlocks[reorgBlockInfo.rskInfo.height] = reorgBlockInfo;
        await utils.getNextBlockInMockBTCApi(apiPoolingTime);
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(loadingTime+apiPoolingTime);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
        await utils.validateMainchain(2, 41, reorgBlocks);
        await utils.validateMainchain(100, 41, reorgBlocks);
    }).timeout(timeoutTests);

    it("should generate a mainchain connection between 3 BTC blocks with RSK tags, reorganization happens on second btc checkpoint, it goes as a sibling, end to end", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightForSiblingRskTag);
        await mongo_utils.DeleteDB(mongo_utils.ArmadilloDB);
        await utils.setBlockAsLastChecked(heightForSiblingRskTag - 1);
        await utils.sleep(apiPoolingTime + loadingTime);
        await utils.getNextBlockInMockBTCApi(apiPoolingTime);
        await utils.sleep(loadingTime);
        const reorgBlockInfo = await utils.fakeMainchainBlock(rskHeightWithSibling, true);
        await utils.getNextBlockInMockBTCApi(apiPoolingTime);
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(loadingTime+apiPoolingTime);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
        let reorgBlocks = {};
        reorgBlocks[reorgBlockInfo.rskInfo.height] = reorgBlockInfo;
        await utils.validateMainchain(2, 41, reorgBlocks);
        await utils.validateMainchain(100, 41, reorgBlocks);
    }).timeout(timeoutTests);
});