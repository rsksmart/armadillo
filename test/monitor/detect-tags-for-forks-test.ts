import "mocha";
import { BtcBlock } from "../../src/common/btc-block";
import { BtcWatcher } from "../../src/services/btc-watcher";
import { BranchItem, Branch, RangeForkInMainchain } from "../../src/common/branch";
import { expect } from "chai";
import { ForkDetector } from "../../src/services/fork-detector";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { stubObject } from "ts-sinon";
import sinon from "sinon";
import { RskBlockInfo, RskForkItemInfo } from "../../src/common/rsk-block";
import { RskApiService } from "../../src/services/rsk-api-service";
import { RskApiConfig } from "../../src/config/rsk-api-config";
import { MongoStore } from "../../src/storage/mongo-store";
import { BranchService } from "../../src/services/branch-service";
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

const btcBlock1 = new BtcBlock(100, "btcHash100", RSKTAG1);
const btcBlock2 = new BtcBlock(1000, "btcHash101", RSKTAG2);
const btcBlock3 = new BtcBlock(10000, "btcHash102", RSKTAG3);
const btcBlock4 = new BtcBlock(100000, "btcHash104", RSKTAG4);
const btcBlock5 = new BtcBlock(200000, "btcHash105", RSKTAG_in_future111);
const btcBlock6 = new BtcBlock(200100, "btcHash105", RSKTAG_in_future112);

const rskBlock1= new RskForkItemInfo(forkData1, forkData1.BN);
const rskBlock111 = new RskBlockInfo(111, "rskHash111", "rskHash110", true, new ForkDetectionData(RSKTAG_in_future111));
const rskBlock112 = new RskBlockInfo(112, "rskHash112", "rskHash111", true, new ForkDetectionData(RSKTAG_in_future112));
const rskBlockFork1 = new RskBlockInfo(1, "rskHash2", "rskHash1", true, forkData_FORKED1);

const branch = new Branch(null, [new BranchItem(null, rskBlock1)]);

let btcWatcher;
let rskApiConfig: RskApiConfig;
let mongoStore: MongoStore;
let btcStore: MongoStore;
let branchService: BranchService;
let rskApiService: RskApiService;
let btcService: BtcService;
let forkDetector: ForkDetector;
let mainchainService: MainchainService;

