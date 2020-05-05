
import { setHeightInMockBTCApi } from './lib/btc-api-mocker'
import { findBlocks, armadilloDB, armadilloMainchain } from './lib/mongo-utils'
import { validateForksCreated, validateMainchain, validateForksRskBlockMongoDB, validateMainchainRskMongoDB, validateMongoOutput, validateFork } from './lib/validators';
import { getLastRSKHeight } from './lib/rsk-operations';
import { rskBlockHeightsWithBtcBlock } from './lib/configs';
import { getBlockchainsAfterMovingXBlocks, getForksFromHeight, getDBForksAfterMovingXBlocks } from './lib/armadillo-operations';
import assert = require('assert');
import { Fork, ForkItem } from '../../src/common/forks';
import { fork } from 'cluster';
import { RskForkItemInfo } from '../../src/common/rsk-block';

const btcApiRoute = "raw";
const firstBtcBlock = 8704;
const bestRskBlock = 7490;
const amountOfMainchainBlocksInFork = 2;
const heightOfNoRskTags = firstBtcBlock + 0;
const heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff = firstBtcBlock + 129;
const heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff = firstBtcBlock + 133;
const heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff = firstBtcBlock + 135;
const dataInputPath = "test/integration-tests/data/";
const forksPresentFilePrefix = dataInputPath + "future-forks-";
const mainchainPresentFilePrefix = dataInputPath + "future-mainchain-";
const fileSuffix = ".json";

describe("RSK Forks in the future tests", () => {
    describe("RSK no match at same height with matching CPV, RSK height in the future regarding BTC chain, end to end", () => {
        it.only("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, full CPV match", async () => {
            // assert.equal(await getLastRSKHeight(context), bestRskBlock, "Please check test data, best block of RSK needs to be " + bestRskBlock);
            const blocksToMove = 1;
            const initialHeight = heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff;
            const blockchain = await getBlockchainsAfterMovingXBlocks(initialHeight, blocksToMove);
            await setHeightInMockBTCApi(heightOfNoRskTags);

            const cpvDiffExpected = 2;
            const forksArrayWithLenghts = [1];

            // await validateFork(blockchain.data.forks[0], forkExpected)

            // var btcPart : BtcInfo = await this.getBlockByHashInMockBTCApi(mapEsperado); 
            // var rskPart : RskForkItemInfo = 

            // var expect = {
            //     btc : {
            //         height : 1000
            //         hash: "sdadsdsa"
            //     }
            // }

            // var forkFound =  xxxxx
            // var forkExpected = xxxx
            // fork.equal(forkExpected)
            // fork.equal(forkExpected)

            await validateForksCreated(blockchain, expect, cpvDiffExpected, forksArrayWithLenghts);
           
            await validateMainchain(1000, 1);
        });

        it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 5 bytes CPV match", async () => {
            assert.equal(await getLastRSKHeight(context), bestRskBlock, "Please check test data, best block of RSK needs to be " + bestRskBlock);
            const blockchainsResponse = await getBlockchainsAfterMovingXBlocks(heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff, 1);
            const lastForksResponse = await getForksFromHeight(0);
            await setHeightInMockBTCApi(heightOfNoRskTags);
            //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
            await validateMainchain(1000, 1, null);
        })
        it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 0 bytes CPV match", async () => {
            assert.equal(await getLastRSKHeight(context), bestRskBlock, "Please check test data, best block of RSK needs to be " + bestRskBlock);
            const blockchainsResponse = await getBlockchainsAfterMovingXBlocks(heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff, 1);
            const lastForksResponse = await getForksFromHeight(0);
            await setHeightInMockBTCApi(heightOfNoRskTags);
            //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
            await validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
            await validateMainchain(1000, 1);
        })
    });
    describe("RSK no match at same height with matching CPV, RSK height in the future regarding BTC chain, mongo input validation", () => {
        it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, full CPV match, mongo input validation", async () => {
            assert.equal(await getLastRSKHeight(context), bestRskBlock, "Please check test data, best block of RSK needs to be " + bestRskBlock);
            const dbForks = await getDBForksAfterMovingXBlocks(btcApiRoute, heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff, 1);
            const mainchainBlocks = await findBlocks(armadilloDB, armadilloMainchain);
            await setHeightInMockBTCApi(heightOfNoRskTags);
            await validateForksRskBlockMongoDB(dbForks, [1]);
            await validateMainchainRskMongoDB(mainchainBlocks, 1);
        })
        it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 5 bytes CPV match, mongo input validation", async () => {
            assert.equal(await getLastRSKHeight(context), bestRskBlock, "Please check test data, best block of RSK needs to be " + bestRskBlock);
            const dbForks = await getDBForksAfterMovingXBlocks(btcApiRoute, heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff, 1);
            const mainchainBlocks = await findBlocks(armadilloDB, armadilloMainchain);
            await setHeightInMockBTCApi(heightOfNoRskTags);
            await validateForksRskBlockMongoDB(dbForks, [1]);
            let btcStart = heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff - firstBtcBlock;
            let btcEnd = btcStart + 1;
            await validateMainchainRskMongoDB(mainchainBlocks, 1, btcStart, btcEnd);
        })
        it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 0 bytes CPV match, mongo input validation", async () => {
            assert.equal(await getLastRSKHeight(context), bestRskBlock, "Please check test data, best block of RSK needs to be " + bestRskBlock);
            const dbForks = await getDBForksAfterMovingXBlocks(btcApiRoute, heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff, 1);
            const mainchainBlocks = await findBlocks(armadilloDB, armadilloMainchain);
            await setHeightInMockBTCApi(heightOfNoRskTags);
            await validateForksRskBlockMongoDB(dbForks, [1]);
            await validateMainchainRskMongoDB(mainchainBlocks, 1);
        })
    });

    describe("RSK no match at same height with matching CPV, RSK height in the future regarding BTC chain, mongo output validation", () => {
        it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, full CPV match, mongo output validation", async () => {
            const testId = "cpvmatch_length1forkconsecutive";
            const forksFile = forksPresentFilePrefix + testId + fileSuffix;
            const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
            await validateMongoOutput(mainchainFile, forksFile);
        })
        it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 5 bytes CPV match, mongo output validation", async () => {
            const testId = "cpv5b_length1forkconsecutive";
            const forksFile = forksPresentFilePrefix + testId + fileSuffix;
            const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
            await validateMongoOutput(mainchainFile, forksFile);
        })
        it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 0 bytes CPV match, mongo output validation", async () => {
            const testId = "cpv0b_length1forkconsecutive";
            const forksFile = forksPresentFilePrefix + testId + fileSuffix;
            const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
            await validateMongoOutput(mainchainFile, forksFile);
        })
    });
});