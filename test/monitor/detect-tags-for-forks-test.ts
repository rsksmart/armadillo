import "mocha";
import { BtcBlock } from "../../src/common/btc-block";
import { BtcWatcher } from "../../src/services/btc-watcher";
import { ForkItem, Fork, RangeForkInMainchain } from "../../src/common/forks";
import { expect } from "chai";
import { ForkDetector } from "../../src/services/fork-detector";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { stubObject } from "ts-sinon";
import sinon from "sinon";
import { RskBlockInfo, RskForkItemInfo } from "../../src/common/rsk-block";
import { RskApiService } from "../../src/services/rsk-api-service";
import { RskApiConfig } from "../../src/config/rsk-api-config";
import { MongoStore } from "../../src/storage/mongo-store";
import { ForkService } from "../../src/services/fork-service";
import { BtcService } from "../../src/services/btc-service";
import { sleep } from "../../src/util/helper";
import { HttpBtcApi } from "../../src/services/btc-api";
import { MainchainService } from "../../src/services/mainchain-service";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const NU = "00"; // 0
const CPV1 = "77665544332211";
const CPV_FORK = "dddddddddddddd";

const RSKTAG1 = PREFIX + CPV1 + NU + "00000001";
const RSKTAG2 = PREFIX + CPV1 + NU + "00000002";
const RSKTAG3 = PREFIX + CPV1 + NU + "00000003";
const RSKTAG4 = PREFIX + CPV1 + NU + "00000004";
const RSKTAG_in_future111 = PREFIX + CPV1 + NU + "00000111";
const RSKTAG_in_future112 = PREFIX + CPV1 + NU + "00000112";

const RSKTAG5_FORK1 = PREFIX + CPV_FORK + NU + "00000001";

const forkData1 = new ForkDetectionData(RSKTAG1);
const forkData_FORKED1 = new ForkDetectionData(RSKTAG5_FORK1);

const btcBlock1 = new BtcBlock(100, "btcHash100", RSKTAG1, "");
const btcBlock2 = new BtcBlock(1000, "btcHash101", RSKTAG2, "");
const btcBlock3 = new BtcBlock(10000, "btcHash102", RSKTAG3, "");
const btcBlock4 = new BtcBlock(100000, "btcHash104", RSKTAG4, "");
const btcBlock5 = new BtcBlock(200000, "btcHash105", RSKTAG_in_future111, "");
const btcBlock6 = new BtcBlock(200100, "btcHash105", RSKTAG_in_future112, "");

const rskBlock1= new RskForkItemInfo(forkData1, forkData1.BN);
const rskBlock111 = new RskBlockInfo(111, "rskHash111", "rskHash110", true, "", new ForkDetectionData(RSKTAG_in_future111));
const rskBlock112 = new RskBlockInfo(112, "rskHash112", "rskHash111", true, "", new ForkDetectionData(RSKTAG_in_future112));
const rskBlockFork1 = new RskBlockInfo(1, "rskHash2", "rskHash1", true, "", forkData_FORKED1);

const fork = new Fork(null, [new ForkItem(null, rskBlock1)]);

let btcWatcher;
let rskApiConfig: RskApiConfig;
let mongoStore: MongoStore;
let btcStore: MongoStore;
let forkService: ForkService;
let rskApiService: RskApiService;
let btcService: BtcService;
let forkDetector: ForkDetector;
let mainchainService: MainchainService;

