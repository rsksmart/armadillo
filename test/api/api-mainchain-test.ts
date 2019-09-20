import "mocha";
import { BtcHeaderInfo } from "../../src/common/btc-block";
import { expect } from "chai";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { MainConfig } from "../../src/config/main-config";
import { MongoStore } from "../../src/storage/mongo-store";
import { MainchainService } from "../../src/services/mainchain-service";
import { RskBlock } from "../../src/common/rsk-block";
import { MainchainController } from "../../src/api/controllers/mainchain-controller";
import { BranchItem } from "../../src/common/branch";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0
const BN = "000004c9"; // 1225
const RSKTAG = PREFIX + CPV + NU + BN;
const btcInfo = new BtcHeaderInfo(0, "");
const mainConfig = MainConfig.getMainConfig('./config.json');
const mongoStore = new MongoStore(mainConfig.store.mainchain);
const mainchainService = new MainchainService(mongoStore);
const mockRes = { "status": () => { return { "send": (y: any) => { return y } } } };

//Before you run this test you have to run a mongo instance
describe("Mainchain api tests", () => {
  beforeEach(async function () {
    await mainchainService.connect();
    await mainchainService.removeLastBlocks(100);
  });

  after(async function () {
    await mainchainService.disconnect();
  });

  it("check save method and getLastBlocks", async () => {

    let branchItem1 = new BranchItem(btcInfo, new RskBlock(1, "hash", "prevHash", new ForkDetectionData(RSKTAG)));

    await mainchainService.save([branchItem1]);

    let mainchainController = new MainchainController(mainchainService);
    let param = { "params": { "n": 1 } };
    let data = await mainchainController.getLastBlocks(param, mockRes);

    expect(data.blocks.length).to.equal(1);

    let branchItem2 = new BranchItem(btcInfo, new RskBlock(2, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000002")));
    let branchItem3 = new BranchItem(btcInfo, new RskBlock(3, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000003")));
    let branchItem4 = new BranchItem(btcInfo, new RskBlock(4, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000004")));
    let branchItem5 = new BranchItem(btcInfo, new RskBlock(5, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000005")));
    
    let blocks = [branchItem2, branchItem5, branchItem3, branchItem4];
    await mainchainService.save(blocks);
    data = await mainchainController.getLastBlocks(param, mockRes);

    expect(data.blocks.length).to.equal(1);
    expect(data.blocks).to.deep.equal([branchItem5]);

    var ok = await mainchainService.save([branchItem4]);
    data = await mainchainController.getLastBlocks(param, mockRes);

    expect(ok).to.be.false;
    expect(data.blocks.length).to.equal(1);
    expect(data.blocks).to.deep.equal([branchItem5]);

    param = { "params": { "n": 5 } }
    data = await mainchainController.getLastBlocks(param, mockRes);
    expect(data.blocks.length).to.equal(5);
    expect(data.blocks).to.deep.equal([branchItem5, branchItem4, branchItem3, branchItem2, branchItem1]);
  });
});