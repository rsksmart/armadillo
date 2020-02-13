const expect = require('chai').expect;
const assert = require('chai').assert;
const utils = require('./lib/utils');
const mongo_utils = require('./lib/mongo-utils');
const rskBlockHeightsWithBtcBlock = utils.rskBlockHeightsWithBtcBlock();
const timeoutTests = utils.timeoutTests;
const btcApiRoute = "raw";
const apiPoolingTime = utils.apiPoolingTime;
const loadingTime = utils.loadingTime;
const firstBtcBlock = 8704;
const bestRskBlock = 7490;
const amountOfMainchainBlocksInFork = 2;
const heightOfNoRskTags = firstBtcBlock + 0;
const heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff = firstBtcBlock + 129;
const heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff = firstBtcBlock + 133;

const heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff = firstBtcBlock + 135;
describe("RSK Forks in the future tests", () => {
    describe("RSK no match at same height with matching CPV, RSK height in the future regarding BTC chain, end to end", () => {
        it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, full CPV match", async () => {
            assert.equal(await utils.getLastRSKHeight(utils.context), bestRskBlock, "Please check test data, best block of RSK needs to be " + bestRskBlock);
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff, 1, 2000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
            await utils.validateMainchain(1000, 1);
        }).timeout(timeoutTests);
        it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 5 bytes CPV match", async () => {
            assert.equal(await utils.getLastRSKHeight(utils.context), bestRskBlock, "Please check test data, best block of RSK needs to be " + bestRskBlock);
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff, 1, 2000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
            await utils.validateMainchain(1000, 1);
        }).timeout(timeoutTests);
        it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 0 bytes CPV match", async () => {
            assert.equal(await utils.getLastRSKHeight(utils.context), bestRskBlock, "Please check test data, best block of RSK needs to be " + bestRskBlock);
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff, 1, 2000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
            await utils.validateMainchain(1000, 1);
        }).timeout(timeoutTests);
    });
    describe("RSK no match at same height with matching CPV, RSK height in the future regarding BTC chain, mongo input validation", () => {
        it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, full CPV match, mongo input validation", async () => {
            assert.equal(await utils.getLastRSKHeight(utils.context), bestRskBlock, "Please check test data, best block of RSK needs to be " + bestRskBlock);
            const dbForks = await utils.getDBForksAfterMovingXBlocks(btcApiRoute, heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff, 1, 2000, apiPoolingTime, loadingTime);
            const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            await utils.validateForksRskBlockMongoDB(dbForks, [1]);
            await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
        }).timeout(timeoutTests);
        it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 5 bytes CPV match, mongo input validation", async () => {
            assert.equal(await utils.getLastRSKHeight(utils.context), bestRskBlock, "Please check test data, best block of RSK needs to be " + bestRskBlock);
            const dbForks = await utils.getDBForksAfterMovingXBlocks(btcApiRoute, heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff, 1, 2000, apiPoolingTime, loadingTime);
            const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            await utils.validateForksRskBlockMongoDB(dbForks, [1]);
            let btcStart = heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff - firstBtcBlock;
            let btcEnd = btcStart + 1;
            await utils.validateMainchainRskMongoDB(mainchainBlocks, 1, btcStart, btcEnd);
        }).timeout(timeoutTests);
        it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 0 bytes CPV match, mongo input validation", async () => {
            assert.equal(await utils.getLastRSKHeight(utils.context), bestRskBlock, "Please check test data, best block of RSK needs to be " + bestRskBlock);
            const dbForks = await utils.getDBForksAfterMovingXBlocks(btcApiRoute, heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff, 1, 2000, apiPoolingTime, loadingTime);
            const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            await utils.validateForksRskBlockMongoDB(dbForks, [1]);
            await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
        }).timeout(timeoutTests);
    });

});