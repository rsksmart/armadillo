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
import { BranchService } from "../../src/services/branch-service";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0
const BN = "00000001"; // 1
const RSKTAG = PREFIX + CPV + NU + BN;
const forkData = new ForkDetectionData(RSKTAG);
const btcBlock = new BtcBlock(2, "btcHash", "btcPrevHash", RSKTAG)
let btcStub;
let rskApiConfig;
let mongoStore;
let branchService;
let rskService;
let forkDetector;

describe('Building mainchain when a new btc block arrives', () => {

  afterEach(function () {
    sinon.restore();
  });

  beforeEach(function () {
     btcStub = stubObject<BtcWatcher>(BtcWatcher.prototype);
     rskApiConfig = stubObject<RskApiConfig>(RskApiConfig.prototype);
     mongoStore = stubObject<MongoStore>(MongoStore.prototype);
     branchService = new BranchService(mongoStore);
     rskService = new RskApiService(rskApiConfig);
     forkDetector = new ForkDetector(branchService, null, btcStub, rskService);
  });
  
  it("Fork: new branch", async () => {
    const rskTag = PREFIX + CPV + NU + "00000064"
    const rskTagSameHeight = PREFIX + "dddddddddddddd" + NU + "00000064"
    const rskBlock4 = new RskBlock(100, "hash4", "hash3", new ForkDetectionData(rskTagSameHeight));
    let btcBlock = new BtcBlock(100, "btcHash", "btcPrevHash", rskTag)

    var getBlocksByNumber = sinon.stub(rskService, <any>'getBlocksByNumber');
    getBlocksByNumber.withArgs(100).returns([rskBlock4]);

    var getBestBlock = sinon.stub(rskService, <any>'getBestBlock');
    getBestBlock.returns([rskBlock4]);

    var getForksDetected = sinon.stub(branchService, <any>'getForksDetected');
    getForksDetected.returns([]);

    await forkDetector.onNewBlock(btcBlock);
  });
})