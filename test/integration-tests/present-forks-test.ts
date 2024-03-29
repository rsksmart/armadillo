import { expect } from 'chai';
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
import { copy, sleep } from '../../src/util/helper';
import { ArmadilloOperations } from './lib/armadillo-operations';
import { BtcApiMocker } from './lib/btc-api-mocker';
import { bestRskBlock, DEFAULT_CONFIG_PATH } from './lib/configs';
import { getEndHeightMainchainForCPVDiff, getStartHeightMainchainForCPVDiff } from './lib/cpv-helper';
import { RskOperations } from './lib/rsk-operations';

const heightOfNoRskTags = 0;
const heightOfConsecutiveRskTags = 3;
const HConsecutiveNoMatchRskTags = 19;
const HNonConsecutiveNoMatchRskTags = 21;
const HMatchRSKWithFollowingNoMatch = 29;
const HMatchRSKWithNoFollowingNoMatch = 32;
const HNoMatchRSKWithFollowingMatch = 31;
const HNoMatchRSK2CPVDiffConsecutive = 39;
const HNoMatchRSK2CPVDiffNonConsecutive = 44;
const HMatchRSK2CPVDiffConsecutive = 43;
const HNoMatch2CPVDiffConsecutiveMatches = 42;
const HNoMatch2CPVDiffNonConsecutiveMatches = 49;
const HNoMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther = 64;
const HNoMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther = 70;
const HMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther = 63;
const HMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther = 67;
const HNoMatch2CPVDiffConsecutiveRskBlocksFollowingMatchesRsk = 66;
const HNoMatch2CPVDiffNonConsecutiveRskBlocksFollowingMatchesRsk = 75;
const HNoMatchRSK8CPVDiffConsecutive = 52;
const HNoMatchRSK8CPVDiffNonConsecutive = 57;
const HMatchRSK8CPVDiffConsecutive = 51;
const HMatchRSK8CPVDiffNonConsecutive = 55;
const HNoMatch8CPVDiffConsecutiveMatches = 54;
const HNoMatch8CPVDiffNonConsecutiveMatches = 61;
const HNoMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther = 78;
const HNoMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther = 84;
const HMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther = 77;
const HMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther = 81;
let firstBlock = 0;
let btcApiService: HttpBtcApi;
let rskApiService: RskApiService;
let mongoStoreForks: MongoStore;
let mongoStoreMainchain: MongoStore;
let mongoStoreBtc: MongoStore;
let forkService: ForkService;
let mainchainService: MainchainService;
let btcService: BtcService;
let btcApiMocker: BtcApiMocker;
let rskOperations: RskOperations;
let armadilloOperations: ArmadilloOperations;
describe('RSK Forks in the present tests', () => {
    before(async () => {
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
        btcApiMocker = new BtcApiMocker(mainConfig.btcApi, btcService);
        rskOperations = new RskOperations(rskApiService);
        armadilloOperations = new ArmadilloOperations(mainchainService, rskOperations, mainConfig.forkApi);
        firstBlock = await btcApiMocker.getFirstBlockNumber();
    });
    after(async () => {
        await mainchainService.disconnect();
        await forkService.disconnect();
    });
    beforeEach(async () => {
        await forkService.deleteAll();
        await mainchainService.deleteAll();
        await btcService.deleteAll();
    });
    afterEach(async () => {
        await btcApiMocker.setHeightInMockBTCApi(heightOfNoRskTags);
        const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + heightOfNoRskTags);
        await btcService.save(firstToCheckBtc);
        await forkService.deleteAll();
        await mainchainService.deleteAll();
        await btcService.deleteAll();
    });
    describe('RSK Forks in the present - end to end tests', () => {
        describe('RSK no match at same height with matching CPV', () => {
            // test 1 - end to end
            it('should not create branch for BTC block matching RSK tag, end to end', async () => {
                const initialHeight: number = heightOfConsecutiveRskTags;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                const bestBlock = await btcApiMocker.getBtcApiLastBlock();
                let btcLastCheckedBlock: BtcBlock = await btcService.getLastBlockDetected();
                while (!btcLastCheckedBlock || btcLastCheckedBlock.btcInfo.height !== bestBlock.height) {
                    await sleep(100);
                    btcLastCheckedBlock = await btcService.getLastBlockDetected();
                }
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
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
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                const bestBlock = await btcApiMocker.getBtcApiLastBlock();
                let btcLastCheckedBlock: BtcBlock = await btcService.getLastBlockDetected();
                while (!btcLastCheckedBlock || btcLastCheckedBlock.btcInfo.height !== bestBlock.height) {
                    await sleep(100);
                    btcLastCheckedBlock = await btcService.getLastBlockDetected();
                }
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                // Get actual fork
                const timeExpected = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                // Prepare expected fork

                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
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
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                await btcApiMocker.moveXBlocks(blocksToMove);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                // Get actual fork
                const fork: Fork = blockchain.forks[0];
                const timeExpected = fork.getForkItems()[1].time; // adding same time to remove from comparision.
                const timeExpected2 = fork.getForkItems()[0].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
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
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                await btcApiMocker.moveXBlocks(blocksToMove);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                // Get actual fork
                const fork: Fork = blockchain.forks[0];
                const timeExpected = fork.getForkItems()[1].time; // adding same time to remove from comparision.
                const timeExpected2 = fork.getForkItems()[0].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
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
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                await btcApiMocker.moveXBlocks(blocksToMove);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                // Get actual fork
                const fork: Fork = blockchain.forks[0];
                const timeExpected = fork.getForkItems()[2].time; // adding same time to remove from comparision.
                const timeExpected2 = fork.getForkItems()[1].time;
                const timeExpected3 = fork.getForkItems()[0].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight3);
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
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                await btcApiMocker.moveXBlocks(blocksToMove);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                // Get actual fork
                const fork: Fork = blockchain.forks[0];
                const timeExpected: string = fork.getForkItems()[2].time; // adding same time to remove from comparision.
                const timeExpected2: string = fork.getForkItems()[1].time;
                const timeExpected3: string = fork.getForkItems()[0].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight3);
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
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                await btcApiMocker.moveXBlocks(blocksToMove);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                // Get actual fork
                // adding same time to remove from comparision.
                const timeExpected = blockchain.forks[0].getForkItems()[0].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkExpected: Fork = new Fork(range, forkItem);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
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
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                await btcApiMocker.moveXBlocks(blocksToMove);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                // Get actual fork
                // adding same time to remove from comparision.
                const timeExpected = blockchain.forks[0].getForkItems()[0].time;
                // Prepare expected fork

                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkExpected: Fork = new Fork(range, forkItem);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
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
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                await btcApiMocker.moveXBlocks(blocksToMove);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                // Get actual fork
                const fork: Fork = blockchain.forks[0];
                const timeExpected = fork.getForkItems()[1].time; // adding same time to remove from comparision.
                const timeExpected2 = fork.getForkItems()[0].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);

                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
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
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                await btcApiMocker.moveXBlocks(blocksToMove);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                // Get actual fork
                const fork: Fork = blockchain.forks[0];
                const timeExpected = fork.getForkItems()[1].time; // adding same time to remove from comparision.
                const timeExpected2 = fork.getForkItems()[0].time;
                // Prepare expected fork

                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);

                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                expect(blockchain).to.be.eql(blockchainExpected);
            });
            // test 11 - end to end
            it('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end', async () => {
                const initialHeight: number = HNoMatchRSKWithFollowingMatch;
                const btcMainchainBlockHeight: number = initialHeight + 1;
                const btcWitnessBlockHeight: number = initialHeight;
                const blocksToMove: number = 1;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                await btcApiMocker.moveXBlocks(blocksToMove);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                // Get actual fork
                const fork: Fork = blockchain.forks[0];
                const timeExpected = fork.getForkItems()[0].time; // adding same time to remove from comparision.
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);

                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkExpected: Fork = new Fork(range, [forkItem]);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                expect(blockchain).to.be.eql(blockchainExpected);
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
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    const fork: Fork = blockchain.forks[0];
                    const timeExpected = fork.getForkItems()[1].time; // adding same time to remove from comparision.
                    const timeExpected2 = fork.getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
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
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    const fork: Fork = blockchain.forks[0];
                    const timeExpected = fork.getForkItems()[1].time; // adding same time to remove from comparision.
                    const timeExpected2 = fork.getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
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
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    const fork: Fork = blockchain.forks[0];
                    const timeExpected = fork.getForkItems()[2].time; // adding same time to remove from comparision.
                    const timeExpected2 = fork.getForkItems()[1].time;
                    const timeExpected3 = fork.getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                    const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight3);
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
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    const fork: Fork = blockchain.forks[0];
                    const timeExpected = fork.getForkItems()[2].time; // adding same time to remove from comparision.
                    const timeExpected2 = fork.getForkItems()[1].time;
                    const timeExpected3 = fork.getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                    const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight3);
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
                // test 16 - end to end
                it('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HMatchRSK2CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight + 1;
                    const blocksToMove: number = 1;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    const fork: Fork = blockchain.forks[0];
                    const timeExpected = fork.getForkItems()[0].time; // adding same time to remove from comparision.
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);

                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, [forkItem]);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    expect(blockchain).to.be.eql(blockchainExpected, 'Known issue with CPV difference, to review and remove this message.');
                });
                // test 17 - end to end
                it('should create branch for first BTC block with matching RSK tag, following 2 BTC block with 2 bytes difference CPV no match RSK tagswith no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HMatchRSK2CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight + 1;
                    const btcWitnessBlockHeight2: number = initialHeight + 4;
                    const blocksToMove: number = 4;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    const fork: Fork = blockchain.forks[0];
                    const timeExpected = fork.getForkItems()[1].time; // adding same time to remove from comparision.
                    const timeExpected2 = fork.getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 18 - end to end
                it('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffConsecutiveMatches;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 1;
                    const blocksToMove: number = 1;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    // adding same time to remove from comparision.
                    const timeExpected = blockchain.forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 19 - end to end
                it('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffNonConsecutiveMatches;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    // adding same time to remove from comparision.
                    const timeExpected = blockchain.forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
            });

            describe('No matching RSK tags no match CPV among each other', () => {
                // test 20 - end to end
                it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 1;
                    const blocksToMove: number = 1;
                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());

                    const timeExpectedFork1 = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = blockchain.forks[1].getForkItems()[0].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 21 - end to end
                it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 3;
                    const blocksToMove: number = 3;
                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());

                    const timeExpectedFork1 = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = blockchain.forks[1].getForkItems()[0].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 22 - end to end
                it('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2item1: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork2item2: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());

                    const timeExpectedFork1 = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2item2 = blockchain.forks[1].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2item1 = blockchain.forks[1].getForkItems()[1].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);

                    const btcWitnessBlockFork2item1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item1);
                    btcWitnessBlockFork2item1.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item1.rskTag, bestRskBlock);
                    const forkItemFork2item1: ForkItem = new ForkItem(btcWitnessBlockFork2item1.btcInfo, rskForkItemInfoFork2item1, timeExpectedFork2item1);
                    const btcWitnessBlockFork2item2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item2);
                    btcWitnessBlockFork2item2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item2.rskTag, bestRskBlock);
                    const forkItemFork2item2: ForkItem = new ForkItem(btcWitnessBlockFork2item2.btcInfo, rskForkItemInfoFork2item2, timeExpectedFork2item2);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    const fork2Expected: Fork = new Fork(rangeFork2, [forkItemFork2item1, forkItemFork2item2]);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 23 - end to end
                it('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2item1: number = initialHeight + 3;
                    const btcWitnessBlockHeightFork2item2: number = initialHeight + 5;
                    const blocksToMove: number = 5;
                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());

                    const timeExpectedFork1 = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2item2 = blockchain.forks[1].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2item1 = blockchain.forks[1].getForkItems()[1].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);

                    const btcWitnessBlockFork2item1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item1);
                    btcWitnessBlockFork2item1.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item1.rskTag, bestRskBlock);
                    const forkItemFork2item1: ForkItem = new ForkItem(btcWitnessBlockFork2item1.btcInfo, rskForkItemInfoFork2item1, timeExpectedFork2item1);
                    const btcWitnessBlockFork2item2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item2);
                    btcWitnessBlockFork2item2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item2.rskTag, bestRskBlock);
                    const forkItemFork2item2: ForkItem = new ForkItem(btcWitnessBlockFork2item2.btcInfo, rskForkItemInfoFork2item2, timeExpectedFork2item2);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    const fork2Expected: Fork = new Fork(rangeFork2, [forkItemFork2item1, forkItemFork2item2]);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 24 - end to end
                it('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeight: number = initialHeight + 1;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const blocksToMove: number = 1;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    // adding same time to remove from comparision.
                    const timeExpected = blockchain.forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 25 - end to end
                it('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeight: number = initialHeight + 3;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const blocksToMove: number = 3;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    // adding same time to remove from comparision.
                    const timeExpected = blockchain.forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 26 - end to end
                it('should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeightFork1: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    const timeExpectedFork1 = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = blockchain.forks[1].getForkItems()[0].time; // adding same time to remove from comparision.
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [fork1Expected, fork2Expected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 27 - end to end
                it('should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeightFork1: number = initialHeight + 3;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 6;
                    const blocksToMove: number = 6;
                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    const timeExpectedFork1 = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = blockchain.forks[1].getForkItems()[0].time; // adding same time to remove from comparision.
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [fork1Expected, fork2Expected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 28 - end to end
                it('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffConsecutiveRskBlocksFollowingMatchesRsk;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 1;
                    const blocksToMove: number = 1;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    // adding same time to remove from comparision.
                    const timeExpected = blockchain.forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 29 - end to end
                it('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffNonConsecutiveRskBlocksFollowingMatchesRsk;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    // adding same time to remove from comparision.
                    const timeExpected = blockchain.forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
            });
        });

        describe('RSK no match at same height with no match CPV', () => {
            describe('No matching RSK tags match CPV among each other', () => {
                // test 30 - end to end
                it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatchRSK8CPVDiffConsecutive;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 1;
                    const blocksToMove: number = 1;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());

                    const timeExpectedFork1 = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = blockchain.forks[1].getForkItems()[0].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    startFork1.forkDetectionData = null;
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 31 - end to end
                it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatchRSK8CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpected: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    const fork: Fork = blockchain.forks[0];
                    const timeExpected = fork.getForkItems()[1].time; // adding same time to remove from comparision.
                    const timeExpected2 = fork.getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
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
                // test 32 - end to end
                it('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatchRSK8CPVDiffConsecutive;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork3: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const cpvDiffExpectedFork3: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    const timeExpectedFork1 = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = blockchain.forks[1].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork3 = blockchain.forks[2].getForkItems()[0].time; // adding same time to remove from comparision.
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const btcWitnessBlockFork3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork3);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const heightStartFork3: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork3.rskTag.BN, cpvDiffExpectedFork3);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const startFork3: RskBlockInfo = await rskApiService.getBlock(heightStartFork3);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    startFork3.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const heightEndFork3: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork3.rskTag.BN, cpvDiffExpectedFork3, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const endFork3: RskBlockInfo = await rskApiService.getBlock(heightEndFork3);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    const rangeFork3: RangeForkInMainchain = new RangeForkInMainchain(startFork3, endFork3);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork3.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);
                    const rskForkItemInfoFork3: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork3.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);
                    const forkItemFork3: ForkItem = new ForkItem(btcWitnessBlockFork3.btcInfo, rskForkItemInfoFork3, timeExpectedFork3);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    const fork3Expected: Fork = new Fork(rangeFork3, forkItemFork3);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected, fork3Expected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 33 - end to end
                it('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatchRSK8CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 2;
                    const btcWitnessBlockHeight3: number = initialHeight + 4;
                    const blocksToMove: number = 4;
                    const cpvDiffExpected: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    const fork: Fork = blockchain.forks[0];
                    const timeExpected = fork.getForkItems()[2].time; // adding same time to remove from comparision.
                    const timeExpected2 = fork.getForkItems()[1].time;
                    const timeExpected3 = fork.getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                    const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight3);
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
                // test 34 - end to end
                it('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HMatchRSK8CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight + 1;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const blocksToMove: number = 1;
                    const cpvDiffExpected: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    // adding same time to remove from comparision.
                    const timeExpected = blockchain.forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 35 - end to end
                it('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HMatchRSK8CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight + 2;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const blocksToMove: number = 2;
                    const cpvDiffExpected: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    // adding same time to remove from comparision.
                    const timeExpected = blockchain.forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 36 - end to end
                it('should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HMatchRSK8CPVDiffConsecutive;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeightFork1: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());

                    const timeExpectedFork1 = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = blockchain.forks[1].getForkItems()[0].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [fork1Expected, fork2Expected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 37 - end to end
                it('should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HMatchRSK8CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight + 2;
                    const btcWitnessBlockHeight2: number = initialHeight + 4;
                    const blocksToMove: number = 4;
                    const cpvDiffExpected: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    const fork: Fork = blockchain.forks[0];
                    const timeExpected = fork.getForkItems()[1].time; // adding same time to remove from comparision.
                    const timeExpected2 = fork.getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 38 - end to end
                it('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffConsecutiveMatches;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 1;
                    const blocksToMove: number = 1;
                    const cpvDiffExpected: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    // adding same time to remove from comparision.
                    const timeExpected = blockchain.forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 39 - end to end
                it('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffNonConsecutiveMatches;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpected: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    // Get actual fork
                    // adding same time to remove from comparision.
                    const timeExpected = blockchain.forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
            });

            describe('No matching RSK tags no match CPV among each other', () => {
                // test 40 - end to end
                it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 1;
                    const blocksToMove: number = 1;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());

                    const timeExpectedFork1 = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = blockchain.forks[1].getForkItems()[0].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 41 - end to end
                it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());

                    const timeExpectedFork1 = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = blockchain.forks[1].getForkItems()[0].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 42 - end to end
                it('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2item1: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork2item2: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
                    const timeExpectedFork1 = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2item2 = blockchain.forks[1].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2item1 = blockchain.forks[1].getForkItems()[1].time; // adding same time to remove from comparision.
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    startFork1.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);

                    const btcWitnessBlockFork2item1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item1);
                    btcWitnessBlockFork2item1.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item1.rskTag, bestRskBlock);
                    const forkItemFork2item1: ForkItem = new ForkItem(btcWitnessBlockFork2item1.btcInfo, rskForkItemInfoFork2item1, timeExpectedFork2item1);
                    const btcWitnessBlockFork2item2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item2);
                    btcWitnessBlockFork2item2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item2.rskTag, bestRskBlock);
                    const forkItemFork2item2: ForkItem = new ForkItem(btcWitnessBlockFork2item2.btcInfo, rskForkItemInfoFork2item2, timeExpectedFork2item2);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork2.forkDetectionData = null;
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    const fork2Expected: Fork = new Fork(rangeFork2, [forkItemFork2item1, forkItemFork2item2]);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 43 - end to end
                it('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2item1: number = initialHeight + 2;
                    const btcWitnessBlockHeightFork2item2: number = initialHeight + 6;
                    const blocksToMove: number = 6;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());

                    const timeExpectedFork1 = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2item2 = blockchain.forks[1].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2item1 = blockchain.forks[1].getForkItems()[1].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    startFork1.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);

                    const btcWitnessBlockFork2item1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item1);
                    btcWitnessBlockFork2item1.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item1.rskTag, bestRskBlock);
                    const forkItemFork2item1: ForkItem = new ForkItem(btcWitnessBlockFork2item1.btcInfo, rskForkItemInfoFork2item1, timeExpectedFork2item1);
                    const btcWitnessBlockFork2item2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item2);
                    btcWitnessBlockFork2item2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item2.rskTag, bestRskBlock);
                    const forkItemFork2item2: ForkItem = new ForkItem(btcWitnessBlockFork2item2.btcInfo, rskForkItemInfoFork2item2, timeExpectedFork2item2);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork2.forkDetectionData = null;
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    const fork2Expected: Fork = new Fork(rangeFork2, [forkItemFork2item1, forkItemFork2item2]);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 44 - end to end
                it('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeightFork1: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());

                    const timeExpectedFork1 = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = blockchain.forks[1].getForkItems()[0].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [fork1Expected, fork2Expected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 45 - end to end
                it('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, end to end', async () => {
                    const initialHeight: number = HMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeightFork1: number = initialHeight + 3;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 5;
                    const blocksToMove: number = 5;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());

                    const timeExpectedFork1 = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = blockchain.forks[1].getForkItems()[0].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [fork1Expected, fork2Expected]);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
            });
        });
    });
    describe('RSK Forks in the present - mongo input tests', () => {
        describe('RSK no match at same height with matching CPV, mongo input validation', () => {
            // test 1 - mongo input
            it('should not create branch for BTC block matching RSK tag, mongo input validation', async () => {
                const initialHeight: number = heightOfConsecutiveRskTags;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                const bestBlock = await btcApiMocker.getBtcApiLastBlock();
                let btcLastCheckedBlock: BtcBlock = await btcService.getLastBlockDetected();
                while (!btcLastCheckedBlock || btcLastCheckedBlock.btcInfo.height !== bestBlock.height) {
                    await sleep(100);
                    btcLastCheckedBlock = await btcService.getLastBlockDetected();
                }

                const forks: Fork[] = await forkService.getAll();
                const mainchain: Item[] = await mainchainService.getAll();
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
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
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                const bestBlock = await btcApiMocker.getBtcApiLastBlock();
                let btcLastCheckedBlock: BtcBlock = await btcService.getLastBlockDetected();
                while (!btcLastCheckedBlock || btcLastCheckedBlock.btcInfo.height !== bestBlock.height) {
                    await sleep(100);
                    btcLastCheckedBlock = await btcService.getLastBlockDetected();
                }
                const forks: Fork[] = await forkService.getAll();
                const mainchain: Item[] = await mainchainService.getAll();
                const timeExpected: string = forks[0].getForkItems()[0].time;
                // Prepare expected fork

                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
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
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                await btcApiMocker.moveXBlocks(blocksToMove);
                const forks: Fork[] = await forkService.getAll();
                const mainchain: Item[] = await mainchainService.getAll();
                const timeExpected = forks[0].getForkItems()[1].time; // adding same time to remove from comparision.
                const timeExpected2 = forks[0].getForkItems()[0].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
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
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                await btcApiMocker.moveXBlocks(blocksToMove);
                const forks: Fork[] = await forkService.getAll();
                const mainchain: Item[] = await mainchainService.getAll();
                const timeExpected = forks[0].getForkItems()[1].time; // adding same time to remove from comparision.
                const timeExpected2 = forks[0].getForkItems()[0].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
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
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                await btcApiMocker.moveXBlocks(blocksToMove);
                const forks: Fork[] = await forkService.getAll();
                const mainchain: Item[] = await mainchainService.getAll();
                const timeExpected = forks[0].getForkItems()[2].time; // adding same time to remove from comparision.
                const timeExpected2 = forks[0].getForkItems()[1].time;
                const timeExpected3 = forks[0].getForkItems()[0].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight3);
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
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                await btcApiMocker.moveXBlocks(blocksToMove);
                const forks: Fork[] = await forkService.getAll();
                const mainchain: Item[] = await mainchainService.getAll();
                const timeExpected = forks[0].getForkItems()[2].time; // adding same time to remove from comparision.
                const timeExpected2 = forks[0].getForkItems()[1].time;
                const timeExpected3 = forks[0].getForkItems()[0].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight3);
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
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                await btcApiMocker.moveXBlocks(blocksToMove);
                const forks: Fork[] = await forkService.getAll();
                const mainchain: Item[] = await mainchainService.getAll();
                const time: string = forks[0].getForkItems()[0].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
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
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                expect(forks).to.be.eql([forkExpected]);
                expect(mainchain).to.be.eql([itemExpected]);
            });
            // test 8 - mongo input
            it('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                const initialHeight: number = HMatchRSKWithNoFollowingNoMatch;
                const btcWitnessBlockHeight: number = initialHeight + 2;
                const blocksToMove: number = 2;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                await btcApiMocker.moveXBlocks(blocksToMove);
                const forks: Fork[] = await forkService.getAll();
                const mainchain: Item[] = await mainchainService.getAll();
                const time: string = forks[0].getForkItems()[0].time;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
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
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
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
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                await btcApiMocker.moveXBlocks(blocksToMove);
                const forks: Fork[] = await forkService.getAll();
                const mainchain: Item[] = await mainchainService.getAll();
                const timeExpected: string = forks[0].getForkItems()[1].time; // adding same time to remove from comparision.
                const timeExpected2: string = forks[0].getForkItems()[0].time;
                // Prepare expected fork

                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);

                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
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
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                await btcApiMocker.moveXBlocks(blocksToMove);
                const forks: Fork[] = await forkService.getAll();
                const mainchain: Item[] = await mainchainService.getAll();
                const timeExpected: string = forks[0].getForkItems()[1].time; // adding same time to remove from comparision.
                const timeExpected2: string = forks[0].getForkItems()[0].time;
                // Prepare expected fork

                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);

                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                expect([itemExpected]).to.be.eql(mainchain);
                expect([forkExpected]).to.be.eql(forks);
            });
            // test 11 - mongo input
            it('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo input validation', async () => {
                const initialHeight: number = HNoMatchRSKWithFollowingMatch;
                const btcMainchainBlockHeight: number = initialHeight + 1;
                const btcWitnessBlockHeight: number = initialHeight;
                const blocksToMove: number = 1;
                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                await btcService.save(firstToCheckBtc);
                await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                // get actual blockchain
                await btcApiMocker.moveXBlocks(blocksToMove);
                const forks: Fork[] = await forkService.getAll();
                const mainchain: Item[] = await mainchainService.getAll();
                // Get actual fork
                const timeExpected = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);

                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                const forkExpected: Fork = new Fork(range, [forkItem]);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                expect([itemExpected]).to.be.eql(mainchain);
                expect([forkExpected]).to.be.eql(forks);
            });
        });
        describe('RSK no match at same height with difference in 2 bytes in CPV, mongo input validation', () => {
            describe('No matching RSK tags match CPV among each other', () => {
                // test 12 - mongo input
                it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 1;
                    const blocksToMove: number = 1;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[1].time; // adding same time to remove from comparision.
                    const timeExpected2 = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
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
                // test 13 - mongo input
                it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 3;
                    const blocksToMove: number = 3;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[1].time; // adding same time to remove from comparision.
                    const timeExpected2 = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
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
                // test 14 - mongo input
                it('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 1;
                    const btcWitnessBlockHeight3: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[2].time; // adding same time to remove from comparision.
                    const timeExpected2 = forks[0].getForkItems()[1].time;
                    const timeExpected3 = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                    const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight3);
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
                // test 15 - mongo input
                it('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 3;
                    const btcWitnessBlockHeight3: number = initialHeight + 5;
                    const blocksToMove: number = 5;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[2].time; // adding same time to remove from comparision.
                    const timeExpected2 = forks[0].getForkItems()[1].time;
                    const timeExpected3 = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                    const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight3);
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
                // test 16 - mongo input
                it('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HMatchRSK2CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight + 1;
                    const blocksToMove: number = 1;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);

                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, [forkItem]);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([forkExpected]);
                    expect(mainchain).to.be.eql([itemExpected]);
                });
                // test 17 - mongo input
                it('should create branch for first BTC block with matching RSK tag, following 2 BTC block with 2 bytes difference CPV no match RSK tagswith no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HMatchRSK2CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight + 1;
                    const btcWitnessBlockHeight2: number = initialHeight + 4;
                    const blocksToMove: number = 4;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[1].time; // adding same time to remove from comparision.
                    const timeExpected2 = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([forkExpected]);
                    expect(mainchain).to.be.eql([itemExpected]);
                });
                // test 18 - mongo input
                it('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffConsecutiveMatches;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 1;
                    const blocksToMove: number = 1;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([forkExpected]);
                    expect(mainchain).to.be.eql([itemExpected]);
                });
                // test 19 - mongo input
                it('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffNonConsecutiveMatches;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([forkExpected]);
                    expect(mainchain).to.be.eql([itemExpected]);
                });
            });
            describe('No matching RSK tags no match CPV among each other', () => {
                // test 20 - mongo input
                it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 1;
                    const blocksToMove: number = 1;
                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpectedFork1 = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = forks[1].getForkItems()[0].time; // adding same time to remove from comparision.
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    expect(forks).to.be.eql([fork1Expected, fork2Expected]);
                    expect(mainchain).to.be.eql([]);
                });
                // test 21 - mongo input
                it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 3;
                    const blocksToMove: number = 3;
                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpectedFork1 = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = forks[1].getForkItems()[0].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    expect(forks).to.be.eql([fork1Expected, fork2Expected]);
                    expect(mainchain).to.be.eql([]);
                });
                // test 22 - mongo input
                it('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2item1: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork2item2: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpectedFork1 = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2item2 = forks[1].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2item1 = forks[1].getForkItems()[1].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);

                    const btcWitnessBlockFork2item1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item1);
                    btcWitnessBlockFork2item1.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item1.rskTag, bestRskBlock);
                    const forkItemFork2item1: ForkItem = new ForkItem(btcWitnessBlockFork2item1.btcInfo, rskForkItemInfoFork2item1, timeExpectedFork2item1);
                    const btcWitnessBlockFork2item2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item2);
                    btcWitnessBlockFork2item2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item2.rskTag, bestRskBlock);
                    const forkItemFork2item2: ForkItem = new ForkItem(btcWitnessBlockFork2item2.btcInfo, rskForkItemInfoFork2item2, timeExpectedFork2item2);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    const fork2Expected: Fork = new Fork(rangeFork2, [forkItemFork2item1, forkItemFork2item2]);
                    expect(forks).to.be.eql([fork1Expected, fork2Expected]);
                    expect(mainchain).to.be.eql([]);
                });
                // test 23 - mongo input
                it('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2item1: number = initialHeight + 3;
                    const btcWitnessBlockHeightFork2item2: number = initialHeight + 5;
                    const blocksToMove: number = 5;
                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpectedFork1 = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2item2 = forks[1].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2item1 = forks[1].getForkItems()[1].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);

                    const btcWitnessBlockFork2item1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item1);
                    btcWitnessBlockFork2item1.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item1.rskTag, bestRskBlock);
                    const forkItemFork2item1: ForkItem = new ForkItem(btcWitnessBlockFork2item1.btcInfo, rskForkItemInfoFork2item1, timeExpectedFork2item1);
                    const btcWitnessBlockFork2item2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item2);
                    btcWitnessBlockFork2item2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item2.rskTag, bestRskBlock);
                    const forkItemFork2item2: ForkItem = new ForkItem(btcWitnessBlockFork2item2.btcInfo, rskForkItemInfoFork2item2, timeExpectedFork2item2);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    const fork2Expected: Fork = new Fork(rangeFork2, [forkItemFork2item1, forkItemFork2item2]);
                    expect(forks).to.be.eql([fork1Expected, fork2Expected]);
                    expect(mainchain).to.be.eql([]);
                });
                // test 24 - mongo input
                it('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeight: number = initialHeight + 1;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const blocksToMove: number = 1;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([forkExpected]);
                    expect(mainchain).to.be.eql([itemExpected]);
                });
                // test 25 - mongo input
                it('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeight: number = initialHeight + 3;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const blocksToMove: number = 3;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([forkExpected]);
                    expect(mainchain).to.be.eql([itemExpected]);
                });
                // test 26 - mongo input
                it('should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeightFork1: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpectedFork1 = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = forks[1].getForkItems()[0].time; // adding same time to remove from comparision.
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([fork1Expected, fork2Expected]);
                    expect(mainchain).to.be.eql([itemExpected]);
                });
                // test 27 - mongo input
                it('should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeightFork1: number = initialHeight + 3;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 6;
                    const blocksToMove: number = 6;
                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpectedFork1 = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = forks[1].getForkItems()[0].time; // adding same time to remove from comparision.
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([fork1Expected, fork2Expected]);
                    expect(mainchain).to.be.eql([itemExpected]);
                });
                // test 28 - mongo input
                it('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffConsecutiveRskBlocksFollowingMatchesRsk;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 1;
                    const blocksToMove: number = 1;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([forkExpected]);
                    expect(mainchain).to.be.eql([itemExpected]);
                });
                // test 29 - mongo input
                it('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffNonConsecutiveRskBlocksFollowingMatchesRsk;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpected: number = 2;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([forkExpected]);
                    expect(mainchain).to.be.eql([itemExpected]);
                });
            });
        });
        describe('RSK no match at same height with no match CPV, mongo input validation', () => {
            describe('No matching RSK tags match CPV among each other', () => {
                // test 30 - mongo input
                it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatchRSK8CPVDiffConsecutive;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 1;
                    const blocksToMove: number = 1;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpectedFork1: string = forks[0].getForkItems()[0].time;
                    const timeExpectedFork2: string = forks[1].getForkItems()[0].time;
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    startFork1.forkDetectionData = null;
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    expect([]).to.be.eql(mainchain);
                    expect([fork1Expected, fork2Expected]).to.be.eql(forks);
                });
                // test 31 - mongo input
                it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatchRSK8CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpected: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    // get actual blockchain
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[1].time; // adding same time to remove from comparision.
                    const timeExpected2 = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
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
                // test 32 - mongo input
                it('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatchRSK8CPVDiffConsecutive;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork3: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const cpvDiffExpectedFork3: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpectedFork1 = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = forks[1].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork3 = forks[2].getForkItems()[0].time; // adding same time to remove from comparision.
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const btcWitnessBlockFork3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork3);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const heightStartFork3: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork3.rskTag.BN, cpvDiffExpectedFork3);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const startFork3: RskBlockInfo = await rskApiService.getBlock(heightStartFork3);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    startFork3.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const heightEndFork3: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork3.rskTag.BN, cpvDiffExpectedFork3, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const endFork3: RskBlockInfo = await rskApiService.getBlock(heightEndFork3);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    const rangeFork3: RangeForkInMainchain = new RangeForkInMainchain(startFork3, endFork3);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork3.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);
                    const rskForkItemInfoFork3: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork3.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);
                    const forkItemFork3: ForkItem = new ForkItem(btcWitnessBlockFork3.btcInfo, rskForkItemInfoFork3, timeExpectedFork3);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    const fork3Expected: Fork = new Fork(rangeFork3, forkItemFork3);
                    expect(forks).to.be.eql([fork1Expected, fork2Expected, fork3Expected]);
                    expect(mainchain).to.be.eql([]);
                });
                // test 33 - mongo input
                it('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatchRSK8CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 2;
                    const btcWitnessBlockHeight3: number = initialHeight + 4;
                    const blocksToMove: number = 4;
                    const cpvDiffExpected: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[2].time; // adding same time to remove from comparision.
                    const timeExpected2 = forks[0].getForkItems()[1].time;
                    const timeExpected3 = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                    const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight3);
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
                // test 34 - mongo input
                it('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HMatchRSK8CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight + 1;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const blocksToMove: number = 1;
                    const cpvDiffExpected: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([forkExpected]);
                    expect(mainchain).to.be.eql([itemExpected]);
                });
                // test 35 - mongo input
                it('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HMatchRSK8CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight + 2;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const blocksToMove: number = 2;
                    const cpvDiffExpected: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([forkExpected]);
                    expect(mainchain).to.be.eql([itemExpected]);
                });
                // test 36 - mongo input
                it('should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HMatchRSK8CPVDiffConsecutive;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeightFork1: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpectedFork1 = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = forks[1].getForkItems()[0].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([fork1Expected, fork2Expected]);
                    expect(mainchain).to.be.eql([itemExpected]);
                });
                // test 37 - mongo input
                it('should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HMatchRSK8CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight + 2;
                    const btcWitnessBlockHeight2: number = initialHeight + 4;
                    const blocksToMove: number = 4;
                    const cpvDiffExpected: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[1].time;
                    const timeExpected2 = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([forkExpected]);
                    expect(mainchain).to.be.eql([itemExpected]);
                });
                // test 38 - mongo input
                it('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffConsecutiveMatches;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 1;
                    const blocksToMove: number = 1;
                    const cpvDiffExpected: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([forkExpected]);
                    expect(mainchain).to.be.eql([itemExpected]);
                });
                // test 39 - mongo input
                it('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffNonConsecutiveMatches;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpected: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpected = forks[0].getForkItems()[0].time;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([forkExpected]);
                    expect(mainchain).to.be.eql([itemExpected]);
                });
            });
            describe('No matching RSK tags no match CPV among each other', () => {
                // test 40 - mongo input
                it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 1;
                    const blocksToMove: number = 1;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpectedFork1 = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = forks[1].getForkItems()[0].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    expect(forks).to.be.eql([fork1Expected, fork2Expected]);
                    expect(mainchain).to.be.eql([]);
                });
                // test 41 - mongo input
                it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpectedFork1 = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = forks[1].getForkItems()[0].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    expect(forks).to.be.eql([fork1Expected, fork2Expected]);
                    expect(mainchain).to.be.eql([]);
                });
                // test 42 - mongo input
                it('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2item1: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork2item2: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpectedFork1 = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2item2 = forks[1].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2item1 = forks[1].getForkItems()[1].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    startFork1.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);

                    const btcWitnessBlockFork2item1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item1);
                    btcWitnessBlockFork2item1.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item1.rskTag, bestRskBlock);
                    const forkItemFork2item1: ForkItem = new ForkItem(btcWitnessBlockFork2item1.btcInfo, rskForkItemInfoFork2item1, timeExpectedFork2item1);
                    const btcWitnessBlockFork2item2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item2);
                    btcWitnessBlockFork2item2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item2.rskTag, bestRskBlock);
                    const forkItemFork2item2: ForkItem = new ForkItem(btcWitnessBlockFork2item2.btcInfo, rskForkItemInfoFork2item2, timeExpectedFork2item2);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork2.forkDetectionData = null;
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    const fork2Expected: Fork = new Fork(rangeFork2, [forkItemFork2item1, forkItemFork2item2]);
                    expect(forks).to.be.eql([fork1Expected, fork2Expected]);
                    expect(mainchain).to.be.eql([]);
                });
                // test 43 - mongo input
                it('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2item1: number = initialHeight + 2;
                    const btcWitnessBlockHeightFork2item2: number = initialHeight + 6;
                    const blocksToMove: number = 6;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpectedFork1 = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2item2 = forks[1].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2item1 = forks[1].getForkItems()[1].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    startFork1.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);

                    const btcWitnessBlockFork2item1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item1);
                    btcWitnessBlockFork2item1.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item1.rskTag, bestRskBlock);
                    const forkItemFork2item1: ForkItem = new ForkItem(btcWitnessBlockFork2item1.btcInfo, rskForkItemInfoFork2item1, timeExpectedFork2item1);
                    const btcWitnessBlockFork2item2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item2);
                    btcWitnessBlockFork2item2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item2.rskTag, bestRskBlock);
                    const forkItemFork2item2: ForkItem = new ForkItem(btcWitnessBlockFork2item2.btcInfo, rskForkItemInfoFork2item2, timeExpectedFork2item2);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork2.forkDetectionData = null;
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    const fork2Expected: Fork = new Fork(rangeFork2, [forkItemFork2item1, forkItemFork2item2]);
                    expect(forks).to.be.eql([fork1Expected, fork2Expected]);
                    expect(mainchain).to.be.eql([]);
                });
                // test 44 - mongo input
                it('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeightFork1: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 2;
                    const blocksToMove: number = 2;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpectedFork1 = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = forks[1].getForkItems()[0].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([fork1Expected, fork2Expected]);
                    expect(mainchain).to.be.eql([itemExpected]);
                });
                // test 45 - mongo input
                it('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo input validation', async () => {
                    const initialHeight: number = HMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeightFork1: number = initialHeight + 3;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 5;
                    const blocksToMove: number = 5;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                    await btcService.save(firstToCheckBtc);
                    await btcApiMocker.setHeightInMockBTCApi(initialHeight);
                    await btcApiMocker.moveXBlocks(blocksToMove);
                    const forks: Fork[] = await forkService.getAll();
                    const mainchain: Item[] = await mainchainService.getAll();
                    const timeExpectedFork1 = forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
                    const timeExpectedFork2 = forks[1].getForkItems()[0].time; // adding same time to remove from comparision.

                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, timeExpectedFork1);
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, timeExpectedFork2);

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    expect(forks).to.be.eql([fork1Expected, fork2Expected]);
                    expect(mainchain).to.be.eql([itemExpected]);
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
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                // Dump to Armadillo DB expected Mainchain and Fork elements
                await mainchainService.save(copy([itemExpected]));
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], []);
                const numberOfBtcWitnessBlocksToAsk: number = 1000;
                const blockchainFromAPI = await armadilloOperations.getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                expect(blockchainExpected).to.be.eql(blockchain);
            });
            // test 2 - mongo output
            it('should create branch for first BTC block with no matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = HConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const cpvDiffExpected: number = 0;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
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
                const blockchainFromAPI = await armadilloOperations.getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                expect(blockchainExpected).to.be.eql(blockchain);
            });
            // test 3 - mongo output
            it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = HConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const btcWitnessBlockHeight2: number = initialHeight + 1;
                const cpvDiffExpected: number = 0;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
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
                const blockchainFromAPI = await armadilloOperations.getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                expect(blockchainExpected).to.be.eql(blockchain);
            });
            // test 4 - mongo output
            it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = HNonConsecutiveNoMatchRskTags;
                const btcWitnessBlockHeight: number = initialHeight;
                const btcWitnessBlockHeight2: number = initialHeight + 3;
                const cpvDiffExpected: number = 0;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
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
                const blockchainFromAPI = await armadilloOperations.getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
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
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight3);
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
                const blockchainFromAPI = await armadilloOperations.getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
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
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight3);
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
                const blockchainFromAPI = await armadilloOperations.getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                expect(blockchainExpected).to.be.eql(blockchain);
            });
            // test 7 - mongo output
            it('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = HMatchRSKWithFollowingNoMatch;
                const btcWitnessBlockHeight: number = initialHeight + 1;
                const cpvDiffExpected: number = 0;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
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
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                // Dump to Armadillo DB expected Mainchain and Fork elements
                await forkService.save(copy(forkExpected));
                await mainchainService.save(copy([itemExpected]));
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                const numberOfBtcWitnessBlocksToAsk: number = 1000;
                const blockchainFromAPI = await armadilloOperations.getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                expect(blockchainExpected).to.be.eql(blockchain);
            });
            // test 8 - mongo output
            it('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = HMatchRSKWithNoFollowingNoMatch;
                const btcWitnessBlockHeight: number = initialHeight + 2;
                const cpvDiffExpected: number = 0;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
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
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                // Dump to Armadillo DB expected Mainchain and Fork elements
                await forkService.save(copy(forkExpected));
                await mainchainService.save(copy([itemExpected]));
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                const numberOfBtcWitnessBlocksToAsk: number = 1000;
                const blockchainFromAPI = await armadilloOperations.getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                expect(blockchainExpected).to.be.eql(blockchain);
            });
            // test 9 - mongo output
            it('should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = HMatchRSKWithFollowingNoMatch;
                const btcWitnessBlockHeight: number = initialHeight + 1;
                const btcWitnessBlockHeight2: number = initialHeight + 2;

                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);

                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, Date());
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                // Dump to Armadillo DB expected Mainchain and Fork elements
                await forkService.save(copy(forkExpected));
                await mainchainService.save(copy([itemExpected]));

                const numberOfBtcWitnessBlocksToAsk: number = 1000;
                const blockchainFromAPI = await armadilloOperations.getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                expect(blockchain).to.be.eql(blockchainExpected);
            });
            // test 10 - mongo output
            it('should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = HMatchRSKWithNoFollowingNoMatch;
                const btcWitnessBlockHeight: number = initialHeight + 2;
                const btcWitnessBlockHeight2: number = initialHeight + 5;

                const cpvDiffExpected: number = 0;
                const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight - 1);
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);

                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                btcWitnessBlock2.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, Date());
                const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                // Dump to Armadillo DB expected Mainchain and Fork elements
                await forkService.save(copy(forkExpected));
                await mainchainService.save(copy([itemExpected]));

                const numberOfBtcWitnessBlocksToAsk: number = 1000;
                const blockchainFromAPI = await armadilloOperations.getBlockchains(numberOfBtcWitnessBlocksToAsk);
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                expect(blockchain).to.be.eql(blockchainExpected);
            });
            // test 11 - mongo output
            it('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo output validation', async () => {
                const initialHeight: number = HNoMatchRSKWithFollowingMatch;
                const btcMainchainBlockHeight: number = initialHeight + 1;
                const btcWitnessBlockHeight: number = initialHeight;
                const cpvDiffExpected: number = 0;
                // Prepare expected fork
                const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);

                const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                btcWitnessBlock.btcInfo.guessedMiner = null;
                const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                const forkExpected: Fork = new Fork(range, [forkItem]);
                // mainchain validation
                const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                btcMainchain.btcInfo.guessedMiner = null;
                const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                // Dump to Armadillo DB expected Mainchain and Fork elements
                await forkService.save(copy(forkExpected));
                await mainchainService.save(copy([itemExpected]));
                const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                const blockchainFromAPI = await armadilloOperations.getBlockchains();
                const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                expect(blockchain).to.be.eql(blockchainExpected);
            });
        });
        describe('RSK no match at same height with difference in 2 bytes in CPV, mongo output validation', () => {
            describe('No matching RSK tags match CPV among each other, mongo output validation', () => {
                // test 12 - mongo output
                it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 1;
                    const cpvDiffExpected: number = 2;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
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
                    const blockchainFromAPI = await armadilloOperations.getBlockchains(numberOfBtcWitnessBlocksToAsk);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchainExpected).to.be.eql(blockchain);
                });
                // test 13 - mongo output
                it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 3;
                    const cpvDiffExpected: number = 0;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
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
                    const blockchainFromAPI = await armadilloOperations.getBlockchains(numberOfBtcWitnessBlocksToAsk);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchainExpected).to.be.eql(blockchain);
                });
                // test 14 - mongo output
                it('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 1;
                    const btcWitnessBlockHeight3: number = initialHeight + 2;
                    const cpvDiffExpected: number = 0;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                    const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight3);
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
                    const blockchainFromAPI = await armadilloOperations.getBlockchains(numberOfBtcWitnessBlocksToAsk);
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchainExpected).to.be.eql(blockchain);
                });
                // test 15 - mongo output
                it('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatchRSK2CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 3;
                    const btcWitnessBlockHeight3: number = initialHeight + 5;
                    const cpvDiffExpected: number = 2;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                    const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight3);
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
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchainExpected).to.be.eql(blockchain);
                });
                // test 16 - mongo output
                it('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HMatchRSK2CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight + 1;
                    const cpvDiffExpected: number = 2;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);

                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                    const forkExpected: Fork = new Fork(range, [forkItem]);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(forkExpected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 17 - mongo output
                it('should create branch for first BTC block with matching RSK tag, following 2 BTC block with 2 bytes difference CPV no match RSK tagswith no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HMatchRSK2CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight + 1;
                    const btcWitnessBlockHeight2: number = initialHeight + 4;
                    const cpvDiffExpected: number = 2;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, Date());
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(forkExpected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 18 - mongo output
                it('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffConsecutiveMatches;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 1;
                    const cpvDiffExpected: number = 2;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(forkExpected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 19 - mongo output
                it('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffNonConsecutiveMatches;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 2;

                    const cpvDiffExpected: number = 2;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(forkExpected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
            });
            describe('No matching RSK tags no match CPV among each other, mongo output validation', () => {
                // test 20 - mongo output
                it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 1;
                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, Date());
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, Date());

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(fork1Expected));
                    await forkService.save(copy(fork2Expected));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 21 - mongo output
                it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 3;

                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, Date());
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, Date());

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(fork1Expected));
                    await forkService.save(copy(fork2Expected));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 22 - mongo output
                it('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2item1: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork2item2: number = initialHeight + 2;

                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, Date());
                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);

                    const btcWitnessBlockFork2item1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item1);
                    btcWitnessBlockFork2item1.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item1.rskTag, bestRskBlock);
                    const forkItemFork2item1: ForkItem = new ForkItem(btcWitnessBlockFork2item1.btcInfo, rskForkItemInfoFork2item1, Date());
                    const btcWitnessBlockFork2item2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item2);
                    btcWitnessBlockFork2item2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item2.rskTag, bestRskBlock);
                    const forkItemFork2item2: ForkItem = new ForkItem(btcWitnessBlockFork2item2.btcInfo, rskForkItemInfoFork2item2, Date());
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    const fork2Expected: Fork = new Fork(rangeFork2, [forkItemFork2item1, forkItemFork2item2]);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(fork1Expected));
                    await forkService.save(copy(fork2Expected));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 23 - mongo output
                it('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2item1: number = initialHeight + 3;
                    const btcWitnessBlockHeightFork2item2: number = initialHeight + 5;

                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, Date());
                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);

                    const btcWitnessBlockFork2item1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item1);
                    btcWitnessBlockFork2item1.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item1.rskTag, bestRskBlock);
                    const forkItemFork2item1: ForkItem = new ForkItem(btcWitnessBlockFork2item1.btcInfo, rskForkItemInfoFork2item1, Date());
                    const btcWitnessBlockFork2item2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item2);
                    btcWitnessBlockFork2item2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item2.rskTag, bestRskBlock);
                    const forkItemFork2item2: ForkItem = new ForkItem(btcWitnessBlockFork2item2.btcInfo, rskForkItemInfoFork2item2, Date());
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    const fork2Expected: Fork = new Fork(rangeFork2, [forkItemFork2item1, forkItemFork2item2]);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(fork1Expected));
                    await forkService.save(copy(fork2Expected));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 24 - mongo output
                it('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeight: number = initialHeight + 1;
                    const btcMainchainBlockHeight: number = initialHeight;

                    const cpvDiffExpected: number = 2;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(forkExpected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 25 - mongo output
                it('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeight: number = initialHeight + 1;
                    const btcMainchainBlockHeight: number = initialHeight;

                    const cpvDiffExpected: number = 2;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(forkExpected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 26 - mongo output
                it('should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HMatch2CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeightFork1: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 2;

                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, Date());
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, Date());

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(fork1Expected));
                    await forkService.save(copy(fork2Expected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [fork1Expected, fork2Expected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 27 - mongo output
                it('should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HMatch2CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeightFork1: number = initialHeight + 3;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 6;

                    const cpvDiffExpectedFork1: number = 2;
                    const cpvDiffExpectedFork2: number = 2;
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, Date());
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, Date());

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(fork1Expected));
                    await forkService.save(copy(fork2Expected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [fork1Expected, fork2Expected]);

                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 28 - mongo output
                it('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffConsecutiveRskBlocksFollowingMatchesRsk;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 1;

                    const cpvDiffExpected: number = 2;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(forkExpected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 29 - mongo output
                it('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatch2CPVDiffNonConsecutiveRskBlocksFollowingMatchesRsk;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 2;

                    const cpvDiffExpected: number = 2;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(forkExpected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
            });
        });
        describe('RSK no match at same height with no match CPV, mongo output validation', () => {
            describe('No matching RSK tags match CPV among each other, mongo output validation', () => {
                // test 30 - mongo output
                it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatchRSK8CPVDiffConsecutive;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 1;
                    const cpvDiffExpectedFork1: number = 7; // Review CPV difference
                    const cpvDiffExpectedFork2: number = 7;
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    startFork1.forkDetectionData = null;
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, Date());
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, Date());

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(fork1Expected));
                    await forkService.save(copy(fork2Expected));
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 31 - mongo output
                it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatchRSK8CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 2;
                    const cpvDiffExpected: number = 7;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
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
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 32 - mongo output
                it('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatchRSK8CPVDiffConsecutive;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork3: number = initialHeight + 2;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    const cpvDiffExpectedFork3: number = 7;
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const btcWitnessBlockFork3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork3);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const heightStartFork3: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork3.rskTag.BN, cpvDiffExpectedFork3);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    const startFork3: RskBlockInfo = await rskApiService.getBlock(heightStartFork3);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    startFork3.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const heightEndFork3: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork3.rskTag.BN, cpvDiffExpectedFork3, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const endFork3: RskBlockInfo = await rskApiService.getBlock(heightEndFork3);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    const rangeFork3: RangeForkInMainchain = new RangeForkInMainchain(startFork3, endFork3);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork3.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);
                    const rskForkItemInfoFork3: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork3.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, Date());
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, Date());
                    const forkItemFork3: ForkItem = new ForkItem(btcWitnessBlockFork3.btcInfo, rskForkItemInfoFork3, Date());

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    const fork3Expected: Fork = new Fork(rangeFork3, forkItemFork3);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(fork1Expected));
                    await forkService.save(copy(fork2Expected));
                    await forkService.save(copy(fork3Expected));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected, fork3Expected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 33 - mongo output
                it('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatchRSK8CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeight2: number = initialHeight + 2;
                    const btcWitnessBlockHeight3: number = initialHeight + 4;

                    const cpvDiffExpected: number = 7;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                    const btcWitnessBlock3: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight3);
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
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 34 - mongo output
                it('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HMatchRSK8CPVDiffConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight + 1;
                    const btcMainchainBlockHeight: number = initialHeight;

                    const cpvDiffExpected: number = 7;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(forkExpected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 35 - mongo output
                it('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HMatchRSK8CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight + 2;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const cpvDiffExpected: number = 7;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(forkExpected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 36 - mongo output
                it('should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HMatchRSK8CPVDiffConsecutive;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeightFork1: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 2;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, Date());
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, Date());

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(fork1Expected));
                    await forkService.save(copy(fork2Expected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [fork1Expected, fork2Expected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 37 - mongo output
                it('should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HMatchRSK8CPVDiffNonConsecutive;
                    const btcWitnessBlockHeight: number = initialHeight + 2;
                    const btcWitnessBlockHeight2: number = initialHeight + 4;

                    const cpvDiffExpected: number = 2;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight2);
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
                    const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    btcWitnessBlock2.btcInfo.guessedMiner = null;
                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                    const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, Date());
                    const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + initialHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(forkExpected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 38 - mongo output
                it('should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffConsecutiveMatches;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 1;
                    const cpvDiffExpected: number = 7;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(forkExpected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 39 - mongo output
                it('should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffNonConsecutiveMatches;
                    const btcWitnessBlockHeight: number = initialHeight;
                    const btcMainchainBlockHeight: number = initialHeight + 2;

                    const cpvDiffExpected: number = 7;
                    // Prepare expected fork
                    const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeight);
                    const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
                    const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
                    start.forkDetectionData = null;
                    const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
                    const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
                    const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
                    btcWitnessBlock.btcInfo.guessedMiner = null;
                    const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

                    const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
                    const forkExpected: Fork = new Fork(range, forkItem);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(forkExpected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
            });
            describe('No matching RSK tags no match CPV among each other, mongo output validation', () => {
                // test 40 - mongo output
                it('should create branch for first 2 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 1;

                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, Date());
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, Date());

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(fork1Expected));
                    await forkService.save(copy(fork2Expected));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 41 - mongo output
                it('should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 2;
                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, Date());
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, Date());

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(fork1Expected));
                    await forkService.save(copy(fork2Expected));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 42 - mongo output
                it('should create branch for first 3 consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2item1: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork2item2: number = initialHeight + 2;

                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    startFork1.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, Date());
                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);

                    const btcWitnessBlockFork2item1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item1);
                    btcWitnessBlockFork2item1.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item1.rskTag, bestRskBlock);
                    const forkItemFork2item1: ForkItem = new ForkItem(btcWitnessBlockFork2item1.btcInfo, rskForkItemInfoFork2item1, Date());
                    const btcWitnessBlockFork2item2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item2);
                    btcWitnessBlockFork2item2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item2.rskTag, bestRskBlock);
                    const forkItemFork2item2: ForkItem = new ForkItem(btcWitnessBlockFork2item2.btcInfo, rskForkItemInfoFork2item2, Date());
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork2.forkDetectionData = null;
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    const fork2Expected: Fork = new Fork(rangeFork2, [forkItemFork2item1, forkItemFork2item2]);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(fork1Expected));
                    await forkService.save(copy(fork2Expected));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 43 - mongo output
                it('should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HNoMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcWitnessBlockHeightFork1: number = initialHeight;
                    const btcWitnessBlockHeightFork2item1: number = initialHeight + 2;
                    const btcWitnessBlockHeightFork2item2: number = initialHeight + 6;

                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    startFork1.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, Date());
                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);

                    const btcWitnessBlockFork2item1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item1);
                    btcWitnessBlockFork2item1.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item1.rskTag, bestRskBlock);
                    const forkItemFork2item1: ForkItem = new ForkItem(btcWitnessBlockFork2item1.btcInfo, rskForkItemInfoFork2item1, Date());
                    const btcWitnessBlockFork2item2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2item2);
                    btcWitnessBlockFork2item2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork2item2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2item2.rskTag, bestRskBlock);
                    const forkItemFork2item2: ForkItem = new ForkItem(btcWitnessBlockFork2item2.btcInfo, rskForkItemInfoFork2item2, Date());
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork2.forkDetectionData = null;
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2item1.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    const fork2Expected: Fork = new Fork(rangeFork2, [forkItemFork2item1, forkItemFork2item2]);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(fork1Expected));
                    await forkService.save(copy(fork2Expected));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([], [fork1Expected, fork2Expected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 44 - mongo output
                it('should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HMatch8CPVDiffConsecutiveRskBlocksDontMatchEachOther;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeightFork1: number = initialHeight + 1;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 2;

                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, Date());
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, Date());

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(fork1Expected));
                    await forkService.save(copy(fork2Expected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [fork1Expected, fork2Expected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
                // test 45 - mongo output
                it('should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, mongo output validation', async () => {
                    const initialHeight: number = HMatch8CPVDiffNonConsecutiveRskBlocksDontMatchEachOther;
                    const btcMainchainBlockHeight: number = initialHeight;
                    const btcWitnessBlockHeightFork1: number = initialHeight + 3;
                    const btcWitnessBlockHeightFork2: number = initialHeight + 5;

                    const cpvDiffExpectedFork1: number = 7;
                    const cpvDiffExpectedFork2: number = 7;
                    // Prepare expected forks
                    const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork1);
                    const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBlock + btcWitnessBlockHeightFork2);
                    const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
                    const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
                    const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
                    const startFork2: RskBlockInfo = await rskApiService.getBlock(heightStartFork2);
                    startFork1.forkDetectionData = null;
                    startFork2.forkDetectionData = null;
                    const heightEndFork1: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1, bestRskBlock);
                    const heightEndFork2: number = getEndHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2, bestRskBlock);
                    const endFork1: RskBlockInfo = await rskApiService.getBlock(heightEndFork1);
                    const endFork2: RskBlockInfo = await rskApiService.getBlock(heightEndFork2);
                    const rangeFork1: RangeForkInMainchain = new RangeForkInMainchain(startFork1, endFork1);
                    const rangeFork2: RangeForkInMainchain = new RangeForkInMainchain(startFork2, endFork2);
                    btcWitnessBlockFork1.btcInfo.guessedMiner = null;
                    btcWitnessBlockFork2.btcInfo.guessedMiner = null;
                    const rskForkItemInfoFork1: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork1.rskTag, bestRskBlock);
                    const rskForkItemInfoFork2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlockFork2.rskTag, bestRskBlock);

                    const forkItemFork1: ForkItem = new ForkItem(btcWitnessBlockFork1.btcInfo, rskForkItemInfoFork1, Date());
                    const forkItemFork2: ForkItem = new ForkItem(btcWitnessBlockFork2.btcInfo, rskForkItemInfoFork2, Date());

                    const fork1Expected: Fork = new Fork(rangeFork1, forkItemFork1);
                    const fork2Expected: Fork = new Fork(rangeFork2, forkItemFork2);
                    // mainchain validation
                    const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBlock + btcMainchainBlockHeight);
                    btcMainchain.btcInfo.guessedMiner = null;
                    const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
                    const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
                    // Dump to Armadillo DB expected Mainchain and Fork elements
                    await forkService.save(copy(fork1Expected));
                    await forkService.save(copy(fork2Expected));
                    await mainchainService.save(copy([itemExpected]));
                    const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [fork1Expected, fork2Expected]);
                    const blockchainFromAPI = await armadilloOperations.getBlockchains();
                    const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
                    expect(blockchain).to.be.eql(blockchainExpected);
                });
            });
        });
    });
});
