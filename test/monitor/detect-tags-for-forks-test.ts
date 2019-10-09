import "mocha";
import { BtcBlock } from "../../src/common/btc-block";
import { BtcWatcher } from "../../src/services/btc-watcher";
import { BranchItem, Branch } from "../../src/common/branch";
import { expect } from "chai";
import { ForkDetector } from "../../src/services/fork-detector";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { stubObject } from "ts-sinon";
import sinon from "sinon";
import { RskBlock } from "../../src/common/rsk-block";
import { RskApiService } from "../../src/services/rsk-api-service";
import { RskApiConfig } from "../../src/config/rsk-api-config";
import { MongoStore } from "../../src/storage/mongo-store";
import { BranchService } from "../../src/services/branch-service";
import { BtcService } from "../../src/services/btc-service";
import { sleep } from "../../src/util/helper";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const NU = "00"; // 0
const CPV1 = "77665544332211";
const CPV_FORK = "dddddddddddddd";

const RSKTAG1 = PREFIX + CPV1 + NU + "00000001";

const RSKTAG_in_future = PREFIX + CPV1 + NU + "00000111";
const RSKTAG_in_future1 = PREFIX + CPV1 + NU + "00000112";

const RSKTAG5_FORK1 = PREFIX + CPV_FORK + NU + "00000001";
const RSKTAG5_FORK2 = PREFIX + CPV_FORK + NU + "00000002";
const RSKTAG5_FORK3 = PREFIX + CPV_FORK + NU + "00000003";

const forkData1 = new ForkDetectionData(RSKTAG1);

const forkData_FORKED1 = new ForkDetectionData(RSKTAG5_FORK1);
const forkData_FORKED2 = new ForkDetectionData(RSKTAG5_FORK2);
const forkData_FORKED3 = new ForkDetectionData(RSKTAG5_FORK3);

const btcBlock1 = new BtcBlock(100, "btcHash100", RSKTAG1);
const btcBlock2 = new BtcBlock(1000, "btcHash101", RSKTAG1);
const btcBlock3 = new BtcBlock(10000, "btcHash102", RSKTAG1);
const btcBlock4 = new BtcBlock(100000, "btcHash104", RSKTAG1);
const btcBlock5 = new BtcBlock(200000, "btcHash105", RSKTAG_in_future);
const btcBlock6 = new BtcBlock(200100, "btcHash105", RSKTAG_in_future1);

const rskBlock0 = new RskBlock(104, "rskHash104", "rskHash103", forkData1);
const rskBlock1 = new RskBlock(101, "rskHash101", "rskHash100", forkData1);
const rskBlock2 = new RskBlock(102, "rskHash102", "rskHash101", forkData1);

const rskBlockFork1 = new RskBlock(102, "rskHash2", "rskHash1", forkData_FORKED1);
const rskBlockFork2 = new RskBlock(103, "rskHash3", "rskHash2", forkData_FORKED2);
const rskBlockFork3 = new RskBlock(104, "rskHash4", "rskHash3", forkData_FORKED3);

const branch1 = new Branch(rskBlock1, [new BranchItem(btcBlock1.btcInfo, rskBlock1)])
const branch2 = new Branch(rskBlock2, [new BranchItem(btcBlock2.btcInfo, rskBlock2)])

const btcBlock = new BtcBlock(2, "btcHash", RSKTAG1);
let btcStub;
let rskApiConfig: RskApiConfig;
let mongoStore: MongoStore;
let btcStore: MongoStore;
let branchService: BranchService;
let rskService: RskApiService;
let btcService: BtcService;
let forkDetector: ForkDetector;

