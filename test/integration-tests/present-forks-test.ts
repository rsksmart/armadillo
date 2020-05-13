import { readFileSync } from 'fs';
import { BlockchainHistory } from '../../src/api/common/models';
import { BtcBlock } from '../../src/common/btc-block';
import { Fork, ForkItem, Item, RangeForkInMainchain } from '../../src/common/forks';
import { RskBlockInfo, RskForkItemInfo } from '../../src/common/rsk-block';
import { BtcApiConfig } from '../../src/config/btc-api-config';
import { RskApiConfig } from '../../src/config/rsk-api-config';
import { HttpBtcApi } from '../../src/services/btc-api';
import { BtcService } from '../../src/services/btc-service';
import { ForkService } from '../../src/services/fork-service';
import { MainchainService } from '../../src/services/mainchain-service';
import { RskApiService } from '../../src/services/rsk-api-service';
import { MongoStore } from '../../src/storage/mongo-store';
import { getBlockchains, getBlockchainsAfterMovingXBlocks, moveXBlocks } from './lib/armadillo-operations';
import { setHeightInMockBTCApi, getBtcApiLastBlock } from './lib/btc-api-mocker';
import { bestRskBlock, DEFAULT_CONFIG_PATH, rskBlockHeightsWithBtcBlock } from './lib/configs';
import { getEndHeightMainchainForCPVDiff, getStartHeightMainchainForCPVDiff } from './lib/cpv-helper';
import { sleep, copy } from '../../src/util/helper';

