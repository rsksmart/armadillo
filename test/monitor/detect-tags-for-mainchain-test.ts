import "mocha";
import { BtcHeaderInfo, BtcBlock } from "../../src/common/btc-block";
import { BtcWatcher } from "../../src/services/btc-watcher";
import { Item } from "../../src/common/forks";
import { expect } from "chai";
import { ForkDetector } from "../../src/services/fork-detector";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { stubObject } from "ts-sinon";
import sinon from "sinon";
import { RskBlockInfo } from "../../src/common/rsk-block";
import { RskApiService } from "../../src/services/rsk-api-service";
import { MainchainService } from "../../src/services/mainchain-service";
import { RskApiConfig } from "../../src/config/rsk-api-config";
import { MongoStore } from "../../src/storage/mongo-store";
import { BtcService } from "../../src/services/btc-service";
import { HttpBtcApi } from "../../src/services/btc-api";
import { sleep } from "../../src/util/helper";
import { ForkDetectorConfig } from "../../src/config/fork-detector-config";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434";
const NU = "00"; 
const BN = "00000001";
const RSKTAG = PREFIX + CPV + NU + BN;
const forkData = new ForkDetectionData(RSKTAG);
const btcBlock = new BtcBlock(2, "btcHash", RSKTAG, "")
const RSKTAGinMainchain = PREFIX + CPV + NU + "00000001";
const btcBlockInMainchain = new BtcBlock(1, "btcHash", RSKTAGinMainchain, "")
let btcWatcher: BtcWatcher;
let rskApiConfig: RskApiConfig;
let mongoStore: MongoStore;
let btcStore: MongoStore;
let mainchainService: MainchainService;
let rskService: RskApiService;
let forkDetector: ForkDetector;
let btcService: BtcService;
let btcBlockPrev = new BtcBlock(1, "btcHash", "", "");
let forkDetectorConfig: ForkDetectorConfig;

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
    forkDetectorConfig =  new ForkDetectorConfig(10, 5); // wait 10ms
    forkDetector = new ForkDetector(null, mainchainService, btcWatcher, rskService, forkDetectorConfig);

    var getLastBlockDetected = sinon.stub(btcService, <any>'getLastBlockDetected');
    getLastBlockDetected.returns(btcBlockPrev);

    sinon.stub(btcService, <any>'save').callsFake(function () { });
  });

  describe('New btc block has a tag which is in RSK network mainchain', () => {
    it("First item in mainnet", async () => {
      const rskBlock = new RskBlockInfo(100, "hash", "prevHash", true,"",  forkData);
      const btcBlockNew = new BtcBlock(85, "btcHash", RSKTAG, "");

      sinon.stub(rskService, <any>'getBlocksByNumber').returns([rskBlock]);
      sinon.stub(mainchainService, <any>'getBestBlock').returns(null);
      sinon.stub(rskService, <any>'getBestBlock').returns(rskBlock);
      var saveMainchain = sinon.stub(mainchainService, <any>'save').callsFake(null);

      var blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');
      
      await forkDetector.onNewBlock(btcBlockNew);

      //Validations
      expect(saveMainchain.called).to.be.true;
      expect(blockSuccessfullyProcessed.called).to.be.true;
    });

    it("Connect item in mainchain, now mainchain has 2 blocks", async () => {
      const partTag: string = PREFIX + CPV + NU;
      const rskBlock1 = new RskBlockInfo(1, "hash1", "hash0", true, "", new ForkDetectionData(partTag + "00000001"));
      const rskBlock2 = new RskBlockInfo(2, "hash2", "hash1", true, "", new ForkDetectionData(partTag + "00000002"));
      const rskBlock10 = new RskBlockInfo(10, "hash10", "hash9", true, "", new ForkDetectionData(partTag + "0000000A"));
      const mainchainBest = new Item(btcBlockInMainchain.btcInfo, rskBlock1);

      sinon.stub(rskService, <any>'getBlocksByNumber').returns([rskBlock2]);
      sinon.stub(rskService, <any>'getBestBlock').returns(rskBlock10);
      sinon.stub(rskService, <any>'getBlock').returns(rskBlock1);
      sinon.stub(mainchainService, <any>'getBestBlock').returns(mainchainBest);
      
      var saveMainchain = sinon.stub(mainchainService, <any>'save').callsFake(null);

      let blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');
      var newBtcBLock = new BtcBlock(10, "btcHash", partTag + "00000002", "");
      await forkDetector.onNewBlock(newBtcBLock);

      //Validations
      expect(saveMainchain.called).to.be.true;
      expect(blockSuccessfullyProcessed.called).to.be.true;
    });

    it("Rebuid 2 blocks between top mainchain and the new block found", async () => {
      const rskBlock100 = new RskBlockInfo(100, "hash1", "hash0", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000064"));
      const rskBlock101 = new RskBlockInfo(101, "hash2", "hash1", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000065"));
      const rskBlock102 = new RskBlockInfo(102, "hash3", "hash2", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000066"));
      const rskBlock103 = new RskBlockInfo(103, "hash4", "hash3", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000067"));
      const rskBlock1000 = new RskBlockInfo(1000, "hash4", "hash3", true, "", new ForkDetectionData(PREFIX + CPV + NU + "000003E8"));
      const newBtcBlock = new BtcBlock(100000, "btcHash", PREFIX + CPV + NU + "00000067", ""); // point to RSK height 103
      
      const getBlocksByNumber = sinon.stub(rskService, <any>'getBlocksByNumber');
      getBlocksByNumber.withArgs(rskBlock103.height).returns([rskBlock103]);
      
      const getBlock = sinon.stub(rskService, <any>'getBlock');
      getBlock.withArgs(rskBlock100.height).returns(rskBlock100);
      getBlock.withArgs(rskBlock101.height).returns(rskBlock101);
      getBlock.withArgs(rskBlock102.height).returns(rskBlock102);
      getBlock.withArgs(rskBlock103.height).returns(rskBlock103);

      sinon.stub(mainchainService, <any>'getBestBlock').returns(new Item(new BtcHeaderInfo(rskBlock100.height, "hash", ""), rskBlock100));
      sinon.stub(rskService, <any>'getBestBlock').returns(rskBlock1000);
      
      let saveMainchain = sinon.stub(mainchainService, <any>'save').callsFake(() => {});
      let blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      await forkDetector.onNewBlock(newBtcBlock);

      //Validations
      expect(saveMainchain.called).to.be.true;
      expect(blockSuccessfullyProcessed.called).to.be.true;
    });

    it("Repeated rsk tag arrives, discart new btc block", async () => {
      const rskBlock1 = new RskBlockInfo(1, "hash1", "hash0", true,"", new ForkDetectionData(PREFIX + CPV + NU + "00000001"));
      const rskBestBlock = new RskBlockInfo(100, "hash1", "hash0", true,"", new ForkDetectionData(PREFIX + CPV + NU + "00000064"));
      const item = new Item(new BtcHeaderInfo(1, "hash", ""), rskBlock1)
      var getBlocksByNumberRrskService = sinon.stub(rskService, <any>'getBlocksByNumber');
      getBlocksByNumberRrskService.returns([rskBlock1]);
      
      var getBestBlockMainchainService = sinon.stub(mainchainService, <any>'getBestBlock')
      getBestBlockMainchainService.onCall(0).callsFake(null);
      getBestBlockMainchainService.onCall(1).returns(item);

      sinon.stub(rskService, <any>'getBlock').returns(rskBlock1)

      var getBlockByForkDataDetection = sinon.stub(mainchainService, <any>'getBlockByForkDataDetection').returns(item);
      var updateBtcInfoItem = sinon.stub(mainchainService, <any>'updateBtcInfoItem').callsFake(() => {});
      
      sinon.stub(rskService, <any>'getBestBlock').returns(rskBestBlock);

      var saveMainchain = sinon.stub(mainchainService, <any>'save').callsFake(null);

      let blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      let btcBlockNew = new BtcBlock(100000, "btcHash",  PREFIX + CPV + NU + "00000001", "");
      await forkDetector.onNewBlock(btcBlockNew);
      await forkDetector.onNewBlock(btcBlockNew);

      //Validations
      await sleep(500);
      expect(saveMainchain.calledOnce).to.be.true;
      expect(updateBtcInfoItem.called).to.be.false;
      expect(getBlockByForkDataDetection.called).to.be.true;
      expect(blockSuccessfullyProcessed.calledTwice).to.be.true;
    });

    it("Rsk tag arrives with lower height (solution in mainchain)", async () => {
      const rskBlock1 = new RskBlockInfo(1, "hash1", "hash0", true, "",  new ForkDetectionData(PREFIX + CPV + NU + "00000001"));
      const rskBlock9 = new RskBlockInfo(9, "hash1", "hash0", true, "",  new ForkDetectionData(PREFIX + CPV + NU + "00000009"));
      let btcBlock = new BtcBlock(2, "btcHash", PREFIX + CPV + NU + "00000001", "")
      let item1 = new Item(null, rskBlock1);
      let item1WithBtcInfo = new Item(btcBlock.btcInfo, rskBlock1)
      const item9 = new Item(new BtcHeaderInfo(9, "hash", ""), rskBlock9);
     
      const getBlocksByNumberRrskService = sinon.stub(rskService, <any>'getBlocksByNumber');
      getBlocksByNumberRrskService.returns([rskBlock1]);
      sinon.stub(rskService, <any>'getBlock').returns(rskBlock1);
      sinon.stub(rskService, <any>'getBestBlock').returns(rskBlock9);

      const getBestBlockMainchainService = sinon.stub(mainchainService, <any>'getBestBlock');
      getBestBlockMainchainService.returns(item9);

      const getBlockByForkDataDetection = sinon.stub(mainchainService, <any>'getBlockByForkDataDetection').returns(item1);
      const updateBtcInfoItem = sinon.stub(mainchainService, <any>'updateBtcInfoItem').withArgs(item1WithBtcInfo).callsFake(() => {});

      const saveMainchain = sinon.stub(mainchainService, <any>'save').callsFake(null);
      const blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      await forkDetector.onNewBlock(btcBlock);

      //Validations
      expect(saveMainchain.called).to.be.false;
      expect(updateBtcInfoItem.called).to.be.true;
      expect(getBlockByForkDataDetection.called).to.be.true;
      expect(blockSuccessfullyProcessed.called).to.be.true;
    });

    it("Rsk tag arrives with lower height, and is pointing to an uncle", async () => {
      const rskBlock1 = new RskBlockInfo(1, "hash1", "hash0", true, "", forkData);
      const rskBlock9 = new RskBlockInfo(9, "hash1", "hash0", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000009"));
      const item9 = new Item(new BtcHeaderInfo(9, "hash", ""), rskBlock9);
      let newBtcBlock = new BtcBlock(2, "btcHash",  PREFIX + CPV + NU + "00000001", "")

      var getBlocksByNumberRrskService = sinon.stub(rskService, <any>'getBlocksByNumber');
      getBlocksByNumberRrskService.returns([rskBlock1]);

      sinon.stub(rskService, <any>'getBlock').returns(rskBlock1);
      
      var getBestBlockMainchainService = sinon.stub(mainchainService, <any>'getBestBlock')
      getBestBlockMainchainService.returns(item9);

       // this line implies that in mainchain there is no block that match with that tag
      var getBlockByForkDataDetection = sinon.stub(mainchainService, <any>'getBlockByForkDataDetection').returns(null);
      
      var updateBtcInfoItem = sinon.stub(mainchainService, <any>'updateBtcInfoItem').callsFake(() => {});

      sinon.stub(rskService, <any>'getBestBlock').returns(rskBlock9);

      var saveMainchain = sinon.stub(mainchainService, <any>'save').callsFake(null);

      let blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      await forkDetector.onNewBlock(newBtcBlock);

      //Validations
      expect(saveMainchain.called).to.be.true;
      expect(updateBtcInfoItem.called).to.be.false;
      expect(getBlockByForkDataDetection.called).to.be.true;
      expect(blockSuccessfullyProcessed.called).to.be.true;
    });
  })

  describe('New btc block with RSK tag is pointing to an RSK uncle', () => {
    it.only("Buinding mainchain with best block instead using the uncle at that height, also save uncle", async () => {
      const btcBlock = new BtcBlock(200, "btcHash", PREFIX + CPV + NU + "00000003", "");
      const rskUncle = new RskBlockInfo(3, "hash3_NoBest", "hash2", false, "", new ForkDetectionData(PREFIX + CPV + NU + "00000003"));
      const rskBestBlock = new RskBlockInfo(10, "hash10", "hash9", true, "", new ForkDetectionData(PREFIX + CPV + NU + "0000000A"));
      const rskInMainchain = new RskBlockInfo(2, "hash2", "hash1", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000002"));
    
      const rskNoBestItem = new Item(btcBlock.btcInfo, rskUncle);
      const rskBestItem = new Item(null, rskInMainchain);
      
      sinon.stub(rskService, <any>'getBlock').withArgs(2).returns(rskInMainchain);
      const getBlocksByNumber = sinon.stub(rskService, <any>'getBlocksByNumber');
      getBlocksByNumber.withArgs(3).returns([rskUncle, rskInMainchain]);

      sinon.stub(mainchainService, <any>'getBestBlock').returns(new Item(null, rskInMainchain));

      const saveMainchain = sinon.stub(mainchainService, <any>'save');
      saveMainchain.withArgs([rskNoBestItem]).callsFake((items) => {
        expect([rskNoBestItem]).to.deep.equal(items);
      });
      saveMainchain.withArgs([rskBestItem]).callsFake((items) => {
        expect([rskBestItem]).to.deep.equal(items);
      });

      sinon.stub(rskService, <any>'getBestBlock').returns(rskBestBlock);

      let blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');

      await forkDetector.onNewBlock(btcBlock);

      //Validations
      expect(saveMainchain.called).to.be.true;
      expect(saveMainchain.calledOnce).to.be.true;
      expect(blockSuccessfullyProcessed.called).to.be.true;
    });
  })

  describe('New RSK tag, there are a reorganization', () => {
    it("Reorg 2 blocks in chain", async () => {
      const rsk4InMainchain = new RskBlockInfo(4, "hash4", "hash3", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000004"));
      const rsk5InMainchain = new RskBlockInfo(5, "hash5", "hash4", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000005"));
      const rsk6InMainchain = new RskBlockInfo(6, "hash6", "hash5", false, "", new ForkDetectionData(PREFIX + CPV + NU + "00000006"));
      const rsk6NewBest = new RskBlockInfo(6, "hash6NewBest", "hash5NewBest", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000006"));
      const rsk5NewBest = new RskBlockInfo(5, "hash5NewBest", "hash4", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000005"));
      const rsk6ItemBNewBest = new Item(null, rsk6NewBest);
      const rsk5ItemNewBest = new Item(null, rsk5NewBest);
      const rsk5ItemInMainchain = new Item(null, rsk5InMainchain);
      const rsk4ItemInMainchain = new Item(null, rsk4InMainchain);

      const getBlocksByNumber = sinon.stub(rskService, <any>'getBlocksByNumber');
      getBlocksByNumber.withArgs(6).returns([rsk6NewBest, rsk6InMainchain]);
      getBlocksByNumber.withArgs(5).returns([rsk5NewBest]);

      var getBlock = sinon.stub(rskService, <any>'getBlock');
      getBlock.withArgs(6).returns(rsk6NewBest);
      getBlock.withArgs(5).returns(rsk5NewBest);
      getBlock.withArgs(4).returns(rsk4InMainchain);

      let changeBlockInMainchain = sinon.stub(mainchainService, <any>'changeBlockInMainchain')
      changeBlockInMainchain.withArgs(6, rsk6ItemBNewBest).callsFake(null);
      changeBlockInMainchain.withArgs(5, rsk5ItemNewBest).callsFake(null);

      var getBlockMainchain = sinon.stub(mainchainService, <any>'getBlock')
      getBlockMainchain.withArgs(5).returns(rsk5ItemInMainchain);
      getBlockMainchain.withArgs(4).returns(rsk4ItemInMainchain);
     
      const saveMainchain = sinon.stub(mainchainService, <any>'save');
      saveMainchain.withArgs([rsk6ItemBNewBest]).callsFake((items) => {
        expect([rsk6ItemBNewBest]).to.deep.equal(items);
      });
      saveMainchain.withArgs([rsk5ItemNewBest]).callsFake((items) => {
        expect([rsk5ItemNewBest]).to.deep.equal(items);
      });

      await forkDetector.rebuildMainchainFromBlock(rsk6ItemBNewBest);

      //Validations
      expect(saveMainchain.calledTwice).to.be.true;
      expect(getBlockMainchain.calledTwice).to.be.true;
      expect(changeBlockInMainchain.calledTwice).to.be.true;
      expect(getBlocksByNumber.calledTwice).to.be.true;
      expect(getBlock.callCount).to.be.equal(4);
    });

    it("Wait until tag's height in BTC block is greater than X blocks backward to the best RSK block", async () => {
      const partTag: string = PREFIX + CPV + NU;
      const rskBlock1 = new RskBlockInfo(1, "hash1", "hash0", true, "", new ForkDetectionData(partTag + "00000001"));
      const rskBlock2 = new RskBlockInfo(2, "hash2", "hash1", true, "", new ForkDetectionData(partTag + "00000002"));
      const rskBlock3 = new RskBlockInfo(3, "hash3", "hash2", true, "", new ForkDetectionData(partTag + "00000003"));
      const rskBlock4 = new RskBlockInfo(4, "hash4", "hash3", true, "", new ForkDetectionData(partTag + "00000004"));
      const rskBlock5 = new RskBlockInfo(5, "hash5", "hash4", true, "", new ForkDetectionData(partTag + "00000005"));
      const rskBlock6 = new RskBlockInfo(6, "hash6", "hash5", true, "", new ForkDetectionData(partTag + "00000006"));
      const rskBlock7 = new RskBlockInfo(7, "hash7", "hash6", true, "", new ForkDetectionData(partTag + "00000007"));
     
      const mainchainBest = new Item(btcBlockInMainchain.btcInfo, rskBlock1);

      sinon.stub(rskService, <any>'getBlocksByNumber').returns([rskBlock2]);
      let getBestBlock = sinon.stub(rskService, <any>'getBestBlock');
      getBestBlock.onCall(0).returns(rskBlock2);
      getBestBlock.onCall(1).returns(rskBlock3);
      getBestBlock.onCall(2).returns(rskBlock4);
      getBestBlock.onCall(3).returns(rskBlock5);
      getBestBlock.onCall(4).returns(rskBlock6);
      getBestBlock.onCall(5).returns(rskBlock7);

      let getBlock = sinon.stub(rskService, <any>'getBlock');
      getBlock.withArgs(1).returns(rskBlock1);
      getBlock.withArgs(2).returns(rskBlock2);
      sinon.stub(mainchainService, <any>'getBestBlock').returns(mainchainBest);
      
      var saveMainchain = sinon.stub(mainchainService, <any>'save').callsFake(null);

      let blockSuccessfullyProcessed = sinon.stub(btcWatcher, <any>'blockSuccessfullyProcessed');
      var newBtcBLock = new BtcBlock(10, "btcHash", partTag + "00000002", "");
      await forkDetector.onNewBlock(newBtcBLock);

      //Validations
      expect(saveMainchain.called).to.be.true;
      expect(blockSuccessfullyProcessed.called).to.be.true;
      expect(getBestBlock.callCount).to.be.equal(6);
    });
  })
})