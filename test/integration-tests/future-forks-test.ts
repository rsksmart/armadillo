import { expect } from "chai";
import { Fork, ForkItem, RangeForkInMainchain, Item } from "../../src/common/forks";
import { RskForkItemInfo } from "../../src/common/rsk-block";
import { MonitorConfig } from "../../src/config/monitor-config";
import { HttpBtcApi } from "../../src/services/btc-api";
import { RskApiService } from "../../src/services/rsk-api-service";
import { getBlockchainsAfterMovingXBlocks, getDBForksAfterMovingXBlocks } from "./lib/armadillo-operations";
import { setHeightInMockBTCApi } from "./lib/btc-api-mocker";
import { armadilloDB, armadilloMainchain, deleteDB, findBlocks, connectDB, disconnectDB } from "./lib/mongo-utils";
import { getLastRSKHeight } from "./lib/rsk-operations";
import { getCPVEndHeightMainchain, getCPVStartHeightMainchain, validateForksRskBlockMongoDB, validateMainchainRskMongoDB, validateMongoOutput } from "./lib/validators";
import assert = require("assert");
import { dataInputPath, DEFAULT_CONFIG_PATH, bestRskBlock, fileSuffix } from "./lib/configs";
import { buildExpectedFork } from "./lib/fork-builder";
import { MongoStore } from "../../src/storage/mongo-store";
import { MongoConfig } from "../../src/config/mongo-config";
import { StoreConfig } from "../../src/config/store-config";
import { disconnect } from "cluster";

const firstBtcBlock = 8704;

const heightOfNoRskTags = firstBtcBlock + 0;
const heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff = firstBtcBlock + 129;
const heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff = firstBtcBlock + 133;
const heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff = firstBtcBlock + 135;
const forksPresentFilePrefix = dataInputPath + "future-forks-";
const mainchainPresentFilePrefix = dataInputPath + "future-mainchain-";

