import "mocha";
import { BtcHeaderInfo, BtcBlock } from "../../src/common/btc-block";
import { BtcWatcher } from "../../src/services/btc-watcher";
import { BranchItem, Branch } from "../../src/common/branch";
import { expect, assert } from "chai";
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

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0
const BN = "00000001"; // 1
const RSKTAG = PREFIX + CPV + NU + BN;
const forkData = new ForkDetectionData(RSKTAG);
const btcBlock = new BtcBlock(2, "btcHash", "btcPrevHash", RSKTAG)
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
     forkDetector = new ForkDetector(branchService, null, btcStub, rskService, btcService);
  });
  
  it("Fork: new branch, CPV match 0 bytes", async () => {
    const rskTag = PREFIX + CPV + NU + "00000064"
    const rskTagSameHeight = PREFIX + "dddddddddddddd" + NU + "00000064"
    const rskBlock4 = new RskBlock(100, "hash4", "hash3", new ForkDetectionData(rskTagSameHeight));
    let btcBlock = new BtcBlock(100, "btcHash", "btcPrevHash", rskTag)
    let btcBlockPrev = new BtcBlock(99, "btcHash", "btcPrevHash", rskTag)
    let blockInMainchain = new RskBlock(1, "btcHash", "btcPrevHash", null)

    var getBlocksByNumber = sinon.stub(rskService, <any>'getBlocksByNumber');
    getBlocksByNumber.withArgs(100).returns([rskBlock4]);

    var getBestBlock = sinon.stub(rskService, <any>'getBestBlock');
    getBestBlock.returns(rskBlock4);
    getBestBlock.withArgs(1).returns(blockInMainchain);

    var getBlock = sinon.stub(rskService, <any>'getBlock');
    getBlock.withArgs(1).returns(blockInMainchain);

    var getForksDetected = sinon.stub(branchService, <any>'getForksDetected');
    getForksDetected.returns([]);

    var getLastBlockDetected = sinon.stub(btcService, <any>'getLastBlockDetected');
    getLastBlockDetected.returns(btcBlockPrev);

    sinon.stub(btcService, <any>'saveBlockDetected').callsFake(function(blockToSave){
      expect(blockToSave).to.deep.equal(btcBlock);
    });

    const branchItemWhichForkNetwork = new BranchItem(btcBlock.btcInfo, new RskBlock(btcBlock.rskTag.BN, btcBlock.rskTag.prefixHash, "", btcBlock.rskTag));
    const branchExpected = new Branch(blockInMainchain, branchItemWhichForkNetwork);
    sinon.stub(branchService, <any>'save').callsFake(function(branchToSave){
      expect(branchToSave).to.deep.equal(branchExpected);
    });

    await forkDetector.onNewBlock(btcBlock);
  });
})