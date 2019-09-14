import "mocha";
import { BtcHeaderInfo, BtcBlock } from "../src/common/btc-block";
import { BtcWatcher } from "../src/services/btc-watcher";
import { BranchItem } from "../src/common/branch";
import { expect } from "chai";
import { ForkDetector } from "../src/services/fork-detector";
import { ForkDetectionData } from "../src/common/fork-detection-data";
import { stubObject } from "ts-sinon";
import sinon from "sinon";
import { RskBlock } from "../src/common/rsk-block";
import { RskApiService } from "../src/services/rsk-api-service";
import { MainchainService } from "../src/services/mainchain-service";
import { RskApiConfig } from "../src/config/rsk-api-config";
import { MongoStore } from "../src/storage/mongo-store";

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
let mainchainService;
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
     mainchainService = new MainchainService(mongoStore);
     rskService = new RskApiService(rskApiConfig);
     forkDetector = new ForkDetector(null, mainchainService, btcStub, rskService);
  });

  it("getBlocksByNumber", async () => {
   
    var getBlocksByNumber = sinon.stub(rskService, <any>'getBlocksByNumber').returns([]);
    
    await forkDetector.onNewBlock(btcBlock);

    expect(getBlocksByNumber.called).to.be.true;
  });

  it("btc block has a tag which is in rsk network mainchain, first item in mainnet", async () => {
    const rskBlock = new RskBlock(1, "hash", "prevHash", forkData);
   
    sinon.stub(rskService, <any>'getBlocksByNumber').returns([rskBlock]);
    sinon.stub(mainchainService, <any>'getLastItems').returns([]);
    var saveMainchain = sinon.stub(mainchainService, <any>'saveMainchainItems').callsFake(null);
    await forkDetector.onNewBlock(btcBlock);
    
    expect(saveMainchain.called).to.be.true;
  });

  it("btc block has a tag which is in rsk network mainchain, connect item in mainchain is not posibble because top hash item doesn't match with current prevHash", async () => {

    const rskBlock1 = new RskBlock(1, "hash", "prevHash", forkData);
    const rskBlock2 = new RskBlock(2, "hash", "prevHash", forkData);

    let mainchainItemsBranch: BranchItem[] = [new BranchItem(btcBlock.btcInfo, rskBlock1)];
    sinon.stub(rskService, <any>'getBlocksByNumber').returns([rskBlock2]);
    sinon.stub(mainchainService, <any>'getLastItems').returns(mainchainItemsBranch);
    var saveMainchain = sinon.stub(mainchainService, <any>'saveMainchainItems').callsFake(null);

    await forkDetector.onNewBlock(btcBlock);

    expect(saveMainchain.called).to.be.false;
  });

  it("btc block has a tag which is in rsk network mainchain, connect item in mainchain, now mainchain has 2 blocks", async () => {
    const rskBlock1 = new RskBlock(1, "hash1", "hash0", forkData);
    const rskBlock2 = new RskBlock(2, "hash2", "hash1", forkData);

    sinon.stub(rskService, <any>'getBlocksByNumber').returns([rskBlock2]);
    sinon.stub(mainchainService, <any>'getLastItems').returns([new BranchItem(new BtcHeaderInfo(1, "hash"), rskBlock1)]);
    var saveMainchain = sinon.stub(mainchainService, <any>'saveMainchainItems').callsFake(null);

    await forkDetector.onNewBlock(btcBlock);

    expect(saveMainchain.called).to.be.true;
  });

  it("btc block has a tag which is in rsk network mainchain, connect item in mainchain, rebuid 2 blocks between top mainchain and the new block found", async () => {
    const rskTag = PREFIX + CPV + NU + "00000004"
    const forkData1 = new ForkDetectionData(rskTag);
    const rskBlock1 = new RskBlock(1, "hash1", "hash0", forkData);
    const rskBlock2 = new RskBlock(2, "hash2", "hash1", forkData);
    const rskBlock3 = new RskBlock(3, "hash3", "hash2", forkData);
    const rskBlock4 = new RskBlock(4, "hash4", "hash3", forkData1);
    let btcBlock = new BtcBlock(2, "btcHash", "btcPrevHash", rskTag)

    var getBlocksByNumber = sinon.stub(rskService, <any>'getBlocksByNumber');
    getBlocksByNumber.withArgs(4).returns([rskBlock4]);
    getBlocksByNumber.withArgs(2).returns([rskBlock2]);
    getBlocksByNumber.withArgs(3).returns([rskBlock3]);

    sinon.stub(mainchainService, <any>'getLastItems').returns([new BranchItem(new BtcHeaderInfo(1, "hash"), rskBlock1)]);
    var saveMainchain = sinon.stub(mainchainService, <any>'saveMainchainItems').callsFake(() => {
      expect(saveMainchain.called).to.be.true;
    });

    await forkDetector.onNewBlock(btcBlock);
  });
})