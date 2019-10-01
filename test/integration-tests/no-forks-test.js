const expect = require('chai').expect;
const utils = require('./lib/utils');
const mongo_utils = require('./lib/mongo-utils');
const db = mongo_utils.ArmadilloDB;
const mainchain = mongo_utils.ArmadilloMainchain
const heightOfNoRskTags = 951;
const heightOfConsecutiveRskTags = 954;
const heightOfDistancedRskTags = 956;
const apiPoolingTime = 5000 + 100;

describe("Tests for mainchain only BTC RSK interaction, no forks", () => {
    it.skip("should not generate any mainchain if BTC doesn't present RSK tags", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        await utils.DeleteCollection(db, mainchain);
        // TODO: Review if armadillo monitor has to be restarted
        //Validate no response in monitor for mainchain
        //Wait until the monitor can read the new block (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        await utils.getNextBlockInMockBTCApi();
        //Wait until the monitor can read the new block (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        let mainchainResponse = await utils.getMainchainBlocks(20);
        let blocks = mainchainResponse.blocks;
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(blocks).to.be.an('array').that.is.empty;
    }).timeout(12000);
    it("should generate a mainchain connection between 2 consecutive BTC blocks with RSK tags", async () => {
        let step = 1;
        await utils.MockBtcApiChangeRoute("raw");
        await mongo_utils.DeleteCollection(db, mainchain);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        await utils.sleep(apiPoolingTime);//Wait until the monitor can read the new block (pooling every 5s)
        await utils.getNextBlockInMockBTCApi();
        await utils.sleep(apiPoolingTime);//Wait until the monitor can read the new block (pooling every 5s)
        await utils.getNextBlockInMockBTCApi();
        await utils.sleep(apiPoolingTime);//Wait until the monitor can read the new block (pooling every 5s)
        await utils.getNextBlockInMockBTCApi();

        // TODO: Review if armadillo monitor has to be restarted
        await utils.sleep(apiPoolingTime);//Wait until the monitor can read the new block (pooling every 5s)
        await utils.getNextBlockInMockBTCApi();
        //Wait until the monitor can read the new block and process of getting 
        //the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        let mainchainResponse = await utils.getMainchainBlocks(1000);
        let blocks = mainchainResponse.blocks;
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(blocks).to.be.an('array').that.is.not.empty;
        // utils.validateRskBlockNodeVsArmadilloMonitor(blocks[0]);
        expect(blocks.length).to.be.equal(21);
        for (let block in blocks) {
            rskBlockHeightsWithBtcBlock = [
                450,
                470,
                490,
                570,
                650,
                730
            ]
            utils.validateRskBlockNodeVsArmadilloMonitor(blocks[block]);
            utils.validateBtcBlockNodeVsArmadilloMonitor(blocks[block],rskBlockHeightsWithBtcBlock);
        }
        //Missing blocks validations: Blocks with BTC info that has correct information in the right heights, 
        //blocks in the middle of RSK doesn't have BTC info whatsoever (null values)
    }).timeout(200000);
    it("should generate a mainchain connection among 3 consecutive BTC blocks with RSK", async () => {
        let step = 1;
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfConsecutiveRskTags);
        await mongo_utils.DeleteCollection(db, mainchain);
        // TODO: Review if armadillo monitor has to be restarted
        await utils.sleep(apiPoolingTime);//Wait until the monitor can read the new block (pooling every 5s)
        await utils.getNextBlockInMockBTCApi();
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        await utils.getNextBlockInMockBTCApi();
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        let mainchainResponse = await utils.getMainchainBlocks(100);
        let blocks = mainchainResponse.blocks;
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(blocks).to.be.an('array').that.is.not.empty;
        expect(blocks.length).to.be.equal(41);
        //Missing blocks validations: Blocks with BTC info that has correct information in the right heights, 
        //blocks in the middle of RSK doesn't have BTC info whatsoever (null values)
        for (let block in blocks) {
            rskBlockHeightsWithBtcBlock = [
                450,
                470,
                490,
                570,
                650,
                730
            ]
            utils.validateRskBlockNodeVsArmadilloMonitor(blocks[block]);
            utils.validateBtcBlockNodeVsArmadilloMonitor(blocks[block],rskBlockHeightsWithBtcBlock);
        }

    }).timeout(30000);
    it("should generate a mainchain connection between 2 BTC blocks with RSK tags, separated by 3 without RSK tags", async () => {
        let step = 1;
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHeightInMockBTCApi(heightOfDistancedRskTags);//P5,H956
        console.log("P5,H956");
        await mongo_utils.DeleteCollection(db, mainchain);
        // TODO: Review if armadillo monitor has to be restarted
        await utils.sleep(apiPoolingTime);//Wait until the monitor can read the new block (pooling every 5s)
        await utils.getNextBlockInMockBTCApi();//P6,H957
        console.log("P6,H957");
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        await utils.getNextBlockInMockBTCApi();//P7,H958
        console.log("P7,H958");
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        await utils.getNextBlockInMockBTCApi();//P8,H959
        console.log("P8,H959");
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        await utils.getNextBlockInMockBTCApi();//P9,H960
        console.log("P9,H960");
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        let mainchainResponse = await utils.getMainchainBlocks(100);
        let blocks = mainchainResponse.blocks;
        //Reset to original height
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(blocks).to.be.an('array').that.is.not.empty;
        expect(blocks.length).to.be.equal(81);
        for (let block in blocks) {
            rskBlockHeightsWithBtcBlock = [
                450,
                470,
                490,
                570,
                650,
                730
            ]
            utils.validateRskBlockNodeVsArmadilloMonitor(blocks[block]);
            utils.validateBtcBlockNodeVsArmadilloMonitor(blocks[block],rskBlockHeightsWithBtcBlock);
        }
        //Missing blocks validations: Blocks with BTC info that has correct information in the right heights, 
        //blocks in the middle of RSK doesn't have BTC info whatsoever (null values)    
    }).timeout(60000);
});



