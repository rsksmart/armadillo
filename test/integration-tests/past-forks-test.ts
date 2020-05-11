import { readFileSync, writeFile, writeFileSync } from "fs";
import { BlockchainHistory } from "../../src/api/common/models";
import { BtcBlock } from "../../src/common/btc-block";
import { Fork, RangeForkInMainchain, ForkItem, Item } from "../../src/common/forks";
import { getBlockchainsAfterMovingXBlocks } from "./lib/armadillo-operations";
import { DEFAULT_CONFIG_PATH, dataInputPath, bestRskBlock, timeoutTests, apiPoolingTime, loadingTime, rskBlockHeightsWithBtcBlock, fileSuffix } from "./lib/configs";
import { HttpBtcApi } from "../../src/services/btc-api";
import { RskApiService } from "../../src/services/rsk-api-service";
import { MongoStore } from "../../src/storage/mongo-store";
import { ForkService } from "../../src/services/fork-service";
import { MainchainService } from "../../src/services/mainchain-service";
import { BtcApiConfig } from "../../src/config/btc-api-config";
import { RskApiConfig } from "../../src/config/rsk-api-config";
import { setHeightInMockBTCApi } from "./lib/btc-api-mocker";
import { getStartHeightMainchainForCPVDiff, getEndHeightMainchainForCPVDiff } from "./lib/cpv-helper";
import { RskBlockInfo, RskForkItemInfo } from "../../src/common/rsk-block";
import { utils } from "mocha";

const expect = require('chai').expect;
// const utils = require('./lib/utils');
const mongo_utils = require('./lib/mongo-utils');
const firstBtcBlock = 8704;
const amountOfMainchainBlocksInFork = 2;
const heightOfNoRskTags = firstBtcBlock + 0;
const heightOfConsecutiveRSKnoMatchPastSameBranch = firstBtcBlock + 92;
const heightOfNonConsecutiveRSKnoMatchPastSameBranch = firstBtcBlock + 97;
const heightOfConsecutiveRSKnoMatchPastDiffBranch = firstBtcBlock + 115;
const heightOfNonConsecutiveRSKnoMatchPastDiffBranch = firstBtcBlock + 119;
const heightOfConsecutiveRSKnoMatchPastFollowingMatch = firstBtcBlock + 95;
const heightOfNonConsecutiveRSKnoMatchPastFollowingMatch = firstBtcBlock + 107;
const forksPresentFilePrefix = dataInputPath + "past-forks-";
const mainchainPresentFilePrefix = dataInputPath + "past-mainchain-";

