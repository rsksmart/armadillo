
import "mocha";
import { BtcHeaderInfo } from "../../src/common/btc-block";
import { expect } from "chai";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { MongoStore } from "../../src/storage/mongo-store";
import { RskBlock } from "../../src/common/rsk-block";
import { BranchService } from "../../src/services/branch-service";
import { BranchItem, Branch } from "../../src/common/branch";
import { MainchainService } from "../../src/services/mainchain-service";
import { BLockchainController } from "../../src/api/controllers/blockchain-controller";
import { ApiConfig } from "../../src/config/api-config";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0
const btcInfo = new BtcHeaderInfo(0, "");
const mainConfig = ApiConfig.getMainConfig('./config.json');
const mongoBranchesStore = new MongoStore(mainConfig.store.branches);
const mongoMainchainStore = new MongoStore(mainConfig.store.mainchain);
const branchService = new BranchService(mongoBranchesStore);
const mainchainService = new MainchainService(mongoMainchainStore);
const mockRes = { "status": () => { return { "send": (y: any) => { return y } } } };

//Before you run this test you have to run a mongo instance
describe("Blockchain api tests", () => {
  beforeEach(async function () {
    await branchService.connect();
    await mainchainService.connect();
    await mainchainService.removeLastBlocks(100);
    await branchService.removeAll();
  });

  after(async function () {
    await mainchainService.disconnect();
    await branchService.disconnect();
  });

  it("getLastBlochains method", async () => {

    let branchItem1 = new BranchItem(btcInfo, new RskBlock(1, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000001")));
    let branchItem2 = new BranchItem(btcInfo, new RskBlock(2, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000002")));
    let branchItem3 = new BranchItem(btcInfo, new RskBlock(3, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000003")));
    let branchItem4 = new BranchItem(btcInfo, new RskBlock(4, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000004")));
    let branchItem5 = new BranchItem(btcInfo, new RskBlock(5, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000005")));
    let branchItem6 = new BranchItem(btcInfo, new RskBlock(6, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000006")));
    let branchItem7 = new BranchItem(btcInfo, new RskBlock(7, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000007")));

    let branch = new Branch(branchItem1.rskInfo, [branchItem3,branchItem4,branchItem5]);
    await branchService.save(branch);

    let mainchainList = [branchItem7,branchItem6,branchItem5,branchItem4,branchItem3,branchItem2,branchItem1]
    await mainchainService.save(mainchainList);

    let blockchainController = new BLockchainController(mainchainService, branchService);
    let param = { "params": { "n": 10 }};
    
    let data = await blockchainController.getLastBlochains(param, mockRes);
    expect(mainchainList).to.deep.equal(data.blockchains.mainchain);
    expect(data.blockchains.forks[0]).to.deep.equal(Branch.fromObjectToListBranchItems(branch));
  });
});