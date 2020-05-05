// const expect = require('chai').expect;
// const utils = require('./lib/utils');
// const mongo_utils = require('./lib/mongo-utils');
// const mainchain = mongo_utils.ArmadilloMainchain;
// const forks = mongo_utils.ArmadilloForks;
// const rskBlockHeightsWithBtcBlock = utils.rskBlockHeightsWithBtcBlock();
// const amountOfMainchainBlocksInFork = 1;
// const firstBtcBlock = 8704;
// const heightOfNoRskTags = firstBtcBlock + 0;
// const heightOfConsecutiveRskTags = firstBtcBlock + 3;
// const HConsecutiveNoMatchRskTags = firstBtcBlock + 19;
// const HNonConsecutiveNoMatchRskTags = firstBtcBlock + 21;
// const HMatchRSKWithFollowingNoMatch = firstBtcBlock + 29;
// const HMatchRSKWithNoFollowingNoMatch = firstBtcBlock + 32;
// const HNoMatchRSKWithFollowingMatch = firstBtcBlock + 31;
// const HNoMatchRSK2CPVDiffConsecutive = firstBtcBlock + 39;
// const HNoMatchRSK2CPVDiffNonConsecutive = firstBtcBlock + 44;
// const HMatchRSK2CPVDiffConsecutive = firstBtcBlock + 43;
// const HNoMatch2CPVDiffConsecutiveMatches = firstBtcBlock + 42;
// const HNoMatch2CPVDiffNonConsecutiveMatches = firstBtcBlock + 49;

// const HNoMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther = firstBtcBlock + 64;
// const HNoMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther = firstBtcBlock + 70;
// const HMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther = firstBtcBlock + 63;
// const HMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther = firstBtcBlock + 67;
// const HNoMatch2CPVDiffConsecutiveRskBlocksFollowingMatchesRsk = firstBtcBlock + 66;
// const HNoMatch2CPVDiffNonConsecutiveRskBlocksFollowingMatchesRsk = firstBtcBlock + 66;
// const timeoutTests = utils.timeoutTests;
// const HNoMatchRSK8CPVDiffConsecutive = firstBtcBlock + 52;
// const HNoMatchRSK8CPVDiffNonConsecutive = firstBtcBlock + 57;
// const HMatchRSK8CPVDiffConsecutive = firstBtcBlock + 51;
// const HMatchRSK8CPVDiffNonConsecutive = firstBtcBlock + 55;
// const HNoMatch8CPVDiffConsecutiveMatches = firstBtcBlock + 54;
// const HNoMatch8CPVDiffNonConsecutiveMatches = firstBtcBlock + 61;

// const HNoMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther = firstBtcBlock + 78;
// const HNoMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther = firstBtcBlock + 84;
// const HMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther = firstBtcBlock + 77;
// const HMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther = firstBtcBlock + 81;
// const HNoMatch8CPVDiffConsecutiveRskBlocksFollowingMatchesRsk = firstBtcBlock + 79;
// const HNoMatch8CPVDiffNonConsecutiveRskBlocksFollowingMatchesRsk = firstBtcBlock + 86;

// const apiPoolingTime = utils.apiPoolingTime;
// const loadingTime = utils.loadingTime;

// const dataInputPath = "test/integration-tests/data/";
// const forksPresentFilePrefix = dataInputPath + "present-forks-";
// const mainchainPresentFilePrefix = dataInputPath + "present-mainchain-";
// const fileSuffix = ".json"