let btcApiService: HttpBtcApi
let rskApiService: RskApiService
let mongoStoreForks: MongoStore
let mongoStoreMainchain: MongoStore
let forkService: ForkService
let mainchainService: MainchainService
describe.only("RSK Forks in the past tests", () => {
    before(async () => {
        // db = await connectDB(armadilloDB)
        var mainConfig = JSON.parse(
            readFileSync(DEFAULT_CONFIG_PATH).toString()
        )
        let mongoConfigForks = mainConfig.store
        mongoConfigForks.collectionName = mainConfig.store.collections.forks
        mongoStoreForks = new MongoStore(mongoConfigForks)
        forkService = new ForkService(mongoStoreForks)

        await forkService.connect()
        let mongoConfigMainchain = mainConfig.store
        mongoConfigMainchain.collectionName =
            mainConfig.store.collections.mainchain
        mongoStoreMainchain = new MongoStore(mongoConfigMainchain)
        mainchainService = new MainchainService(mongoStoreMainchain)
        await mainchainService.connect()
        btcApiService = new HttpBtcApi(
            BtcApiConfig.fromObject(mainConfig.btcApi)
        )
        rskApiService = new RskApiService(
            RskApiConfig.fromObject(mainConfig.rskApi)
        )
    })
    after(async () => {
        await mainchainService.disconnect()
        await forkService.disconnect()
        // await disconnectDB(db)
    })
    beforeEach(async () => {
        // await deleteDB(db) //Esto borra producción, hay que connectar el monitor y la api que ejecutan a la de test.
        await forkService.deleteAll()
        await mainchainService.deleteAll()
    })
    afterEach(async () => {
        await setHeightInMockBTCApi(heightOfNoRskTags)
    })
    describe("RSK no match at same height with matching CPV, RSK height in the past regarding BTC chain", () => {
        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found", async () => {
            const initialHeight: number = heightOfConsecutiveRSKnoMatchPastSameBranch;
            let btcWitnessBlockHeight: number = initialHeight + 1;
            const blocksToMove: number = 1;
            const cpvDiffExpected: number = 0;
            //get actual blockchain
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject(
                (
                    await getBlockchainsAfterMovingXBlocks(
                        initialHeight,
                        blocksToMove
                    )
                ).data
            )
            //Get actual fork
            let fork: Fork = blockchain.forks[0]
            let timeExpected = blockchain.forks[0].getForkItems()[0].time //adding same time to remove from comparision.
            //Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(
                btcWitnessBlockHeight
            )
            const heightStart: number = getStartHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected
            ) //Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(
                heightStart
            )
            const heightEnd: number = getEndHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected,
                bestRskBlock
            ) //Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd)
            const range: RangeForkInMainchain = new RangeForkInMainchain(
                start,
                end
            )
            btcWitnessBlock.btcInfo.guessedMiner = null
            let rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(
                btcWitnessBlock.rskTag,
                bestRskBlock
            )

            const forkItem: ForkItem = new ForkItem(
                btcWitnessBlock.btcInfo,
                rskForkItemInfo,
                timeExpected
            )
            let forkExpected: Fork = new Fork(range, forkItem)
            //mainchain validation
            let btcMainchain: BtcBlock = await btcApiService.getBlock(
                initialHeight
            )
            btcMainchain.btcInfo.guessedMiner = null
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(
                btcMainchain.rskTag.BN
            )
            let itemExpected: Item = new Item(
                btcMainchain.btcInfo,
                rskBlockMainchain
            )
            const blockchainExpected: BlockchainHistory = new BlockchainHistory(
                [itemExpected],
                [forkExpected]
            )
            expect(blockchain).to.be.eql(blockchainExpected)
        })
        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following consecutive BTC block", async () => {
            const initialHeight: number = heightOfConsecutiveRSKnoMatchPastSameBranch;
            let btcWitnessBlockHeight: number = initialHeight + 1;
            let btcWitnessBlockHeight2 : number = initialHeight + 2;
            const blocksToMove: number = 2;
            const cpvDiffExpected: number = 0;
            //get actual blockchain
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject(
                (
                    await getBlockchainsAfterMovingXBlocks(
                        initialHeight,
                        blocksToMove
                    )
                ).data
            )
            //Get actual fork
            let fork: Fork = blockchain.forks[0]
            let timeExpected = fork.getForkItems()[0].time //adding same time to remove from comparision.
            //Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(
                btcWitnessBlockHeight
            )
            const heightStart: number = getStartHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected
            ) //Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(
                heightStart
            )
            const heightEnd: number = getEndHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected,
                bestRskBlock
            ) //Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd)
            const range: RangeForkInMainchain = new RangeForkInMainchain(
                start,
                end
            )
            const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(
                btcWitnessBlockHeight2
            )
            
            let rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(
                btcWitnessBlock.rskTag,
                bestRskBlock
            )
            let rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(
                btcWitnessBlock2.rskTag,
                bestRskBlock
            )
            btcWitnessBlock.btcInfo.guessedMiner = null
            btcWitnessBlock2.btcInfo.guessedMiner = null
            const forkItem: ForkItem = new ForkItem(
                btcWitnessBlock.btcInfo,
                rskForkItemInfo,
                timeExpected
            )
            const forkItem2: ForkItem = new ForkItem(
                btcWitnessBlock2.btcInfo,
                rskForkItemInfo2,
                timeExpected
            )
            let forkExpected: Fork = new Fork(range, [forkItem,forkItem2])
            //mainchain validation
            let btcMainchain: BtcBlock = await btcApiService.getBlock(
                initialHeight
            )
            btcMainchain.btcInfo.guessedMiner = null
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(
                btcMainchain.rskTag.BN
            )
            let itemExpected: Item = new Item(
                btcMainchain.btcInfo,
                rskBlockMainchain
            )
            const blockchainExpected: BlockchainHistory = new BlockchainHistory(
                [itemExpected],
                [forkExpected]
            )
            expect(blockchain).to.be.eql(blockchainExpected)
        });
        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following non consecutive BTC block", async () => {
            const initialHeight: number = heightOfNonConsecutiveRSKnoMatchPastSameBranch;
            let btcWitnessBlockHeight: number = initialHeight + 3;
            const blocksToMove: number = 3;
            const cpvDiffExpected: number = 0;
            //get actual blockchain
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject(
                (
                    await getBlockchainsAfterMovingXBlocks(
                        initialHeight,
                        blocksToMove
                    )
                ).data
            )
            //Get actual fork
            let fork: Fork = blockchain.forks[0]
            let timeExpected = blockchain.forks[0].getForkItems()[0].time //adding same time to remove from comparision.
            //Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(
                btcWitnessBlockHeight
            )
            const heightStart: number = getStartHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected
            ) //Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(
                heightStart
            )
            const heightEnd: number = getEndHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected,
                bestRskBlock
            ) //Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd)
            const range: RangeForkInMainchain = new RangeForkInMainchain(
                start,
                end
            )
            btcWitnessBlock.btcInfo.guessedMiner = null
            let rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(
                btcWitnessBlock.rskTag,
                bestRskBlock
            )

            const forkItem: ForkItem = new ForkItem(
                btcWitnessBlock.btcInfo,
                rskForkItemInfo,
                timeExpected
            )
            let forkExpected: Fork = new Fork(range, forkItem)
            //mainchain validation
            let btcMainchain: BtcBlock = await btcApiService.getBlock(
                initialHeight
            )
            btcMainchain.btcInfo.guessedMiner = null
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(
                btcMainchain.rskTag.BN
            )
            let itemExpected: Item = new Item(
                btcMainchain.btcInfo,
                rskBlockMainchain
            )
            const blockchainExpected: BlockchainHistory = new BlockchainHistory(
                [itemExpected],
                [forkExpected]
            )
            expect(blockchain).to.be.eql(blockchainExpected)
        });
    //     it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following consecutive BTC block", async () => {
    //         const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
    //             btcApiRoute, heightOfConsecutiveRSKnoMatchPastDiffBranch, 2, 2000, apiPoolingTime, loadingTime);
    //         const lastForksResponse = await utils.getForksFromHeight(0);
    //         await utils.setHeightInMockBTCApi(heightOfNoRskTags);
    //         //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
    //         await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1, 1]);
    //         await utils.validateMainchain(1000, 1);
    //     }).timeout(timeoutTests);
    //     it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following non consecutive BTC block", async () => {
    //         const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
    //             btcApiRoute, heightOfNonConsecutiveRSKnoMatchPastDiffBranch, 8, 2000, apiPoolingTime, loadingTime);
    //         const lastForksResponse = await utils.getForksFromHeight(0);
    //         await utils.setHeightInMockBTCApi(heightOfNoRskTags);
    //         //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
    //         await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1, 1]);
    //         await utils.validateMainchain(1000, 1);
    //     }).timeout(timeoutTests);
        it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following consecutive BTC block", async () => {
            const initialHeight: number = heightOfConsecutiveRSKnoMatchPastFollowingMatch;
            let btcWitnessBlockHeight: number = initialHeight + 1;
            let btcWitnessBlockHeightMainchain2: number = initialHeight + 2;
            const blocksToMove: number = 2;
            const cpvDiffExpected: number = 0;
            //get actual blockchain
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject(
                (
                    await getBlockchainsAfterMovingXBlocks(
                        initialHeight,
                        blocksToMove
                    )
                ).data
            )
            //Get actual fork
            let fork: Fork = blockchain.forks[0]
            let timeExpected = blockchain.forks[0].getForkItems()[0].time //adding same time to remove from comparision.
            //Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(
                btcWitnessBlockHeight
            )
            const heightStart: number = getStartHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected
            ) //Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(
                heightStart
            )
            const heightEnd: number = getEndHeightMainchainForCPVDiff(
                btcWitnessBlock.rskTag.BN,
                cpvDiffExpected,
                bestRskBlock
            ) //Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd)
            const range: RangeForkInMainchain = new RangeForkInMainchain(
                start,
                end
            )
            btcWitnessBlock.btcInfo.guessedMiner = null
            let rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(
                btcWitnessBlock.rskTag,
                bestRskBlock
            )

            const forkItem: ForkItem = new ForkItem(
                btcWitnessBlock.btcInfo,
                rskForkItemInfo,
                timeExpected
            )
            let forkExpected: Fork = new Fork(range, forkItem)
            //mainchain validation
            let btcMainchain: BtcBlock = await btcApiService.getBlock(
                initialHeight
            )
            btcMainchain.btcInfo.guessedMiner = null
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(
                btcMainchain.rskTag.BN
            )
            let itemExpected: Item = new Item(
                btcMainchain.btcInfo,
                rskBlockMainchain
            )
            let btcMainchain2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeightMainchain2);
            btcMainchain2.btcInfo.guessedMiner = null;
            let rskBlockMainchain2: RskBlockInfo = await rskApiService.getBlock( btcMainchain2.rskTag.BN );
            let itemExpected2: Item = new Item(btcMainchain2.btcInfo, rskBlockMainchain2);
            let mainchain: Item[] = [itemExpected2];
            for (let i = itemExpected2.rskInfo.height-1; i> itemExpected.rskInfo.height;i--) {
                rskBlockMainchain = await rskApiService.getBlock(i);
                mainchain.push(new Item(null,rskBlockMainchain));
            }
            mainchain.push(itemExpected);
            const blockchainExpected: BlockchainHistory = new BlockchainHistory(
                mainchain,
                [forkExpected]
            )
            expect(blockchain).to.be.eql(blockchainExpected)
            // await utils.validateMainchain(1000, 16);
        }).timeout(timeoutTests);
    //     it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following non consecutive BTC block", async () => {
    //         const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(
    //             btcApiRoute, heightOfNonConsecutiveRSKnoMatchPastFollowingMatch, 8, 2000, apiPoolingTime, loadingTime);
    //         const lastForksResponse = await utils.getForksFromHeight(0);
    //         await utils.setHeightInMockBTCApi(heightOfNoRskTags);
    //         //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
    //         await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock, 2, [1]);
    //         await utils.sleep(loadingTime);
    //         await utils.validateMainchain(1000, 6);
    //     }).timeout(timeoutTests);
    });

    // describe("RSK no match at same height with matching CPV, RSK height in the past regarding BTC chain, mongo input validation", () => {
    //     it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found, mongo input validation", async () => {
    //         const dbForks = await utils.getDBForksAfterMovingXBlocks(
    //             btcApiRoute, heightOfConsecutiveRSKnoMatchPastSameBranch, 1, apiPoolingTime, loadingTime);
    //         const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
    //         await utils.setHeightInMockBTCApi(heightOfNoRskTags);
    //         await utils.validateForksRskBlockMongoDB(dbForks, [1]);
    //         await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
    //     }).timeout(timeoutTests);
    //     it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following consecutive BTC block, mongo input validation", async () => {
    //         const dbForks = await utils.getDBForksAfterMovingXBlocks(
    //             btcApiRoute, heightOfConsecutiveRSKnoMatchPastSameBranch, 2, apiPoolingTime, loadingTime);
    //         const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
    //         await utils.setHeightInMockBTCApi(heightOfNoRskTags);
    //         await utils.validateForksRskBlockMongoDB(dbForks, [2]);
    //         await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
    //     }).timeout(timeoutTests);
    //     it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following non consecutive BTC block, mongo input validation", async () => {
    //         const dbForks = await utils.getDBForksAfterMovingXBlocks(
    //             btcApiRoute, heightOfNonConsecutiveRSKnoMatchPastSameBranch, 3, apiPoolingTime, loadingTime);
    //         const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
    //         await utils.setHeightInMockBTCApi(heightOfNoRskTags);
    //         await utils.validateForksRskBlockMongoDB(dbForks, [1]);
    //         await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
    //     }).timeout(timeoutTests);
    //     it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following consecutive BTC block, mongo input validation", async () => {
    //         const dbForks = await utils.getDBForksAfterMovingXBlocks(
    //             btcApiRoute, heightOfConsecutiveRSKnoMatchPastDiffBranch, 2, apiPoolingTime, loadingTime);
    //         const lastForksResponse = await utils.getForksFromHeight(0);
    //         const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
    //         await utils.setHeightInMockBTCApi(heightOfNoRskTags);
    //         await utils.validateForksRskBlockMongoDB(dbForks, [1, 1]);
    //         await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
    //     }).timeout(timeoutTests);
    //     it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following non consecutive BTC block, mongo input validation", async () => {
    //         const dbForks = await utils.getDBForksAfterMovingXBlocks(
    //             btcApiRoute, heightOfNonConsecutiveRSKnoMatchPastDiffBranch, 8, apiPoolingTime, loadingTime);
    //         const lastForksResponse = await utils.getForksFromHeight(0);
    //         const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
    //         await utils.setHeightInMockBTCApi(heightOfNoRskTags);
    //         await utils.validateForksRskBlockMongoDB(dbForks, [1, 1]);
    //         await utils.validateMainchainRskMongoDB(mainchainBlocks, 1);
    //     }).timeout(timeoutTests);
    //     it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following consecutive BTC block, mongo input validation", async () => {
    //         const dbForks = await utils.getDBForksAfterMovingXBlocks(
    //             btcApiRoute, heightOfConsecutiveRSKnoMatchPastFollowingMatch, 2, apiPoolingTime, loadingTime);
    //         const lastForksResponse = await utils.getForksFromHeight(0);
    //         const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
    //         await utils.setHeightInMockBTCApi(heightOfNoRskTags);
    //         await utils.validateForksRskBlockMongoDB(dbForks, [1]);
    //         await utils.validateMainchainRskMongoDB(mainchainBlocks, 16);
    //     }).timeout(timeoutTests);

    //     it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following non consecutive BTC block, mongo input validation", async () => {
    //         let numberOfBtcBlocksToMove = 8;
    //         const dbForks = await utils.getDBForksAfterMovingXBlocks(
    //             btcApiRoute, heightOfNonConsecutiveRSKnoMatchPastFollowingMatch, numberOfBtcBlocksToMove, apiPoolingTime, loadingTime);
    //         const mainchainBlocks = await mongo_utils.findBlocks(mongo_utils.ArmadilloDB, mongo_utils.ArmadilloMainchain);
    //         await utils.setHeightInMockBTCApi(heightOfNoRskTags);
    //         await utils.sleep(loadingTime);
    //         await utils.validateForksRskBlockMongoDB(dbForks, [1]);
    //         await utils.sleep(loadingTime);
    //         let startBTC = heightOfNonConsecutiveRSKnoMatchPastFollowingMatch - firstBtcBlock;
    //         let endBTC = startBTC + numberOfBtcBlocksToMove;
    //         await utils.validateMainchainRskMongoDB(mainchainBlocks, 6, startBTC, endBTC);
    //     }).timeout(timeoutTests);
    // });

    // describe("RSK no match at same height with matching CPV, RSK height in the past regarding BTC chain, mongo output validation", () => {
    //     it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found, mongo output validation", async () => {
    //         const testId = "pastfork_length1fork";
    //         const forksFile = forksPresentFilePrefix + testId + fileSuffix;
    //         const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
    //         await utils.validateMongoOutput(mainchainFile, forksFile);
    //     }).timeout(timeoutTests);
    //     it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following consecutive BTC block, mongo output validation", async () => {
    //         const testId = "pastfork_length2forkconsecutive";
    //         const forksFile = forksPresentFilePrefix + testId + fileSuffix;
    //         const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
    //         await utils.validateMongoOutput(mainchainFile, forksFile);
    //     }).timeout(timeoutTests);
    //     it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following non consecutive BTC block, mongo output validation", async () => {
    //         const testId = "pastfork_length2forknonconsecutive";
    //         const forksFile = forksPresentFilePrefix + testId + fileSuffix;
    //         const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
    //         await utils.validateMongoOutput(mainchainFile, forksFile);
    //     }).timeout(timeoutTests);
    //     it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following consecutive BTC block, mongo output validation", async () => {
    //         const testId = "pastfork_2forkslength1consecutive";
    //         const forksFile = forksPresentFilePrefix + testId + fileSuffix;
    //         const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
    //         await utils.validateMongoOutput(mainchainFile, forksFile);
    //     }).timeout(timeoutTests);
    //     it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following non consecutive BTC block, mongo output validation", async () => {
    //         const testId = "pastfork_2forkslength1nonconsecutive";
    //         const forksFile = forksPresentFilePrefix + testId + fileSuffix;
    //         const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
    //         await utils.validateMongoOutput(mainchainFile, forksFile);
    //     }).timeout(timeoutTests);
    //     it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following consecutive BTC block, mongo output validation", async () => {
    //         const testId = "pastfork_1fork1length1follows1rsktagmatchconsecutive";
    //         const forksFile = forksPresentFilePrefix + testId + fileSuffix;
    //         const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
    //         await utils.validateMongoOutput(mainchainFile, forksFile);
    //     }).timeout(timeoutTests);
    //     it("should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following non consecutive BTC block, mongo output validation", async () => {
    //         const testId = "pastfork_1fork1length1follows1rsktagmatchnonconsecutive";
    //         const forksFile = forksPresentFilePrefix + testId + fileSuffix;
    //         const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix
    //         await utils.validateMongoOutput(mainchainFile, forksFile);
    //     }).timeout(timeoutTests);
    // });
});