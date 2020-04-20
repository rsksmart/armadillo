import "mocha";
import { BtcHeaderInfo } from "../../src/common/btc-block";
import { expect } from "chai";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { MongoStore } from "../../src/storage/mongo-store";
import { RskBlockInfo, RskForkItemInfo } from "../../src/common/rsk-block";
import { ForkService } from "../../src/services/fork-service";
import ForkController from "../../src/api/controllers/fork-controller";
import { ApiConfig } from "../../src/config/api-config";
import { MessageResponse } from "../../src/api/common/models";
import { copy } from "../../src/util/helper";
import { Item, Fork } from "../../src/common/forks";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0
const BN = "000004c9"; 
const btcInfo = new BtcHeaderInfo(0, "", "");
const RSKTAG = PREFIX + CPV + NU + BN;
const mainConfig = ApiConfig.getMainConfig('./config.json');
console.log(mainConfig)
const mongoStore = new MongoStore(mainConfig.store.forks);
const forkService = new ForkService(mongoStore);
const mockRes = { "status": () => { return { "send": (y: any) => { return y } } } };

//Before you run this test you have to run a mongo instance
describe("Fok api tests", () => {
  beforeEach(async function () {
    await forkService.connect();
    await forkService.deleteAll();
  });

  after(async function () {
    await forkService.deleteAll();
    await forkService.disconnect();
  });

  it.only("getBtcBlocksBetweenRskHeight and getBtcBlocksBetweenHeight method from route", async () => {
    const btcInfo1 = new BtcHeaderInfo(1000, "", "");
    const btcInfo2 = new BtcHeaderInfo(2000, "", "");
    const item = new Item(btcInfo1, new RskBlockInfo(100, "hash", "prevHash", true, "", new ForkDetectionData( PREFIX + CPV + NU + BN)));
    const item2 = new Item(btcInfo2, new RskBlockInfo(200, "hash", "prevHash", true, "", new ForkDetectionData( PREFIX + CPV + NU + BN)));

    const forkController = new ForkController(forkService);
    let param = { "params": { "forkDataDetection": PREFIX + CPV + NU + BN, "guessedMiner": "MinerName.com"} };
    let response : MessageResponse<Fork[]> = await forkController.getForksThatMatchWithSomePartOfForkDetectionData(param, mockRes);
    expect(response.data.length).to.equal(1);

    //startHeight > endHeight must return 
    // param = { "params": { "forkDataDetection": PREFIX + CPV + NU + BN, "guessedMiner": "MinerName.com"} };
    // response = await forkController.getBtcBlocksBetweenRskHeight(param, mockRes);
    // expect(response.data.length).to.equal(0);
    // expect(response.success).to.equal(false);
  });
});