// const btcApiRoute = "raw";
// describe("RSK Forks in the present tests", () => {
//     describe("RSK Forks in the present - end to end tests", () => {
//         describe("RSK no match at same height with matching CPV", () => {
//             it("should not create branch for BTC block matching RSK tag, end to end", async () => {
//                 const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                     btcApiRoute, heightOfConsecutiveRskTags, 0, 1000, apiPoolingTime, loadingTime);
//                 await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                 expect(blockchainsResponse.data.forks).to.be.an('array').that.is.empty;
//                 await utils.validateMainchain(1000, 1);
//                 const testId = "noForks";
//                 mongo_utils.saveCollectionToFile(forks, forksPresentFilePrefix + testId + fileSuffix);
//             }).timeout(timeoutTests);
//             it("should create branch for first BTC block with no matching RSK tag, end to end", async () => {
//                 const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                     btcApiRoute, HConsecutiveNoMatchRskTags, 0, 100, apiPoolingTime, loadingTime);
//                 const lastForksResponse = await utils.getForksFromHeight(0);
//                 await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                 //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                 await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
//                 const testId = "only1rsktagfork";
//                 mongo_utils.saveCollectionToFile(forks, forksPresentFilePrefix + testId + fileSuffix);
//                 mongo_utils.saveCollectionToFile(mainchain, mainchainPresentFilePrefix + testId + fileSuffix);
//             }).timeout(timeoutTests);
//             it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end", async () => {
//                 const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                     btcApiRoute, HConsecutiveNoMatchRskTags, 1, 1000, apiPoolingTime, loadingTime);
//                 const lastForksResponse = await utils.getForksFromHeight(0);
//                 await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                 await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [2]);
//             }).timeout(timeoutTests);
//             it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {
//                 const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                     btcApiRoute, HNonConsecutiveNoMatchRskTags, 3, 1000, apiPoolingTime, loadingTime);
//                 const lastForksResponse = await utils.getForksFromHeight(0);
//                 await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                 await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [2]);
//             }).timeout(timeoutTests);
//             it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end", async () => {
//                 const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                     btcApiRoute, HConsecutiveNoMatchRskTags, 2, 1000, apiPoolingTime, loadingTime);
//                 const lastForksResponse = await utils.getForksFromHeight(0);
//                 await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                 //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                 await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [3]);
//             }).timeout(timeoutTests);
//             it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {
//                 const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                     btcApiRoute, HNonConsecutiveNoMatchRskTags, 6, 1000, apiPoolingTime, loadingTime);
//                 const lastForksResponse = await utils.getForksFromHeight(0);
//                 await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                 //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                 await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [3]);
//             }).timeout(timeoutTests);
//             it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block "
//                 + "\n\twith no matching RSK tag, end to end", async () => {
//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HMatchRSKWithFollowingNoMatch, 1, 1000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
//                     await utils.validateMainchain(1000, 1);
//                 }).timeout(timeoutTests);
//             it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, end to end", async () => {
//                 const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                     btcApiRoute, HMatchRSKWithNoFollowingNoMatch, 2, 1000, apiPoolingTime, loadingTime);
//                 const lastForksResponse = await utils.getForksFromHeight(0);
//                 await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                 //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                 await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
//                 await utils.validateMainchain(1000, 1);
//             }).timeout(timeoutTests);
//             it("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, end to end", async () => {
//                 const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                     btcApiRoute, HMatchRSKWithFollowingNoMatch, 2, 2000, apiPoolingTime, loadingTime);
//                 const lastForksResponse = await utils.getForksFromHeight(0);
//                 await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                 //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                 await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [2]);
//                 await utils.validateMainchain(1000, 1);
//             }).timeout(timeoutTests);
//             it("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, end to end", async () => {
//                 const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                     btcApiRoute, HMatchRSKWithNoFollowingNoMatch, 5, 2000, apiPoolingTime, loadingTime);
//                 const lastForksResponse = await utils.getForksFromHeight(0);
//                 await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                 //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                 await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [2]);
//                 await utils.validateMainchain(1000, 1);
//             }).timeout(timeoutTests);
//             it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block "
//                 + "\n\twith matching RSK tag, end to end", async () => {
//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSKWithFollowingMatch, 1, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
//                 }).timeout(timeoutTests);
//         });

