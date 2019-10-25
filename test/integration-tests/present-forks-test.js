const expect = require('chai').expect;
const utils = require('./lib/utils');
const mongo_utils = require('./lib/mongo-utils');
const db = mongo_utils.ArmadilloDB;
const mainchain = mongo_utils.ArmadilloMainchain;
const stateTracker = mongo_utils.ArmadilloStateTracker;
const forks = mongo_utils.ArmadilloForks;
const rskBlockHeightsWithBtcBlock = utils.rskBlockHeightsWithBtcBlock();
const firstBtcBlock = 8704;
const heightOfNoRskTags = firstBtcBlock + 0;
const heightOfConsecutiveRskTags = firstBtcBlock + 3;
const HConsecutiveNoMatchRskTags = firstBtcBlock + 19;
const HNonConsecutiveNoMatchRskTags = firstBtcBlock + 21;
const HMatchRSKWithFollowingNoMatch = firstBtcBlock + 29;
const HMatchRSKWithNoFollowingNoMatch = firstBtcBlock + 32;
const HNoMatchRSKWithFollowingMatch = firstBtcBlock + 31;
const HNoMatchRSKWithNonConsecutiveFollowingMatch = firstBtcBlock + 31;
const HNoMatchRSK2CPVDiffConsecutive = firstBtcBlock + 39
const HNoMatchRSK2CPVDiffNonConsecutive = firstBtcBlock + 44
const apiPoolingTime = 5000;
const loadingTime = 700;
const btcApiRoute = "raw";
describe("RSK no match at same height with matching CPV", () => {
    it("should not create branch for BTC block matching RSK tag, end to end, end to end", async () => {
        const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
            btcApiRoute, heightOfConsecutiveRskTags, 0, 1000, apiPoolingTime, loadingTime);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        expect(blockchainsResponse.blockchains.forks).to.be.an('array').that.is.empty;
        const lastForksResponse = await utils.getForksFromHeight(0);
        expect(lastForksResponse.forks).to.be.an('array').that.is.empty;
    }).timeout(1 * 2 * apiPoolingTime + 2000);;
    it("should create branch for first BTC block with no matching RSK tag, end to end", async () => {
        const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
            btcApiRoute, HConsecutiveNoMatchRskTags, 0, 100, apiPoolingTime, loadingTime);
        const lastForksResponse = await utils.getForksFromHeight(0);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
        await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1, [1]);

    }).timeout(1 * 2 * apiPoolingTime + 2000);
    it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end", async () => {
        const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
            btcApiRoute, HConsecutiveNoMatchRskTags, 1, 1000, apiPoolingTime, loadingTime);
        const lastForksResponse = await utils.getForksFromHeight(0);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
        await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1, [2]);
    }).timeout(2 * 2 * apiPoolingTime + 2000);
    it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {
        const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
            btcApiRoute, HNonConsecutiveNoMatchRskTags, 3, 1000, apiPoolingTime, loadingTime);
        const lastForksResponse = await utils.getForksFromHeight(0);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
        await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1, [2]);
    }).timeout(4 * 2 * apiPoolingTime + 2000);
    it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end", async () => {
        const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
            btcApiRoute, HConsecutiveNoMatchRskTags, 2, 1000, apiPoolingTime, loadingTime);
        const lastForksResponse = await utils.getForksFromHeight(0);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
        await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1, [3]);
    }).timeout(3 * 2 * apiPoolingTime + 2000);
    it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {
        const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
            btcApiRoute, HNonConsecutiveNoMatchRskTags, 6, 1000, apiPoolingTime, loadingTime);
        const lastForksResponse = await utils.getForksFromHeight(0);
        await utils.setHeightInMockBTCApi(heightOfNoRskTags);
        //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
        await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1, [3]);
    }).timeout(7 * 2 * apiPoolingTime + 2000);
    it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block "
        + "\n\twith no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, HMatchRSKWithFollowingNoMatch, 1, 1000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1,[1]);
        }).timeout(2 * 2 * apiPoolingTime + 2000);
    it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC "
        + "\n\tblock with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, HMatchRSKWithNoFollowingNoMatch, 2, 1000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1, [1]);
        }).timeout(3 * 2 * apiPoolingTime + 2000);
    it("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block "
        + "\n\twith no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, HMatchRSKWithFollowingNoMatch, 2, 2000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1, [2]);
        }).timeout(3 * 2 * apiPoolingTime + 2000);
    it("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC "
        + "\n\tblock with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, HMatchRSKWithNoFollowingNoMatch, 5, 2000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1, [2]);
        }).timeout(5 * 2 * apiPoolingTime + 2000);
    it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block "
        + "\n\twith matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, HNoMatchRSKWithFollowingMatch, 1, 2000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1,[1]);
        }).timeout(2 * 2 * apiPoolingTime + 2000);
    it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC "
        + "\n\tblock with matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, HNoMatchRSKWithNonConsecutiveFollowingMatch, 3, 2000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1, [1]);
        }).timeout(2 * 2 * apiPoolingTime + 2000);
});