describe('Forks tests', () => {

  afterEach(async function () {
    sinon.restore();
  });

  beforeEach(function () {
    var httpBtcApi = stubObject<HttpBtcApi>(HttpBtcApi.prototype);
    btcWatcher = new BtcWatcher(httpBtcApi, null, 0);
    rskApiConfig =  new RskApiConfig("localhost:4444",0);
    mongoStore = stubObject<MongoStore>(MongoStore.prototype);
    btcStore = stubObject<MongoStore>(MongoStore.prototype);
    forkService = new ForkService(mongoStore);
    rskApiService = new RskApiService(rskApiConfig);
    btcStore = stubObject<MongoStore>(MongoStore.prototype);
    btcService = new BtcService(btcStore);
    mainchainService = new MainchainService(mongoStore);
  
    var getBestBlockMainchainService = sinon.stub(mainchainService, <any>'getBestBlock')
    getBestBlockMainchainService.returns(null);

    forkDetector = new ForkDetector(forkService, mainchainService, btcWatcher, rskApiService);
  });

  describe("Forks in present and in the past", () => {
    it("Fork: new fork, CPV match 0 bytes", async () => {
      const rskBLock1000 = new RskBlockInfo(1000, "hash4", "hash3", true, "", new ForkDetectionData(PREFIX + "dddddddddddddd" + NU + "000003E8"));
      const rskBlock576 = new RskBlockInfo(576, "hash576", "hash575", true, "", new ForkDetectionData(PREFIX + "aaaaaaaaaaaaaa" + NU + "00000240"));
      let btcBlock100 = new BtcBlock(100, "btcHash", PREFIX + "11223344556677" + NU + "000003E8", "");
      let rskBlock1 = new RskBlockInfo(1, "btcHash", "btcPrevHash", true, "",  null)

      var getBlocksByNumber = sinon.stub(rskApiService, <any>'getBlocksByNumber');
      getBlocksByNumber.withArgs(1000).returns([rskBLock1000]);

      var getBestBlock = sinon.stub(rskApiService, <any>"getBestBlock");
      getBestBlock.returns(rskBLock1000);

      var getBlock = sinon.stub(rskApiService, <any>"getBlock");
      getBlock.withArgs(1).returns(rskBlock1);
      getBlock.withArgs(1000).returns(rskBLock1000);
      getBlock.withArgs(576).returns(rskBlock576);

      var getForksDetected = sinon.stub(forkService, <any>'getForksDetected');
      getForksDetected.returns([]);

      var getLastBlockDetected = sinon.stub(btcService, <any>'getLastBlockDetected');
      getLastBlockDetected.returns(btcBlock100);
 
      sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      sinon.stub(btcService, <any>'save').callsFake(function (blockToSave) {
        expect(blockToSave).to.deep.equal(btcBlock100);
      });
      
      let rangeForkInMainchain = new RangeForkInMainchain(rskBlock1, rskBlock576);
      const forkItemWhichForkNetwork = new ForkItem(btcBlock100.btcInfo, RskForkItemInfo.fromForkDetectionData(btcBlock100.rskTag, rskBLock1000.height));
      const forkExpected = new Fork(rangeForkInMainchain, forkItemWhichForkNetwork);

      let save = sinon.stub(forkService, <any>'save');
      save.callsFake(function (forkToSave) {
        expect(forkToSave).to.deep.equal(forkExpected);
      });

      await forkDetector.onNewBlock(btcBlock100);

      //Validations
      expect(save.calledOnce).to.be.true;
    });

    it("Fork: 4 btc blocks arrives, genereate 2 new forks, each fork has lenght 2", async () => {

      var getBestBlock = sinon.stub(rskApiService, <any>'getBestBlock');
      getBestBlock.returns(rskBlock112);

      var getBestBlock = sinon.stub(rskApiService, <any>'getBlock');
      getBestBlock.returns(rskBlockFork1);

      var getBlocksByNumber = sinon.stub(rskApiService, <any>'getBlocksByNumber');
      getBlocksByNumber.returns([rskBlockFork1]);

      var getForksDetected = sinon.stub(forkService, <any>'getForksDetected');
      getForksDetected.onCall(0).returns([]);
      getForksDetected.onCall(1).returns([]);
      getForksDetected.onCall(2).returns([fork]);
      getForksDetected.onCall(3).returns([fork]);

      let saveFork = sinon.stub(forkService, <any>'save')
      saveFork.callsFake(function () { });

      let addForkItem = sinon.stub(forkService, <any>'addForkItem');
      addForkItem.callsFake(function () { });

      let getRangeForkWhenItCouldHaveStarted = sinon.stub(rskApiService, <any>'getRangeForkWhenItCouldHaveStarted')
      getRangeForkWhenItCouldHaveStarted.returns(rskBlock111);

      sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      await forkDetector.onNewBlock(btcBlock1);
      await forkDetector.onNewBlock(btcBlock2);
      await forkDetector.onNewBlock(btcBlock3);
      await forkDetector.onNewBlock(btcBlock4);
      await sleep(100)

      //Validations
      expect(addForkItem.calledTwice).to.be.true;
      expect(saveFork.calledTwice).to.be.true;
    });
  });

  describe("Fork in future", () => {
    it("Created a new fork", async () => {
      let tagInTheFuture = PREFIX + CPV1 + NU + "0000006F"
      let btcBlock = new BtcBlock(200000, "btcHash200000", tagInTheFuture, "");
      let rskBestBlock = new RskBlockInfo(90, "rskHash90", "rskHash89", true, "", new ForkDetectionData(PREFIX + CPV1 + NU + "0000005A"));
      let rskBlock1 = new RskBlockInfo(1, "rskHash1", null, true, "", null);

      let item2 = new ForkItem(btcBlock.btcInfo, RskForkItemInfo.fromForkDetectionData(new ForkDetectionData(tagInTheFuture), rskBestBlock.height));
      let rangeForkInMainchain = new RangeForkInMainchain(rskBlock1, rskBestBlock);
      let forkExpected = new Fork(rangeForkInMainchain, [item2])

      let getBlocksByNumber = sinon.stub(rskApiService, <any>'getBlocksByNumber');
      getBlocksByNumber.returns([rskBestBlock]);

      let getBestBlock = sinon.stub(rskApiService, <any>'getBestBlock');
      getBestBlock.returns(rskBestBlock);

      let getForksDetected = sinon.stub(forkService, <any>'getForksDetected');
      getForksDetected.returns([]);

      let getRangeForkWhenItCouldHaveStarted = sinon.stub(rskApiService, <any>'getRangeForkWhenItCouldHaveStarted')
      getRangeForkWhenItCouldHaveStarted.returns(rangeForkInMainchain);

      let saveFork = sinon.stub(forkService, <any>'save')
      saveFork.callsFake(function (forkToSave) {
        expect(forkExpected).to.deep.equal(forkToSave);
      });

      var blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      await forkDetector.onNewBlock(btcBlock);

      //Validations
      expect(saveFork.calledOnce).to.be.true;
      expect(blockSuccessfullyProcessed.called).to.be.true;
    });

    it("Created a new fork with two items", async () => {
      let rangeForkInMainchain = new RangeForkInMainchain(rskBlock111, rskBlock111);

      let item1 = new ForkItem(btcBlock5.btcInfo, RskForkItemInfo.fromForkDetectionData(btcBlock5.rskTag, rskBlock111.height));
      let item2 = new ForkItem(btcBlock6.btcInfo, RskForkItemInfo.fromForkDetectionData(btcBlock6.rskTag, rskBlock111.height));
      let forkFirstSaved = new Fork(rangeForkInMainchain, [item1]);
     
      let getBlocksByNumber = sinon.stub(rskApiService, <any>'getBlocksByNumber');
      getBlocksByNumber.returns([rskBlockFork1]);
      
      let getBestBlock = sinon.stub(rskApiService, <any>'getBestBlock');
      getBestBlock.returns(rskBlock111);

      let getForksDetected = sinon.stub(forkService, <any>'getForksDetected');
      getForksDetected.onCall(0).returns([]);
      getForksDetected.onCall(1).returns([forkFirstSaved]);

      let getRangeForkWhenItCouldHaveStarted = sinon.stub(rskApiService, <any>'getRangeForkWhenItCouldHaveStarted')
      getRangeForkWhenItCouldHaveStarted.returns(rangeForkInMainchain);

      let saveFork = sinon.stub(forkService, <any>'save')
      saveFork.callsFake(function (forkToSave) {
        expect(forkToSave).to.deep.equal(forkFirstSaved);
      });

      let addForkItem = sinon.stub(forkService, <any>'addForkItem');
      addForkItem.callsFake(function (prefixHash, forkPassToMethod) {
        expect(prefixHash).to.deep.equal(forkFirstSaved.getFirstDetected().rskForkInfo.forkDetectionData.prefixHash);
        expect(forkPassToMethod).to.deep.equal(item2);
      });
      
      sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      await forkDetector.onNewBlock(btcBlock5);
      await forkDetector.onNewBlock(btcBlock6);
      await sleep(100)

      //Validations
      expect(saveFork.calledOnce).to.be.true;
      expect(addForkItem.calledOnce).to.be.true;
    });

    it("Tag repeted arrive, should not create a new fork, because it is already a fork, tag exists in fork", async () => {
      let rangeForkInMainchain = new RangeForkInMainchain(rskBlock111, rskBlock111);
      let item1 = new ForkItem(btcBlock5.btcInfo, RskForkItemInfo.fromForkDetectionData(btcBlock5.rskTag, rskBlock111.height));
      let forkFirstSaved = new Fork(rangeForkInMainchain, [item1]);

      let getBlocksByNumber = sinon.stub(rskApiService, <any>'getBlocksByNumber');
      getBlocksByNumber.returns([]);

      let getBestBlock = sinon.stub(rskApiService, <any>'getBestBlock');
      getBestBlock.returns(rskBlock111);

      sinon.stub(rskApiService, <any>'getBlock');
      getBestBlock.returns(rskBlock111);

      let getForksDetected = sinon.stub(forkService, <any>'getForksDetected');
      getForksDetected.onCall(0).returns([]);
      getForksDetected.onCall(1).returns([forkFirstSaved]);

      let getRangeForkWhenItCouldHaveStarted = sinon.stub(rskApiService, <any>'getRangeForkWhenItCouldHaveStarted')
      getRangeForkWhenItCouldHaveStarted.returns(rangeForkInMainchain);

      let saveFork = sinon.stub(forkService, <any>'save')
      saveFork.callsFake(function (forkToSave) {
        expect(forkToSave).to.deep.equal(forkFirstSaved);
      });

      let addForkItem = sinon.stub(forkService, <any>'addForkItem');
      
      sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      await forkDetector.onNewBlock(btcBlock5);
      await forkDetector.onNewBlock(btcBlock5);

      //Validations
      expect(saveFork.calledOnce).to.be.true;
      expect(addForkItem.notCalled).to.be.true;
    });
  });
})