//         describe("RSK no match at same height with difference in 2 bytes in CPV", () => {
//             describe("No matching RSK tags match CPV among each other", () => {
//                 it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end", async () => {
//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSK2CPVDiffConsecutive, 1, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [2]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {
//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSK2CPVDiffNonConsecutive, 3, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [2]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end", async () => {
//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSK2CPVDiffConsecutive, 2, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [3]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {
//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSK2CPVDiffNonConsecutive, 5, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [3]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end", async () => {
//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HMatchRSK2CPVDiffConsecutive, 2, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
//                     await utils.validateMainchain(1000, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following 2 BTC block with 2 bytes difference CPV no match RSK tagswith no matching RSK tag, end to end", async () => {
//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HMatchRSK2CPVDiffConsecutive, 4, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [2]);
//                     await utils.validateMainchain(1000, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end", async () => {
//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch2CPVDiffConsecutiveMatches, 1, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, end to end", async () => {
//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch2CPVDiffNonConsecutiveMatches, 2, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
//                     await utils.validateMainchain(1000, 1);
//                 }).timeout(timeoutTests);
//             });
//             describe("No matching RSK tags no match CPV among each other", () => {
//                 it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther, 1, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1, 1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 3, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1, 1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther, 2, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1, 2]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 5, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 3, rskBlockHeightsWithBtcBlock, 2, [1, 2]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther, 1, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
//                     await utils.validateMainchain(1000, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 3, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
//                     await utils.validateMainchain(1000, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther, 2, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock, 2, [1, 1]);
//                     await utils.validateMainchain(1000, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 6, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock, 2, [1, 1]);
//                     await utils.validateMainchain(1000, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch2CPVDiffConsecutiveRskBlocksFollowingMatchesRsk, 1, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock, 2, [1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch2CPVDiffNonConsecutiveRskBlocksFollowingMatchesRsk, 2, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
//                 }).timeout(timeoutTests);
//             });

//         });
//         describe("RSK no match at same height with no match CPV", () => {
//             describe("No matching RSK tags match CPV among each other", () => {
//                 it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end", async () => {
//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSK8CPVDiffConsecutive, 1, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1, 1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {
//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSK8CPVDiffNonConsecutive, 2, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [2]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSK8CPVDiffConsecutive, 3, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1, 1, 1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {
//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSK8CPVDiffNonConsecutive, 4, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [3]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HMatchRSK8CPVDiffConsecutive, 1, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
//                     await utils.validateMainchain(1000, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HMatchRSK8CPVDiffNonConsecutive, 2, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
//                     await utils.validateMainchain(1000, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HMatchRSK8CPVDiffConsecutive, 2, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1, 1]);
//                     await utils.validateMainchain(1000, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HMatchRSK8CPVDiffNonConsecutive, 4, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [2]);
//                     await utils.validateMainchain(1000, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch8CPVDiffConsecutiveMatches, 1, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch8CPVDiffNonConsecutiveMatches, 2, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
//                     await utils.validateMainchain(1000, 1);
//                 }).timeout(timeoutTests);
//             });
//             describe("No matching RSK tags no match CPV among each other", () => {
//                 it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther, 1, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock, 2, [1, 1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 3, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock, 2, [1, 1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther, 3, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 3, rskBlockHeightsWithBtcBlock, 2, [1, 2]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 6, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 3, rskBlockHeightsWithBtcBlock, 2, [1, 2]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther, 2, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock, 2, [1, 1]);
//                     await utils.validateMainchain(1000, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 6, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock, 2, [1, 1]);
//                     await utils.validateMainchain(1000, 1);
//                 }).timeout(timeoutTests);

//                 it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch8CPVDiffConsecutiveRskBlocksFollowingMatchesRsk, 2, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock, 2, [2]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, end to end", async () => {

