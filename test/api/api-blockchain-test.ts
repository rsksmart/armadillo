
import "mocha";
import { BtcHeaderInfo } from "../../src/common/btc-block";
import { expect } from "chai";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { MongoStore } from "../../src/storage/mongo-store";
import { RskBlock } from "../../src/common/rsk-block";
import { BranchService } from "../../src/services/branch-service";
import { BranchItem, Branch, RangeForkInMainchain } from "../../src/common/branch";
import { MainchainService } from "../../src/services/mainchain-service";
import { BlockchainController, BlockchainHistory } from "../../src/api/controllers/blockchain-controller";
import { ApiConfig } from "../../src/config/api-config";
import { MessageResponse } from "../../src/api/common/message-response";
import { copy } from "../../src/util/helper";

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
    await branchService.deleteAll();
    await mainchainService.deleteAll();
  });

  after(async function () {
    await branchService.deleteAll();
    await mainchainService.deleteAll();
    await mainchainService.disconnect();
    await branchService.disconnect();
  });

  it("getLastBlochains method", async () => {
    const branchItem1 = new BranchItem(btcInfo, new RskBlock(1, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000001")));
    const branchItem2 = new BranchItem(btcInfo, new RskBlock(2, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000002")));
    const branchItem3 = new BranchItem(btcInfo, new RskBlock(3, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000003")));
    const branchItem4 = new BranchItem(btcInfo, new RskBlock(4, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000004")));
    const branchItem5 = new BranchItem(btcInfo, new RskBlock(5, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000005")));
    const branchItem6 = new BranchItem(btcInfo, new RskBlock(6, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000006")));
    const branchItem7 = new BranchItem(btcInfo, new RskBlock(7, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000007")));

    let rangeForkInMainchain = new RangeForkInMainchain(branchItem1.rskInfo, branchItem1.rskInfo);
    let branch = new Branch(rangeForkInMainchain, [branchItem3,branchItem4,branchItem5]);

    var b = copy(branch);
    await branchService.save(b);
    
    const mainchainList = [branchItem7,branchItem6,branchItem5,branchItem4,branchItem3,branchItem2,branchItem1];
    var a = copy(mainchainList);
    await mainchainService.save(a);

    let blockchainController = new BlockchainController(mainchainService, branchService);
    let param = { "params": { "n": 10 }};

    let response : MessageResponse<BlockchainHistory> = await blockchainController.getLastBlocksInChain(param, mockRes);
    expect(mainchainList).to.deep.equal(response.data.mainchain);
    expect(response.data.forks[0]).to.deep.equal(Branch.fromObjectToListBranchItems(branch));
  });

  it("getLastBlochains method, max to search 5000", async () => {

    let blockchainController = new BlockchainController(mainchainService, branchService);
    
    let param = { "params": { "n": 6000 }};

    let response : MessageResponse<BlockchainHistory> = await blockchainController.getLastBlocksInChain(param, mockRes);
    expect("Get mainchain and forks in the last 5000 blocks").to.deep.equal(response.message);
  });
});