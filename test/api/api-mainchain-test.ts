import "mocha";
import { BtcHeaderInfo } from "../../src/common/btc-block";
import { expect } from "chai";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { MongoStore } from "../../src/storage/mongo-store";
import { MainchainService } from "../../src/services/mainchain-service";
import { RskBlockInfo } from "../../src/common/rsk-block";
import { MainchainController } from "../../src/api/controllers/mainchain-controller";
import { Item } from "../../src/common/forks";
import { ApiConfig } from "../../src/config/api-config";
import { MessageResponse } from "../../src/api/common/models";
import { copy } from "../../src/util/helper";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; 
const NU = "00";
const BN = "000004c9"; 
const RSKTAG = PREFIX + CPV + NU + BN;
const btcInfo = new BtcHeaderInfo(0, "", "");
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

    let item = new Item(btcInfo, new RskBlockInfo(1, "hash", "prevHash", true, "", new ForkDetectionData(RSKTAG)));

    await mainchainService.save([copy(item)]);

    let mainchainController = new MainchainController(mainchainService);
    let param = { "params": { "n": 1 } };
    let response : MessageResponse<Item[]> = await mainchainController.getLastBlocks(param, mockRes);

    expect(response.data.length).to.equal(1);

    let item2 = new Item(btcInfo, new RskBlockInfo(2, "hash", "prevHash", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000002")));
    let item3 = new Item(btcInfo, new RskBlockInfo(3, "hash", "prevHash", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000003")));
    let item4 = new Item(btcInfo, new RskBlockInfo(4, "hash", "prevHash", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000004")));
    let item5 = new Item(btcInfo, new RskBlockInfo(5, "hash", "prevHash", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000005")));
    
    let blocks = [item2, item5, item3, item4];
    await mainchainService.save(copy(blocks));
    response = await mainchainController.getLastBlocks(param, mockRes);

    expect(response.data.length).to.equal(1);
    expect(response.data).to.deep.equal([item5]);

    var ok = await mainchainService.save([copy(item4)]);
    response = await mainchainController.getLastBlocks(param, mockRes);

    expect(ok).to.be.false;
    expect(response.data.length).to.equal(1);
    expect(response.data).to.deep.equal([item5]);
   
    param = { "params": { "n": 5 } }
    response = await mainchainController.getLastBlocks(param, mockRes);
    expect(response.data.length).to.equal(5);
    expect(response.data).to.deep.equal([item5, item4, item3, item2, item]);

    //Saving a uncle with same height is allow
    item4.rskInfo.mainchain = false;
    var ok = await mainchainService.save([copy(item4)]);
    expect(ok).to.be.true;
    param = { "params": { "n": 10 } }
    response = await mainchainController.getLastBlocks(param, mockRes);
    expect(response.data.length).to.equal(6);
  });

  it("getBlockByForkDataDetection method", async () => {

    var forkDetectionData = new ForkDetectionData(PREFIX + CPV + NU + "00000001")
    let item1 = new Item(btcInfo, new RskBlockInfo(1, "hash", "prevHash", true, "", forkDetectionData));

    await mainchainService.save([copy(item1)]);

    let item : Item = await mainchainService.getBlockByForkDataDetection(forkDetectionData);
    expect(item1).to.deep.equal(item);

    let item2 = new Item(btcInfo, new RskBlockInfo(2, "hash", "prevHash", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000002")));
    let item3 = new Item(btcInfo, new RskBlockInfo(3, "hash", "prevHash", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000003")));
    let item4 = new Item(btcInfo, new RskBlockInfo(4, "hash", "prevHash", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000004")));
    let item5 = new Item(btcInfo, new RskBlockInfo(5, "hash", "prevHash", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000005")));
    
    let blocks = [item2, item5, item3, item4];
    await mainchainService.save(copy(blocks));
    item = await mainchainService.getBlockByForkDataDetection(new ForkDetectionData(PREFIX + CPV + NU + "00000002"));

    expect(item).to.deep.equal(item2);
  });

  it("updateBtcInfoItem method", async () => {

    var forkDetectionData = new ForkDetectionData(PREFIX + CPV + NU + "00000001");
    let item1 = new Item(null, new RskBlockInfo(1, "hash", "prevHash", true, "", forkDetectionData));

    await mainchainService.save([copy(item1)]);

    item1.btcInfo = btcInfo;

    await mainchainService.updateBtcInfoItem(item1);

    let item : Item = await mainchainService.getBlockByForkDataDetection(forkDetectionData);

    expect(item1).to.deep.equal(item);
  });

  it("getBlock method", async () => {
    var forkDetectionData = new ForkDetectionData(RSKTAG)
    let item1 = new Item(null, new RskBlockInfo(1, "hash", "prevHash", true, "", forkDetectionData));
    let itemUncle = new Item(null, new RskBlockInfo(1, "otroHash", "otroPrevHash", false, "", forkDetectionData));

    await mainchainService.save([copy(item1)]);

    var itemSaved = await mainchainService.getBlock(item1.rskInfo.height);

    expect(item1).to.deep.equal(itemSaved);

    await mainchainService.save([copy(itemUncle)]);

    itemSaved = await mainchainService.getBlock(item1.rskInfo.height);
  
    expect(item1).to.deep.equal(itemSaved);
    expect(itemSaved.rskInfo.mainchain).to.true;
  });

  it("changeBlockInMainchain method", async () => {
    let item1 = new Item(null, new RskBlockInfo(1, "hash", "prevHash", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000001")));
    let item2 = new Item(null, new RskBlockInfo(2, "hash", "prevHash", true, "",  new ForkDetectionData(PREFIX + CPV + NU + "00000002")));
    let item3 = new Item(null, new RskBlockInfo(3, "hash", "prevHash", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000003")));
    let itemToChange = new Item(null, new RskBlockInfo(1, "otroHash", "otroPrevHash", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000001")));

    await mainchainService.save([copy(item1), copy(item2), copy(item3)]);

    await mainchainService.changeBlockInMainchain(item1.rskInfo.height, copy(itemToChange));

    var itemSaved = await mainchainService.getBlock(item1.rskInfo.height);

    expect(itemToChange).to.deep.equal(itemSaved);
  });

  it("getLastBtcBlocksDetectedInChain method", async () => {
    // Add some items into armadillo chain and then check if the given chain is correct
    let item1WithBTC = new Item(new BtcHeaderInfo(1000, "", ""), new RskBlockInfo(100, "hash", "prevHash", true, "", new ForkDetectionData(RSKTAG)));

    await mainchainService.save([copy(item1WithBTC)]);

    let response : Item[] = await mainchainService.getLastBtcBlocksDetectedInChainCompleteWithRSK(100);

    expect(response.length).to.equal(1);
    expect([item1WithBTC]).to.deep.equal(response);
    
    //Building chain between tags btcblock 1000 and btcblock 1020
    var itemsToSave = [];
    for(var i = 101; i <= 120; i++){
      itemsToSave.push(new Item(null, new RskBlockInfo(i, "hash" + i, "prevHash" + (i-1), true, "", new ForkDetectionData(RSKTAG))));
    }
    let item2WithBTC = new Item(new BtcHeaderInfo(1120, "", ""), new RskBlockInfo(121, "hash121", "prevHash120", true, "", new ForkDetectionData(RSKTAG)));
    itemsToSave.push(item2WithBTC);

    await mainchainService.save(copy(itemsToSave));

    response = await mainchainService.getLastBtcBlocksDetectedInChainCompleteWithRSK(100);
    expect(response.length).to.equal(22);
    var itemsToCheck =[item1WithBTC].concat(itemsToSave);
    expect(itemsToCheck.reverse()).to.deep.equal(response);

    itemsToSave = [];
    for(var i = 122; i <= 130; i++){
      itemsToSave.push(new Item(null, new RskBlockInfo(i, "hash" + i, "prevHash" + (i-1), true, "", new ForkDetectionData(RSKTAG))));
    }
    let item3WithBTC = new Item(new BtcHeaderInfo(1122, "", ""), new RskBlockInfo(131, "hash121", "prevHash120", true, "", new ForkDetectionData(RSKTAG)));
    itemsToSave.push(item3WithBTC);

    await mainchainService.save(copy(itemsToSave));

    response = await mainchainService.getLastBtcBlocksDetectedInChainCompleteWithRSK(100);
    expect(response.length).to.equal(32);
    itemsToCheck = itemsToCheck.reverse().concat(itemsToSave);
    expect(itemsToCheck.reverse()).to.deep.equal(response);

    //add btc item as a uncle
    itemsToSave = [];
    for(var i = 132; i <= 140; i++){
      itemsToSave.push(new Item(null, new RskBlockInfo(i, "hash" + i, "prevHash" + (i-1), true, "", new ForkDetectionData(RSKTAG))));
    }
    let item4WithBTC = new Item(new BtcHeaderInfo(1125, "", ""), new RskBlockInfo(140, "hash140", "prevHash139", false, "", new ForkDetectionData(RSKTAG)));
    itemsToSave.push(item4WithBTC);
    let itemsToSaveBetween3and4 = itemsToSave;
    await mainchainService.save(copy(itemsToSave));

    response = await mainchainService.getLastBtcBlocksDetectedInChainCompleteWithRSK(100);
    
    expect(response.length).to.equal(42);
    itemsToCheck = itemsToCheck.reverse().concat(itemsToSave);
    expect(itemsToCheck.reverse()).to.deep.equal(response);

     //return just chain between last BTC block
    response = await mainchainService.getLastBtcBlocksDetectedInChainCompleteWithRSK(1);
    expect(response.length).to.equal(1);
    expect([item4WithBTC]).to.deep.equal(response);

    //return just chain between the last 2 BTC blocks
    response = await mainchainService.getLastBtcBlocksDetectedInChainCompleteWithRSK(2);
    expect(response.length).to.equal(11);
    expect([item3WithBTC].concat(itemsToSaveBetween3and4).reverse()).to.deep.equal(response);
  });

  it("getBtcBlocksBetweenHeight method", async () => {
    // Add some items into armadillo chain and then check if the given chain is correct
    const item3 = new Item(new BtcHeaderInfo(3000, "", ""), new RskBlockInfo(300, "hash", "prevHash", true, "", new ForkDetectionData(RSKTAG)));
    const item2 = new Item(new BtcHeaderInfo(2000, "", ""), new RskBlockInfo(200, "hash", "prevHash", true, "", new ForkDetectionData(RSKTAG)));
    const item1 = new Item(new BtcHeaderInfo(1000, "", ""), new RskBlockInfo(100, "hash", "prevHash", true, "", new ForkDetectionData(RSKTAG)));

    // start is bigger than end return []
    let response : Item[] = await mainchainService.getBtcBlocksBetweenHeight(1000, 200);
    expect(response.length).to.equal(0);

    // no btc blocks with interval 100 - 200
    await mainchainService.save([copy(item1)]);
    response = await mainchainService.getBtcBlocksBetweenHeight(100, 200);
    expect(response.length).to.equal(0);

    // 1 item with interval 1000 - 2000
    response = await mainchainService.getBtcBlocksBetweenHeight(1000, 2000);
    expect([item1]).to.deep.equal(response);

    // 2 items with interval 1000 - 2000
    await mainchainService.save([copy(item2)]);
    await mainchainService.save([copy(item3)]);
    response = await mainchainService.getBtcBlocksBetweenHeight(1000, 2000);
    expect([item2, item1]).to.deep.equal(response);

    // 2 items with interval 2000 - 3000
    response = await mainchainService.getBtcBlocksBetweenHeight(2000, 3000);
    expect([item3, item2]).to.deep.equal(response);

    // 2 items with interval 3000 - 3000
    response = await mainchainService.getBtcBlocksBetweenHeight(3000, 3000);
    expect([item3]).to.deep.equal(response);

    // add rsk blocks without btc data should be in the response
    const itemRsk = new Item(null, new RskBlockInfo(102, "hash", "prevHash", true, "", new ForkDetectionData(RSKTAG)));
    await mainchainService.save([copy(itemRsk)]);
    response = await mainchainService.getBtcBlocksBetweenHeight(100, 1000);
    expect([item1]).to.deep.equal(response);
  });

  it("getBtcBlocksBetweenRskHeight method", async () => {
    // Add some items into armadillo chain and then check if the given chain is correct
    const item3 = new Item(new BtcHeaderInfo(3000, "", ""), new RskBlockInfo(300, "hash", "prevHash", true, "", new ForkDetectionData(RSKTAG)));
    const item2 = new Item(new BtcHeaderInfo(2000, "", ""), new RskBlockInfo(200, "hash", "prevHash", true, "", new ForkDetectionData(RSKTAG)));
    const item1 = new Item(new BtcHeaderInfo(1000, "", ""), new RskBlockInfo(100, "hash", "prevHash", true, "", new ForkDetectionData(RSKTAG)));

    // start is bigger than end return []
    let response : Item[] = await mainchainService.getBtcBlocksBetweenRskHeight(1000, 200);
    expect(response.length).to.equal(0);

    // no btc blocks with interval 1000 - 2000
    await mainchainService.save([copy(item1)]);
    response = await mainchainService.getBtcBlocksBetweenRskHeight(1000, 2000);
    expect(response.length).to.equal(0);

    // 1 item with interval 1000 - 2000
    response = await mainchainService.getBtcBlocksBetweenRskHeight(100, 150);
    expect([item1]).to.deep.equal(response);

    // 2 items with interval 1000 - 2000
    await mainchainService.save([copy(item2)]);
    await mainchainService.save([copy(item3)]);
    response = await mainchainService.getBtcBlocksBetweenRskHeight(100, 200);
    expect([item2, item1]).to.deep.equal(response);

    // 2 items with interval 2000 - 3000
    response = await mainchainService.getBtcBlocksBetweenRskHeight(200, 300);
    expect([item3, item2]).to.deep.equal(response);

    // 2 items with interval 3000 - 3000
    response = await mainchainService.getBtcBlocksBetweenRskHeight(300, 300);
    expect([item3]).to.deep.equal(response);

    // add rsk blocks without btc data should be in the response
    const itemRsk = new Item(null, new RskBlockInfo(102, "hash", "prevHash", true, "", new ForkDetectionData(RSKTAG)));
    await mainchainService.save([copy(itemRsk)]);
    response = await mainchainService.getBtcBlocksBetweenRskHeight(100, 200);
    expect([item2, item1]).to.deep.equal(response);
  });

  it("getBtcBlocksBetweenRskHeight and getBtcBlocksBetweenHeight method from route", async () => {
    const btcInfo1 = new BtcHeaderInfo(1000, "", "");
    const btcInfo2 = new BtcHeaderInfo(2000, "", "");
    const item = new Item(btcInfo1, new RskBlockInfo(100, "hash", "prevHash", true, "", new ForkDetectionData(RSKTAG)));
    const item2 = new Item(btcInfo2, new RskBlockInfo(200, "hash", "prevHash", true, "", new ForkDetectionData(RSKTAG)));

    await mainchainService.save([copy(item)]);
    await mainchainService.save([copy(item2)]);

    const mainchainController = new MainchainController(mainchainService);
    let param = { "params": { "startHeight": 100, "endHeight": 150} };
    let response : MessageResponse<Item[]> = await mainchainController.getBtcBlocksBetweenRskHeight(param, mockRes);
    expect(response.data.length).to.equal(1);

    //startHeight > endHeight must return 
    param = { "params": { "startHeight": 200, "endHeight": 150} };
    response = await mainchainController.getBtcBlocksBetweenRskHeight(param, mockRes);
    expect(response.data.length).to.equal(0);
    expect(response.success).to.equal(false);
  });
});