//                     const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch8CPVDiffNonConsecutiveRskBlocksFollowingMatchesRsk, 6, 2000, apiPoolingTime, loadingTime);
//                     const lastForksResponse = await utils.getForksFromHeight(0);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
//                     await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock, 2, [2]);
//                     await utils.validateMainchain(1000, 1);
//                 }).timeout(timeoutTests);
//             });
//         });
//     });
//     describe("RSK Forks in the present - mongo input tests", () => {
//         describe("RSK no match at same height with matching CPV, mongo input validation", () => {
//             it("should not create branch for BTC block matching RSK tag, mongo input validation", async () => {
//                 const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                     btcApiRoute, heightOfConsecutiveRskTags, 0, apiPoolingTime, loadingTime);
//                 await utils.sleep(apiPoolingTime + loadingTime);
//                 const mongoForkBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloForks);
//                 //Reset to original height
//                 await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                 expect(mongoForkBlocks).to.be.an('array').that.is.empty;
//             }).timeout(timeoutTests);
//             it("should create branch for first BTC block with no matching RSK tag, mongo input validation", async () => {
//                 const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                     btcApiRoute, HConsecutiveNoMatchRskTags, 0, apiPoolingTime, loadingTime);
//                 await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                 await utils.validateForksRskBlockMongoDB(dbForks, [1]);
//             }).timeout(timeoutTests);
//             it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                 const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                     btcApiRoute, HConsecutiveNoMatchRskTags, 1, apiPoolingTime, loadingTime);
//                 await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                 await utils.validateForksRskBlockMongoDB(dbForks, [2]);
//             }).timeout(timeoutTests);
//             it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                 const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                     btcApiRoute, HNonConsecutiveNoMatchRskTags, 3, apiPoolingTime, loadingTime);
//                 await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                 await utils.validateForksRskBlockMongoDB(dbForks, [2]);
//             }).timeout(timeoutTests);
//             it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                 const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                     btcApiRoute, HConsecutiveNoMatchRskTags, 2, apiPoolingTime, loadingTime);
//                 await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                 await utils.validateForksRskBlockMongoDB(dbForks, [3]);
//             }).timeout(timeoutTests);
//             it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                 const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                     btcApiRoute, HNonConsecutiveNoMatchRskTags, 6, apiPoolingTime, loadingTime);
//                 await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                 await utils.validateForksRskBlockMongoDB(dbForks, [3]);
//             }).timeout(timeoutTests);
//             it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block "
//                 + "\n\twith no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HMatchRSKWithFollowingNoMatch, 1, apiPoolingTime, loadingTime);
//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);
//             it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC "
//                 + "\n\tblock with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HMatchRSKWithNoFollowingNoMatch, 2, apiPoolingTime, loadingTime);

//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.sleep(loadingTime);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);
//             it("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block "
//                 + "\n\twith no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HMatchRSKWithFollowingNoMatch, 2, apiPoolingTime, loadingTime);
//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [2]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);
//             it("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC "
//                 + "\n\tblock with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HMatchRSKWithNoFollowingNoMatch, 5, apiPoolingTime, loadingTime);

//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [2]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);
//             it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block "
//                 + "\n\twith matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSKWithFollowingMatch, 1, apiPoolingTime, loadingTime);

//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1]);
//                 }).timeout(timeoutTests);
//         });

//         describe("RSK no match at same height with difference in 2 bytes in CPV, mongo input validation", () => {
//             describe("No matching RSK tags match CPV among each other", () => {
//                 it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSK2CPVDiffConsecutive, 1, apiPoolingTime, loadingTime);

//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [2]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSK2CPVDiffNonConsecutive, 3, apiPoolingTime, loadingTime);

//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [2]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSK2CPVDiffConsecutive, 2, apiPoolingTime, loadingTime);

//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [3]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSK2CPVDiffNonConsecutive, 5, apiPoolingTime, loadingTime);

//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [3]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HMatchRSK2CPVDiffConsecutive, 2, apiPoolingTime, loadingTime);

//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following 2 BTC block with 2 bytes difference CPV no match RSK tagswith no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HMatchRSK2CPVDiffConsecutive, 4, apiPoolingTime, loadingTime);

//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [2]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch2CPVDiffConsecutiveMatches, 1, apiPoolingTime, loadingTime);

//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch2CPVDiffNonConsecutiveMatches, 2, apiPoolingTime, loadingTime);

//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);
//             });
//             describe("No matching RSK tags no match CPV among each other", () => {
//                 it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther, 1, apiPoolingTime, loadingTime);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1, 1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 3, apiPoolingTime, loadingTime);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1, 1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther, 2, apiPoolingTime, loadingTime);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1, 2]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 5, apiPoolingTime, loadingTime);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1, 2]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther, 1, apiPoolingTime, loadingTime);
//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo input validation", async () => {

//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 3, apiPoolingTime, loadingTime);
//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther, 2, apiPoolingTime, loadingTime);
//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1, 1]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 6, apiPoolingTime, loadingTime);
//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1, 1]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch2CPVDiffConsecutiveRskBlocksFollowingMatchesRsk, 1, apiPoolingTime, loadingTime);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch2CPVDiffNonConsecutiveRskBlocksFollowingMatchesRsk, 2, apiPoolingTime, loadingTime);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1]);
//                 }).timeout(timeoutTests);
//             });

