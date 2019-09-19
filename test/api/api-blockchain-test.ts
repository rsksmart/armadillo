
import "mocha";
import { BtcHeaderInfo } from "../../src/common/btc-block";
import { expect } from "chai";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { MainConfig } from "../../src/config/main-config";
import { MongoStore } from "../../src/storage/mongo-store";
import { RskBlock } from "../../src/common/rsk-block";
import { BranchService } from "../../src/services/branch-service";
import { BranchItem, Branch } from "../../src/common/branch";
import BranchController from "../../src/api/controllers/branch-controller";
import { MainchainService } from "../../src/services/mainchain-service";
import { BLockchainController } from "../../src/api/controllers/blockchain-controller";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0
const BN = "000004c9"; // 1225
const RSKTAG = PREFIX + CPV + NU + BN;
const btcInfo = new BtcHeaderInfo(0, "");
const mainConfig = MainConfig.getMainConfig('./config.json');
const mongoStore = new MongoStore(mainConfig.store.branches);
const branchService = new BranchService(mongoStore);
const mainchainService = new MainchainService(mongoStore);
const mockRes = { "status": () => { return { "send": (y: any) => { return y } } } };

//Before you run this test you have to run a mongo instance
describe("Blockchain api tests", () => {
  beforeEach(async function () {
    await branchService.connect();
    await mainchainService.removeLastBlocks(100);
    // await branchService.removeLastForks(100);
  });

  it("Get getLastBlochains method", async () => {

    let branchItem1 = new BranchItem(btcInfo, new RskBlock(1, "hash", "prevHash", new ForkDetectionData(RSKTAG)));
    let branchItem2 = new BranchItem(btcInfo, new RskBlock(2, "hash", "prevHash", new ForkDetectionData(RSKTAG)));
    let branchItem3 = new BranchItem(btcInfo, new RskBlock(3, "hash", "prevHash", new ForkDetectionData(RSKTAG)));
    let branchItem4 = new BranchItem(btcInfo, new RskBlock(2, "hash", "prevHash", new ForkDetectionData(RSKTAG)));
    let branchItem5 = new BranchItem(btcInfo, new RskBlock(3, "hash", "prevHash", new ForkDetectionData(RSKTAG)));
    let branchItem6 = new BranchItem(btcInfo, new RskBlock(2, "hash", "prevHash", new ForkDetectionData(RSKTAG)));
    let branchItem7 = new BranchItem(btcInfo, new RskBlock(3, "hash", "prevHash", new ForkDetectionData(RSKTAG)));

    let branch1 = new Branch([branchItem3,branchItem4,branchItem5]);
    await branchService.save(branch1);

    let mainchainList = [branchItem1,branchItem2,branchItem3,branchItem4,branchItem5,branchItem6,,branchItem7]
    await mainchainService.save(mainchainList);

    let blockchainController = new BLockchainController(mainchainService, branchService);
    let param = { "params": { "n": 10 }};
    
    let data = await blockchainController.getLastBlochains(param, mockRes);

    expect(data.mainchain).to.deep.equal(mainchainList);
    expect(data.forks).to.deep.equal(branch1);

    // let branchItem2 = new BranchItem(btcInfo, new RskBlock(2, "hash", "prevHash", new ForkDetectionData(RSKTAG)));
    // let branchItem3 = new BranchItem(btcInfo, new RskBlock(3, "hash", "prevHash", new ForkDetectionData(RSKTAG)));
    // let branchItem4 = new BranchItem(btcInfo, new RskBlock(4, "hash", "prevHash", new ForkDetectionData(RSKTAG)));
    // let branchItem5 = new BranchItem(btcInfo, new RskBlock(5, "hash", "prevHash", new ForkDetectionData(RSKTAG)));

    // let blocks = [branchItem2, branchItem5, branchItem3, branchItem4];
    // await branchService.save(blocks);
    // data = await branchController.getLastBlocks(param, mockRes);

    // expect(data.blocks.length).to.equal(1);
    // expect(data.blocks).to.deep.equal([branchItem5]);

    // var ok = await branchService.save([branchItem4]);
    // data = await branchController.getLastBlocks(param, mockRes);

    // expect(ok).to.be.false;
    // expect(data.blocks.length).to.equal(1);
    // expect(data.blocks).to.deep.equal([branchItem5]);

    // param = { "params": { "n": 5 } }
    // data = await branchController.getLastBlocks(param, mockRes);
    // expect(data.blocks.length).to.equal(5);
    // expect(data.blocks).to.deep.equal([branchItem5, branchItem4, branchItem3, branchItem2, branchItem1]);
  });
});