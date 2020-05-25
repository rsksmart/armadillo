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
import { getBlockchainsAfterMovingXBlocks, moveXBlocks, getBlockchains } from './lib/armadillo-operations';
import { setHeightInMockBTCApi, getFirstBlockNumber } from './lib/btc-api-mocker';
import { bestRskBlock, dataInputPath, DEFAULT_CONFIG_PATH, timeoutTests } from './lib/configs';
import { getEndHeightMainchainForCPVDiff, getStartHeightMainchainForCPVDiff } from './lib/cpv-helper';
import { copy } from '../../src/util/helper';
import { expect } from 'chai';
import { readFileSync } from 'fs';

const heightOfNoRskTags = 0;
const heightOfConsecutiveRSKnoMatchPastSameBranch = 92;
const heightOfNonConsecutiveRSKnoMatchPastSameBranch = 97;
const heightOfConsecutiveRSKnoMatchPastDiffBranch = 115;
const heightOfNonConsecutiveRSKnoMatchPastDiffBranch = 119;
const heightOfConsecutiveRSKnoMatchPastFollowingMatch = 95;
const heightOfNonConsecutiveRSKnoMatchPastFollowingMatch = 107;
let firstBtcBlock = 0;
let btcApiService: HttpBtcApi;
let rskApiService: RskApiService;
let mongoStoreForks: MongoStore;
let mongoStoreMainchain: MongoStore;
let mongoStoreBtc: MongoStore;
let forkService: ForkService;
let mainchainService: MainchainService;
let btcService: BtcService;
describe('RSK Forks in the past tests', () => {
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
        firstBtcBlock = await getFirstBlockNumber();
    });
    after(async () => {
        await mainchainService.disconnect();
        await forkService.disconnect();
    });
    beforeEach(async () => {
        await forkService.deleteAll();
        await mainchainService.deleteAll();
    });
    afterEach(async () => {
        await setHeightInMockBTCApi(heightOfNoRskTags);
    });
    describe('RSK no match at same height with matching CPV, RSK height in the past regarding BTC chain', () => {
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found', async () => {
            const initialHeight: number = heightOfConsecutiveRSKnoMatchPastSameBranch;
            const btcWitnessBlockHeight: number = initialHeight + 1;
            const blocksToMove: number = 1;
            const cpvDiffExpected: number = 0;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            btcService.save(firstToCheckBtc);
            await setHeightInMockBTCApi(initialHeight);
            // get actual blockchain
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);
            // Get actual fork
            // adding same time to remove from comparision.
            const timeExpected = blockchain.forks[0].getForkItems()[0].time;
            // Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
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
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
            expect(blockchain).to.be.eql(blockchainExpected);
        });
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following consecutive BTC block', async () => {
            const initialHeight: number = heightOfConsecutiveRSKnoMatchPastSameBranch;
            const btcWitnessBlockHeight: number = initialHeight + 1;
            const btcWitnessBlockHeight2: number = initialHeight + 2;
            const blocksToMove: number = 2;
            const cpvDiffExpected: number = 0;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            btcService.save(firstToCheckBtc);
            await setHeightInMockBTCApi(initialHeight);
            // get actual blockchain
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);
            // Get actual fork
            const fork: Fork = blockchain.forks[0];
            const timeExpected = fork.getForkItems()[1].time; // adding same time to remove from comparision.
            const timeExpected2 = fork.getForkItems()[0].time;
            // Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
            const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
            const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
            const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
            const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight2);

            const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
            const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
            btcWitnessBlock.btcInfo.guessedMiner = null;
            btcWitnessBlock2.btcInfo.guessedMiner = null;
            const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
            const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
            const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
            // mainchain validation
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
            expect(blockchain).to.be.eql(blockchainExpected);
        });
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following non consecutive BTC block', async () => {
            const initialHeight: number = heightOfNonConsecutiveRSKnoMatchPastSameBranch;
            const btcWitnessBlockHeight: number = initialHeight + 3;
            const blocksToMove: number = 3;
            const cpvDiffExpected: number = 0;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            btcService.save(firstToCheckBtc);
            await setHeightInMockBTCApi(initialHeight);
            // get actual blockchain
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);
            // Get actual fork
            const fork: Fork = blockchain.forks[0];
            const timeExpected = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
            // Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
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
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [forkExpected]);
            expect(blockchain).to.be.eql(blockchainExpected);
        });
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following consecutive BTC block', async () => {
            const initialHeight: number = heightOfConsecutiveRSKnoMatchPastDiffBranch;
            const btcWitnessBlockHeightFork1: number = initialHeight + 1;
            const btcWitnessBlockHeightFork2: number = initialHeight + 2;
            const blocksToMove: number = 2;
            const cpvDiffExpectedFork1: number = 0;
            const cpvDiffExpectedFork2: number = 2;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            btcService.save(firstToCheckBtc);
            await setHeightInMockBTCApi(initialHeight);
            // get actual blockchain
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);

            const timeExpectedFork1 = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
            const timeExpectedFork2 = blockchain.forks[1].getForkItems()[0].time; // adding same time to remove from comparision.

            // Prepare expected forks
            const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightFork1);
            const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightFork2);
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
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [fork1Expected, fork2Expected]);
            expect(blockchain).to.be.eql(blockchainExpected);
        });
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following non consecutive BTC block', async () => {
            const initialHeight: number = heightOfNonConsecutiveRSKnoMatchPastDiffBranch;
            const btcWitnessBlockHeightFork1: number = initialHeight + 5;
            const btcWitnessBlockHeightFork2: number = initialHeight + 8;
            const blocksToMove: number = 8;
            const cpvDiffExpectedFork1: number = 0;
            const cpvDiffExpectedFork2: number = 2;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            btcService.save(firstToCheckBtc);
            await setHeightInMockBTCApi(initialHeight);
            // get actual blockchain
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);

            const timeExpectedFork1 = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
            const timeExpectedFork2 = blockchain.forks[1].getForkItems()[0].time; // adding same time to remove from comparision.

            // Prepare expected forks
            const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightFork1);
            const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightFork2);
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
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [fork1Expected, fork2Expected]);
            expect(blockchain).to.be.eql(blockchainExpected);
        });
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following consecutive BTC block', async () => {
            const initialHeight: number = heightOfConsecutiveRSKnoMatchPastFollowingMatch;
            const btcWitnessBlockHeight: number = initialHeight + 1;
            const btcWitnessBlockHeightMainchain2: number = initialHeight + 2;
            const blocksToMove: number = 2;
            const cpvDiffExpected: number = 0;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            btcService.save(firstToCheckBtc);
            await setHeightInMockBTCApi(initialHeight);
            // get actual blockchain
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);
            // Get actual fork
            const fork: Fork = blockchain.forks[0];
            const timeExpected = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
            // Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
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
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            const btcMainchain2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightMainchain2);
            btcMainchain2.btcInfo.guessedMiner = null;
            const rskBlockMainchain2: RskBlockInfo = await rskApiService.getBlock(btcMainchain2.rskTag.BN);
            const itemExpected2: Item = new Item(btcMainchain2.btcInfo, rskBlockMainchain2);
            const mainchain: Item[] = [itemExpected2];
            for (let i = itemExpected2.rskInfo.height - 1; i > itemExpected.rskInfo.height; i--) {
                rskBlockMainchain = await rskApiService.getBlock(i);
                mainchain.push(new Item(null, rskBlockMainchain));
            }
            mainchain.push(itemExpected);
            const blockchainExpected: BlockchainHistory = new BlockchainHistory(mainchain, [forkExpected]);
            expect(blockchain).to.be.eql(blockchainExpected);
        });
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following non consecutive BTC block', async () => {
            const initialHeight: number = heightOfNonConsecutiveRSKnoMatchPastFollowingMatch;
            const btcWitnessBlockHeight: number = initialHeight + 3;
            const btcWitnessBlockHeightMainchain2: number = initialHeight + 8;
            const blocksToMove: number = 8;
            const cpvDiffExpected: number = 0;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            btcService.save(firstToCheckBtc);
            await setHeightInMockBTCApi(initialHeight);
            // get actual blockchain
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await getBlockchainsAfterMovingXBlocks(blocksToMove, btcService)).data);
            // Get actual fork
            const fork: Fork = blockchain.forks[0];
            const timeExpected = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
            // Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
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
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            const btcMainchain2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightMainchain2);
            btcMainchain2.btcInfo.guessedMiner = null;
            const rskBlockMainchain2: RskBlockInfo = await rskApiService.getBlock(btcMainchain2.rskTag.BN);
            const itemExpected2: Item = new Item(btcMainchain2.btcInfo, rskBlockMainchain2);
            const mainchain: Item[] = [itemExpected2];
            for (let i = itemExpected2.rskInfo.height - 1; i > itemExpected.rskInfo.height; i--) {
                rskBlockMainchain = await rskApiService.getBlock(i);
                mainchain.push(new Item(null, rskBlockMainchain));
            }
            mainchain.push(itemExpected);
            const blockchainExpected: BlockchainHistory = new BlockchainHistory(mainchain, [forkExpected]);
            expect(blockchain).to.be.eql(blockchainExpected);
        });
    });

    describe('RSK no match at same height with matching CPV, RSK height in the past regarding BTC chain, mongo input validation', () => {
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found, mongo input validation', async () => {
            const initialHeight: number = heightOfConsecutiveRSKnoMatchPastSameBranch;
            const btcWitnessBlockHeight: number = initialHeight + 1;
            const blocksToMove: number = 1;
            const cpvDiffExpected: number = 0;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            btcService.save(firstToCheckBtc);
            await setHeightInMockBTCApi(initialHeight);
            await moveXBlocks(blocksToMove, btcService);
            const forks: Fork[] = await forkService.getAll();
            const mainchain: Item[] = await mainchainService.getAll();
            const timeExpected: string = forks[0].getForkItems()[0].time;
            // Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
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
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            expect([itemExpected]).to.be.eql(mainchain);
            expect([forkExpected]).to.be.eql(forks);
        });
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following consecutive BTC block, mongo input validation', async () => {
            const initialHeight: number = heightOfConsecutiveRSKnoMatchPastSameBranch;
            const btcWitnessBlockHeight: number = initialHeight + 1;
            const btcWitnessBlockHeight2: number = initialHeight + 2;
            const blocksToMove: number = 2;
            const cpvDiffExpected: number = 0;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            btcService.save(firstToCheckBtc);
            await setHeightInMockBTCApi(initialHeight);
            await moveXBlocks(blocksToMove, btcService);
            const forks: Fork[] = await forkService.getAll();
            const mainchain: Item[] = await mainchainService.getAll();
            const timeExpected: string = forks[0].getForkItems()[1].time; // adding same time to remove from comparision.
            const timeExpected2: string = forks[0].getForkItems()[0].time;
            // Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
            const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
            const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
            const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
            const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight2);

            const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
            const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
            btcWitnessBlock.btcInfo.guessedMiner = null;
            btcWitnessBlock2.btcInfo.guessedMiner = null;
            const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
            const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, timeExpected2);
            const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
            // mainchain validation
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            expect([itemExpected]).to.be.eql(mainchain);
            expect([forkExpected]).to.be.eql(forks);
        });
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following non consecutive BTC block, mongo input validation', async () => {
            const initialHeight: number = heightOfNonConsecutiveRSKnoMatchPastSameBranch;
            const btcWitnessBlockHeight: number = initialHeight + 3;
            const blocksToMove: number = 3;
            const cpvDiffExpected: number = 0;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            btcService.save(firstToCheckBtc);
            await setHeightInMockBTCApi(initialHeight);
            await moveXBlocks(blocksToMove, btcService);
            const forks: Fork[] = await forkService.getAll();
            const mainchain: Item[] = await mainchainService.getAll();
            // adding same time to remove from comparision.
            const timeExpected: string = forks[0].getForkItems()[0].time;
            // Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
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
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            expect([itemExpected]).to.be.eql(mainchain);
            expect([forkExpected]).to.be.eql(forks);
        });
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following consecutive BTC block, mongo input validation', async () => {
            const initialHeight: number = heightOfConsecutiveRSKnoMatchPastDiffBranch;
            const btcWitnessBlockHeightFork1: number = initialHeight + 1;
            const btcWitnessBlockHeightFork2: number = initialHeight + 2;
            const blocksToMove: number = 2;
            const cpvDiffExpectedFork1: number = 0;
            const cpvDiffExpectedFork2: number = 2;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            btcService.save(firstToCheckBtc);
            await setHeightInMockBTCApi(initialHeight);
            await moveXBlocks(blocksToMove, btcService);
            const forks: Fork[] = await forkService.getAll();
            const mainchain: Item[] = await mainchainService.getAll();
            const timeExpectedFork1: string = forks[0].getForkItems()[0].time;
            const timeExpectedFork2: string = forks[1].getForkItems()[0].time;
            // Prepare expected forks
            const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightFork1);
            const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightFork2);
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
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            expect([itemExpected]).to.be.eql(mainchain);
            expect([fork1Expected, fork2Expected]).to.be.eql(forks);
        });
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following non consecutive BTC block, mongo input validation', async () => {
            const initialHeight: number = heightOfNonConsecutiveRSKnoMatchPastDiffBranch;
            const btcWitnessBlockHeightFork1: number = initialHeight + 5;
            const btcWitnessBlockHeightFork2: number = initialHeight + 8;
            const blocksToMove: number = 8;
            const cpvDiffExpectedFork1: number = 0;
            const cpvDiffExpectedFork2: number = 2;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            btcService.save(firstToCheckBtc);
            await setHeightInMockBTCApi(initialHeight);
            await moveXBlocks(blocksToMove, btcService);

            const forks: Fork[] = await forkService.getAll();
            const mainchain: Item[] = await mainchainService.getAll();
            const timeExpectedFork1: string = forks[0].getForkItems()[0].time;
            const timeExpectedFork2: string = forks[1].getForkItems()[0].time;
            // Prepare expected forks
            const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightFork1);
            const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightFork2);
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
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            expect([itemExpected]).to.be.eql(mainchain);
            expect([fork1Expected, fork2Expected]).to.be.eql(forks);
        });
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following consecutive BTC block, mongo input validation', async () => {
            const initialHeight: number = heightOfConsecutiveRSKnoMatchPastFollowingMatch;
            const btcWitnessBlockHeight: number = initialHeight + 1;
            const btcWitnessBlockHeightMainchain2: number = initialHeight + 2;
            const blocksToMove: number = 2;
            const cpvDiffExpected: number = 0;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            btcService.save(firstToCheckBtc);
            await setHeightInMockBTCApi(initialHeight);
            // get actual blockchain
            await moveXBlocks(blocksToMove, btcService);
            const forks: Fork[] = await forkService.getAll();
            const mainchain: Item[] = await mainchainService.getAll();
            const timeExpected: string = forks[0].getForkItems()[0].time;
            // Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
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
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            const btcMainchain2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightMainchain2);
            btcMainchain2.btcInfo.guessedMiner = null;
            const rskBlockMainchain2: RskBlockInfo = await rskApiService.getBlock(btcMainchain2.rskTag.BN);
            const itemExpected2: Item = new Item(btcMainchain2.btcInfo, rskBlockMainchain2);
            const mainchainExpected: Item[] = [itemExpected];
            for (let i = itemExpected.rskInfo.height + 1; i < itemExpected2.rskInfo.height; i++) {
                rskBlockMainchain = await rskApiService.getBlock(i);
                mainchainExpected.push(new Item(null, rskBlockMainchain));
            }
            mainchainExpected.push(itemExpected2);
            expect(mainchainExpected).to.be.eql(mainchain);
            expect([forkExpected]).to.be.eql(forks);
        });

        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following non consecutive BTC block, mongo input validation', async () => {
            const initialHeight: number = heightOfNonConsecutiveRSKnoMatchPastFollowingMatch;
            const btcWitnessBlockHeight: number = initialHeight + 3;
            const btcWitnessBlockHeightMainchain2: number = initialHeight + 8;
            const blocksToMove: number = 8;
            const cpvDiffExpected: number = 0;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            btcService.save(firstToCheckBtc);
            await setHeightInMockBTCApi(initialHeight);
            // get actual blockchain
            await moveXBlocks(blocksToMove, btcService);
            const forks: Fork[] = await forkService.getAll();
            const mainchain: Item[] = await mainchainService.getAll();
            const timeExpected: string = forks[0].getForkItems()[0].time;
            // Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
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
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            const btcMainchain2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightMainchain2);
            btcMainchain2.btcInfo.guessedMiner = null;
            const rskBlockMainchain2: RskBlockInfo = await rskApiService.getBlock(btcMainchain2.rskTag.BN);
            const itemExpected2: Item = new Item(btcMainchain2.btcInfo, rskBlockMainchain2);
            const mainchainExpected: Item[] = [itemExpected];
            for (let i = itemExpected.rskInfo.height + 1; i < itemExpected2.rskInfo.height; i++) {
                rskBlockMainchain = await rskApiService.getBlock(i);
                mainchainExpected.push(new Item(null, rskBlockMainchain));
            }
            mainchainExpected.push(itemExpected2);
            expect(mainchainExpected).to.be.eql(mainchain);
            expect([forkExpected]).to.be.eql(forks);
        });
    });

    describe('RSK no match at same height with matching CPV, RSK height in the past regarding BTC chain, mongo output validation', () => {
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found, mongo output validation', async () => {
            const initialHeight: number = heightOfConsecutiveRSKnoMatchPastSameBranch;
            const btcWitnessBlockHeight: number = initialHeight + 1;
            const cpvDiffExpected: number = 0;
            // Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
            const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
            const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
            const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
            btcWitnessBlock.btcInfo.guessedMiner = null;
            const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

            const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
            const forkExpected: Fork = new Fork(range, forkItem);
            // mainchain validation
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
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
            expect(blockchainExpected).to.be.eql(blockchain);
        });
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following consecutive BTC block, mongo output validation', async () => {
            const initialHeight: number = heightOfConsecutiveRSKnoMatchPastSameBranch;
            const btcWitnessBlockHeight: number = initialHeight + 1;
            const btcWitnessBlockHeight2: number = initialHeight + 2;
            const cpvDiffExpected: number = 0;
            // Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
            const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
            const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
            const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
            const btcWitnessBlock2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight2);

            const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
            const rskForkItemInfo2: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock2.rskTag, bestRskBlock);
            btcWitnessBlock.btcInfo.guessedMiner = null;
            btcWitnessBlock2.btcInfo.guessedMiner = null;
            const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
            const forkItem2: ForkItem = new ForkItem(btcWitnessBlock2.btcInfo, rskForkItemInfo2, Date());
            const forkExpected: Fork = new Fork(range, [forkItem, forkItem2]);
            // mainchain validation
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
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
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of same branch in the following non consecutive BTC block, mongo output validation', async () => {
            const initialHeight: number = heightOfNonConsecutiveRSKnoMatchPastSameBranch;
            const btcWitnessBlockHeight: number = initialHeight + 3;
            const blocksToMove: number = 3;
            const cpvDiffExpected: number = 0;
            // Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
            const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
            const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
            const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
            btcWitnessBlock.btcInfo.guessedMiner = null;
            const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

            const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
            const forkExpected: Fork = new Fork(range, forkItem);
            // mainchain validation
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
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
            expect(blockchainExpected).to.be.eql(blockchain);
        });
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following consecutive BTC block, mongo output validation', async () => {
            const initialHeight: number = heightOfConsecutiveRSKnoMatchPastDiffBranch;
            const btcWitnessBlockHeightFork1: number = initialHeight + 1;
            const btcWitnessBlockHeightFork2: number = initialHeight + 2;
            const blocksToMove: number = 2;
            const cpvDiffExpectedFork1: number = 0;
            const cpvDiffExpectedFork2: number = 7;
            // Prepare expected forks
            const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightFork1);
            const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightFork2);
            const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
            const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
            const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
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
            // mainchain validation
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [fork1Expected, fork2Expected]);
            // Dump to Armadillo DB expected Mainchain and Fork elements
            await forkService.save(copy(fork1Expected));
            await forkService.save(copy(fork2Expected));
            await mainchainService.save(copy([itemExpected]));

            const numberOfBtcWitnessBlocksToAsk: number = 1000;
            const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
            expect(blockchainExpected).to.be.eql(blockchain);
        });
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a not match of different branch in the following non consecutive BTC block, mongo output validation', async () => {
            const initialHeight: number = heightOfNonConsecutiveRSKnoMatchPastDiffBranch;
            const btcWitnessBlockHeightFork1: number = initialHeight + 5;
            const btcWitnessBlockHeightFork2: number = initialHeight + 8;
            const blocksToMove: number = 8;
            const cpvDiffExpectedFork1: number = 0;
            const cpvDiffExpectedFork2: number = 7;
            // Prepare expected forks
            const btcWitnessBlockFork1: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightFork1);
            const btcWitnessBlockFork2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightFork2);
            const heightStartFork1: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork1.rskTag.BN, cpvDiffExpectedFork1);
            const heightStartFork2: number = getStartHeightMainchainForCPVDiff(btcWitnessBlockFork2.rskTag.BN, cpvDiffExpectedFork2);
            const startFork1: RskBlockInfo = await rskApiService.getBlock(heightStartFork1);
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
            // mainchain validation
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            const blockchainExpected: BlockchainHistory = new BlockchainHistory([itemExpected], [fork1Expected, fork2Expected]);
            // Dump to Armadillo DB expected Mainchain and Fork elements
            await forkService.save(copy(fork1Expected));
            await forkService.save(copy(fork2Expected));
            await mainchainService.save(copy([itemExpected]));

            const numberOfBtcWitnessBlocksToAsk: number = 1000;
            const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
            expect(blockchainExpected).to.be.eql(blockchain);
        });
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following consecutive BTC block, mongo output validation', async () => {
            const initialHeight: number = heightOfConsecutiveRSKnoMatchPastFollowingMatch;
            const btcWitnessBlockHeight: number = initialHeight + 1;
            const btcWitnessBlockHeightMainchain2: number = initialHeight + 2;
            const blocksToMove: number = 2;
            const cpvDiffExpected: number = 0;
            // Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
            const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
            const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
            const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
            btcWitnessBlock.btcInfo.guessedMiner = null;
            const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

            const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
            const forkExpected: Fork = new Fork(range, forkItem);
            // mainchain validation
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            const btcMainchain2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightMainchain2);
            btcMainchain2.btcInfo.guessedMiner = null;
            const rskBlockMainchain2: RskBlockInfo = await rskApiService.getBlock(btcMainchain2.rskTag.BN);
            const itemExpected2: Item = new Item(btcMainchain2.btcInfo, rskBlockMainchain2);
            const mainchain: Item[] = [itemExpected2];
            for (let i = itemExpected2.rskInfo.height - 1; i > itemExpected.rskInfo.height; i--) {
                rskBlockMainchain = await rskApiService.getBlock(i);
                mainchain.push(new Item(null, rskBlockMainchain));
            }
            mainchain.push(itemExpected);
            const blockchainExpected: BlockchainHistory = new BlockchainHistory(mainchain, [forkExpected]);
            // Dump to Armadillo DB expected Mainchain and Fork elements
            await forkService.save(copy(forkExpected));
            await mainchainService.save(copy(mainchain));

            const numberOfBtcWitnessBlocksToAsk: number = 1000;
            const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
            expect(blockchainExpected).to.be.eql(blockchain);
        });
        it('should detect a past fork with the first RSK tag in BTC that height is lesser than previous RSK tag found and there is a RSK tag match in the following non consecutive BTC block, mongo output validation', async () => {
            const initialHeight: number = heightOfNonConsecutiveRSKnoMatchPastFollowingMatch;
            const btcWitnessBlockHeight: number = initialHeight + 3;
            const btcWitnessBlockHeightMainchain2: number = initialHeight + 8;
            const blocksToMove: number = 8;
            const cpvDiffExpected: number = 0;
            // Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
            const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected); // Rename función para que sea más sencilla.
            const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
            const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock); // Rename función para que sea más sencilla.
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
            const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
            btcWitnessBlock.btcInfo.guessedMiner = null;
            const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);

            const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
            const forkExpected: Fork = new Fork(range, forkItem);
            // mainchain validation
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            const btcMainchain2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightMainchain2);
            btcMainchain2.btcInfo.guessedMiner = null;
            const rskBlockMainchain2: RskBlockInfo = await rskApiService.getBlock(btcMainchain2.rskTag.BN);
            const itemExpected2: Item = new Item(btcMainchain2.btcInfo, rskBlockMainchain2);
            const mainchain: Item[] = [itemExpected2];
            for (let i = itemExpected2.rskInfo.height - 1; i > itemExpected.rskInfo.height; i--) {
                rskBlockMainchain = await rskApiService.getBlock(i);
                mainchain.push(new Item(null, rskBlockMainchain));
            }
            mainchain.push(itemExpected);
            const blockchainExpected: BlockchainHistory = new BlockchainHistory(mainchain, [forkExpected]);
            // Dump to Armadillo DB expected Mainchain and Fork elements
            await forkService.save(copy(forkExpected));
            await mainchainService.save(copy(mainchain));

            const numberOfBtcWitnessBlocksToAsk: number = 1000;
            const blockchainFromAPI = await getBlockchains(numberOfBtcWitnessBlocksToAsk);
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI.data);
            expect(blockchainExpected).to.be.eql(blockchain);
        });
    });
});