describe('Forks branch tests', () => {

  afterEach(async function () {
    sinon.restore();
  });

  beforeEach(function () {
    var httpBtcApi = stubObject<HttpBtcApi>(HttpBtcApi.prototype);
    btcWatcher = new BtcWatcher(httpBtcApi, null, 0);
    rskApiConfig =  new RskApiConfig("localhost:4444",0);
    mongoStore = stubObject<MongoStore>(MongoStore.prototype);
    btcStore = stubObject<MongoStore>(MongoStore.prototype);
    branchService = new BranchService(mongoStore);
    rskApiService = new RskApiService(rskApiConfig);
    btcStore = stubObject<MongoStore>(MongoStore.prototype);
    btcService = new BtcService(btcStore);
    mainchainService = new MainchainService(mongoStore);
  
    var getBestBlockMainchainService = sinon.stub(mainchainService, <any>'getBestBlock')
    getBestBlockMainchainService.returns(null);

    forkDetector = new ForkDetector(branchService, mainchainService, btcWatcher, rskApiService);
  });

  describe("Forks in present and in the past", () => {
    it("Fork: new branch, CPV match 0 bytes", async () => {
      const rskBLock1000 = new RskBlockInfo(1000, "hash4", "hash3", true, new ForkDetectionData(PREFIX + "dddddddddddddd" + NU + "000003E8"));
      const rskBlock576 = new RskBlockInfo(576, "hash576", "hash575", true, new ForkDetectionData(PREFIX + "aaaaaaaaaaaaaa" + NU + "00000240"));
      let btcBlock100 = new BtcBlock(100, "btcHash", PREFIX + "11223344556677" + NU + "000003E8");
      let rskBlock1 = new RskBlockInfo(1, "btcHash", "btcPrevHash", true,  null)

      var getBlocksByNumber = sinon.stub(rskApiService, <any>'getBlocksByNumber');
      getBlocksByNumber.withArgs(1000).returns([rskBLock1000]);

      var getBestBlock = sinon.stub(rskApiService, <any>"getBestBlock");
      getBestBlock.returns(rskBLock1000);

      var getBlock = sinon.stub(rskApiService, <any>"getBlock");
      getBlock.withArgs(1).returns(rskBlock1);
      getBlock.withArgs(1000).returns(rskBLock1000);
      getBlock.withArgs(576).returns(rskBlock576);

      var getForksDetected = sinon.stub(branchService, <any>'getForksDetected');
      getForksDetected.returns([]);

      var getLastBlockDetected = sinon.stub(btcService, <any>'getLastBlockDetected');
      getLastBlockDetected.returns(btcBlock100);
 
      sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      sinon.stub(btcService, <any>'save').callsFake(function (blockToSave) {
        expect(blockToSave).to.deep.equal(btcBlock100);
      });
      
      let rangeForkInMainchain = new RangeForkInMainchain(rskBlock1, rskBlock576);
      const branchItemWhichForkNetwork = new BranchItem(btcBlock100.btcInfo, RskForkItemInfo.fromForkDetectionData(btcBlock100.rskTag, rskBLock1000.height));
      const branchExpected = new Branch(rangeForkInMainchain, branchItemWhichForkNetwork);

      let save = sinon.stub(branchService, <any>'save');
      save.callsFake(function (branchToSave) {
        expect(branchToSave).to.deep.equal(branchExpected);
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

      var getForksDetected = sinon.stub(branchService, <any>'getForksDetected');
      getForksDetected.onCall(0).returns([]);
      getForksDetected.onCall(1).returns([]);
      getForksDetected.onCall(2).returns([branch]);
      getForksDetected.onCall(3).returns([branch]);

      let saveBranch = sinon.stub(branchService, <any>'save')
      saveBranch.callsFake(function () { });

      let addBranchItem = sinon.stub(branchService, <any>'addBranchItem');
      addBranchItem.callsFake(function () { });

      let getRangeForkWhenItCouldHaveStarted = sinon.stub(rskApiService, <any>'getRangeForkWhenItCouldHaveStarted')
      getRangeForkWhenItCouldHaveStarted.returns(rskBlock111);

      sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      await forkDetector.onNewBlock(btcBlock1);
      await forkDetector.onNewBlock(btcBlock2);
      await forkDetector.onNewBlock(btcBlock3);
      await forkDetector.onNewBlock(btcBlock4);
      await sleep(100)

      //Validations
      expect(addBranchItem.calledTwice).to.be.true;
      expect(saveBranch.calledTwice).to.be.true;
    });
  });

  describe("Fork in future", () => {
    it("Created a new branch", async () => {
      let tagInTheFuture = PREFIX + CPV1 + NU + "0000006F"
      let btcBlock = new BtcBlock(200000, "btcHash200000", tagInTheFuture);
      let rskBestBlock = new RskBlockInfo(90, "rskHash90", "rskHash89", true, new ForkDetectionData(PREFIX + CPV1 + NU + "0000005A"));
      let rskBlock1 = new RskBlockInfo(1, "rskHash1", null, true, null);

      let item2 = new BranchItem(btcBlock.btcInfo, RskForkItemInfo.fromForkDetectionData(new ForkDetectionData(tagInTheFuture), rskBestBlock.height));
      let rangeForkInMainchain = new RangeForkInMainchain(rskBlock1, rskBestBlock);
      let branchExpected = new Branch(rangeForkInMainchain, [item2])

      let getBlocksByNumber = sinon.stub(rskApiService, <any>'getBlocksByNumber');
      getBlocksByNumber.returns([rskBestBlock]);

      let getBestBlock = sinon.stub(rskApiService, <any>'getBestBlock');
      getBestBlock.returns(rskBestBlock);

      let getForksDetected = sinon.stub(branchService, <any>'getForksDetected');
      getForksDetected.returns([]);

      let getRangeForkWhenItCouldHaveStarted = sinon.stub(rskApiService, <any>'getRangeForkWhenItCouldHaveStarted')
      getRangeForkWhenItCouldHaveStarted.returns(rangeForkInMainchain);

      let saveBranch = sinon.stub(branchService, <any>'save')
      saveBranch.callsFake(function (branchToSave) {
        expect(branchExpected).to.deep.equal(branchToSave);
      });

      var blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      await forkDetector.onNewBlock(btcBlock);

      //Validations
      expect(saveBranch.calledOnce).to.be.true;
      expect(blockSuccessfullyProcessed.called).to.be.true;
    });

    it("Created a new branch with two items", async () => {
      let rangeForkInMainchain = new RangeForkInMainchain(rskBlock111, rskBlock111);

      let item1 = new BranchItem(btcBlock5.btcInfo, RskForkItemInfo.fromForkDetectionData(btcBlock5.rskTag, rskBlock111.height));
      let item2 = new BranchItem(btcBlock6.btcInfo, RskForkItemInfo.fromForkDetectionData(btcBlock6.rskTag, rskBlock111.height));
      let branchFirstSaved = new Branch(rangeForkInMainchain, [item1]);
     
      let getBlocksByNumber = sinon.stub(rskApiService, <any>'getBlocksByNumber');
      getBlocksByNumber.returns([rskBlockFork1]);
      
      let getBestBlock = sinon.stub(rskApiService, <any>'getBestBlock');
      getBestBlock.returns(rskBlock111);

      let getForksDetected = sinon.stub(branchService, <any>'getForksDetected');
      getForksDetected.onCall(0).returns([]);
      getForksDetected.onCall(1).returns([branchFirstSaved]);

      let getRangeForkWhenItCouldHaveStarted = sinon.stub(rskApiService, <any>'getRangeForkWhenItCouldHaveStarted')
      getRangeForkWhenItCouldHaveStarted.returns(rangeForkInMainchain);

      let saveBranch = sinon.stub(branchService, <any>'save')
      saveBranch.callsFake(function (branchToSave) {
        expect(branchToSave).to.deep.equal(branchFirstSaved);
      });

      let addBranchItem = sinon.stub(branchService, <any>'addBranchItem');
      addBranchItem.callsFake(function (prefixHash, branchPassToMethod) {
        expect(prefixHash).to.deep.equal(branchFirstSaved.getFirstDetected().rskForkInfo.forkDetectionData.prefixHash);
        expect(branchPassToMethod).to.deep.equal(item2);
      });
      
      sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      await forkDetector.onNewBlock(btcBlock5);
      await forkDetector.onNewBlock(btcBlock6);
      await sleep(100)

      //Validations
      expect(saveBranch.calledOnce).to.be.true;
      expect(addBranchItem.calledOnce).to.be.true;
    });

    it("Tag repeted arrive, should not create a new branch, because it is already a fork, tag exists in branch", async () => {
      let rangeForkInMainchain = new RangeForkInMainchain(rskBlock111, rskBlock111);
      let item1 = new BranchItem(btcBlock5.btcInfo, RskForkItemInfo.fromForkDetectionData(btcBlock5.rskTag, rskBlock111.height));
      let branchFirstSaved = new Branch(rangeForkInMainchain, [item1]);

      let getBlocksByNumber = sinon.stub(rskApiService, <any>'getBlocksByNumber');
      getBlocksByNumber.returns([]);

      let getBestBlock = sinon.stub(rskApiService, <any>'getBestBlock');
      getBestBlock.returns(rskBlock111);

      sinon.stub(rskApiService, <any>'getBlock');
      getBestBlock.returns(rskBlock111);

      let getForksDetected = sinon.stub(branchService, <any>'getForksDetected');
      getForksDetected.onCall(0).returns([]);
      getForksDetected.onCall(1).returns([branchFirstSaved]);

      let getRangeForkWhenItCouldHaveStarted = sinon.stub(rskApiService, <any>'getRangeForkWhenItCouldHaveStarted')
      getRangeForkWhenItCouldHaveStarted.returns(rangeForkInMainchain);

      let saveBranch = sinon.stub(branchService, <any>'save')
      saveBranch.callsFake(function (branchToSave) {
        expect(branchToSave).to.deep.equal(branchFirstSaved);
      });

      let addBranchItem = sinon.stub(branchService, <any>'addBranchItem');
      
      sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      await forkDetector.onNewBlock(btcBlock5);
      await forkDetector.onNewBlock(btcBlock5);

      //Validations
      expect(saveBranch.calledOnce).to.be.true;
      expect(addBranchItem.notCalled).to.be.true;
    });
  });
})