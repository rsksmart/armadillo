import "mocha";
import { BtcHeaderInfo } from "../../src/common/btc-block";
import { expect } from "chai";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { MongoStore } from "../../src/storage/mongo-store";
import { RskBlock } from "../../src/common/rsk-block";
import { BranchService } from "../../src/services/branch-service";
import { BranchItem, Branch } from "../../src/common/branch";
import BranchController from "../../src/api/controllers/branch-controller";
import { ApiConfig } from "../../src/config/api-config";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0
const btcInfo = new BtcHeaderInfo(0, "");
const mainConfig = ApiConfig.getMainConfig('./config.json');
const mongoStore = new MongoStore(mainConfig.store.branches);
const branchService = new BranchService(mongoStore);
const mockRes = { "status": () => { return { "send": (y: any) => { return y } } } };

//Before you run this test you have to run a mongo instance
describe("Branches api tests", () => {
  beforeEach(async function () {
    await branchService.connect();
    await branchService.removeAll();
  });

  after(async function () {
    await branchService.disconnect();
  });

  it("getForksDetected method", async () => {

    let branchItem1 = new BranchItem(btcInfo, new RskBlock(1, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000001")));
    let branchItem2 = new BranchItem(btcInfo, new RskBlock(2, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000002")));
    let branchItem3 = new BranchItem(btcInfo, new RskBlock(3, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000003")));
    let branchItem4 = new BranchItem(btcInfo, new RskBlock(4, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000004")));
    let branch1 = new Branch(branchItem1, [branchItem1,branchItem2]);
    let branch2 = new Branch(branchItem1, [branchItem3,branchItem4]);
    
    await branchService.save(branch1);
    await branchService.save(branch2);

    let branchController = new BranchController(branchService);
    let param = { "params": { "n": 0 } };
    let data = await branchController.getForksDetected(param, mockRes);
    expect(data.forks.length).to.equal(2);
    expect(data.forks).to.deep.equal([branch1,branch2]);

    param = { "params": { "n": 1 } };
    data = await branchController.getForksDetected(param, mockRes);
    expect(data.forks.length).to.equal(2);
    expect(data.forks).to.deep.equal([branch1,branch2]);

    param = { "params": { "n": 2 } };
    data = await branchController.getForksDetected(param, mockRes);
    expect(data.forks.length).to.equal(2);
    expect(data.forks).to.deep.equal([branch1, branch2]);

    param = { "params": { "n": 3 } };
    data = await branchController.getForksDetected(param, mockRes);
    expect(data.forks.length).to.equal(1);
    expect(data.forks).to.deep.equal([branch2]);
    
    param = { "params": { "n": 4} };
    data = await branchController.getForksDetected(param, mockRes);
    expect(data.forks.length).to.equal(1);
    expect(data.forks).to.deep.equal([branch2]);

    param = { "params": { "n": 5} };
    data = await branchController.getForksDetected(param, mockRes);
    expect(data.forks.length).to.equal(0);
  });
});