const expect = require('chai').expect;
const utils = require('./lib/utils');
const mongo_utils = require('./lib/mongo-utils');
const db = mongo_utils.ArmadilloDB;
const mainchain = mongo_utils.ArmadilloMainchain;
const stateTracker = mongo_utils.ArmadilloStateTracker;
const heightOfNoRskTags = 951;
const heightOfConsecutiveRskTags = 954;
const heightOfDistancedRskTags = 956;
const apiPoolingTime = 5000;
const loadingTime = 500;
const rskBlockHeightsWithBtcBlock = [450, 470, 490, 570, 650, 730]
describe("Tests for mainchain only BTC RSK interaction, no forks", () => {
    it("should not generate any mainchain if BTC doesn't present RSK tags, end to end", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        await mongo_utils.DeleteCollection(db, mainchain);
        await mongo_utils.DeleteCollection(db, stateTracker);
        //Validate no response in monitor for mainchain
        //Wait until the monitor can read the new block (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        await utils.getNextBlockInMockBTCApi();
        //Wait until the monitor can read the new block (pooling every 5s)
        await utils.sleep(apiPoolingTime+loadingTime);
        let mainchainResponse = await utils.getMainchainBlocks(1000);
        let blocks = mainchainResponse.blocks;
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(blocks).to.be.an('array').that.is.empty;
    }).timeout(2 * 2 * apiPoolingTime);
    it("should not generate any mainchain if BTC doesn't present RSK tags, mongo input validation", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        await mongo_utils.DeleteCollection(db, mainchain);
        await mongo_utils.DeleteCollection(db, stateTracker);
        //Validate no response in monitor for mainchain
        //Wait until the monitor can read the new block (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        await utils.getNextBlockInMockBTCApi();
        //Wait until the monitor can read the new block (pooling every 5s)
        await utils.sleep(apiPoolingTime+loadingTime);

        let mongoBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(mongoBlocks).to.be.an('array').that.is.empty;
    }).timeout(2 * 2 * apiPoolingTime);
    it("should generate a mainchain connection between 2 consecutive BTC blocks with RSK tags, end to end", async () => {
        let step = 1;
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfConsecutiveRskTags);
        await mongo_utils.DeleteCollection(db, mainchain);
        await mongo_utils.DeleteCollection(db, stateTracker);
        // TODO: Review if armadillo monitor has to be restarted
        await utils.sleep(apiPoolingTime);//Wait until the monitor can read the new block (pooling every 5s)
        await utils.getNextBlockInMockBTCApi();
        //Wait until the monitor can read the new block and process of getting 
        //the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime+loadingTime);
        let mainchainResponse = await utils.getMainchainBlocks(1000);
        let blocks = mainchainResponse.blocks;
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(blocks).to.be.an('array').that.is.not.empty;
        expect(blocks.length).to.be.equal(21);
        for (let block in blocks) {
            utils.validateRskBlockNodeVsArmadilloMonitor(blocks[block]);
            utils.validateBtcBlockNodeVsArmadilloMonitor(blocks[block], rskBlockHeightsWithBtcBlock);
        }
    }).timeout(2 * 2 * apiPoolingTime);
    it("should generate a mainchain connection between 2 consecutive BTC blocks with RSK tags, mongo input validation", async () => {
        let step = 1;
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfConsecutiveRskTags);
        await mongo_utils.DeleteCollection(db, mainchain);
        await mongo_utils.DeleteCollection(db, stateTracker);
        // TODO: Review if armadillo monitor has to be restarted
        await utils.sleep(apiPoolingTime);//Wait until the monitor can read the new block (pooling every 5s)
        await utils.getNextBlockInMockBTCApi();
        //Wait until the monitor can read the new block and process of getting 
        //the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime+loadingTime);
        let mongoBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(mongoBlocks).to.be.an('array').that.is.not.empty;
        expect(mongoBlocks.length).to.be.equal(21);
        for (let block in mongoBlocks) {
            utils.validateRskBlockNodeVsArmadilloMonitorMongoDB(mongoBlocks[block]);
            utils.validateBtcBlockNodeVsArmadilloMonitorMongoDB(mongoBlocks[block], rskBlockHeightsWithBtcBlock);
        }
    }).timeout(2 * 2 * apiPoolingTime);
    it("should generate a mainchain connection among 3 consecutive BTC blocks with RSK, end to end", async () => {
        let step = 1;
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfConsecutiveRskTags);
        await mongo_utils.DeleteCollection(db, mainchain);
        await mongo_utils.DeleteCollection(db, stateTracker);
        await utils.sleep(apiPoolingTime);//Wait until the monitor can read the new block (pooling every 5s)
        await utils.getNextBlockInMockBTCApi();
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        await utils.getNextBlockInMockBTCApi();
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime+loadingTime);
        let mainchainResponse = await utils.getMainchainBlocks(100);
        let blocks = mainchainResponse.blocks;
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(blocks).to.be.an('array').that.is.not.empty;
        expect(blocks.length).to.be.equal(41);
        for (let block in blocks) {

            utils.validateRskBlockNodeVsArmadilloMonitor(blocks[block]);
            utils.validateBtcBlockNodeVsArmadilloMonitor(blocks[block], rskBlockHeightsWithBtcBlock);
        }

    }).timeout(3 * 2 * apiPoolingTime);
    it("should generate a mainchain connection among 3 consecutive BTC blocks with RSK, mongo input validation", async () => {
        let step = 1;
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfConsecutiveRskTags);
        await mongo_utils.DeleteCollection(db, mainchain);
        await mongo_utils.DeleteCollection(db, stateTracker);
        await utils.sleep(apiPoolingTime);//Wait until the monitor can read the new block (pooling every 5s)
        await utils.getNextBlockInMockBTCApi();
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        await utils.getNextBlockInMockBTCApi();
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime+loadingTime);
        let mongoBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(mongoBlocks).to.be.an('array').that.is.not.empty;
        expect(mongoBlocks.length).to.be.equal(41);
        for (let block in mongoBlocks) {
            utils.validateRskBlockNodeVsArmadilloMonitorMongoDB(mongoBlocks[block]);
            utils.validateBtcBlockNodeVsArmadilloMonitorMongoDB(mongoBlocks[block], rskBlockHeightsWithBtcBlock);
        }
    }).timeout(3 * 2 * apiPoolingTime);
    it("should generate a mainchain connection between 2 BTC blocks with RSK tags, separated by 3 without RSK tags, end to end", async () => {
        let step = 1;
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfDistancedRskTags);//P5,H956
        await mongo_utils.DeleteCollection(db, mainchain);
        await mongo_utils.DeleteCollection(db, stateTracker);
        await utils.sleep(apiPoolingTime);//Wait until the monitor can read the new block (pooling every 5s)
        await utils.getNextBlockInMockBTCApi();//P6,H957
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        await utils.getNextBlockInMockBTCApi();//P7,H958
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        await utils.getNextBlockInMockBTCApi();//P8,H959
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        await utils.getNextBlockInMockBTCApi();//P9,H960
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime+loadingTime);
        let mainchainResponse = await utils.getMainchainBlocks(100);
        let blocks = mainchainResponse.blocks;
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(blocks).to.be.an('array').that.is.not.empty;
        expect(blocks.length).to.be.equal(81);
        for (let block in blocks) {
            utils.validateRskBlockNodeVsArmadilloMonitor(blocks[block]);
            utils.validateBtcBlockNodeVsArmadilloMonitor(blocks[block], rskBlockHeightsWithBtcBlock);
        }
    }).timeout(5 * 2 * apiPoolingTime);
    it("should generate a mainchain connection between 2 BTC blocks with RSK tags, separated by 3 without RSK tags, mongo input validation", async () => {
        let step = 1;
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfDistancedRskTags);//P5,H956
        await mongo_utils.DeleteCollection(db, mainchain);
        await mongo_utils.DeleteCollection(db, stateTracker);
        await utils.sleep(apiPoolingTime);//Wait until the monitor can read the new block (pooling every 5s)
        await utils.getNextBlockInMockBTCApi();//P6,H957
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        await utils.getNextBlockInMockBTCApi();//P7,H958
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        await utils.getNextBlockInMockBTCApi();//P8,H959
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        await utils.getNextBlockInMockBTCApi();//P9,H960
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime+loadingTime);
        let mongoBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(mongoBlocks).to.be.an('array').that.is.not.empty;
        expect(mongoBlocks.length).to.be.equal(81);
        for (let block in mongoBlocks) {
            utils.validateRskBlockNodeVsArmadilloMonitorMongoDB(mongoBlocks[block]);
            utils.validateBtcBlockNodeVsArmadilloMonitorMongoDB(mongoBlocks[block], rskBlockHeightsWithBtcBlock);
        }
    }).timeout(5 * 2 * apiPoolingTime);
});



