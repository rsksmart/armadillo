import "mocha";
import { BtcHeaderInfo, BtcBlock } from "../../src/common/btc-block";
import { BtcWatcher } from "../../src/services/btc-watcher";
import { BranchItem } from "../../src/common/branch";
import { expect } from "chai";
import { ForkDetector } from "../../src/services/fork-detector";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { stubObject } from "ts-sinon";
import sinon from "sinon";
import { RskBlock } from "../../src/common/rsk-block";
import { RskApiService } from "../../src/services/rsk-api-service";
import { MainchainService } from "../../src/services/mainchain-service";
import { RskApiConfig } from "../../src/config/rsk-api-config";
import { MongoStore } from "../../src/storage/mongo-store";
import { BtcService } from "../../src/services/btc-service";
import { HttpBtcApi } from "../../src/services/btc-api";
import { sleep } from "../../src/util/helper";
import { unwatchFile } from "fs";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0
const BN = "00000001"; // 1
const RSKTAG = PREFIX + CPV + NU + BN;
const forkData = new ForkDetectionData(RSKTAG);
const btcBlock = new BtcBlock(2, "btcHash", RSKTAG)
let btcWatcher: BtcWatcher;
let rskApiConfig: RskApiConfig;
let mongoStore: MongoStore;
let btcStore: MongoStore;
let mainchainService: MainchainService;
let rskService: RskApiService;
let forkDetector: ForkDetector;
let btcService: BtcService;
let btcBlockPrev = new BtcBlock(1, "btcHash", "")

