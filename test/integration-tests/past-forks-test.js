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
const dataInputPath = "test/integration-tests/data/";
const forksPresentFilePrefix = dataInputPath + "past-forks-";
const mainchainPresentFilePrefix = dataInputPath + "past-mainchain-";
const fileSuffix = ".json"

describe("RSK Forks in the past tests", () => {
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

    describe("RSK no match at same height with matching CPV, RSK height in the past regarding BTC chain, mongo input validation", () => {
        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found, mongo input validation", async () => {
            const dbForks = await utils.getDBForksAfterMovingXBlocks(
                btcApiRoute, heightOfConsecutiveRSKnoMatchPastSameBranch, 1, apiPoolingTime, loadingTime);
            const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            await utils.validateForksRskBlockMongoDB(dbForks, [1]);
            await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
        }).timeout(timeoutTests);
        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following consecutive BTC block, mongo input validation", async () => {
            const dbForks = await utils.getDBForksAfterMovingXBlocks(
                btcApiRoute, heightOfConsecutiveRSKnoMatchPastSameBranch, 2, apiPoolingTime, loadingTime);
            const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            await utils.validateForksRskBlockMongoDB(dbForks, [2]);
            await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
        }).timeout(timeoutTests);
        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following non consecutive BTC block, mongo input validation", async () => {
            const dbForks = await utils.getDBForksAfterMovingXBlocks(
                btcApiRoute, heightOfNonConsecutiveRSKnoMatchPastSameBranch, 3, apiPoolingTime, loadingTime);
            const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            await utils.validateForksRskBlockMongoDB(dbForks, [1]);
            await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
        }).timeout(timeoutTests);
        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following consecutive BTC block, mongo input validation", async () => {
            const dbForks = await utils.getDBForksAfterMovingXBlocks(
                btcApiRoute, heightOfConsecutiveRSKnoMatchPastDiffBranch, 2, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            await utils.validateForksRskBlockMongoDB(dbForks, [1, 1]);
            await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
        }).timeout(timeoutTests);
        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following non consecutive BTC block, mongo input validation", async () => {
            const dbForks = await utils.getDBForksAfterMovingXBlocks(
                btcApiRoute, heightOfNonConsecutiveRSKnoMatchPastDiffBranch, 8, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            await utils.validateForksRskBlockMongoDB(dbForks, [1, 1]);
            await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
        }).timeout(timeoutTests);
        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following consecutive BTC block, mongo input validation", async () => {
            const dbForks = await utils.getDBForksAfterMovingXBlocks(
                btcApiRoute, heightOfConsecutiveRSKnoMatchPastFollowingMatch, 2, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            await utils.validateForksRskBlockMongoDB(dbForks, [1]);
            await utils.validateMainchainRskMongoDB(mainchainBlocks, 16);
        }).timeout(timeoutTests);

        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following non consecutive BTC block, mongo input validation", async () => {
            let numberOfBtcBlocksToMove = 8;
            const dbForks = await utils.getDBForksAfterMovingXBlocks(
                btcApiRoute, heightOfNonConsecutiveRSKnoMatchPastFollowingMatch, numberOfBtcBlocksToMove, apiPoolingTime, loadingTime);
            const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            await utils.sleep(loadingTime);
            await utils.validateForksRskBlockMongoDB(dbForks, [1]);
            await utils.sleep(loadingTime);
            let startBTC = heightOfNonConsecutiveRSKnoMatchPastFollowingMatch - firstBtcBlock;
            let endBTC = startBTC + numberOfBtcBlocksToMove;
            await utils.validateMainchainRskMongoDB(mainchainBlocks, 6, startBTC, endBTC);
        }).timeout(timeoutTests);
    });

    describe("RSK no match at same height with matching CPV, RSK height in the past regarding BTC chain, mongo output validation", () => {
        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found, mongo output validation", async () => {
            const testId = "pastfork_length1fork";
            const forksFile = forksPresentFilePrefix + testId + fileSuffix;
            const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
            await utils.validateMongoOutput(mainchainFile, forksFile);
        }).timeout(timeoutTests);
        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following consecutive BTC block, mongo output validation", async () => {
            const testId = "pastfork_length2forkconsecutive";
            const forksFile = forksPresentFilePrefix + testId + fileSuffix;
            const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
            await utils.validateMongoOutput(mainchainFile, forksFile);
        }).timeout(timeoutTests);
        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following non consecutive BTC block, mongo output validation", async () => {
            const testId = "pastfork_length2forknonconsecutive";
            const forksFile = forksPresentFilePrefix + testId + fileSuffix;
            const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
            await utils.validateMongoOutput(mainchainFile, forksFile);
        }).timeout(timeoutTests);
        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following consecutive BTC block, mongo output validation", async () => {
            const testId = "pastfork_2forkslength1consecutive";
            const forksFile = forksPresentFilePrefix + testId + fileSuffix;
            const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
            await utils.validateMongoOutput(mainchainFile, forksFile);
        }).timeout(timeoutTests);
        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following non consecutive BTC block, mongo output validation", async () => {
            const testId = "pastfork_2forkslength1nonconsecutive";
            const forksFile = forksPresentFilePrefix + testId + fileSuffix;
            const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
            await utils.validateMongoOutput(mainchainFile, forksFile);
        }).timeout(timeoutTests);
        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following consecutive BTC block, mongo output validation", async () => {
            const testId = "pastfork_1fork1length1follows1rsktagmatchconsecutive";
            const forksFile = forksPresentFilePrefix + testId + fileSuffix;
            const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
            await utils.validateMongoOutput(mainchainFile, forksFile);
        }).timeout(timeoutTests);
        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following non consecutive BTC block, mongo output validation", async () => {
            const testId = "pastfork_1fork1length1follows1rsktagmatchnonconsecutive";
            const forksFile = forksPresentFilePrefix + testId + fileSuffix;
            const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
            await utils.validateMongoOutput(mainchainFile, forksFile);
        }).timeout(timeoutTests);
    });
});