describe("RSK no match at same height with difference in 2 bytes in CPV", () => {
    describe("No matching RSK tags match CPV among each other", () => {
        it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end", async () => {
            // getBlockchainsAfterMovingXBlocks(
            // btcApiRoute, initialHeight, blocksToMove, amountOfBlockchains, apiPoolingTime, loadingTime)
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, HNoMatchRSK2CPVDiffConsecutive, 1, 2000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1, [2]);
        }).timeout(2 * 2 * apiPoolingTime + 2000);
        it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, HNoMatchRSK2CPVDiffNonConsecutive, 3, 2000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1,[2]);
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, HNoMatchRSK2CPVDiffConsecutive, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1, [3]);
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, HNoMatchRSK2CPVDiffNonConsecutive, 5, 2000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1,[3]);
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with matching RSK tag, following consecutive BTC block "
            + "\n\twith no matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                const lastForksResponse = await utils.getForksFromHeight(0);
                await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1);
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block "
            + "\n\twith no matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                const lastForksResponse = await utils.getForksFromHeight(0);
                await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1);
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block "
            + "\n\twith no matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                const lastForksResponse = await utils.getForksFromHeight(0);
                await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1);
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC "
            + "\n\tblock with no matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                const lastForksResponse = await utils.getForksFromHeight(0);
                await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1);
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block "
            + "\n\twith matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                const lastForksResponse = await utils.getForksFromHeight(0);
                await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1);
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC "
            + "\n\tblock with matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                const lastForksResponse = await utils.getForksFromHeight(0);
                await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1);
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
    });
    describe("No matching RSK tags no match CPV among each other", () => {
        it.skip("should create branch for first BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1);
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1);
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1);
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1);
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
            const lastForksResponse = await utils.getForksFromHeight(0);
            await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1);
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with "
            + "\n\tno matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                const lastForksResponse = await utils.getForksFromHeight(0);
                await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1);
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block "
            + "\n\twith no matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                const lastForksResponse = await utils.getForksFromHeight(0);
                await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1);
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block "
            + "\n\twith no matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                const lastForksResponse = await utils.getForksFromHeight(0);
                await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1);
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block "
            + "\n\twith no matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                const lastForksResponse = await utils.getForksFromHeight(0);
                await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1);
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block "
            + "\n\twith matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                const lastForksResponse = await utils.getForksFromHeight(0);
                await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1);
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block "
            + "\n\twith matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                const lastForksResponse = await utils.getForksFromHeight(0);
                await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 1, rskBlockHeightsWithBtcBlock, 1);
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
    });

});

describe("RSK no match at same height with no match CPV", () => {
    describe("No matching RSK tags match CPV among each other", () => {
        it.skip("should create branch for first BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
            expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
            const lastForksResponse = await utils.getForksFromHeight(0);
            expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
            //Lacks blocks validation
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
            expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
            const lastForksResponse = await utils.getForksFromHeight(0);
            expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
            //Lacks blocks validation
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
            expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
            const lastForksResponse = await utils.getForksFromHeight(0);
            expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
            //Lacks blocks validation
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
            expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
            const lastForksResponse = await utils.getForksFromHeight(0);
            expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
            //Lacks blocks validation
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
            expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
            const lastForksResponse = await utils.getForksFromHeight(0);
            expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
            //Lacks blocks validation
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with matching RSK tag, following consecutive BTC block "
            + "\n\twith no matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
                const lastForksResponse = await utils.getForksFromHeight(0);
                expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
                //Lacks blocks validation
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with matching RSK tag, following non consecutive BTC "
            + "\n\tblock with no matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
                const lastForksResponse = await utils.getForksFromHeight(0);
                expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
                //Lacks blocks validation
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block "
            + "\n\twith no matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
                const lastForksResponse = await utils.getForksFromHeight(0);
                expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
                //Lacks blocks validation
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC "
            + "\n\tblock with no matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
                const lastForksResponse = await utils.getForksFromHeight(0);
                expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
                //Lacks blocks validation
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block "
            + "\n\twith matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
                const lastForksResponse = await utils.getForksFromHeight(0);
                expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
                //Lacks blocks validation
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC "
            + "\n\tblock with matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
                const lastForksResponse = await utils.getForksFromHeight(0);
                expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
                //Lacks blocks validation
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
    });
    describe("No matching RSK tags no match CPV among each other", () => {
        it.skip("should create branch for first BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
            expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
            const lastForksResponse = await utils.getForksFromHeight(0);
            expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
            //Lacks blocks validation
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
            expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
            const lastForksResponse = await utils.getForksFromHeight(0);
            expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
            //Lacks blocks validation
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
            expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
            const lastForksResponse = await utils.getForksFromHeight(0);
            expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
            //Lacks blocks validation
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
            expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
            const lastForksResponse = await utils.getForksFromHeight(0);
            expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
            //Lacks blocks validation
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {
            const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
            expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
            const lastForksResponse = await utils.getForksFromHeight(0);
            expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
            //Lacks blocks validation
        }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with matching RSK tag, following consecutive BTC block "
            + "\n\twith no matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
                const lastForksResponse = await utils.getForksFromHeight(0);
                expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
                //Lacks blocks validation
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with matching RSK tag, following non consecutive BTC "
            + "\n\tblock with no matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
                const lastForksResponse = await utils.getForksFromHeight(0);
                expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
                //Lacks blocks validation
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block "
            + "\n\twith no matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
                const lastForksResponse = await utils.getForksFromHeight(0);
                expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
                //Lacks blocks validation
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC "
            + "\n\tblock with no matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
                const lastForksResponse = await utils.getForksFromHeight(0);
                expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
                //Lacks blocks validation
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block "
            + "\n\twith matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
                const lastForksResponse = await utils.getForksFromHeight(0);
                expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
                //Lacks blocks validation
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
        it.skip("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC "
            + "\n\tblock with matching RSK tag, end to end", async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
                    btcApiRoute, /** TODO: Create DataSet*/TBD_InitialHeight, TBD_NbrOfBlocks, 2000, apiPoolingTime, loadingTime);
                expect(blockchainsResponse.blockchains).to.be.an('array').that.is.not.empty;
                const lastForksResponse = await utils.getForksFromHeight(0);
                expect(lastForksResponse.forks).to.be.an('array').that.is.not.empty;
                //Lacks blocks validation
            }).timeout(/*TODO: TBD*/4 * 2 * apiPoolingTime + 2000);
    });
});