let btcApiService: HttpBtcApi;
let rskApiService: RskApiService;
let monitorConfig: MonitorConfig;
// let mongoStoreForks: MongoStore;
// let mongoStoreMainchain: MongoStore;
let db;
describe("RSK Forks in the future tests", () => {
  before(async () => {
    db = await connectDB(armadilloDB);
    monitorConfig = MonitorConfig.getMainConfig(DEFAULT_CONFIG_PATH);
    // mongoStoreForks = new MongoStore(monitorConfig.store.forks);
    // await mongoStoreForks.connect();
    // mongoStoreMainchain = new MongoStore(monitorConfig.store.mainchain);
    // await mongoStoreMainchain.connect();
    btcApiService = new HttpBtcApi(monitorConfig.btcApi);
    rskApiService = new RskApiService(monitorConfig.rskApi);
  });
  after(async ()=> {
    // await mongoStoreMainchain.disconnect();
    // await mongoStoreForks.disconnect();
    await disconnectDB(db);
  });
  beforeEach(async () => {
    await deleteDB(db); //Esto borra producción, hay que connectar el monitor y la api que ejecutan a la de test.
    // console.log(await mongoStoreForks.getCollection())
    // if (await mongoStoreForks.getCollection()){
    //   await mongoStoreForks.getCollection().drop();
    // }
    // if (await mongoStoreMainchain.getCollection()) {
    //   await mongoStoreMainchain.getCollection().drop();
    // }
    
  });
  afterEach(async () => {
    await setHeightInMockBTCApi(heightOfNoRskTags); 
  });

  describe("RSK no match at same height with matching CPV, RSK height in the future regarding BTC chain, end to end", () => {
    it.only("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, full CPV match", async () => { 

      const initialHeight = heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff;
      let btcWitnessBlockHeight = initialHeight + 1;
      const blocksToMove = 1;
      const cpvDiffExpected = 0;
      //get actual blockchain
      const blockchain = await getBlockchainsAfterMovingXBlocks( initialHeight, blocksToMove );
      //Get actual fork
      let fork = blockchain.data.forks[0];
      let timeExpected = blockchain.data.forks[0].time; //adding same time to remove from comparision.
      //Prepare expected fork
      const btcWitnessBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
      const heightStart = getCPVStartHeightMainchain(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
      const start = await rskApiService.getBlock(heightStart);
      const heightEnd = getCPVEndHeightMainchain(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
      const end = await rskApiService.getBlock(heightEnd);
      const range = new RangeForkInMainchain(start, end);
      let rskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
      btcWitnessBlock.btcInfo.guessedMiner = null;
      const forkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
      let forkExpected = new Fork(range, forkItem); 
      expect(fork).to.be.eql(forkExpected);
      expect(blockchain.data.forks.length).to.be.equal(1);


      //Alternative Version
      let forkExpected2 = await buildExpectedFork([btcWitnessBlockHeight],cpvDiffExpected);
      fork.items = fork.items.map( item => {
        item.time = "time out of scope";
        return item;
      });

      expect(fork).to.be.eql(forkExpected2);

      //mainchain validation
      let btcMainchain = await btcApiService.getBlock(initialHeight);
      btcMainchain.btcInfo.guessedMiner=null;
      let rskBlockMainchain = await rskApiService.getBlock(btcMainchain.rskTag.BN)
      let itemExpected = new Item(btcMainchain.btcInfo, rskBlockMainchain); 
      expect(blockchain.data.mainchain[0]).to.be.eql(itemExpected);
    });

    it.only("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 3 bytes CPV match", async () => {
      const initialHeight = heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff;
      const btcWitnessBlockHeight = initialHeight + 1;
      const blocksToMove = 1;
      const cpvDiffExpected = 4;
      const blockchain = await getBlockchainsAfterMovingXBlocks(initialHeight, blocksToMove);
      //Get actual fork
      let fork = blockchain.data.forks[0];
      //ExpectedFork
      let forkExpected = await buildExpectedFork([btcWitnessBlockHeight],cpvDiffExpected);
      fork.items = fork.items.map( item => {
        item.time = "time out of scope";
        return item;
      });
      expect(fork).to.be.eql(forkExpected);
      expect(blockchain.data.forks.length).to.be.equal(1);
      //mainchain validation
      let btcMainchain = await btcApiService.getBlock(initialHeight);
      btcMainchain.btcInfo.guessedMiner=null;
      let rskBlockMainchain = await rskApiService.getBlock(btcMainchain.rskTag.BN)
      let itemExpected = new Item(btcMainchain.btcInfo, rskBlockMainchain); 
      expect(blockchain.data.mainchain[0]).to.be.eql(itemExpected);
    });
    it.only("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 0 bytes CPV match", async () => {
      const initialHeight = heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff;
      const btcWitnessBlockHeight = initialHeight + 1;
      const blocksToMove = 1;
      const cpvDiffExpected = 7;
      const blockchain = await getBlockchainsAfterMovingXBlocks(initialHeight, blocksToMove);
      //Get actual fork
      let fork = blockchain.data.forks[0];
      //ExpectedFork
      let timeExpected = fork.time; //adding same time to remove from comparision.
      const btcWitnessBlock = await btcApiService.getBlock(btcWitnessBlockHeight);
      const heightStart = getCPVStartHeightMainchain(btcWitnessBlock.rskTag.BN, cpvDiffExpected);
      const start = await rskApiService.getBlock(heightStart);
      start.forkDetectionData= null;
      const heightEnd = getCPVEndHeightMainchain(btcWitnessBlock.rskTag.BN, cpvDiffExpected, bestRskBlock);
      const end = await rskApiService.getBlock(heightEnd);
      const range = new RangeForkInMainchain(start, end);
      let rskForkItemInfo = new RskForkItemInfo(btcWitnessBlock.rskTag, bestRskBlock);
      btcWitnessBlock.btcInfo.guessedMiner = null;
      const forkItem = new ForkItem(btcWitnessBlock.btcInfo, rskForkItemInfo, timeExpected);
      let forkExpected = new Fork(range, forkItem); 
      expect(fork).to.be.eql(forkExpected);
      expect(blockchain.data.forks.length).to.be.equal(1);
      //mainchain validation
      let btcMainchain = await btcApiService.getBlock(initialHeight);
      btcMainchain.btcInfo.guessedMiner=null;
      let rskBlockMainchain = await rskApiService.getBlock(btcMainchain.rskTag.BN)
      let itemExpected = new Item(btcMainchain.btcInfo, rskBlockMainchain); 
      expect(blockchain.data.mainchain[0]).to.be.eql(itemExpected);
    })
  });
  describe("RSK no match at same height with matching CPV, RSK height in the future regarding BTC chain, mongo input validation", () => {
    it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, full CPV match, mongo input validation", async () => {
      //Work in progress
      const initialHeight = heightOfConsecutiveBTCwithFutureRSKtags0bCPVdiff;
      let btcWitnessBlockHeight = initialHeight + 1;
      const blocksToMove = 1;
      const cpvDiffExpected = 0;
      let forkExpected = await buildExpectedFork([btcWitnessBlockHeight],cpvDiffExpected);
      const forks = await getDBForksAfterMovingXBlocks( initialHeight, blocksToMove );
      let fork = forks[0];
      fork.items = fork.items.map( item => {
        item.time = "time out of scope";
        return item;
      });
      const mainchainBlocks = await findBlocks(armadilloDB, armadilloMainchain);

      expect(fork).to.be.eql(forkExpected);
      expect(forks.length).to.be.equal(1);
      let btcMainchain = await btcApiService.getBlock(initialHeight);
      btcMainchain.btcInfo.guessedMiner=null;
      let rskBlockMainchain = await rskApiService.getBlock(btcMainchain.rskTag.BN)
      let itemExpected = new Item(btcMainchain.btcInfo, rskBlockMainchain); 
      expect(mainchainBlocks[0]).to.be.eql(itemExpected);
      // await validateForksRskBlockMongoDB(dbForks, [1]);
      // await validateMainchainRskMongoDB(mainchainBlocks, 1);
    });
    it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 5 bytes CPV match, mongo input validation", async () => {
      assert.equal(
        await getLastRSKHeight(),
        bestRskBlock,
        "Please check test data, best block of RSK needs to be " + bestRskBlock
      );
      const dbForks = await getDBForksAfterMovingXBlocks(
        heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff,
        1
      );
      const mainchainBlocks = await findBlocks(armadilloDB, armadilloMainchain);
      await setHeightInMockBTCApi(heightOfNoRskTags);
      await validateForksRskBlockMongoDB(dbForks, [1]);
      let btcStart =
        heightOfConsecutiveBTCwithFutureRSKtags2bCPVdiff - firstBtcBlock;
      let btcEnd = btcStart + 1;
      await validateMainchainRskMongoDB(mainchainBlocks, 1, btcStart, btcEnd);
    });
    it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 0 bytes CPV match, mongo input validation", async () => {
      assert.equal(
        await getLastRSKHeight(),
        bestRskBlock,
        "Please check test data, best block of RSK needs to be " + bestRskBlock
      );
      const dbForks = await getDBForksAfterMovingXBlocks(
        heightOfConsecutiveBTCwithFutureRSKtags7bCPVdiff,
        1
      );
      const mainchainBlocks = await findBlocks(armadilloDB, armadilloMainchain);
      await setHeightInMockBTCApi(heightOfNoRskTags);
      await validateForksRskBlockMongoDB(dbForks, [1]);
      await validateMainchainRskMongoDB(mainchainBlocks, 1);
    });
  });

  describe("RSK no match at same height with matching CPV, RSK height in the future regarding BTC chain, mongo output validation", () => {
    it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, full CPV match, mongo output validation", async () => {
      const testId = "cpvmatch_length1forkconsecutive";
      const forksFile = forksPresentFilePrefix + testId + fileSuffix;
      const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
      await validateMongoOutput(mainchainFile, forksFile);
    });
    it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 5 bytes CPV match, mongo output validation", async () => {
      const testId = "cpv5b_length1forkconsecutive";
      const forksFile = forksPresentFilePrefix + testId + fileSuffix;
      const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
      await validateMongoOutput(mainchainFile, forksFile);
    });
    it("should detect a future fork with the first RSK tag in BTC that height is larger than RSKs current best block, consecutive blocks, 0 bytes CPV match, mongo output validation", async () => {
      const testId = "cpv0b_length1forkconsecutive";
      const forksFile = forksPresentFilePrefix + testId + fileSuffix;
      const mainchainFile = mainchainPresentFilePrefix + testId + fileSuffix;
      await validateMongoOutput(mainchainFile, forksFile);
    });
  });
});
