import "mocha";
import { BtcHeaderInfo } from "../../src/common/btc-block";
import { expect } from "chai";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { MongoStore } from "../../src/storage/mongo-store";
import { RskBlockInfo, RskForkItemInfo } from "../../src/common/rsk-block";
import { ForkService } from "../../src/services/fork-service";
import { ForkItem, Fork, RangeForkInMainchain } from "../../src/common/forks";
import ForkController from "../../src/api/controllers/fork-controller";
import { ApiConfig } from "../../src/config/api-config";
import { MessageResponse } from "../../src/api/common/message-response";
import { copy } from "../../src/util/helper";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0
const btcInfo = new BtcHeaderInfo(0, "");
const mainConfig = ApiConfig.getMainConfig('./config.json');
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

  // it("getForksDetected method", async () => {

  //   let forkItem1 = new ForkItem(btcInfo, new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000001"), 0));
  //   let forkItem2 = new ForkItem(btcInfo, new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000002"), 0));
  //   let forkItem3 = new ForkItem(btcInfo, new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000003"), 0));
  //   let forkItem4 = new ForkItem(btcInfo, new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000004"), 0));
    
  //   let rangeForkInMainchain = new RangeForkInMainchain(forkItem1.rskForkInfo, forkItem1.rskForkInfo);
  //   let fork1 = new Fork(rangeForkInMainchain, [forkItem1,forkItem2]);
  //   let fork2 = new Fork(rangeForkInMainchain, [forkItem3,forkItem4]);
    
  //   await forkService.save(copy(fork1));
  //   await forkService.save(copy(fork2));

  //   let forkController = new ForkController(forkService);
  //   let param = { "params": { "n": 0 } };
  //   let next =  () => {};
  //   let response : MessageResponse<Fork[]> = await forkController.getForksDetected(param, mockRes, next);
  //   expect(response.data.length).to.equal(2);
  //   expect(response.data).to.deep.equal([fork1,fork2]);

  //   param = { "params": { "n": 1 } };
  //   response = await forkController.getForksDetected(param, mockRes, next);
  //   expect(response.data.length).to.equal(2);
  //   expect(response.data).to.deep.equal([fork1,fork2]);

  //   param = { "params": { "n": 2 } };
  //   response = await forkController.getForksDetected(param, mockRes, next);
  //   expect(response.data.length).to.equal(2);
  //   expect(response.data).to.deep.equal([fork1, fork2]);

  //   param = { "params": { "n": 3 } };
  //   response = await forkController.getForksDetected(param, mockRes, next);
  //   expect(response.data.length).to.equal(1);
  //   expect(response.data).to.deep.equal([fork2]);
    
  //   param = { "params": { "n": 4} };
  //   response = await forkController.getForksDetected(param, mockRes, next);
  //   expect(response.data.length).to.equal(1);
  //   expect(response.data).to.deep.equal([fork2]);

  //   param = { "params": { "n": 5} };
  //   response = await forkController.getForksDetected(param, mockRes, next);
  //   expect(response.data.length).to.equal(0);
  // });
});