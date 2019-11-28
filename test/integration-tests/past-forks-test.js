const expect = require('chai').expect;
const utils = require('./lib/utils');
const mongo_utils = require('./lib/mongo-utils');
const rskBlockHeightsWithBtcBlock = utils.rskBlockHeightsWithBtcBlock();
const firstBtcBlock = 8704;
const amountOfMainchainBlocksInFork = 2;
const heightOfNoRskTags = firstBtcBlock + 0;
const heightOfConsecutiveRSKnoMatchPastSameBranch = firstBtcBlock + 92;
const heightOfNonConsecutiveRSKnoMatchPastSameBranch = firstBtcBlock + 97;
const heightOfConsecutiveRSKnoMatchPastDiffBranch = firstBtcBlock + 115;
const heightOfNonConsecutiveRSKnoMatchPastDiffBranch = firstBtcBlock + 119;
const heightOfConsecutiveRSKnoMatchPastFollowingMatch = firstBtcBlock + 95;
const heightOfNonConsecutiveRSKnoMatchPastFollowingMatch = firstBtcBlock + 107;
const timeoutTests = utils.timeoutTests;
const btcApiRoute = "raw";
const apiPoolingTime = utils.apiPoolingTime;
const loadingTime = utils.loadingTime;

describe("RSK no match at same height with matching CPV, RSK height in the past regarding BTC chain", () => {
    it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found", async () => {
        const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
            btcApiRoute, heightOfConsecutiveRSKnoMatchPastSameBranch, 1, 2000, apiPoolingTime, loadingTime);
        const lastForksResponse = await utils.getForksFromHeight(0);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
        await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
        await utils.validateMainchain(1000, 1);
    }).timeout(timeoutTests);
    it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following consecutive BTC block", async () => {
        const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
            btcApiRoute, heightOfConsecutiveRSKnoMatchPastSameBranch, 2, 2000, apiPoolingTime, loadingTime);
        const lastForksResponse = await utils.getForksFromHeight(0);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
        await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [2]);
        await utils.validateMainchain(1000, 1);
    }).timeout(timeoutTests);
    it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following non consecutive BTC block", async () => {
        const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
            btcApiRoute, heightOfNonConsecutiveRSKnoMatchPastSameBranch, 3, 2000, apiPoolingTime, loadingTime);
        const lastForksResponse = await utils.getForksFromHeight(0);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
        await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
        await utils.validateMainchain(1000, 1);
    }).timeout(timeoutTests);
    it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following consecutive BTC block", async () => {
        const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
            btcApiRoute, heightOfConsecutiveRSKnoMatchPastDiffBranch, 2, 2000, apiPoolingTime, loadingTime);
        const lastForksResponse = await utils.getForksFromHeight(0);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
        await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1, 1]);
        await utils.validateMainchain(1000, 1);
    }).timeout(timeoutTests);
    it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following non consecutive BTC block", async () => {
        const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
            btcApiRoute, heightOfNonConsecutiveRSKnoMatchPastDiffBranch, 8, 2000, apiPoolingTime, loadingTime);
        const lastForksResponse = await utils.getForksFromHeight(0);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
        await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1, 1]);
        await utils.validateMainchain(1000, 1);
    }).timeout(timeoutTests);
    it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following consecutive BTC block", async () => {
        const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
            btcApiRoute, heightOfConsecutiveRSKnoMatchPastFollowingMatch, 2, 2000, apiPoolingTime, loadingTime);
        const lastForksResponse = await utils.getForksFromHeight(0);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
        await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
        await utils.validateMainchain(1000, 16);
    }).timeout(timeoutTests);
    it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following non consecutive BTC block", async () => {
        const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
            btcApiRoute, heightOfNonConsecutiveRSKnoMatchPastFollowingMatch, 8, 2000, apiPoolingTime, loadingTime);
        const lastForksResponse = await utils.getForksFromHeight(0);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
        await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
        await utils.sleep(loadingTime);
        await utils.validateMainchain(1000, 6);
    }).timeout(timeoutTests);
});