//Building mainchain when a new btc block arrives
describe('Mainchain test', () => {

  afterEach(function () {
    sinon.restore();
  });

  beforeEach(function () {
    var httpBtcApi = stubObject<HttpBtcApi>(HttpBtcApi.prototype);
    btcWatcher = new BtcWatcher(httpBtcApi, null, 0);
    rskApiConfig =  new RskApiConfig("localhost:4444",0);
    mongoStore = stubObject<MongoStore>(MongoStore.prototype);
    mainchainService = new MainchainService(mongoStore);
    rskService = new RskApiService(rskApiConfig);
    btcStore = stubObject<MongoStore>(MongoStore.prototype);
    btcService = new BtcService(btcStore);
    forkDetector = new ForkDetector(null, mainchainService, btcWatcher, rskService);

    var getLastBlockDetected = sinon.stub(btcService, <any>'getLastBlockDetected');
    getLastBlockDetected.returns(btcBlockPrev);

    sinon.stub(btcService, <any>'save').callsFake(function () { });
  });

  it("getBlocksByNumber method", async () => {

    var getBlocksByNumber = sinon.stub(rskService, <any>'getBlocksByNumber').returns([]);

    sinon.stub(rskService, <any>'getBestBlock').returns(btcBlock);

    await forkDetector.onNewBlock(btcBlock);

    //Validations
    expect(getBlocksByNumber.called).to.be.true;
  });

  describe('New btc block has a tag which is in RSK network mainchain', () => {
    it("First item in mainnet", async () => {
      const rskBlock = new RskBlock(1, "hash", "prevHash", true, forkData);

      sinon.stub(rskService, <any>'getBlocksByNumber').returns([rskBlock]);
      sinon.stub(mainchainService, <any>'getBestBlock').returns(null);
      sinon.stub(rskService, <any>'getBestBlock').returns(rskBlock);
      var saveMainchain = sinon.stub(mainchainService, <any>'save').callsFake(null);

      var blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');
      
      await forkDetector.onNewBlock(btcBlock);

      //Validations
      expect(saveMainchain.called).to.be.true;
      expect(blockSuccessfullyProcessed.called).to.be.true;
    });

    it("Connect item in mainchain is not posibble because top hash item doesn't match with current prevHash", async () => {
      const rskBlock1 = new RskBlock(1, "hash", "prevHash", true, forkData);
      const rskBlock2 = new RskBlock(2, "hash", "prevHash", true, forkData);

      sinon.stub(rskService, <any>'getBlocksByNumber').returns([rskBlock2]);
      sinon.stub(mainchainService, <any>'getBestBlock').returns(new BranchItem(btcBlock.btcInfo, rskBlock1));
      sinon.stub(rskService, <any>'getBestBlock').returns(rskBlock1);
      var saveMainchain = sinon.stub(mainchainService, <any>'save').callsFake(null);

      var blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      await forkDetector.onNewBlock(btcBlock);

      //Validations
      sleep(100);
      expect(blockSuccessfullyProcessed.called).to.be.false;
      expect(saveMainchain.called).to.be.false;
    });

    it("Connect item in mainchain, now mainchain has 2 blocks", async () => {
      const rskBlock1 = new RskBlock(1, "hash1", "hash0", true, forkData);
      const rskBlock2 = new RskBlock(2, "hash2", "hash1", true, forkData);

      sinon.stub(rskService, <any>'getBlocksByNumber').returns([rskBlock2]);
      sinon.stub(mainchainService, <any>'getBestBlock').returns(new BranchItem(new BtcHeaderInfo(1, "hash"), rskBlock1));
      sinon.stub(rskService, <any>'getBestBlock').returns(rskBlock1);
      var saveMainchain = sinon.stub(mainchainService, <any>'save').callsFake(null);

      let blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      await forkDetector.onNewBlock(btcBlock);

      //Validations
      expect(saveMainchain.called).to.be.true;
      expect(blockSuccessfullyProcessed.called).to.be.true;
    });

    it("Rebuid 2 blocks between top mainchain and the new block found", async () => {
      const rskTag = PREFIX + CPV + NU + "00000004"
      const forkData1 = new ForkDetectionData(rskTag);
      const rskBlock1 = new RskBlock(1, "hash1", "hash0", true, forkData);
      const rskBlock2 = new RskBlock(2, "hash2", "hash1", true, forkData);
      const rskBlock3 = new RskBlock(3, "hash3", "hash2", true, forkData);
      const rskBlock4 = new RskBlock(4, "hash4", "hash3", true, forkData1);
      const btcBlock = new BtcBlock(2, "btcHash", rskTag)

      const getBlocksByNumber = sinon.stub(rskService, <any>'getBlocksByNumber');
      getBlocksByNumber.withArgs(4).returns([rskBlock4]);

      let getBlock = sinon.stub(rskService, <any>'getBlock');
      getBlock.withArgs(4).returns(rskBlock4);
      getBlock.withArgs(2).returns(rskBlock2);
      getBlock.withArgs(3).returns(rskBlock3);

      sinon.stub(mainchainService, <any>'getBestBlock').returns(new BranchItem(new BtcHeaderInfo(1, "hash"), rskBlock1));

      var saveMainchain = sinon.stub(mainchainService, <any>'save').callsFake(() => {});

      let blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      sinon.stub(rskService, <any>'getBestBlock').returns(rskBlock4);

      await forkDetector.onNewBlock(btcBlock);

      //Validations
      expect(saveMainchain.called).to.be.true;
      expect(blockSuccessfullyProcessed.called).to.be.true;
    });
  })

  describe('New btc block with RSK tag is pointing to an RSK uncle', () => {
    it("Buinding mainchain with best block instead using the uncle at that height, also save uncle", async () => {
      const rskTag = PREFIX + CPV + NU + "00000002"
      const forkData1 = new ForkDetectionData(rskTag);
      const btcBlock = new BtcBlock(200, "btcHash", rskTag);
      const rskNoBest = new RskBlock(2, "hash2_NoBest", "hash1", false, forkData1);
      const rskNoBestBranchItem = new BranchItem(btcBlock.btcInfo, rskNoBest);
      const rskBest = new RskBlock(2, "hash2", "hash1", true, forkData);
      const rskBestBranchItem = new BranchItem(null, rskBest);
      
      const getBlocksByNumber = sinon.stub(rskService, <any>'getBlocksByNumber');
      getBlocksByNumber.withArgs(2).returns([rskNoBest, rskBest]);

      sinon.stub(mainchainService, <any>'getBestBlock').returns(new BranchItem(null, rskBest));

      const saveMainchain = sinon.stub(mainchainService, <any>'save');
      saveMainchain.withArgs([rskNoBestBranchItem]).callsFake((branchItems) => {
        expect([rskNoBestBranchItem]).to.deep.equal(branchItems);
      });
      saveMainchain.withArgs([rskBestBranchItem]).callsFake((branchItems) => {
        expect([rskBestBranchItem]).to.deep.equal(branchItems);
      });

      sinon.stub(rskService, <any>'getBestBlock').returns(rskNoBest);

      let blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      await forkDetector.onNewBlock(btcBlock);

      //Validations
      expect(saveMainchain.called).to.be.true;
      expect(saveMainchain.calledTwice).to.be.true;
      expect(blockSuccessfullyProcessed.called).to.be.true;
    });
  })
})