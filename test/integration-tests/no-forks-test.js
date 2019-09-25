const expect = require('chai').expect;
const utils = require('./lib/utils');
const db = utils.ArmadilloDB;
const mainchain = utils.ArmadilloMainchain
const heightOfNoRskTags = 951;
const heightOfConsecutiveRskTags = 954;
const heightOfDistancedRskTags = 956;
const apiPoolingTime = 500 + 100;

describe("Tests for mainchain only BTC RSK interaction, no forks", () => {
    it.skip("should not generate any mainchain if BTC doesn't present RSK tags", async () => {
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHightInMockBTCApi(heightOfNoRskTags);
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
        await utils.setHightInMockBTCApi(heightOfNoRskTags);
        expect(blocks).to.be.an('array').that.is.empty;
    }).timeout(12000);
    it("should generate a mainchain connection between 2 consecutive BTC blocks with RSK tags", async () => {
        let step = 1;
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHightInMockBTCApi(heightOfConsecutiveRskTags);
        await utils.DeleteCollection(db, mainchain);
        // TODO: Review if armadillo monitor has to be restarted
        await utils.sleep(apiPoolingTime);//Wait until the monitor can read the new block (pooling every 5s)
        await utils.getNextBlockInMockBTCApi();
        //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
        await utils.sleep(apiPoolingTime);
        let mainchainResponse = await utils.getMainchainBlocks(30);
        let blocks = mainchainResponse.blocks;
        //Reset to original height
        await utils.setHightInMockBTCApi(heightOfNoRskTags);
        expect(blocks).to.be.an('array').that.is.not.empty;
        expect(blocks.length).to.be.equal(21);
        //Missing blocks validations: Blocks with BTC info that has correct information in the right heights, 
        //blocks in the middle of RSK doesn't have BTC info whatsoever (null values)
    }).timeout(20000);
    it("should generate a mainchain connection among 3 consecutive BTC blocks with RSK", async () => {
        let step = 1;
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHightInMockBTCApi(heightOfConsecutiveRskTags);
        await utils.DeleteCollection(db, mainchain);
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
        await utils.setHightInMockBTCApi(heightOfNoRskTags);
        expect(blocks).to.be.an('array').that.is.not.empty;
        expect(blocks.length).to.be.equal(41);
        //Missing blocks validations: Blocks with BTC info that has correct information in the right heights, 
        //blocks in the middle of RSK doesn't have BTC info whatsoever (null values)
        
    }).timeout(30000);
    it("should generate a mainchain connection between 2 BTC blocks with RSK tags, separated by 3 without RSK tags", async () => {
        let step = 1;
        await utils.MockBtcApiChangeRoute("raw");
        await utils.setHightInMockBTCApi(heightOfDistancedRskTags);//P5,H956
        console.log("P5,H956");
        await utils.DeleteCollection(db, mainchain);
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
        expect(blocks).to.be.an('array').that.is.not.empty;
        expect(blocks.length).to.be.equal(81);
        //Reset to original height
        await utils.setHightInMockBTCApi(heightOfNoRskTags);
        //Missing blocks validations: Blocks with BTC info that has correct information in the right heights, 
        //blocks in the middle of RSK doesn't have BTC info whatsoever (null values)
        
    }).timeout(60000);
});



