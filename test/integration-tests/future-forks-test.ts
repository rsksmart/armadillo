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
import { copy } from '../../src/util/helper';
import { ArmadilloOperations } from './lib/armadillo-operations';
import { BtcApiMocker } from './lib/btc-api-mocker';
import { bestRskBlock, DEFAULT_CONFIG_PATH } from './lib/configs';
import { getEndHeightMainchainForCPVDiff, getStartHeightMainchainForCPVDiff } from './lib/cpv-helper';

const heightOfNoRskTags: number = 0;
const heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff: number = 129;
const heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff: number = 133;
const heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff: number = 135;
let firstBtcBlock: number = 0;
let btcApiService: HttpBtcApi;
let rskApiService: RskApiService;
let mongoStoreForks: MongoStore;
let mongoStoreMainchain: MongoStore;
let mongoStoreBtc: MongoStore;
let forkService: ForkService;
let mainchainService: MainchainService;
let btcService: BtcService;
let btcApiMocker: BtcApiMocker;
let armadilloOperations: ArmadilloOperations;
describe('RSK Forks in the future tests', () => {
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
        armadilloOperations = new ArmadilloOperations(mainchainService, rskApiService, mainConfig.forkApi);
        firstBtcBlock = await btcApiMocker.getFirstBlockNumber();
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
        await btcApiMocker.setHeightInMockBTCApi(heightOfNoRskTags);
    });

    describe('RSK no match at same height with matching CPV, RSK height in the future regarding BTC chain, end to end', () => {
        it('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, full CPV match', async () => {
            const initialHeight: number = heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff;
            const btcWitnessBlockHeight: number = initialHeight + 1;
            const blocksToMove: number = 1;
            const cpvDiffExpected: number = 0;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            await btcService.save(firstToCheckBtc);
            await btcApiMocker.setHeightInMockBTCApi(initialHeight);
            // get actual blockchain
            await btcApiMocker.moveXBlocks(blocksToMove);
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await armadilloOperations.getBlockchains()));
            // Get actual fork
            const timeExpected = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
            // Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
            const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
            const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
            const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
            const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
            const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
            btcWitnessBlock.btcInfo.guessedMiner = null;
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
        // TODO fix data and/or check for issue in armadillo
        it('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 3 bytes CPV match', async () => {
            const initialHeight = heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff;
            const btcWitnessBlockHeight = initialHeight + 1;
            const blocksToMove = 1;
            const cpvDiffExpected = 8;
            // get actual blockchain
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            await btcService.save(firstToCheckBtc);
            await btcApiMocker.setHeightInMockBTCApi(initialHeight);
            await btcApiMocker.moveXBlocks(blocksToMove);
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await armadilloOperations.getBlockchains()));
            // Get actual fork
            const timeExpected = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
            // Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
            const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
            const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
            start.forkDetectionData = null;
            const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
            const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
            const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
            btcWitnessBlock.btcInfo.guessedMiner = null;
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
        it('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 0 bytes CPV match', async () => {
            const initialHeight = heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff;
            const btcWitnessBlockHeight = initialHeight + 1;
            const blocksToMove = 1;
            const cpvDiffExpected = 7;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            await btcService.save(firstToCheckBtc);
            await btcApiMocker.setHeightInMockBTCApi(initialHeight);
            // get actual blockchain
            await btcApiMocker.moveXBlocks(blocksToMove);
            const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await armadilloOperations.getBlockchains()));
            // Get actual fork
            const timeExpected = blockchain.forks[0].getForkItems()[0].time; // adding same time to remove from comparision.
            // Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
            const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
            const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
            start.forkDetectionData = null;
            const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
            const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
            const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
            btcWitnessBlock.btcInfo.guessedMiner = null;
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
    });
    describe('RSK no match at same height with matching CPV, RSK height in the future regarding BTC chain, mongo input validation', () => {
        it('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, full CPV match, mongo input validation', async () => {
            const initialHeight: number = heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff;
            const btcWitnessBlockHeight: number = initialHeight + 1;
            const blocksToMove: number = 1;
            const cpvDiffExpected: number = 0;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            await btcService.save(firstToCheckBtc);
            await btcApiMocker.setHeightInMockBTCApi(initialHeight);
            await btcApiMocker.moveXBlocks(blocksToMove);
            const forks: Fork[] = await forkService.getAll();
            const mainchain: Item[] = await mainchainService.getAll();
            const time: string = forks[0].getForkItems()[0].time;
            // Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
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
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            expect(forks).to.be.eql([forkExpected]);
            expect(mainchain).to.be.eql([itemExpected]);
        });
        // TODO FIX Mongo input and/or check for issue in armadillo
        it('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 5 bytes CPV match, mongo input validation', async () => {
            const initialHeight = heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff;
            const btcWitnessBlockHeight = initialHeight + 1;
            const blocksToMove = 1;
            const cpvDiffExpected = 4;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            await btcService.save(firstToCheckBtc);
            await btcApiMocker.setHeightInMockBTCApi(initialHeight);
            await btcApiMocker.moveXBlocks(blocksToMove);
            const forks: Fork[] = await forkService.getAll();
            const mainchain: Item[] = await mainchainService.getAll();
            const time: string = forks[0].getForkItems()[0].time;
            // Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
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
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            expect(forks).to.be.eql([forkExpected]);
            expect(mainchain).to.be.eql([itemExpected]);
        });
        it('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 0 bytes CPV match, mongo input validation', async () => {
            const initialHeight = heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff;
            const btcWitnessBlockHeight = initialHeight + 1;
            const blocksToMove = 1;
            const cpvDiffExpected = 7;
            const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
            await btcService.save(firstToCheckBtc);
            await btcApiMocker.setHeightInMockBTCApi(initialHeight);
            await btcApiMocker.moveXBlocks(blocksToMove);
            const forks: Fork[] = await forkService.getAll();
            const mainchain: Item[] = await mainchainService.getAll();
            const time: string = forks[0].getForkItems()[0].time;
            // Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
            const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
            const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
            start.forkDetectionData = null;
            const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
            const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
            const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
            btcWitnessBlock.btcInfo.guessedMiner = null;
            const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, time);
            const forkExpected: Fork = new Fork(range, forkItem);
            // mainchain validation
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
            btcMainchain.btcInfo.guessedMiner = null;
            const rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
            const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
            expect(forks).to.be.eql([forkExpected]);
            expect(mainchain).to.be.eql([itemExpected]);
        });
    });

    describe('RSK no match at same height with matching CPV, RSK height in the future regarding BTC chain, mongo output validation', () => {
        it('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, full CPV match, mongo output validation', async () => {
            const initialHeight: number = heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff;
            const btcWitnessBlockHeight: number = initialHeight + 1;
            const cpvDiffExpected: number = 0;
            // Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
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
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
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
        it('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 5 bytes CPV match, mongo output validation', async () => {
            const initialHeight: number = heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff;
            const btcWitnessBlockHeight: number = initialHeight + 1;
            const blocksToMove: number = 1;
            const cpvDiffExpected: number = 4;
            // Prepare expected fork

            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
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
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
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
        it('should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 0 bytes CPV match, mongo output validation', async () => {
            const initialHeight: number = heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff;
            const btcWitnessBlockHeight: number = initialHeight + 1;
            const blocksToMove: number = 1;
            const cpvDiffExpected: number = 7;
            // Prepare expected fork
            const btcWitnessBlock: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeight);
            const heightStart: number = getStartHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
            const start: RskBlockInfo = await rskApiService.getBlock(heightStart);
            start.forkDetectionData = null;
            const heightEnd: number = getEndHeightMainchainForCPVDiff(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
            const end: RskBlockInfo = await rskApiService.getBlock(heightEnd);
            const range: RangeForkInMainchain = new RangeForkInMainchain(start, end);
            const rskForkItemInfo: RskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
            btcWitnessBlock.btcInfo.guessedMiner = null;
            const forkItem: ForkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, Date());
            const forkExpected: Fork = new Fork(range, forkItem);
            // mainchain validation
            const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
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
    });
});
