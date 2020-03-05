
import "mocha";
import { BtcBlock } from "../../src/common/btc-block";
import { expect } from "chai";
import { MongoStore } from "../../src/storage/mongo-store";
import { ApiConfig } from "../../src/config/api-config";
import { BtcService } from "../../src/services/btc-service";

const mainConfig = ApiConfig.getMainConfig('./config.json');
const mongoBtcService = new MongoStore(mainConfig.store.btc);
const btcService = new BtcService(mongoBtcService);
const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0
const BN = "000004c9"; // 1225
const RSKTAG = PREFIX + CPV + NU + BN;

//Before you run this test you have to run a mongo instance
describe("Btc service tests", () => {
  beforeEach(async function () {
    await btcService.connect();
    await btcService.deleteAll();
  });

  it("getLastBlockDetected method, there is nothing in database", async () => {
    var blocks = await btcService.getLastBlockDetected();
    expect(blocks).to.deep.equal(null);
  });

  it("getLastBlockDetected method, return 1 element but save 2 times", async () => {
    let btcBlock = new BtcBlock(100, "btcHash", RSKTAG, "");
    let btcBlockNext = new BtcBlock(101, "btcHash", RSKTAG, "");

    await btcService.save(btcBlock);
    var block = await btcService.getLastBlockDetected();
    expect(block).to.deep.equal(btcBlock);
    await btcService.save(btcBlockNext);
    block = await btcService.getLastBlockDetected();
    expect(block).to.deep.equal(btcBlockNext);
  });

  it("save multiple times, and then get last item saved", async () => {
    let btcBlock1 = new BtcBlock(1, "btcHash", RSKTAG, "");
    let btcBlock2 = new BtcBlock(2, "btcHash", RSKTAG, "");
    let btcBlock3 = new BtcBlock(3, "btcHash", RSKTAG, "");
    let btcBlock4 = new BtcBlock(4, "btcHash", "", "");
    let btcBlock5 = new BtcBlock(5, "btcHash", "", "");

    await btcService.save(btcBlock1);
    await btcService.save(btcBlock2);
    await btcService.save(btcBlock3);
    await btcService.save(btcBlock4);
    await btcService.save(btcBlock4);
    await btcService.save(btcBlock5);
    await btcService.save(btcBlock5);
    var block = await btcService.getLastBlockDetected();

    expect(block).to.deep.equal(btcBlock5);
  });
});