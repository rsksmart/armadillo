import "mocha";
import { BtcHeaderInfo } from "../../src/common/btc-block";
import { expect } from "chai";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { MongoStore } from "../../src/storage/mongo-store";
import { MainchainService } from "../../src/services/mainchain-service";
import { RskBlock } from "../../src/common/rsk-block";
import { MainchainController } from "../../src/api/controllers/mainchain-controller";
import { BranchItem } from "../../src/common/branch";
import { ApiConfig } from "../../src/config/api-config";
import { MessageResponse } from "../../src/api/common/message-response";
import { copy } from "../../src/util/helper";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; 
const NU = "00";
const BN = "000004c9"; 
const RSKTAG = PREFIX + CPV + NU + BN;
const btcInfo = new BtcHeaderInfo(0, "");
const mainConfig = ApiConfig.getMainConfig('./config.json');
const mongoStore = new MongoStore(mainConfig.store.mainchain);
const mainchainService = new MainchainService(mongoStore);
const mockRes = { "status": () => { return { "send": (y: any) => { return y } } } };

//Before you run this test you have to run a mongo instance
describe("Mainchain api tests", () => {
  beforeEach(async function () {
    await mainchainService.connect();
    await mainchainService.deleteAll();
  });

  after(async function () {
    await mainchainService.deleteAll();
    await mainchainService.disconnect();
  });

  it("save method and getLastBlocks method", async () => {

    let branchItem1 = new BranchItem(btcInfo, new RskBlock(1, "hash", "prevHash", true, new ForkDetectionData(RSKTAG)));

    await mainchainService.save([copy(branchItem1)]);

    let mainchainController = new MainchainController(mainchainService);
    let param = { "params": { "n": 1 } };
    let response : MessageResponse<BranchItem[]> = await mainchainController.getLastBlocks(param, mockRes);

    expect(response.data.length).to.equal(1);

    let branchItem2 = new BranchItem(btcInfo, new RskBlock(2, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000002")));
    let branchItem3 = new BranchItem(btcInfo, new RskBlock(3, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000003")));
    let branchItem4 = new BranchItem(btcInfo, new RskBlock(4, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000004")));
    let branchItem5 = new BranchItem(btcInfo, new RskBlock(5, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000005")));
    
    let blocks = [branchItem2, branchItem5, branchItem3, branchItem4];
    await mainchainService.save(copy(blocks));
    response = await mainchainController.getLastBlocks(param, mockRes);

    expect(response.data.length).to.equal(1);
    expect(response.data).to.deep.equal([branchItem5]);

    var ok = await mainchainService.save([copy(branchItem4)]);
    response = await mainchainController.getLastBlocks(param, mockRes);

    expect(ok).to.be.false;
    expect(response.data.length).to.equal(1);
    expect(response.data).to.deep.equal([branchItem5]);
   
    param = { "params": { "n": 5 } }
    response = await mainchainController.getLastBlocks(param, mockRes);
    expect(response.data.length).to.equal(5);
    expect(response.data).to.deep.equal([branchItem5, branchItem4, branchItem3, branchItem2, branchItem1]);

    //Saving a uncle with same height is allow
    branchItem4.rskInfo.mainchain = false;
    var ok = await mainchainService.save([copy(branchItem4)]);
    expect(ok).to.be.true;
    param = { "params": { "n": 10 } }
    response = await mainchainController.getLastBlocks(param, mockRes);
    expect(response.data.length).to.equal(6);
  });

  it("getBlockByForkDataDetection method", async () => {

    var forkDetectionData = new ForkDetectionData(PREFIX + CPV + NU + "00000001")
    let branchItem1 = new BranchItem(btcInfo, new RskBlock(1, "hash", "prevHash", true, forkDetectionData));

    await mainchainService.save([copy(branchItem1)]);

    let branchItem : BranchItem = await mainchainService.getBlockByForkDataDetection(forkDetectionData);
    expect(branchItem1).to.deep.equal(branchItem);

    let branchItem2 = new BranchItem(btcInfo, new RskBlock(2, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000002")));
    let branchItem3 = new BranchItem(btcInfo, new RskBlock(3, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000003")));
    let branchItem4 = new BranchItem(btcInfo, new RskBlock(4, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000004")));
    let branchItem5 = new BranchItem(btcInfo, new RskBlock(5, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000005")));
    
    let blocks = [branchItem2, branchItem5, branchItem3, branchItem4];
    await mainchainService.save(copy(blocks));
    branchItem = await mainchainService.getBlockByForkDataDetection(new ForkDetectionData(PREFIX + CPV + NU + "00000002"));

    expect(branchItem).to.deep.equal(branchItem2);
  });

  it("updateBtcInfoBranchItem method", async () => {

    var forkDetectionData = new ForkDetectionData(PREFIX + CPV + NU + "00000001");
    let branchItem1 = new BranchItem(null, new RskBlock(1, "hash", "prevHash", true, forkDetectionData));

    await mainchainService.save([copy(branchItem1)]);

    branchItem1.btcInfo = btcInfo;

    await mainchainService.updateBtcInfoBranchItem(branchItem1);

    let branchItem : BranchItem = await mainchainService.getBlockByForkDataDetection(forkDetectionData);

    expect(branchItem1).to.deep.equal(branchItem);
  });

  it("getBlock method", async () => {
    var forkDetectionData = new ForkDetectionData(RSKTAG)
    let branchItem1 = new BranchItem(null, new RskBlock(1, "hash", "prevHash", true, forkDetectionData));
    let branchItemUncle = new BranchItem(null, new RskBlock(1, "otroHash", "otroPrevHash", false, forkDetectionData));

    await mainchainService.save([copy(branchItem1)]);

    var branchItemSaved = await mainchainService.getBlock(branchItem1.rskInfo.height);

    expect(branchItem1).to.deep.equal(branchItemSaved);

    await mainchainService.save([copy(branchItemUncle)]);

    branchItemSaved = await mainchainService.getBlock(branchItem1.rskInfo.height);
  
    expect(branchItem1).to.deep.equal(branchItemSaved);
    expect(branchItemSaved.rskInfo.mainchain).to.true;
  });

  it("changeBlockInMainchain method", async () => {
    let branchItem1 = new BranchItem(null, new RskBlock(1, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000001")));
    let branchItem2 = new BranchItem(null, new RskBlock(2, "hash", "prevHash", true,  new ForkDetectionData(PREFIX + CPV + NU + "00000002")));
    let branchItem3 = new BranchItem(null, new RskBlock(3, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000003")));
    let branchToChange = new BranchItem(null, new RskBlock(1, "otroHash", "otroPrevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000001")));

    await mainchainService.save([copy(branchItem1), copy(branchItem2), copy(branchItem3)]);

    await mainchainService.changeBlockInMainchain(branchItem1.rskInfo.height, copy(branchToChange));

    var branchItemSaved = await mainchainService.getBlock(branchItem1.rskInfo.height);

    expect(branchToChange).to.deep.equal(branchItemSaved);
  });
});