//         });
//         describe("RSK no match at same height with no match CPV, mongo input validation", () => {
//             describe("No matching RSK tags match CPV among each other", () => {
//                 it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSK8CPVDiffConsecutive, 1, apiPoolingTime, loadingTime);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1, 1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSK8CPVDiffNonConsecutive, 2, apiPoolingTime, loadingTime);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [2]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {

//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSK8CPVDiffConsecutive, 3, apiPoolingTime, loadingTime);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1, 1, 1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatchRSK8CPVDiffNonConsecutive, 4, apiPoolingTime, loadingTime);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [3]);
//                 }).timeout(timeoutTests);

//                 it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo input validation", async () => {

//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HMatchRSK8CPVDiffConsecutive, 1, apiPoolingTime, loadingTime);
//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1)
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo input validation", async () => {

//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HMatchRSK8CPVDiffNonConsecutive, 2, apiPoolingTime, loadingTime);
//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, mongo input validation", async () => {

//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HMatchRSK8CPVDiffConsecutive, 2, apiPoolingTime, loadingTime);
//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1, 1]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, mongo input validation", async () => {

//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HMatchRSK8CPVDiffNonConsecutive, 4, apiPoolingTime, loadingTime);
//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [2]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo input validation", async () => {

//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch8CPVDiffConsecutiveMatches, 1, apiPoolingTime, loadingTime);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo input validation", async () => {

//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch8CPVDiffNonConsecutiveMatches, 2, apiPoolingTime, loadingTime);
//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);
//             });
//             describe("No matching RSK tags no match CPV among each other", () => {
//                 it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther, 1, apiPoolingTime, loadingTime);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1, 1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 3, apiPoolingTime, loadingTime);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1, 1]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther, 3, apiPoolingTime, loadingTime);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1, 2]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 6, apiPoolingTime, loadingTime);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1, 2]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther, 2, apiPoolingTime, loadingTime);
//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1, 1]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 6, apiPoolingTime, loadingTime);
//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [1, 1]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);

//                 it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo input validation", async () => {

