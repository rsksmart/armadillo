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
const CPV = "d89d8bf4d2e434";
const NU = "00"; 
const BN = "00000001";
const RSKTAG = PREFIX + CPV + NU + BN;
const forkData = new ForkDetectionData(RSKTAG);
const btcBlock = new BtcBlock(2, "btcHash", RSKTAG)
const RSKTAGinMainchain = PREFIX + CPV + NU + "00000001";
const btcBlockInMainchain = new BtcBlock(1, "btcHash", RSKTAGinMainchain)
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

    it("Connect item in mainchain is not posibble because top hash item doesn't match with coming prevHash", async () => {
      const partTag: string = PREFIX + CPV + NU;
      const rskBlock1 = new RskBlock(1, "hash1", "hash0", true,  new ForkDetectionData(partTag + "00000001"));
      const rskBlock2 = new RskBlock(2, "hash2", "hash", true,  new ForkDetectionData(partTag + "00000002"));

      sinon.stub(rskService, <any>'getBlocksByNumber').returns([rskBlock2]);
      sinon.stub(mainchainService, <any>'getBestBlock').returns(new BranchItem(btcBlockInMainchain.btcInfo, rskBlock1));
      sinon.stub(rskService, <any>'getBestBlock').returns(rskBlock2);
      var saveMainchain = sinon.stub(mainchainService, <any>'save').callsFake(null);

      var blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');
      var newBtcBLock = new BtcBlock(10, "btcHash", partTag + "00000002");
      await forkDetector.onNewBlock(newBtcBLock);

      //Validations
      sleep(100);
      expect(blockSuccessfullyProcessed.called).to.be.false;
      expect(saveMainchain.called).to.be.false;
    });

    it("Connect item in mainchain, now mainchain has 2 blocks", async () => {
      const partTag: string = PREFIX + CPV + NU;
      const rskBlock1 = new RskBlock(1, "hash1", "hash0", true,  new ForkDetectionData(partTag + "00000001"));
      const rskBlock2 = new RskBlock(2, "hash2", "hash1", true,  new ForkDetectionData(partTag + "00000002"));
      const mainchainBest = new BranchItem(btcBlockInMainchain.btcInfo, rskBlock1);

      sinon.stub(rskService, <any>'getBlocksByNumber').returns([rskBlock2]);
      sinon.stub(rskService, <any>'getBestBlock').returns(rskBlock2);
      sinon.stub(mainchainService, <any>'getBestBlock').returns(mainchainBest);
      
      var saveMainchain = sinon.stub(mainchainService, <any>'save').callsFake(null);

      let blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');
      var newBtcBLock = new BtcBlock(10, "btcHash", partTag + "00000002");
      await forkDetector.onNewBlock(newBtcBLock);

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

    it("Repeated Rsk tag arrives, discart new btc block", async () => {
      const rskBlock1 = new RskBlock(1, "hash1", "hash0", true, forkData);
      const branch = new BranchItem(new BtcHeaderInfo(1, "hash"), rskBlock1)
      var getBlocksByNumberRrskService = sinon.stub(rskService, <any>'getBlocksByNumber');
      getBlocksByNumberRrskService.returns([rskBlock1]);
      
      var getBestBlockMainchainService = sinon.stub(mainchainService, <any>'getBestBlock')
      getBestBlockMainchainService.onCall(1).callsFake(null);
      getBestBlockMainchainService.onCall(2).returns(branch);

      var getBlockByForkDataDetection = sinon.stub(mainchainService, <any>'getBlockByForkDataDetection').returns(branch);
      var updateBtcInfoBranchItem = sinon.stub(mainchainService, <any>'updateBtcInfoBranchItem').callsFake(() => {});
      
      sinon.stub(rskService, <any>'getBestBlock').returns(rskBlock1);

      var saveMainchain = sinon.stub(mainchainService, <any>'save').callsFake(null);

      let blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      await forkDetector.onNewBlock(btcBlock);
      await forkDetector.onNewBlock(btcBlock);

      //Validations
      await sleep(500);
      expect(saveMainchain.calledOnce).to.be.true;
      expect(updateBtcInfoBranchItem.called).to.be.false;
      expect(getBlockByForkDataDetection.called).to.be.true;
      expect(blockSuccessfullyProcessed.calledTwice).to.be.true;
    });

    it("Rsk tag arrives with lower height (solution in mainchain)", async () => {
      const rskBlock1 = new RskBlock(1, "hash1", "hash0", true, forkData);
      const rskBlock9 = new RskBlock(9, "hash1", "hash0", true, new ForkDetectionData(PREFIX + CPV + NU + "00000009"));
      let branch1 = new BranchItem(null, rskBlock1)
      let branch1WithBtcInfo = new BranchItem(btcBlock.btcInfo, rskBlock1)
      const branch9 = new BranchItem(new BtcHeaderInfo(9, "hash"), rskBlock9);
      var getBlocksByNumberRrskService = sinon.stub(rskService, <any>'getBlocksByNumber');
      getBlocksByNumberRrskService.returns([rskBlock1]);
      
      var getBestBlockMainchainService = sinon.stub(mainchainService, <any>'getBestBlock')
      getBestBlockMainchainService.returns(branch9);

      var getBlockByForkDataDetection = sinon.stub(mainchainService, <any>'getBlockByForkDataDetection').returns(branch1);
      var updateBtcInfoBranchItem = sinon.stub(mainchainService, <any>'updateBtcInfoBranchItem').withArgs(branch1WithBtcInfo).callsFake(() => {});

      sinon.stub(rskService, <any>'getBestBlock').returns(rskBlock1);

      var saveMainchain = sinon.stub(mainchainService, <any>'save').callsFake(null);

      let blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      await forkDetector.onNewBlock(btcBlock);

      //Validations
      await sleep(500);
      expect(saveMainchain.called).to.be.false;
      expect(updateBtcInfoBranchItem.called).to.be.true;
      expect(getBlockByForkDataDetection.called).to.be.true;
      expect(blockSuccessfullyProcessed.called).to.be.true;
    });
  })

  describe('New btc block with RSK tag is pointing to an RSK uncle', () => {
    it("Buinding mainchain with best block instead using the uncle at that height, also save uncle", async () => {
      const rskTag = PREFIX + CPV + NU + "00000001";
      const btcBlock = new BtcBlock(200, "btcHash", PREFIX + CPV + NU + "00000003");
      const rskNoBest = new RskBlock(4, "hash2_NoBest", "hash1", false, new ForkDetectionData(PREFIX + CPV + NU + "00000003"));

      const rskNoBestBranchItem = new BranchItem(btcBlock.btcInfo, rskNoBest);
      const rskBest = new RskBlock(2, "hash2", "hash1", true, forkData);
      const rskBestBranchItem = new BranchItem(null, rskBest);
      
      const getBlocksByNumber = sinon.stub(rskService, <any>'getBlocksByNumber');
      getBlocksByNumber.withArgs(3).returns([rskNoBest, rskBest]);

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