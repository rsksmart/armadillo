import { expect } from 'chai';
import { readFileSync } from 'fs';
import { BlockchainHistory } from '../../src/api/common/models';
import { BtcBlock } from '../../src/common/btc-block';
import { Fork, Item } from '../../src/common/forks';
import { RskBlockInfo } from '../../src/common/rsk-block';
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
import { DEFAULT_CONFIG_PATH } from './lib/configs';

const heightOfNoRskTags = 0;
const heightOfConsecutiveRskTags = 3;
const rskheightOfConsecutiveRskTags = 470;
const heightOfDistancedRskTags = 5;
const heightForSiblingRskTag = 140;
const rskHeightWithSibling = 6550;
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
let firstBtcBlock = 0;
describe('RSK no forks tests', () => {
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
    it("should not generate any mainchain if BTC doesn't present RSK tags, end to end", async () => {
        const initialHeight: number = heightOfNoRskTags + 1;
        const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
        await btcService.save(firstToCheckBtc);
        await btcApiMocker.setHeightInMockBTCApi(initialHeight);
        const blocksToMove: number = 1;
        await btcApiMocker.moveXBlocks(blocksToMove);
        const blockchain: BlockchainHistory = BlockchainHistory.fromObject(await armadilloOperations.getBlockchains());
        const blockchainExpected: BlockchainHistory = new BlockchainHistory([], []);
        expect(blockchain).to.be.eql(blockchainExpected);
    });
    it("should not generate any mainchain if BTC doesn't present RSK tags, mongo input validation", async () => {
        const initialHeight: number = heightOfNoRskTags + 1;
        const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
        const blocksToMove: number = 1;
        await btcService.save(firstToCheckBtc);
        await btcApiMocker.setHeightInMockBTCApi(initialHeight);
        await btcApiMocker.moveXBlocks(blocksToMove);
        const forks: Fork[] = await forkService.getAll();
        const mainchain: Item[] = await mainchainService.getAll();
        expect([]).to.be.eql(mainchain);
        expect([]).to.be.eql(forks);
    });
    it('should generate a mainchain connection between 2 consecutive BTC blocks with RSK tags, end to end', async () => {
        const initialHeight: number = heightOfConsecutiveRskTags;
        const btcWitnessBlockHeightMainchain2: number = initialHeight + 1;
        const blocksToMove: number = 1;
        const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
        await btcService.save(firstToCheckBtc);
        await btcApiMocker.setHeightInMockBTCApi(initialHeight);
        // get actual blockchain
        await btcApiMocker.moveXBlocks(blocksToMove);
        const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await armadilloOperations.getBlockchains()));
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
        const blockchainExpected: BlockchainHistory = new BlockchainHistory(mainchain, []);
        expect(blockchain).to.be.eql(blockchainExpected);
    });
    it('should generate a mainchain connection between 2 consecutive BTC blocks with RSK tags, mongo input validation', async () => {
        const initialHeight: number = heightOfConsecutiveRskTags;
        const btcWitnessBlockHeightMainchain2: number = initialHeight + 1;
        const blocksToMove: number = 1;
        const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
        await btcService.save(firstToCheckBtc);
        await btcApiMocker.setHeightInMockBTCApi(initialHeight);
        await btcApiMocker.moveXBlocks(blocksToMove);
        const forks: Fork[] = await forkService.getAll();
        const mainchain: Item[] = await mainchainService.getAll();
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
        expect([]).to.be.eql(forks);
    });
    it('should generate a mainchain connection between 2 consecutive BTC blocks with RSK tags, mongo output validation', async () => {
        const initialHeight: number = heightOfConsecutiveRskTags;
        const btcWitnessBlockHeightMainchain2: number = initialHeight + 1;
        // mainchain validation
        const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
        btcMainchain.btcInfo.guessedMiner = null;
        let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
        const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
        const btcMainchain2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightMainchain2);
        btcMainchain2.btcInfo.guessedMiner = null;
        const rskBlockMainchain2: RskBlockInfo = await rskApiService.getBlock(btcMainchain2.rskTag.BN);
        const itemExpected2: Item = new Item(btcMainchain2.btcInfo, rskBlockMainchain2);
        const mainchainExpected: Item[] = [itemExpected2];
        for (let i = itemExpected2.rskInfo.height - 1; i > itemExpected.rskInfo.height; i--) {
            rskBlockMainchain = await rskApiService.getBlock(i);
            mainchainExpected.push(new Item(null, rskBlockMainchain));
        }
        mainchainExpected.push(itemExpected);
        const blockchainExpected: BlockchainHistory = new BlockchainHistory(mainchainExpected, []);
        // Dump to Armadillo DB expected Mainchain and Fork elements
        await mainchainService.save(copy(mainchainExpected));
        const blockchainFromAPI = await armadilloOperations.getBlockchains();
        const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
        expect(blockchainExpected).to.be.eql(blockchain);
    });
    it('should generate a mainchain connection among 3 consecutive BTC blocks with RSK tags, end to end', async () => {
        const initialHeight: number = heightOfConsecutiveRskTags;
        const btcWitnessBlockHeightMainchain2: number = initialHeight + 1;
        const btcWitnessBlockHeightMainchain3: number = initialHeight + 2;
        const blocksToMove: number = 2;
        const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
        await btcService.save(firstToCheckBtc);
        await btcApiMocker.setHeightInMockBTCApi(initialHeight);
        // get actual blockchain
        await btcApiMocker.moveXBlocks(blocksToMove);
        const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await armadilloOperations.getBlockchains()));
        // mainchain validation
        const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
        btcMainchain.btcInfo.guessedMiner = null;
        let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
        const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
        const btcMainchain2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightMainchain2);
        btcMainchain2.btcInfo.guessedMiner = null;
        const rskBlockMainchain2: RskBlockInfo = await rskApiService.getBlock(btcMainchain2.rskTag.BN);
        const itemExpected2: Item = new Item(btcMainchain2.btcInfo, rskBlockMainchain2);
        const btcMainchain3: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightMainchain3);
        btcMainchain3.btcInfo.guessedMiner = null;
        const rskBlockMainchain3: RskBlockInfo = await rskApiService.getBlock(btcMainchain3.rskTag.BN);
        const itemExpected3: Item = new Item(btcMainchain3.btcInfo, rskBlockMainchain3);
        const mainchain: Item[] = [itemExpected3];
        for (let i = itemExpected3.rskInfo.height - 1; i > itemExpected2.rskInfo.height; i--) {
            rskBlockMainchain = await rskApiService.getBlock(i);
            mainchain.push(new Item(null, rskBlockMainchain));
        }
        mainchain.push(itemExpected2);
        for (let i = itemExpected2.rskInfo.height - 1; i > itemExpected.rskInfo.height; i--) {
            rskBlockMainchain = await rskApiService.getBlock(i);
            mainchain.push(new Item(null, rskBlockMainchain));
        }
        mainchain.push(itemExpected);
        const blockchainExpected: BlockchainHistory = new BlockchainHistory(mainchain, []);
        expect(blockchain).to.be.eql(blockchainExpected);
    });
    it('should generate a mainchain connection among 3 consecutive BTC blocks with RSK, mongo input validation', async () => {
        const initialHeight: number = heightOfConsecutiveRskTags;
        const btcWitnessBlockHeightMainchain2: number = initialHeight + 1;
        const btcWitnessBlockHeightMainchain3: number = initialHeight + 2;
        const blocksToMove: number = 2;
        const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
        await btcService.save(firstToCheckBtc);
        await btcApiMocker.setHeightInMockBTCApi(initialHeight);
        await btcApiMocker.moveXBlocks(blocksToMove);
        const forks: Fork[] = await forkService.getAll();
        const mainchain: Item[] = await mainchainService.getAll();
        // mainchain validation
        const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
        btcMainchain.btcInfo.guessedMiner = null;
        let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
        const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
        const btcMainchain2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightMainchain2);
        btcMainchain2.btcInfo.guessedMiner = null;
        const rskBlockMainchain2: RskBlockInfo = await rskApiService.getBlock(btcMainchain2.rskTag.BN);
        const itemExpected2: Item = new Item(btcMainchain2.btcInfo, rskBlockMainchain2);
        const btcMainchain3: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightMainchain3);
        btcMainchain3.btcInfo.guessedMiner = null;
        const rskBlockMainchain3: RskBlockInfo = await rskApiService.getBlock(btcMainchain3.rskTag.BN);
        const itemExpected3: Item = new Item(btcMainchain3.btcInfo, rskBlockMainchain3);
        const mainchainExpected: Item[] = [itemExpected];
        for (let i = itemExpected.rskInfo.height + 1; i < itemExpected2.rskInfo.height; i++) {
            rskBlockMainchain = await rskApiService.getBlock(i);
            mainchainExpected.push(new Item(null, rskBlockMainchain));
        }
        mainchainExpected.push(itemExpected2);
        for (let i = itemExpected2.rskInfo.height + 1; i < itemExpected3.rskInfo.height; i++) {
            rskBlockMainchain = await rskApiService.getBlock(i);
            mainchainExpected.push(new Item(null, rskBlockMainchain));
        }
        mainchainExpected.push(itemExpected3);
        expect(mainchainExpected).to.be.eql(mainchain);
        expect([]).to.be.eql(forks);
    });
    it('should generate a mainchain connection between 2 BTC blocks with RSK tags, separated by 3 without RSK tags, end to end', async () => {
        const initialHeight: number = heightOfDistancedRskTags;
        const btcWitnessBlockHeightMainchain2: number = initialHeight + 4;
        const blocksToMove: number = 4;
        const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
        await btcService.save(firstToCheckBtc);
        await btcApiMocker.setHeightInMockBTCApi(initialHeight);
        // get actual blockchain
        await btcApiMocker.moveXBlocks(blocksToMove);
        const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await armadilloOperations.getBlockchains()));
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
        const blockchainExpected: BlockchainHistory = new BlockchainHistory(mainchain, []);
        expect(blockchain).to.be.eql(blockchainExpected);
    });
    it('should generate a mainchain connection between 2 BTC blocks with RSK tags, separated by 3 without RSK tags, mongo input validation', async () => {
        const initialHeight: number = heightOfDistancedRskTags;
        const btcWitnessBlockHeightMainchain2: number = initialHeight + 4;
        const blocksToMove: number = 4;
        const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
        await btcService.save(firstToCheckBtc);
        await btcApiMocker.setHeightInMockBTCApi(initialHeight);
        await btcApiMocker.moveXBlocks(blocksToMove);
        const forks: Fork[] = await forkService.getAll();
        const mainchain: Item[] = await mainchainService.getAll();
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
        expect([]).to.be.eql(forks);
    });

    it('should generate a mainchain connection between 2 BTC blocks with RSK tags, separated by 3 without RSK tags, mongo output validation', async () => {
        const initialHeight: number = heightOfDistancedRskTags;
        const btcWitnessBlockHeightMainchain2: number = initialHeight + 4;
        // mainchain validation
        const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
        btcMainchain.btcInfo.guessedMiner = null;
        let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
        const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
        const btcMainchain2: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightMainchain2);
        btcMainchain2.btcInfo.guessedMiner = null;
        const rskBlockMainchain2: RskBlockInfo = await rskApiService.getBlock(btcMainchain2.rskTag.BN);
        const itemExpected2: Item = new Item(btcMainchain2.btcInfo, rskBlockMainchain2);
        const mainchainExpected: Item[] = [itemExpected2];
        for (let i = itemExpected2.rskInfo.height - 1; i > itemExpected.rskInfo.height; i--) {
            rskBlockMainchain = await rskApiService.getBlock(i);
            mainchainExpected.push(new Item(null, rskBlockMainchain));
        }
        mainchainExpected.push(itemExpected);
        const blockchainExpected: BlockchainHistory = new BlockchainHistory(mainchainExpected, []);
        // Dump to Armadillo DB expected Mainchain and Fork elements
        await mainchainService.save(copy(mainchainExpected));
        const blockchainFromAPI = await armadilloOperations.getBlockchains();
        const blockchain: BlockchainHistory = BlockchainHistory.fromObject(blockchainFromAPI);
        expect(blockchainExpected).to.be.eql(blockchain);
    });
    // TODO differentiate rskTag of sibling and mainchain block
    it('should generate a mainchain connection between 2 BTC blocks with RSK tags, second RSK tag is of a sibling block, end to end', async () => {
        const initialHeight: number = heightForSiblingRskTag;
        const btcWitnessBlockHeightMainchain2: number = initialHeight + 1;
        const blocksToMove: number = 1;
        const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
        await btcService.save(firstToCheckBtc);
        await btcApiMocker.setHeightInMockBTCApi(initialHeight);
        await btcApiMocker.moveXBlocks(blocksToMove);
        const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await armadilloOperations.getBlockchains()));
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
        const blockchainExpected: BlockchainHistory = new BlockchainHistory(mainchain, []);
        expect(blockchain).to.be.eql(blockchainExpected);
    });
    it('should generate a mainchain connection between 3 BTC blocks with RSK tags, a reorganization of lenght 1 in RSK happens in between the second and third btc checkpoint, the monitor rebuilds mainchain to consider reorganization, end to end', async () => {
        const initialHeight: number = heightOfConsecutiveRskTags;
        const btcWitnessBlockHeightMainchain3: number = initialHeight + 2;
        const blocksToMove1: number = 2;
        const blocksToMove2: number = 1;
        const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
        await btcService.save(firstToCheckBtc);
        await btcApiMocker.setHeightInMockBTCApi(initialHeight);
        // get actual blockchain
        await btcApiMocker.moveXBlocks(blocksToMove1);
        await armadilloOperations.fakeMainchainBlock(rskheightOfConsecutiveRskTags);
        await btcApiMocker.moveXBlocks(blocksToMove2);
        const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await armadilloOperations.getBlockchains()));
        // mainchain validation
        const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
        btcMainchain.btcInfo.guessedMiner = null;
        let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
        const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
        const btcMainchain3: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightMainchain3);
        btcMainchain3.btcInfo.guessedMiner = null;
        const rskBlockMainchain3: RskBlockInfo = await rskApiService.getBlock(btcMainchain3.rskTag.BN);
        const itemExpected3: Item = new Item(btcMainchain3.btcInfo, rskBlockMainchain3);
        const mainchain: Item[] = [itemExpected3];
        for (let i = itemExpected3.rskInfo.height - 1; i > itemExpected.rskInfo.height; i--) {
            rskBlockMainchain = await rskApiService.getBlock(i);
            mainchain.push(new Item(null, rskBlockMainchain));
        }
        mainchain.push(itemExpected);
        const blockchainExpected: BlockchainHistory = new BlockchainHistory(mainchain, []);
        expect(blockchain).to.be.eql(blockchainExpected);
    });

    // TODO Review there is a bug in the armadillo code aparently, to be investigated
    it('should generate a mainchain connection between 3 BTC blocks with RSK tags, a reorganization of lenght 3 in RSK happens in between the second and third btc checkpoint, the monitor rebuilds mainchain to consider reorganization, end to end', async () => {
        const initialHeight: number = heightOfConsecutiveRskTags;
        const btcWitnessBlockHeightMainchain3: number = initialHeight + 2;
        const blocksToMove1: number = 2;
        const blocksToMove2: number = 1;
        const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
        await btcService.save(firstToCheckBtc);
        await btcApiMocker.setHeightInMockBTCApi(initialHeight);
        // get actual blockchain
        await btcApiMocker.moveXBlocks(blocksToMove1);
        await armadilloOperations.fakeMainchainBlock(rskheightOfConsecutiveRskTags - 2);
        await armadilloOperations.fakeMainchainBlock(rskheightOfConsecutiveRskTags - 1);
        await armadilloOperations.fakeMainchainBlock(rskheightOfConsecutiveRskTags);
        await btcApiMocker.moveXBlocks(blocksToMove2);
        const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await armadilloOperations.getBlockchains()));
        // mainchain validation
        const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
        btcMainchain.btcInfo.guessedMiner = null;
        let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
        const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
        const btcMainchain3: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightMainchain3);
        btcMainchain3.btcInfo.guessedMiner = null;
        const rskBlockMainchain3: RskBlockInfo = await rskApiService.getBlock(btcMainchain3.rskTag.BN);
        const itemExpected3: Item = new Item(btcMainchain3.btcInfo, rskBlockMainchain3);
        const mainchain: Item[] = [itemExpected3];
        for (let i = itemExpected3.rskInfo.height - 1; i > itemExpected.rskInfo.height; i--) {
            rskBlockMainchain = await rskApiService.getBlock(i);
            mainchain.push(new Item(null, rskBlockMainchain));
        }
        mainchain.push(itemExpected);
        const blockchainExpected: BlockchainHistory = new BlockchainHistory(mainchain, []);
        expect(blockchain).to.be.eql(blockchainExpected);
    });
    // TODO differentiate rskTag of sibling and mainchain block, reorg test
    it('should generate a mainchain connection between 3 BTC blocks with RSK tags, reorganization happens on second btc checkpoint, it goes as a sibling, end to end', async () => {
        const initialHeight: number = heightForSiblingRskTag;
        const btcWitnessBlockHeightMainchain3: number = initialHeight + 2;
        const blocksToMove1: number = 2;
        const blocksToMove2: number = 1;
        const firstToCheckBtc: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight - 1);
        await btcService.save(firstToCheckBtc);
        await btcApiMocker.setHeightInMockBTCApi(initialHeight);
        // get actual blockchain‚
        await btcApiMocker.moveXBlocks(blocksToMove1);
        await armadilloOperations.swapMainchainBlockWithSibling(rskHeightWithSibling);
        await btcApiMocker.moveXBlocks(blocksToMove2);
        const blockchain: BlockchainHistory = BlockchainHistory.fromObject((await armadilloOperations.getBlockchains()));
        // mainchain validation
        const btcMainchain: BtcBlock = await btcApiService.getBlock(firstBtcBlock + initialHeight);
        btcMainchain.btcInfo.guessedMiner = null;
        let rskBlockMainchain: RskBlockInfo = await rskApiService.getBlock(btcMainchain.rskTag.BN);
        const itemExpected: Item = new Item(btcMainchain.btcInfo, rskBlockMainchain);
        const btcMainchain3: BtcBlock = await btcApiService.getBlock(firstBtcBlock + btcWitnessBlockHeightMainchain3);
        btcMainchain3.btcInfo.guessedMiner = null;
        const rskBlockMainchain3: RskBlockInfo = await rskApiService.getBlock(btcMainchain3.rskTag.BN);
        const itemExpected3: Item = new Item(btcMainchain3.btcInfo, rskBlockMainchain3);
        const mainchain: Item[] = [itemExpected3];
        for (let i = itemExpected3.rskInfo.height - 1; i > itemExpected.rskInfo.height; i--) {
            rskBlockMainchain = await rskApiService.getBlock(i);
            mainchain.push(new Item(null, rskBlockMainchain));
        }
        mainchain.push(itemExpected);
        const blockchainExpected: BlockchainHistory = new BlockchainHistory(mainchain, []);
        expect(blockchain).to.be.eql(blockchainExpected);
    });
});