//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch8CPVDiffConsecutiveRskBlocksFollowingMatchesRsk, 2, apiPoolingTime, loadingTime);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [2]);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo input validation", async () => {
//                     const dbForks = await utils.getDBForksAfterMovingXBlocks(
//                         btcApiRoute, HNoMatch8CPVDiffNonConsecutiveRskBlocksFollowingMatchesRsk, 6, apiPoolingTime, loadingTime);
//                     const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
//                     await utils.setHeightInMockBTCApi(heightOfNoRskTags);
//                     await utils.validateForksRskBlockMongoDB(dbForks, [2]);
//                     await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
//                 }).timeout(timeoutTests);
//             });
//         });
//     });
//     describe("RSK Forks in the present - mongo output tests", () => {
//         describe("RSK no match at same height with matching CPV, mongo output validation", () => {
//             it("should not create branch for BTC block matching RSK tag, mongo output validation", async () => {
//                 const testId = "noForks";
//                 const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                 const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                 await utils.validateMongoOutput(mainchainFile, forksFile);
//             }).timeout(timeoutTests);
//             it("should create branch for first BTC block with no matching RSK tag, mongo output validation", async () => {
//                 const testId = "only1rsktagfork";
//                 const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                 const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                 await utils.validateMongoOutput(mainchainFile, forksFile);
//             }).timeout(timeoutTests);
//             it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                 const testId = "only2rsktagforkconsecutive";
//                 const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                 const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                 await utils.validateMongoOutput(mainchainFile, forksFile);
//             }).timeout(timeoutTests);
//             it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                 const testId = "only2rsktagforknonconsecutive";
//                 const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                 const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                 await utils.validateMongoOutput(mainchainFile, forksFile);
//             }).timeout(timeoutTests);
//             it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                 const testId = "only3rsktagforkconsecutive";
//                 const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                 const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                 await utils.validateMongoOutput(mainchainFile, forksFile);
//             }).timeout(timeoutTests);
//             it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                 const testId = "only3rsktagforknonconsecutive";
//                 const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                 const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                 await utils.validateMongoOutput(mainchainFile, forksFile);
//             }).timeout(timeoutTests);
//             it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo output validation", async () => {
//                 const testId = "1rskmatch1rsktagnomatchconsecutive";
//                 const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                 const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                 await utils.validateMongoOutput(mainchainFile, forksFile);
//             }).timeout(timeoutTests);
//             it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo output validation", async () => {
//                 const testId = "1rskmatch1rsktagnomatchnonconsecutive";
//                 const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                 const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                 await utils.validateMongoOutput(mainchainFile, forksFile);
//             }).timeout(timeoutTests);
//             it("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, mongo output validation", async () => {
//                 const testId = "1rskmatch2rsktagnomatchconsecutive";
//                 const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                 const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                 await utils.validateMongoOutput(mainchainFile, forksFile);
//             }).timeout(timeoutTests);
//             it("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, mongo output validation", async () => {
//                 const testId = "1rskmatch2rsktagnomatchnonconsecutive";
//                 const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                 const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                 await utils.validateMongoOutput(mainchainFile, forksFile);
//             }).timeout(timeoutTests);
//             it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo output validation", async () => {
//                 const testId = "1rsknomatch1rsktagmatchconsecutive";
//                 const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                 const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                 await utils.validateMongoOutput(mainchainFile, forksFile);
//             }).timeout(timeoutTests);
//         });
//         describe("RSK no match at same height with difference in 2 bytes in CPV, mongo output validation", () => {
//             describe("No matching RSK tags match CPV among each other, mongo output validation", () => {
//                 it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpv_only2rsktagforkconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpv_only2rsktagforknonconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpv_only3rsktagforkconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpv_only3rsktagforknonconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpv_1rsktagmatch1rsktagforkconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following 2 BTC block with 2 bytes difference CPV no match RSK tagswith no matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpv_1rsktagmatch2rsktagfork";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpv_1rsktagfork1rsktagmatchconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpv_1rsktagmatch1rsktagforknonconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//             });
//             describe("No matching RSK tags no match CPV among each other, mongo output validation", () => {
//                 it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpvnomatch_only2rsktagforkconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpvnomatch_only2rsktagforknonconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpvnomatch_only3rsktagforkconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpvnomatch_only3rsktagforknonconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpvnomatch_1matchrsktag1rsktagforkconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpvnomatch_1matchrsktag1rsktagforknonconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpvnomatch_1matchrsktag2rsktagforkconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpvnomatch_1matchrsktag2rsktagforknonconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpvnomatch_1sktagfork1rsktagmatchconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo output validation", async () => {
//                     const testId = "2b_cpvnomatch_1sktagfork1rsktagmatchnonconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//             });
//         });
//         describe("RSK no match at same height with no match CPV, mongo output validation", () => {
//             describe("No matching RSK tags match CPV among each other, mongo output validation", () => {
//                 it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpv_only2rsktagforkconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpv_only2rsktagforknonconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpv_only3rsktagforkconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpv_only3rsktagforknonconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpv_1rsktagmatch1rsktagforkconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpv_1rsktagmatch1rsktagforknonconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpv_1rsktagmatch2rsktagforkconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpv_1rsktagmatch2rsktagforknonconsecutive";
//                     console.log(testId);
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpv_1rsktagfork1rsktagmatchconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpv_1rsktagfork1rsktagmatchnonconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//             });
//             describe("No matching RSK tags no match CPV among each other, mongo output validation", () => {
//                 it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpvnomatch_only2rsktagforkconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpvnomatch_only2rsktagforknonconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpvnomatch_only3rsktagforkconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpvnomatch_only3rsktagforknonconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpvnomatch_1rsktagmatch1rsktagforkconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpvnomatch_1rsktagmatch1rsktagforknonconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests); it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpvnomatch_1rsktagfork1rsktagmatchconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//                 it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo output validation", async () => {
//                     const testId = "7b_cpvnomatch_1rsktagfork1rsktagmatchnonconsecutive";
//                     const forksFile = forksPresentFilePrefix + testId + fileSuffix;
//                     const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
//                     await utils.validateMongoOutput(mainchainFile, forksFile);
//                 }).timeout(timeoutTests);
//             });
//         });
//     });
// });