import "mocha";
import { BtcHeaderInfo } from "../../src/common/btc-block";
import { expect } from "chai";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { MongoStore } from "../../src/storage/mongo-store";
import { RskBlockInfo, RskForkItemInfo } from "../../src/common/rsk-block";
import { ForkService } from "../../src/services/fork-service";
import { ForkItem, Fork, RangeForkInMainchain, Item } from "../../src/common/forks";
import { MainchainService } from "../../src/services/mainchain-service";
import { BlockchainController } from "../../src/api/controllers/blockchain-controller";
import { ApiConfig } from "../../src/config/api-config";
import { MessageResponse, BlockchainHistory } from "../../src/api/common/models";
import { copy } from "../../src/util/helper";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const PREFIX1 = "11116e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0
const btcInfo = new BtcHeaderInfo(0, "", "");
const storeConfig = ApiConfig.getStoreConfig('./config-test.json');
const mongoForkStore = new MongoStore(storeConfig.forks);
const mongoMainchainStore = new MongoStore(storeConfig.mainchain);
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
    const itemInMainchain = new RskBlockInfo(0, "", "", true, "", null);
    const forkItem3 = new ForkItem(btcInfo, new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000003"), 0), Date());
    const forkItem4 = new ForkItem(btcInfo, new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000004"), 0), Date());
    const forkItem5 = new ForkItem(btcInfo, new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000005"), 0), Date());

    const item1 = new Item(btcInfo, new RskBlockInfo(1, "hash", "prevHash", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000001")));
    const item2 = new Item(btcInfo, new RskBlockInfo(2, "hash", "prevHash", true, "",  new ForkDetectionData(PREFIX + CPV + NU + "00000002")));
    const item3 = new Item(btcInfo, new RskBlockInfo(3, "hash", "prevHash", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000003")));
    const item4 = new Item(btcInfo, new RskBlockInfo(4, "hash", "prevHash", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000004")));
    const item5 = new Item(btcInfo, new RskBlockInfo(5, "hash", "prevHash", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000005")));
    const item6 = new Item(btcInfo, new RskBlockInfo(6, "hash", "prevHash", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000006")));
    const item7 = new Item(btcInfo, new RskBlockInfo(7, "hash", "prevHash", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000007")));

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

  it("getLastForksInChain method", async () => {

    let blockchainController = new BlockchainController(mainchainService, forkService);
    let start = new RskBlockInfo(1, "", "", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000003"));
    let end = new RskBlockInfo(2, "", "", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000002"));
    let rangeForkInMainchain = new RangeForkInMainchain(start, end);
    let param = { "params": { "n": 1 }};

    //Add a fork, check if the last fork (which is the only one) it there.
    var fork1 = new Fork(rangeForkInMainchain, new ForkItem(new BtcHeaderInfo(1000,"",""), new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000003"), 0), Date()))
    let response : MessageResponse<Fork[]>  = await blockchainController.getLastForksInChain(param, mockRes);
    expect(response.data).to.deep.equal([]);
    await forkService.save(copy(fork1))
    response = await blockchainController.getLastForksInChain(param, mockRes);
    expect(response.data).to.deep.equal([fork1]);

    //Add a second fork, check if the last fork is this.
    var fork2 = new Fork(rangeForkInMainchain, new ForkItem(new BtcHeaderInfo(1100,"",""), new RskForkItemInfo(new ForkDetectionData(PREFIX1 + CPV + NU + "00000003"), 0), Date()))
    await forkService.save(copy(fork2));
    response = await blockchainController.getLastForksInChain(param, mockRes);
    expect(response.data).to.deep.equal([fork2]);

     //Add a third fork and add a new item, check if the last fork is this.
    var newPrefix = "9b9b9b9b9b9b9b9b9b9b9b9b9b99b9b9bb9b9b9b";
    var fork3 = new Fork(rangeForkInMainchain, new ForkItem(new BtcHeaderInfo(900,"",""), new RskForkItemInfo(new ForkDetectionData(newPrefix + CPV + NU + "00000003"), 0), Date()))
    await forkService.save(copy(fork3));
    response = await blockchainController.getLastForksInChain(param, mockRes);
    let item = new ForkItem(new BtcHeaderInfo(1200,"",""), new RskForkItemInfo(new ForkDetectionData(newPrefix + CPV + NU + "00000003"), 100), Date());
    await forkService.addForkItem(fork3.firstDetected.prefixHash, item);
    response = await blockchainController.getLastForksInChain(param, mockRes);
    fork3.addNewForkItem(item);
    expect(response.data).to.deep.equal([fork3]);

    //Add another item into the third fork, check if the last fork is this.
    let item2 = new ForkItem(new BtcHeaderInfo(1300,"",""), new RskForkItemInfo(new ForkDetectionData(newPrefix + CPV + NU + "00000003"), 100), Date());
    await forkService.addForkItem(fork3.firstDetected.prefixHash, item2);
    response = await blockchainController.getLastForksInChain(param, mockRes);
    fork3.addNewForkItem(item2);
    expect(response.data).to.deep.equal([fork3]);

    //Add a new item into the second fork, check if the last fork is this.
    let item3 = new ForkItem(new BtcHeaderInfo(1400,"",""), new RskForkItemInfo(new ForkDetectionData(PREFIX1 + CPV + NU + "00000003"), 100), Date());
    await forkService.addForkItem(fork2.firstDetected.prefixHash, item3);
    response = await blockchainController.getLastForksInChain(param, mockRes);
    fork2.addNewForkItem(item3);
    expect(response.data).to.deep.equal([fork2]);

    //check the last 2 blocks
    param = { "params": { "n": 2}};
    response = await blockchainController.getLastForksInChain(param, mockRes);
    expect(response.data).to.deep.equal([fork2, fork3]);
    
    //check the last 3 blocks
    param = { "params": { "n": 3}};
    response = await blockchainController.getLastForksInChain(param, mockRes);
    expect(response.data).to.deep.equal([fork2, fork3, fork1]);

    //check the last 6000 blocks, should find the 3 existing forks
    response = await blockchainController.getLastForksInChain(param, mockRes);
    expect(response.data).to.deep.equal([fork2, fork3, fork1]);
  });
});