describe('Forks branch tests', () => {

  afterEach(async function () {
    sinon.restore();
  });

  beforeEach(function () {
    btcStub = stubObject<BtcWatcher>(BtcWatcher.prototype);
    rskApiConfig = stubObject<RskApiConfig>(RskApiConfig.prototype);
    mongoStore = stubObject<MongoStore>(MongoStore.prototype);
    btcStore = stubObject<MongoStore>(MongoStore.prototype);
    branchService = new BranchService(mongoStore);
    rskService = new RskApiService(rskApiConfig);
    btcStore = stubObject<MongoStore>(MongoStore.prototype);
    btcService = new BtcService(btcStore);

    forkDetector = new ForkDetector(branchService, null, btcStub, rskService);
  });

  describe("Forks in present and in the past", () => {
    it("Fork: new branch, CPV match 0 bytes", async () => {
      const rskTag = PREFIX + CPV1 + NU + "00000064"
      const rskTagSameHeight = PREFIX + "dddddddddddddd" + NU + "00000064"
      const rskBlock4 = new RskBlock(100, "hash4", "hash3", new ForkDetectionData(rskTagSameHeight));
      let btcBlock = new BtcBlock(100, "btcHash", rskTag)
      let btcBlockPrev = new BtcBlock(99, "btcHash", rskTag)
      let blockInMainchain = new RskBlock(1, "btcHash", "btcPrevHash", null)

      var getBlocksByNumber = sinon.stub(rskService, <any>'getBlocksByNumber');
      getBlocksByNumber.withArgs(100).returns([rskBlock4]);

      var getBestBlock = sinon.stub(rskService, <any>"getBestBlock");
      getBestBlock.returns(rskBlock4);
      getBestBlock.withArgs(1).returns(blockInMainchain);

      var getBlock = sinon.stub(rskService, <any>"getBlock");
      getBlock.withArgs(1).returns(blockInMainchain);

      var getForksDetected = sinon.stub(branchService, <any>'getForksDetected');
      getForksDetected.returns([]);

      var getLastBlockDetected = sinon.stub(btcService, <any>'getLastBlockDetected');
      getLastBlockDetected.returns(btcBlockPrev);

      sinon.stub(btcService, <any>'save').callsFake(function (blockToSave) {
        expect(blockToSave).to.deep.equal(btcBlock);
      });

      const branchItemWhichForkNetwork = new BranchItem(btcBlock.btcInfo, new RskBlock(btcBlock.rskTag.BN, "", "", btcBlock.rskTag));
      const branchExpected = new Branch(blockInMainchain, branchItemWhichForkNetwork);

      let save = sinon.stub(branchService, <any>'save');
      save.callsFake(function (branchToSave) {
        expect(branchToSave).to.deep.equal(branchExpected);
      });

      await forkDetector.onNewBlock(btcBlock);
      await sleep(100)

      //Validations
      expect(save.calledOnce).to.be.true;
    });

    it("Fork: 4 btc blocks arrives, genereate 2 new forks, each fork has lenght 2", async () => {
      var getLastBlockDetected = sinon.stub(btcService, <any>'getLastBlockDetected');
      getLastBlockDetected.onCall(0).returns(btcBlock);
      getLastBlockDetected.onCall(1).returns(btcBlock1);
      getLastBlockDetected.onCall(2).returns(btcBlock2);
      getLastBlockDetected.onCall(3).returns(btcBlock3);

      var saveBtc = sinon.stub(btcService, <any>'save');
      saveBtc.withArgs(btcBlock2).callsFake(function () { });
      saveBtc.withArgs(btcBlock3).callsFake(function () { });
      saveBtc.withArgs(btcBlock4).callsFake(function () { });

      var getBestBlock = sinon.stub(rskService, <any>'getBestBlock');
      getBestBlock.returns(rskBlock1);

      var getBlocksByNumber = sinon.stub(rskService, <any>'getBlocksByNumber');
      getBlocksByNumber.withArgs(btcBlock1.rskTag.BN).returns([rskBlockFork1]);
      getBlocksByNumber.withArgs(btcBlock2.rskTag.BN).returns([rskBlockFork2]);
      getBlocksByNumber.withArgs(btcBlock3.rskTag.BN).returns([rskBlockFork3]);

      var getForksDetected = sinon.stub(branchService, <any>'getForksDetected');
      getForksDetected.onCall(0).returns([]);
      getForksDetected.onCall(1).returns([]);
      getForksDetected.onCall(2).returns([branch1]);
      getForksDetected.onCall(3).returns([branch2]);

      let saveBranch = sinon.stub(branchService, <any>'save')
      saveBranch.callsFake(function () { });

      let addBranchItem = sinon.stub(branchService, <any>'addBranchItem');
      addBranchItem.callsFake(function () { });

      let getRskBlockAtCertainHeight = sinon.stub(rskService, <any>'getRskBlockAtCertainHeight')
      getRskBlockAtCertainHeight.returns(rskBlock0);

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
      let item0 = new BranchItem(null, rskBlock1);
      let item1 = new BranchItem(btcBlock5.btcInfo, new RskBlock(btcBlock5.rskTag.BN, "", "", btcBlock5.rskTag));
      let branchToBeValid = new Branch(rskBlock0, [item1, item0])

      let getBestBlock = sinon.stub(rskService, <any>'getBestBlock');
      getBestBlock.returns(rskBlock1);

      let getForksDetected = sinon.stub(branchService, <any>'getForksDetected');
      getForksDetected.returns([]);

      let saveBranch = sinon.stub(branchService, <any>'save')
      saveBranch.callsFake(function (branchToSave) {
        expect(branchToSave).to.deep.equal(branchToBeValid);
      });

      let getRskBlockAtCertainHeight = sinon.stub(rskService, <any>'getRskBlockAtCertainHeight')
      getRskBlockAtCertainHeight.returns(rskBlock0);

      await forkDetector.onNewBlock(btcBlock5);
      await sleep(100)

      //Validations
      expect(saveBranch.called).to.be.true;
    });

    it("Created a new branch with two items", async () => {
      let item0 = new BranchItem(null, rskBlock1);
      let item1 = new BranchItem(btcBlock5.btcInfo, new RskBlock(btcBlock5.rskTag.BN, "", "", btcBlock5.rskTag));
      let item2 = new BranchItem(btcBlock6.btcInfo, new RskBlock(btcBlock6.rskTag.BN, "", "", btcBlock6.rskTag));
      let branchFirstSaved = new Branch(rskBlock0, [item1, item0]);

      let getBestBlock = sinon.stub(rskService, <any>'getBestBlock');
      getBestBlock.returns(rskBlock1);

      let getForksDetected = sinon.stub(branchService, <any>'getForksDetected');
      getForksDetected.onCall(0).returns([]);
      getForksDetected.onCall(1).returns([branchFirstSaved]);

      let saveBranch = sinon.stub(branchService, <any>'save')
      saveBranch.callsFake(function (branchToSave) {
        expect(branchToSave).to.deep.equal(branchFirstSaved);
      });

      let addBranchItem = sinon.stub(branchService, <any>'addBranchItem');
      addBranchItem.callsFake(function (prefixHash, branchPassToMethod) {
        expect(prefixHash).to.deep.equal(branchFirstSaved.getFirstDetected().rskInfo.forkDetectionData.prefixHash);
        expect(branchPassToMethod).to.deep.equal(item2);
      });

      let getRskBlockAtCertainHeight = sinon.stub(rskService, <any>'getRskBlockAtCertainHeight')
      getRskBlockAtCertainHeight.returns(rskBlock0);

      await forkDetector.onNewBlock(btcBlock5);
      await forkDetector.onNewBlock(btcBlock6);
      await sleep(100)

      //Validations
      expect(saveBranch.calledOnce).to.be.true;
      expect(addBranchItem.calledOnce).to.be.true;
    });
  });
})