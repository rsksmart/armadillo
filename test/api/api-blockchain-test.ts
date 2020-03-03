import "mocha";
import { BtcHeaderInfo } from "../../src/common/btc-block";
import { expect } from "chai";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { MongoStore } from "../../src/storage/mongo-store";
import { RskBlockInfo, RskForkItemInfo } from "../../src/common/rsk-block";
import { ForkService } from "../../src/services/fork-service";
import { ForkItem, Fork, RangeForkInMainchain, Item } from "../../src/common/forks";
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
const mongoForkStore = new MongoStore(mainConfig.store.forks);
const mongoMainchainStore = new MongoStore(mainConfig.store.mainchain);
const forkService = new ForkService(mongoForkStore);
const mainchainService = new MainchainService(mongoMainchainStore);
const mockRes = { "status": () => { return { "send": (y: any) => { return y } } } };

//Before you run this test you have to run a mongo instance
describe("Blockchain api tests", () => {
  beforeEach(async function () {
    await forkService.connect();
    await mainchainService.connect();
    await forkService.deleteAll();
    await mainchainService.deleteAll();
  });

  after(async function () {
    await forkService.deleteAll();
    await mainchainService.deleteAll();
    await mainchainService.disconnect();
    await forkService.disconnect();
  });

  it("getLastBlochains method", async () => {
    const itemInMainchain = new RskBlockInfo(0, "", "", true, null);
    const forkItem3 = new ForkItem(btcInfo, new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000003"), 0));
    const forkItem4 = new ForkItem(btcInfo, new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000004"), 0));
    const forkItem5 = new ForkItem(btcInfo, new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000005"), 0));

    const item1 = new Item(btcInfo, new RskBlockInfo(1, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000001")));
    const item2 = new Item(btcInfo, new RskBlockInfo(2, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000002")));
    const item3 = new Item(btcInfo, new RskBlockInfo(3, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000003")));
    const item4 = new Item(btcInfo, new RskBlockInfo(4, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000004")));
    const item5 = new Item(btcInfo, new RskBlockInfo(5, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000005")));
    const item6 = new Item(btcInfo, new RskBlockInfo(6, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000006")));
    const item7 = new Item(btcInfo, new RskBlockInfo(7, "hash", "prevHash", true, new ForkDetectionData(PREFIX + CPV + NU + "00000007")));

    let rangeForkInMainchain = new RangeForkInMainchain(itemInMainchain, itemInMainchain);
    let fork = new Fork(rangeForkInMainchain, [forkItem3,forkItem4,forkItem5]);

    var b = copy(fork);
    await forkService.save(b);
    
    const mainchainList = [item7,item6,item5,item4,item3,item2,item1];
    var a = copy(mainchainList);
    await mainchainService.save(a);

    let blockchainController = new BlockchainController(mainchainService, forkService);
    let param = { "params": { "n": 10 }};

    let response : MessageResponse<BlockchainHistory> = await blockchainController.getLastBlocksInChain(param, mockRes);
    expect(mainchainList).to.deep.equal(response.data.mainchain);
    expect(response.data.forks).to.deep.equal([fork]);
  });

  it("getLastBlochains method, max to search 5000", async () => {

    let blockchainController = new BlockchainController(mainchainService, forkService);
    
    let param = { "params": { "n": 6000 }};

    let response : MessageResponse<BlockchainHistory> = await blockchainController.getLastBlocksInChain(param, mockRes);
    expect("Get mainchain and forks in the last 5000 BTC blocks").to.deep.equal(response.message);
  });
});