const expect = require('chai').expect;
const utils = require('./lib/utils');
const mongo_utils = require('./lib/mongo-utils');
const mainchain = mongo_utils.ArmadilloMainchain;
const amountOfMainchainBlocksInFork = 1;
const firstBtcBlock = 8704;
const heightOfNoRskTags = firstBtcBlock + 0;
const heightOfConsecutiveRskTags = firstBtcBlock + 3;
const HConsecutiveNoMatchRskTags = firstBtcBlock + 19;
const HNonConsecutiveNoMatchRskTags = firstBtcBlock + 21;
const HMatchRSKWithFollowingNoMatch = firstBtcBlock + 29;
const HMatchRSKWithNoFollowingNoMatch = firstBtcBlock + 32;
const HNoMatchRSKWithFollowingMatch = firstBtcBlock + 31;
const HNoMatchRSK2CPVDiffConsecutive = firstBtcBlock + 39; // TODO correct data for this to be a 2 byte cpv diff
const HNoMatchRSK2CPVDiffNonConsecutive = firstBtcBlock + 44; // TODO correct data for this to be a 2 byte cpv diff
const HMatchRSK2CPVDiffConsecutive = firstBtcBlock + 43;
const HNoMatch2CPVDiffConsecutiveMatches = firstBtcBlock + 42;
const HNoMatch2CPVDiffNonConsecutiveMatches = firstBtcBlock + 49;
const HNoMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther = firstBtcBlock + 64;
const HNoMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther = firstBtcBlock + 70;
const HMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther = firstBtcBlock + 63;
const HMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther = firstBtcBlock + 67;
const HNoMatch2CPVDiffConsecutiveRskBlocksFollowingMatchesRsk = firstBtcBlock + 66;
const HNoMatch2CPVDiffNonConsecutiveRskBlocksFollowingMatchesRsk = firstBtcBlock + 66;
const HNoMatchRSK8CPVDiffConsecutive = firstBtcBlock + 52;
const HNoMatchRSK8CPVDiffNonConsecutive = firstBtcBlock + 57;
const HMatchRSK8CPVDiffConsecutive = firstBtcBlock + 51;
const HMatchRSK8CPVDiffNonConsecutive = firstBtcBlock + 55;
const HNoMatch8CPVDiffConsecutiveMatches = firstBtcBlock + 54;
const HNoMatch8CPVDiffNonConsecutiveMatches = firstBtcBlock + 61;
const HNoMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther = firstBtcBlock + 78;
const HNoMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther = firstBtcBlock + 84;
const HMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther = firstBtcBlock + 77;
const HMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther = firstBtcBlock + 81;
const HNoMatch8CPVDiffConsecutiveRskBlocksFollowingMatchesRsk = firstBtcBlock + 79;
const HNoMatch8CPVDiffNonConsecutiveRskBlocksFollowingMatchesRsk = firstBtcBlock + 86;
const apiPoolingTime = utils.apiPoolingTime;
const loadingTime = utils.loadingTime;
const dataInputPath = 'test/integration-tests/data/';
const forksPresentFilePrefix = dataInputPath + 'present-forks-';
const mainchainPresentFilePrefix = dataInputPath + 'present-mainchain-';
const fileSuffix = '.json';
const btcApiRoute = 'raw';
let btcApiService: HttpBtcApi;
let rskApiService: RskApiService;
let mongoStoreForks: MongoStore;
let mongoStoreMainchain: MongoStore;
let mongoStoreBtc: MongoStore;
let forkService: ForkService;
let mainchainService: MainchainService;
let btcService: BtcService;
describe('RSK Forks in the present tests', () => {
    before(async () => {
        // db = await connectDB(armadilloDB)
        const mainConfig = JSON.parse(readFileSync(DEFAULT_CONFIG_PATH).toString());
        const mongoConfigForks = mainConfig.store;
        mongoConfigForks.collectionName = mainConfig.store.collections.forks;
        mongoStoreForks = new MongoStore(mongoConfigForks);
        forkService = new ForkService(mongoStoreForks);
        await forkService.connect();
        const mongoConfigMainchain = mainConfig.store;
        mongoConfigMainchain.collectionName = mainConfig.store.collections.mainchain;
        mongoStoreMainchain = new MongoStore(mongoConfigMainchain);
        mainchainService = new MainchainService(mongoStoreMainchain);
        await mainchainService.connect();
        const mongoConfigBtc = mainConfig.store;
        mongoConfigBtc.collectionName = mainConfig.store.collections.btc;
        mongoStoreBtc = new MongoStore(mongoConfigBtc);
        btcService = new BtcService(mongoStoreBtc);
        await btcService.connect();
        btcApiService = new HttpBtcApi(BtcApiConfig.fromObject(mainConfig.btcApi));
        rskApiService = new RskApiService(RskApiConfig.fromObject(mainConfig.rskApi));
    });
    after(async () => {
        await mainchainService.disconnect();
        await forkService.disconnect();
        // await disconnectDB(db)
    });
    beforeEach(async () => {
        // await deleteDB(db) // Esto borra producción, hay que connectar el monitor y la api que ejecutan a la de test.
        await forkService.deleteAll();
        await mainchainService.deleteAll();
    });
    afterEach(async () => {
        await setHeightInMockBTCApi(heightOfNoRskTags);
    });
    describe('RSK Forks in the present - end to end tests', () => {
        describe('RSK no match at same height with matching CPV', () => {
            // test 1 - end to end
            it('should not create branch for BTC block matching RSK tag, end to end', async () => {
                const initialHeight: number = heightOfConsecutiveRskTags;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                let bestBlock = await getBtcApiLastBlock();
                let btcLastCheckedBlock: BtcBlock = await btcService.getLastBlockDetected();
                while (!btcLastCheckedBlock || btcLastCheckedBlock.btcInfo.height !== bestBlock.height) {
                    await sleep(100);
                    btcLastCheckedBlock = await btcService.getLastBlockDetected();
                }
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchains()).data);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], []);
                expect(blockchain).to.be.eql(blockchainExpected);
            });
            // test 2 - end to end
            it('should create branch for first BTC block with no matching RSK tag, end to end', async () => {
                const initialHeight: number = HConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                const bestBlock = await getBtcApiLastBlock();
                let btcLastCheckedBlock: BtcBlock = await btcService.getLastBlockDetected();
                while (!btcLastCheckedBlock || btcLastCheckedBlock.btcInfo.height !== bestBlock.height) {
                    await sleep(100);
                    btcLastCheckedBlock = await btcService.getLastBlockDetected();
                }
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchains()).data);
                // Get actual fork
                const timeExpected = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                // Prepare expected fork

                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkExpected: Fork = new Fork(range, forkItem);
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                expect(blockchainExpected).to.be.eql(blockchain);
            });
            // test 3 - end to end
            it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                const initialHeight: number = HConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const btcWitnessBlockHeight2: number = initialHeight + 1;
                const blocksToMove: number = 1;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);
                // Get actual fork
                const fork: Fork = blockchain.forks[0];
                const timeExpected = fork.getForkItems()[0].time; // adding same time to remove from comparision.
                const timeExpected2 = fork.getForkItems()[1].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                expect(blockchain).to.be.eql(blockchainExpected);
            });
            // test 4 - end to end
            it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                const initialHeight: number = HNonConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const btcWitnessBlockHeight2: number = initialHeight + 3;
                const blocksToMove: number = 3;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);
                // Get actual fork
                const fork: Fork = blockchain.forks[0];
                const timeExpected = fork.getForkItems()[0].time; // adding same time to remove from comparision.
                const timeExpected2 = fork.getForkItems()[1].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                expect(blockchain).to.be.eql(blockchainExpected);
            });
            // test 5 - end to end
            it('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                const initialHeight: number = HConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const btcWitnessBlockHeight2: number = initialHeight + 1;
                const btcWitnessBlockHeight3: number = initialHeight + 2;
                const blocksToMove: number = 2;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);
                // Get actual fork
                const fork: Fork = blockchain.forks[0];
                const timeExpected = fork.getForkItems()[0].time; // adding same time to remove from comparision.
                const timeExpected2 = fork.getForkItems()[1].time;
                const timeExpected3 = fork.getForkItems()[2].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight3);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                const rskForkItemInfo3: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock3.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                btcWitnessBlock3.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                const forkItem3: ForkItem = new ForkItem(btcWitnessBlock3.btcInfo, rskForkItemInfo3, timeExpected3);
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2, forkItem3]);
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                expect(blockchain).to.be.eql(blockchainExpected);
            });
            // test 6 - end to end
            it('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                const initialHeight: number = HNonConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const btcWitnessBlockHeight2: number = initialHeight + 3;
                const btcWitnessBlockHeight3: number = initialHeight + 6;
                const blocksToMove: number = 6;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);
                // Get actual fork
                const fork: Fork = blockchain.forks[0];
                const timeExpected = fork.getForkItems()[0].time; // adding same time to remove from comparision.
                const timeExpected2 = fork.getForkItems()[1].time;
                const timeExpected3 = fork.getForkItems()[2].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight3);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                const rskForkItemInfo3: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock3.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                btcWitnessBlock3.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                const forkItem3: ForkItem = new ForkItem(btcWitnessBlock3.btcInfo, rskForkItemInfo3, timeExpected3);
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2, forkItem3]);
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                expect(blockchain).to.be.eql(blockchainExpected);
            });
            // test 7 - end to end
            it('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end', async () => {
                const initialHeight: number = HMatchRSKWithFollowingNoMatch;
                const btcWitnessBlockHeight: number = initialHeight + 1;
                const blocksToMove: number = 1;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);
                // Get actual fork
                // adding same time to remove from comparision.
                const timeExpected = blockchain.forks[0].getForkItems()[0].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkExpected: Fork = new Fork(range, forkItem);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                expect(blockchain).to.be.eql(blockchainExpected);
            });
            // test 8 - end to end
            it('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, end to end', async () => {
                const initialHeight: number = HMatchRSKWithNoFollowingNoMatch;
                const btcWitnessBlockHeight: number = initialHeight + 2;
                const blocksToMove: number = 2;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);
                // Get actual fork
                // adding same time to remove from comparision.
                const timeExpected = blockchain.forks[0].getForkItems()[0].time;
                // Prepare expected fork

                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkExpected: Fork = new Fork(range, forkItem);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                expect(blockchain).to.be.eql(blockchainExpected);
            });
            // test 9 - end to end
            it('should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, end to end', async () => {
                const initialHeight: number = HMatchRSKWithFollowingNoMatch;
                const btcWitnessBlockHeight: number = initialHeight + 1;
                const btcWitnessBlockHeight2: number = initialHeight + 2;
                const blocksToMove: number = 2;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);
                // Get actual fork
                const fork: Fork = blockchain.forks[0];
                const timeExpected = fork.getForkItems()[0].time; // adding same time to remove from comparision.
                const timeExpected2 = fork.getForkItems()[1].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);

                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                expect(blockchain).to.be.eql(blockchainExpected);
            });
            // test 10 - end to end
            it('should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, end to end', async () => {
                const initialHeight: number = HMatchRSKWithNoFollowingNoMatch;
                const btcWitnessBlockHeight: number = initialHeight + 2;
                const btcWitnessBlockHeight2: number = initialHeight + 5;
                const blocksToMove: number = 5;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);
                // Get actual fork
                const fork: Fork = blockchain.forks[0];
                const timeExpected = fork.getForkItems()[0].time; // adding same time to remove from comparision.
                const timeExpected2 = fork.getForkItems()[1].time;
                // Prepare expected fork

                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);

                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                expect(blockchain).to.be.eql(blockchainExpected);
            });
            // TODO FIX IN ARMADILLO FIRST - test 11 - end to end
            it.skip('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end', async () => {
                const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatchRSKWithFollowingMatch, 1, 2000, apiPoolingTime, loadingTime);
                const lastForksResponse = await utils.getForksFromHeight(0);
                await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [1]);
            });
        });
        describe('RSK no match at same height with difference in 2 bytes in CPV', () => {
            describe('No matching RSK tags match CPV among each other', () => {
                // test 12 - end to end
                it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 1;
                    const blocksToMove: number = 1;
                    const cpvDiffExpected: number = 0;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                    btcService.save(firstToCheckBtc);
                    await setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);
                    // Get actual fork
                    const fork: Fork = blockchain.forks[0];
                    const timeExpected = fork.getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpected2 = fork.getForkItems()[1].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 13 - end to end
                it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 3;
                    const blocksToMove: number = 3;
                    const cpvDiffExpected: number = 0;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                    btcService.save(firstToCheckBtc);
                    await setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);
                    // Get actual fork
                    const fork: Fork = blockchain.forks[0];
                    const timeExpected = fork.getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpected2 = fork.getForkItems()[1].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 14 - end to end
                it('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 1;
                    const btcWitnessBlockHeight3: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpected: number = 0;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                    btcService.save(firstToCheckBtc);
                    await setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);
                    // Get actual fork
                    const fork: Fork = blockchain.forks[0];
                    const timeExpected = fork.getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpected2 = fork.getForkItems()[1].time;
                    const timeExpected3 = fork.getForkItems()[2].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                    const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight3);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    const rskForkItemInfo3: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock3.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    btcWitnessBlock3.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                    const forkItem3: ForkItem = new ForkItem(btcWitnessBlock3.btcInfo, rskForkItemInfo3, timeExpected3);
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2, forkItem3]);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 15 - end to end
                it('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 3;
                    const btcWitnessBlockHeight3: number = initialHeight + 5;
                    const blocksToMove: number = 5;
                    const cpvDiffExpected: number = 0;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                    btcService.save(firstToCheckBtc);
                    await setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);
                    // Get actual fork
                    const fork: Fork = blockchain.forks[0];
                    const timeExpected = fork.getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpected2 = fork.getForkItems()[1].time;
                    const timeExpected3 = fork.getForkItems()[2].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                    const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight3);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    const rskForkItemInfo3: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock3.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    btcWitnessBlock3.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                    const forkItem3: ForkItem = new ForkItem(btcWitnessBlock3.btcInfo, rskForkItemInfo3, timeExpected3);
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2, forkItem3]);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // TODO test 16 - end to end
                it.skip('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HMatchRSK2CPVDiffConsecutive, 2, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [1]);
                    await utils.validateMainchain(1000, 1);
                });
                // TODO test 17 - end to end
                it.skip('should create branch for first BTC block with matching RSK tag, following 2 BTC block with 2 bytes difference CPV no match RSK tagswith no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HMatchRSK2CPVDiffConsecutive, 4, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [2]);
                    await utils.validateMainchain(1000, 1);
                });
                // TODO test 18 - end to end
                it.skip('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatch2CPVDiffConsecutiveMatches, 1, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [1]);
                });
                // TODO test 19 - end to end
                it.skip('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatch2CPVDiffNonConsecutiveMatches, 2, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [1]);
                    await utils.validateMainchain(1000, 1);
                });
            });
            describe('No matching RSK tags no match CPV among each other', () => {
                // TODO test 20 - end to end
                it.skip('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther, 1, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [1, 1]);
                });
                // TODO test 21 - end to end
                it.skip('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 3, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [1, 1]);
                });
                // TODO test 22 - end to end
                it.skip('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther, 2, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [1, 2]);
                });
                // TODO test 23 - end to end
                it.skip('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 5, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 3, rskBlockHeightsWithBtcBlock(), 2, [1, 2]);
                });
                // TODO test 24 - end to end
                it.skip('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther, 1, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [1]);
                    await utils.validateMainchain(1000, 1);
                });
                // TODO test 25 - end to end
                it.skip('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 3, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [1]);
                    await utils.validateMainchain(1000, 1);
                });
                // TODO test 26 - end to end
                it.skip('should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther, 2, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock(), 2, [1, 1]);
                    await utils.validateMainchain(1000, 1);
                });
                // TODO test 27 - end to end
                it.skip('should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 6, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock(), 2, [1, 1]);
                    await utils.validateMainchain(1000, 1);
                });
                // TODO test 28 - end to end
                it.skip('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatch2CPVDiffConsecutiveRskBlocksFollowingMatchesRsk, 1, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock(), 2, [1]);
                });
                // TODO test 29 - end to end
                it.skip('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatch2CPVDiffNonConsecutiveRskBlocksFollowingMatchesRsk, 2, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //    validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [1]);
                });
            });
        });
        describe('RSK no match at same height with no match CPV', () => {
            describe('No matching RSK tags match CPV among each other', () => {
                // TODO test 30 - end to end
                it.skip('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatchRSK8CPVDiffConsecutive, 1, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [1, 1]);
                });
                // TODO test 31 - end to end
                it.skip('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatchRSK8CPVDiffNonConsecutive, 2, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [2]);
                });
                // TODO test 32 - end to end
                it.skip('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatchRSK8CPVDiffConsecutive, 3, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [1, 1, 1]);
                });
                // TODO test 33 - end to end
                it.skip('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatchRSK8CPVDiffNonConsecutive, 4, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [3]);
                });
                // TODO test 34 - end to end
                it.skip('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HMatchRSK8CPVDiffConsecutive, 1, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [1]);
                    await utils.validateMainchain(1000, 1);
                });
                // TODO test 35 - end to end
                it.skip('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HMatchRSK8CPVDiffNonConsecutive, 2, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [1]);
                    await utils.validateMainchain(1000, 1);
                });
                // TODO test 36 - end to end
                it.skip('should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HMatchRSK8CPVDiffConsecutive, 2, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [1, 1]);
                    await utils.validateMainchain(1000, 1);
                });
                // TODO test 37 - end to end
                it.skip('should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HMatchRSK8CPVDiffNonConsecutive, 4, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [2]);
                    await utils.validateMainchain(1000, 1);
                });
                // TODO test 38 - end to end
                it.skip('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatch8CPVDiffConsecutiveMatches, 1, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [1]);
                });
                // TODO test 39 - end to end
                it.skip('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatch8CPVDiffNonConsecutiveMatches, 2, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, amountOfMainchainBlocksInFork, rskBlockHeightsWithBtcBlock(), 2, [1]);
                    await utils.validateMainchain(1000, 1);
                });
            });
            describe('No matching RSK tags no match CPV among each other', () => {
                // TODO test 40 - end to end
                it.skip('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther, 1, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock(), 2, [1, 1]);
                });
                // TODO test 41 - end to end
                it.skip('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 3, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock(), 2, [1, 1]);
                });
                // TODO test 42 - end to end
                it.skip('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther, 3, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 3, rskBlockHeightsWithBtcBlock(), 2, [1, 2]);
                });
                // TODO test 43 - end to end
                it.skip('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 6, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 3, rskBlockHeightsWithBtcBlock(), 2, [1, 2]);
                });
                // TODO test 44 - end to end
                it.skip('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther, 2, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock(), 2, [1, 1]);
                    await utils.validateMainchain(1000, 1);
                });
                // TODO test 45 - end to end
                it.skip('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther, 6, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock(), 2, [1, 1]);
                    await utils.validateMainchain(1000, 1);
                });
                // TODO test 46 - end to end
                it.skip('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatch8CPVDiffConsecutiveRskBlocksFollowingMatchesRsk, 2, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock(), 2, [2]);
                });
                // TODO test 47 - end to end
                it.skip('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, end to end', async () => {
                    const blockchainsResponse = await utils.getBlockchainsAfterMovingXBlocks(btcApiRoute, HNoMatch8CPVDiffNonConsecutiveRskBlocksFollowingMatchesRsk, 6, 2000, apiPoolingTime, loadingTime);
                    const lastForksResponse = await utils.getForksFromHeight(0);
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                    //          validateForksCreated(blockchainsResponse, lastForksResponse, numberOfForksExpected, rskTagsMap, expectedMainchainBlocks)
                    await utils.validateForksCreated(blockchainsResponse, lastForksResponse, 2, rskBlockHeightsWithBtcBlock(), 2, [2]);
                    await utils.validateMainchain(1000, 1);
                });
            });
        });
    });
    describe('RSK Forks in the present - mongo input tests', () => {
        describe('RSK no match at same height with matching CPV, mongo input validation', () => {
            // test 1 - mongo input
            it('should not create branch for BTC block matching RSK tag, mongo input validation', async () => {
                const initialHeight: number = heightOfConsecutiveRskTags;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                const bestBlock = await getBtcApiLastBlock();
                let btcLastCheckedBlock: BtcBlock = await btcService.getLastBlockDetected();
                while (!btcLastCheckedBlock || btcLastCheckedBlock.btcInfo.height !== bestBlock.height) {
                    await sleep(100);
                    btcLastCheckedBlock = await btcService.getLastBlockDetected();
                }

                const forks: Fork[] = await forkService.getAll();
                const mainchain: Item[] = await mainchainService.getAll();
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                expect(forks).to.be.eql([]);
                expect(mainchain).to.be.eql([itemExpected]);
            });
            // test 2 - mongo input
            it('should create branch for first BTC block with no matching RSK tag, mongo input validation', async () => {
                const initialHeight: number = HConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                const bestBlock = await getBtcApiLastBlock();
                let btcLastCheckedBlock: BtcBlock = await btcService.getLastBlockDetected();
                while (!btcLastCheckedBlock || btcLastCheckedBlock.btcInfo.height !== bestBlock.height) {
                    await sleep(100);
                    btcLastCheckedBlock = await btcService.getLastBlockDetected();
                }
                const forks: Fork[] = await forkService.getAll();
                const mainchain: Item[] = await mainchainService.getAll();
                const timeExpected: string = forks[0].getForkItems()[0].time;
                // Prepare expected fork

                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkExpected: Fork = new Fork(range, forkItem);
                expect(forks).to.be.eql([forkExpected]);
                expect(mainchain).to.be.eql([]);
            });
            // test 3 - mongo input
            it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                const initialHeight: number = HConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const btcWitnessBlockHeight2: number = initialHeight + 1;
                const blocksToMove: number = 1;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                await moveXBlocks(blocksToMove, btcService);
                let forks: Fork[] = await forkService.getAll();
                let mainchain: Item[] = await mainchainService.getAll();
                const timeExpected = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                const timeExpected2 = forks[0].getForkItems()[1].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                expect(forks).to.be.eql([forkExpected]);
                expect(mainchain).to.be.eql([]);
            });
            // test 4 - mongo input
            it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                const initialHeight: number = HNonConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const btcWitnessBlockHeight2: number = initialHeight + 3;
                const blocksToMove: number = 3;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                await moveXBlocks(blocksToMove, btcService);
                let forks: Fork[] = await forkService.getAll();
                let mainchain: Item[] = await mainchainService.getAll();
                const timeExpected = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                const timeExpected2 = forks[0].getForkItems()[1].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                expect(forks).to.be.eql([forkExpected]);
                expect(mainchain).to.be.eql([]);
            });
            // test 5 - mongo input
            it('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                const initialHeight: number = HConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const btcWitnessBlockHeight2: number = initialHeight + 1;
                const btcWitnessBlockHeight3: number = initialHeight + 2;
                const blocksToMove: number = 2;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                await moveXBlocks(blocksToMove, btcService);
                let forks: Fork[] = await forkService.getAll();
                let mainchain: Item[] = await mainchainService.getAll();
                const timeExpected = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                const timeExpected2 = forks[0].getForkItems()[1].time;
                const timeExpected3 = forks[0].getForkItems()[2].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight3);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                const rskForkItemInfo3: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock3.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                btcWitnessBlock3.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                const forkItem3: ForkItem = new ForkItem(btcWitnessBlock3.btcInfo, rskForkItemInfo3, timeExpected3);
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2, forkItem3]);
                expect(forks).to.be.eql([forkExpected]);
                expect(mainchain).to.be.eql([]);
            });
            // test 6 - mongo input
            it('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                const initialHeight: number = HNonConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const btcWitnessBlockHeight2: number = initialHeight + 3;
                const btcWitnessBlockHeight3: number = initialHeight + 6;
                const blocksToMove: number = 6;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                await moveXBlocks(blocksToMove, btcService);
                let forks: Fork[] = await forkService.getAll();
                let mainchain: Item[] = await mainchainService.getAll();
                const timeExpected = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                const timeExpected2 = forks[0].getForkItems()[1].time;
                const timeExpected3 = forks[0].getForkItems()[2].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight3);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                const rskForkItemInfo3: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock3.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                btcWitnessBlock3.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                const forkItem3: ForkItem = new ForkItem(btcWitnessBlock3.btcInfo, rskForkItemInfo3, timeExpected3);
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2, forkItem3]);
                expect(forks).to.be.eql([forkExpected]);
                expect(mainchain).to.be.eql([]);
            });
            // test 7 - mongo input
            it('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                const initialHeight: number = HMatchRSKWithFollowingNoMatch;
                const btcWitnessBlockHeight: number = initialHeight + 1;
                const blocksToMove: number = 1;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                await moveXBlocks(blocksToMove, btcService);
                const forks: Fork[] = await forkService.getAll();
                const mainchain: Item[] = await mainchainService.getAll();
                const time: string = forks[0].getForkItems()[0].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, time);
                const forkExpected: Fork = new Fork(range, forkItem);
                // mainchain validation
                let btcMainchain: BtcBlock = await btcApiService.getBlock(initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                let itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                expect(forks).to.be.eql([forkExpected]);
                expect(mainchain).to.be.eql([itemExpected]);
            });
            // test 8 - mongo input
            it('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                const initialHeight: number = HMatchRSKWithNoFollowingNoMatch;
                const btcWitnessBlockHeight: number = initialHeight + 2;
                const blocksToMove: number = 2;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                await moveXBlocks(blocksToMove, btcService);
                const forks: Fork[] = await forkService.getAll();
                const mainchain: Item[] = await mainchainService.getAll();
                const time: string = forks[0].getForkItems()[0].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, time);
                const forkExpected: Fork = new Fork(range, forkItem);
                // mainchain validation
                let btcMainchain: BtcBlock = await btcApiService.getBlock(initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                let itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                expect(forks).to.be.eql([forkExpected]);
                expect(mainchain).to.be.eql([itemExpected]);
            });
            // test 9 - mongo input
            it('should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                const initialHeight: number = HMatchRSKWithFollowingNoMatch;
                const btcWitnessBlockHeight: number = initialHeight + 1;
                const btcWitnessBlockHeight2: number = initialHeight + 2;
                const blocksToMove: number = 2;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                await moveXBlocks(blocksToMove, btcService);
                const forks: Fork[] = await forkService.getAll();
                const mainchain: Item[] = await mainchainService.getAll();
                const timeExpected: string = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                const timeExpected2: string = forks[0].getForkItems()[1].time;
                // Prepare expected fork

                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);

                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                expect([itemExpected]).to.be.eql(mainchain);
                expect([forkExpected]).to.be.eql(forks);
            });
            // test 10 - mongo input
            it('should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                const initialHeight: number = HMatchRSKWithNoFollowingNoMatch;
                const btcWitnessBlockHeight: number = initialHeight + 2;
                const btcWitnessBlockHeight2: number = initialHeight + 5;
                const blocksToMove: number = 5;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                btcService.save(firstToCheckBtc);
                await setHeightInMockBTCApi(initialHeight);
                await moveXBlocks(blocksToMove, btcService);
                const forks: Fork[] = await forkService.getAll();
                const mainchain: Item[] = await mainchainService.getAll();
                const timeExpected: string = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                const timeExpected2: string = forks[0].getForkItems()[1].time;
                // Prepare expected fork

                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);

                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                expect([itemExpected]).to.be.eql(mainchain);
                expect([forkExpected]).to.be.eql(forks);
            });
            // TODO test 11 - mongo input
            it.skip('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo input validation', async () => {
                await utils.setHeightInMockBTCApi(heightOfNoRskTags);
            });
        });
        describe('RSK no match at same height with difference in 2 bytes in CPV, mongo input validation', () => {
            describe('No matching RSK tags match CPV among each other', () => {
                // TODO test 12 - mongo input
                it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 1;
                    const blocksToMove: number = 1;
                    const cpvDiffExpected: number = 0;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                    btcService.save(firstToCheckBtc);
                    await setHeightInMockBTCApi(initialHeight);
                    await moveXBlocks(blocksToMove, btcService);
                    let forks: Fork[] = await forkService.getAll();
                    let mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpected2 = forks[0].getForkItems()[1].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                    expect(forks).to.be.eql([forkExpected]);
                    expect(mainchain).to.be.eql([]);
                });
                // TODO test 13 - mongo input
                it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 3;
                    const blocksToMove: number = 3;
                    const cpvDiffExpected: number = 0;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                    btcService.save(firstToCheckBtc);
                    await setHeightInMockBTCApi(initialHeight);
                    await moveXBlocks(blocksToMove, btcService);
                    let forks: Fork[] = await forkService.getAll();
                    let mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpected2 = forks[0].getForkItems()[1].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                    expect(forks).to.be.eql([forkExpected]);
                    expect(mainchain).to.be.eql([]);
                });
                // TODO test 14 - mongo input
                it('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 1;
                    const btcWitnessBlockHeight3: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpected: number = 0;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                    btcService.save(firstToCheckBtc);
                    await setHeightInMockBTCApi(initialHeight);
                    await moveXBlocks(blocksToMove, btcService);
                    let forks: Fork[] = await forkService.getAll();
                    let mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpected2 = forks[0].getForkItems()[1].time;
                    const timeExpected3 = forks[0].getForkItems()[2].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                    const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight3);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    const rskForkItemInfo3: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock3.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    btcWitnessBlock3.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                    const forkItem3: ForkItem = new ForkItem(btcWitnessBlock3.btcInfo, rskForkItemInfo3, timeExpected3);
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2, forkItem3]);
                    expect(forks).to.be.eql([forkExpected]);
                    expect(mainchain).to.be.eql([]);
                });
                // TODO test 15 - mongo input
                it('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 3;
                    const btcWitnessBlockHeight3: number = initialHeight + 5;
                    const blocksToMove: number = 5;
                    const cpvDiffExpected: number = 0;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                    btcService.save(firstToCheckBtc);
                    await setHeightInMockBTCApi(initialHeight);
                    await moveXBlocks(blocksToMove, btcService);
                    let forks: Fork[] = await forkService.getAll();
                    let mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpected2 = forks[0].getForkItems()[1].time;
                    const timeExpected3 = forks[0].getForkItems()[2].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                    const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight3);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    const rskForkItemInfo3: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock3.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    btcWitnessBlock3.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                    const forkItem3: ForkItem = new ForkItem(btcWitnessBlock3.btcInfo, rskForkItemInfo3, timeExpected3);
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2, forkItem3]);
                    expect(forks).to.be.eql([forkExpected]);
                    expect(mainchain).to.be.eql([]);
                });
                // TODO test 16 - mongo input
                it.skip('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 17 - mongo input
                it.skip('should create branch for first BTC block with matching RSK tag, following 2 BTC block with 2 bytes difference CPV no match RSK tagswith no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 18 - mongo input
                it.skip('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 19 - mongo input
                it.skip('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
            });
            describe('No matching RSK tags no match CPV among each other', () => {
                it.skip('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 21 - mongo input
                it.skip('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 22 - mongo input
                it.skip('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 23 - mongo input
                it.skip('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 24 - mongo input
                it.skip('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 25 - mongo input
                it.skip('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 26 - mongo input
                it.skip('should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 27 - mongo input
                it.skip('should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 28 - mongo input
                it.skip('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 29 - mongo input
                it.skip('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
            });
        });
        describe('RSK no match at same height with no match CPV, mongo input validation', () => {
            describe('No matching RSK tags match CPV among each other', () => {
                // TODO test 30 - mongo input
                it.skip('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 31 - mongo input
                it.skip('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 32 - mongo input
                it.skip('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 33 - mongo input
                it.skip('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 34 - mongo input
                it.skip('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 35 - mongo input
                it.skip('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 36 - mongo input
                it.skip('should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 37 - mongo input
                it.skip('should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 38 - mongo input
                it.skip('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 39 - mongo input
                it.skip('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
            });
            describe('No matching RSK tags no match CPV among each other', () => {
                // TODO test 40 - mongo input
                it.skip('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 41 - mongo input
                it.skip('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 42 - mongo input
                it.skip('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 43 - mongo input
                it.skip('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 44 - mongo input
                it.skip('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 45 - mongo input
                it.skip('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 46 - mongo input
                it.skip('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
                // TODO test 47 - mongo input
                it.skip('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo input validation', async () => {
                    await utils.setHeightInMockBTCApi(heightOfNoRskTags);
                });
            });
        });
    });
    describe('RSK Forks in the present - mongo output tests', () => {
        describe('RSK no match at same height with matching CPV, mongo output validation', () => {
            // test 1 - mongo output
            it('should not create branch for BTC block matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = heightOfConsecutiveRskTags;
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                // Dump to Armadillo DB expected Mainchain and Fork elements
                await mainchainService.save(copy([itemExpected]));
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], []);
                const numberOfBtcWitnessBlocksToAsk: number = 1000;
                const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
                expect(blockchainExpected).to.be.eql(blockchain);
            });
            // test 2 - mongo output
            it('should create branch for first BTC block with no matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = HConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const cpvDiffExpected: number = 0;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                const forkExpected: Fork = new Fork(range, forkItem);
                // Dump to Armadillo DB expected Mainchain and Fork elements
                await forkService.save(copy(forkExpected));
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                const numberOfBtcWitnessBlocksToAsk: number = 1000;
                const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
                expect(blockchainExpected).to.be.eql(blockchain);
            });
            // test 3 - mongo output
            it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = HConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const btcWitnessBlockHeight2: number = initialHeight + 1;
                const cpvDiffExpected: number = 0;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, Date());
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                // Dump to Armadillo DB expected Mainchain and Fork elements
                await forkService.save(copy(forkExpected));
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                const numberOfBtcWitnessBlocksToAsk: number = 1000;
                const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
                expect(blockchainExpected).to.be.eql(blockchain);
            });
            // test 4 - mongo output
            it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = HNonConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const btcWitnessBlockHeight2: number = initialHeight + 3;
                const cpvDiffExpected: number = 0;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, Date());
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                // Dump to Armadillo DB expected Mainchain and Fork elements
                await forkService.save(copy(forkExpected));
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                const numberOfBtcWitnessBlocksToAsk: number = 1000;
                const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
                expect(blockchainExpected).to.be.eql(blockchain);
            });
            // test 5 - mongo output
            it('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = HConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const btcWitnessBlockHeight2: number = initialHeight + 1;
                const btcWitnessBlockHeight3: number = initialHeight + 2;
                const cpvDiffExpected: number = 0;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight3);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                const rskForkItemInfo3: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock3.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                btcWitnessBlock3.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, Date());
                const forkItem3: ForkItem = new ForkItem(btcWitnessBlock3.btcInfo, rskForkItemInfo3, Date());
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2, forkItem3]);
                // Dump to Armadillo DB expected Mainchain and Fork elements
                await forkService.save(copy(forkExpected));
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                const numberOfBtcWitnessBlocksToAsk: number = 1000;
                const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
                expect(blockchainExpected).to.be.eql(blockchain);
            });
            // test 6 - mongo output
            it('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = HNonConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const btcWitnessBlockHeight2: number = initialHeight + 3;
                const btcWitnessBlockHeight3: number = initialHeight + 6;
                const cpvDiffExpected: number = 0;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight3);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                const rskForkItemInfo3: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock3.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                btcWitnessBlock3.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, Date());
                const forkItem3: ForkItem = new ForkItem(btcWitnessBlock3.btcInfo, rskForkItemInfo3, Date());
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2, forkItem3]);
                // Dump to Armadillo DB expected Mainchain and Fork elements
                await forkService.save(copy(forkExpected));
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                const numberOfBtcWitnessBlocksToAsk: number = 1000;
                const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
                expect(blockchainExpected).to.be.eql(blockchain);
            });
            // test 7 - mongo output
            it('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = HMatchRSKWithFollowingNoMatch;
                const btcWitnessBlockHeight: number = initialHeight + 1;
                const cpvDiffExpected: number = 0;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                const forkExpected: Fork = new Fork(range, forkItem);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                // Dump to Armadillo DB expected Mainchain and Fork elements
                await forkService.save(copy(forkExpected));
                await mainchainService.save(copy([itemExpected]));
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                const numberOfBtcWitnessBlocksToAsk: number = 1000;
                const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
                expect(blockchainExpected).to.be.eql(blockchain);
            });
            // test 8 - mongo output
            it('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = HMatchRSKWithNoFollowingNoMatch;
                const btcWitnessBlockHeight: number = initialHeight + 2;
                const cpvDiffExpected: number = 0;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                const forkExpected: Fork = new Fork(range, forkItem);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                // Dump to Armadillo DB expected Mainchain and Fork elements
                await forkService.save(copy(forkExpected));
                await mainchainService.save(copy([itemExpected]));
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                const numberOfBtcWitnessBlocksToAsk: number = 1000;
                const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
                expect(blockchainExpected).to.be.eql(blockchain);
            });
            // test 9 - mongo output
            it('should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = HMatchRSKWithFollowingNoMatch;
                const btcWitnessBlockHeight: number = initialHeight + 1;
                const btcWitnessBlockHeight2: number = initialHeight + 2;
                const blocksToMove: number = 2;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);

                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, Date());
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                // Dump to Armadillo DB expected Mainchain and Fork elements
                await forkService.save(copy(forkExpected));
                await mainchainService.save(copy([itemExpected]));

                const numberOfBtcWitnessBlocksToAsk: number = 1000;
                const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
                expect(blockchain).to.be.eql(blockchainExpected);
            });
            // test 10 - mongo output
            it('should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = HMatchRSKWithNoFollowingNoMatch;
                const btcWitnessBlockHeight: number = initialHeight + 2;
                const btcWitnessBlockHeight2: number = initialHeight + 5;
                const blocksToMove: number = 2;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(initialHeight - 1);
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);

                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, Date());
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                // Dump to Armadillo DB expected Mainchain and Fork elements
                await forkService.save(copy(forkExpected));
                await mainchainService.save(copy([itemExpected]));

                const numberOfBtcWitnessBlocksToAsk: number = 1000;
                const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
                expect(blockchain).to.be.eql(blockchainExpected);
            });
            // TODO FIX IN ARMADILLO FIRST test 11 - mongo output
            it.skip('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo output validation', async () => {
                const testId = '1rsknomatch1rsktagmatchconsecutive';
                const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                await utils.validateMongoOutput(mainchainFile, forksFile);
            });
        });
        describe('RSK no match at same height with difference in 2 bytes in CPV, mongo output validation', () => {
            describe('No matching RSK tags match CPV among each other, mongo output validation', () => {
                // TODO test 12 - mongo output
                it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 1;
                    const cpvDiffExpected: number = 0;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, Date());
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(forkExpected));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                    const numberOfBtcWitnessBlocksToAsk: number = 1000;
                    const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
                    expect(blockchainExpected).to.be.eql(blockchain);
                });
                // TODO test 13 - mongo output
                it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 3;
                    const cpvDiffExpected: number = 0;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, Date());
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(forkExpected));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                    const numberOfBtcWitnessBlocksToAsk: number = 1000;
                    const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
                    expect(blockchainExpected).to.be.eql(blockchain);
                });
                // TODO test 14 - mongo output
                it('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 1;
                    const btcWitnessBlockHeight3: number = initialHeight + 2;
                    const cpvDiffExpected: number = 0;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                    const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight3);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    const rskForkItemInfo3: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock3.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    btcWitnessBlock3.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, Date());
                    const forkItem3: ForkItem = new ForkItem(btcWitnessBlock3.btcInfo, rskForkItemInfo3, Date());
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2, forkItem3]);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(forkExpected));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                    const numberOfBtcWitnessBlocksToAsk: number = 1000;
                    const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
                    expect(blockchainExpected).to.be.eql(blockchain);
                });
                // TODO test 15 - mongo output
                it('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 3;
                    const btcWitnessBlockHeight3: number = initialHeight + 5;
                    const cpvDiffExpected: number = 0;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight2);
                    const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(btcWitnessBlockHeight3);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    const rskForkItemInfo3: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock3.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    btcWitnessBlock3.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, Date());
                    const forkItem3: ForkItem = new ForkItem(btcWitnessBlock3.btcInfo, rskForkItemInfo3, Date());
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2, forkItem3]);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(forkExpected));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [forkExpected]);
                    const numberOfBtcWitnessBlocksToAsk: number = 1000;
                    const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
                    expect(blockchainExpected).to.be.eql(blockchain);
                });
                // TODO test 16 - mongo output
                it.skip('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const testId = '2b_cpv_1rsktagmatch1rsktagforkconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 17 - mongo output
                it.skip('should create branch for first BTC block with matching RSK tag, following 2 BTC block with 2 bytes difference CPV no match RSK tagswith no matching RSK tag, mongo output validation', async () => {
                    const testId = '2b_cpv_1rsktagmatch2rsktagfork';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 18 - mongo output
                it.skip('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo output validation', async () => {
                    const testId = '2b_cpv_1rsktagfork1rsktagmatchconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 19 - mongo output
                it.skip('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo output validation', async () => {
                    const testId = '2b_cpv_1rsktagmatch1rsktagforknonconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
            });
            describe('No matching RSK tags no match CPV among each other, mongo output validation', () => {
                // TODO test 20 - mongo output
                it.skip('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const testId = '2b_cpvnomatch_only2rsktagforkconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 21 - mongo output
                it.skip('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const testId = '2b_cpvnomatch_only2rsktagforknonconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 22 - mongo output
                it.skip('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const testId = '2b_cpvnomatch_only3rsktagforkconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 23 - mongo output
                it.skip('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const testId = '2b_cpvnomatch_only3rsktagforknonconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 24 - mongo output
                it.skip('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const testId = '2b_cpvnomatch_1matchrsktag1rsktagforkconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 25 - mongo output
                it.skip('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const testId = '2b_cpvnomatch_1matchrsktag1rsktagforknonconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 26 - mongo output
                it.skip('should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const testId = '2b_cpvnomatch_1matchrsktag2rsktagforkconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 27 - mongo output
                it.skip('should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const testId = '2b_cpvnomatch_1matchrsktag2rsktagforknonconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 28 - mongo output
                it.skip('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo output validation', async () => {
                    const testId = '2b_cpvnomatch_1sktagfork1rsktagmatchconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 29 - mongo output
                it.skip('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo output validation', async () => {
                    const testId = '2b_cpvnomatch_1sktagfork1rsktagmatchnonconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
            });
        });
        describe('RSK no match at same height with no match CPV, mongo output validation', () => {
            describe('No matching RSK tags match CPV among each other, mongo output validation', () => {
                // TODO test 30 - mongo output
                it.skip('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpv_only2rsktagforkconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 31 - mongo output
                it.skip('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpv_only2rsktagforknonconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 32 - mongo output
                it.skip('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpv_only3rsktagforkconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 33 - mongo output
                it.skip('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpv_only3rsktagforknonconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 34 - mongo output
                it.skip('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpv_1rsktagmatch1rsktagforkconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 35 - mongo output
                it.skip('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpv_1rsktagmatch1rsktagforknonconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 36 - mongo output
                it.skip('should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpv_1rsktagmatch2rsktagforkconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 37 - mongo output
                it.skip('should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpv_1rsktagmatch2rsktagforknonconsecutive';
                    console.log(testId);
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 38 - mongo output
                it.skip('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpv_1rsktagfork1rsktagmatchconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 39 - mongo output
                it.skip('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpv_1rsktagfork1rsktagmatchnonconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
            });
            describe('No matching RSK tags no match CPV among each other, mongo output validation', () => {
                // TODO test 40 - mongo output
                it.skip('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpvnomatch_only2rsktagforkconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 41 - mongo output
                it.skip('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpvnomatch_only2rsktagforknonconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 42 - mongo output
                it.skip('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpvnomatch_only3rsktagforkconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 43 - mongo output
                it.skip('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpvnomatch_only3rsktagforknonconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 44 - mongo output
                it.skip('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpvnomatch_1rsktagmatch1rsktagforkconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 45 - mongo output
                it.skip('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpvnomatch_1rsktagmatch1rsktagforknonconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 46 - mongo output
                it.skip('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpvnomatch_1rsktagfork1rsktagmatchconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
                // TODO test 47 - mongo output
                it.skip('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo output validation', async () => {
                    const testId = '7b_cpvnomatch_1rsktagfork1rsktagmatchnonconsecutive';
                    const forksFile = forksPresentFilePrefix + testId + fileSuffix;
                    const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
                    await utils.validateMongoOutput(mainchainFile, forksFile);
                });
            });
        });
    });
});
