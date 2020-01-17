const expect = require('chai').expect;
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

describe.only("RSK no match at same height with matching CPV, RSK height in the past regarding BTC chain", () => {
    it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, full CPV match", async () => {
        assert.equal(utils.getLastRSKHeight(), bestRskBlock, "Please check test data, best block of RSK needs to be " + bestRskBlock);
        const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff, 1, 2000, apiPoolingTime, loadingTime);
        const lastForksResponse = await utils.getForksFromHeight(0);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
        await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
        await utils.validateMainchain(1000, 1);
    }).timeout(timeoutTests);
    it.skip("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 5 bytes CPV match", async () => {
        assert.equal(utils.getLastRSKHeight(), bestRskBlock, "Please check test data, best block of RSK needs to be " + bestRskBlock);
        const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff, 1, 2000, apiPoolingTime, loadingTime);
        const lastForksResponse = await utils.getForksFromHeight(0);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
        await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
        await utils.validateMainchain(1000, 1);
    }).timeout(timeoutTests);
    it.skip("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 0 bytes CPV match", async () => {
        assert.equal(utils.getLastRSKHeight(), bestRskBlock, "Please check test data, best block of RSK needs to be " + bestRskBlock);
        const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff, 1, 2000, apiPoolingTime, loadingTime);
        const lastForksResponse = await utils.getForksFromHeight(0);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
        await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
        await utils.validateMainchain(1000, 1);
    }).timeout(timeoutTests);
});