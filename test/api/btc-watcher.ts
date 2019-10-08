
import "mocha";
import { BtcBlock } from "../../src/common/btc-block";
import { expect } from "chai";
import { MongoStore } from "../../src/storage/mongo-store";
import { ApiConfig } from "../../src/config/api-config";
import { BtcService } from "../../src/services/btc-service";
import { BtcWatcher } from "../../src/services/btc-watcher";
import { HttpBtcApi } from "../../src/services/btc-api";
import sinon from "sinon";
import { stubObject } from "ts-sinon";
import { BtcApiConfig } from "../../src/config/btc-api-config";
import { sleep } from "../../src/util/helper";

const mainConfig = ApiConfig.getMainConfig('./config.json');
const mongoBtcService = new MongoStore(mainConfig.store.btc);
const btcService = new BtcService(mongoBtcService);
const config = stubObject<BtcApiConfig>(BtcApiConfig.prototype);
const btcApi = new HttpBtcApi(config)
const btcWatcher = new BtcWatcher(btcApi, btcService);

describe.only("Btc watcher tests, synchronization with BTC, ", () => {
  beforeEach(async function () {
    btcWatcher.stop();
  });

  it("From the very begining no btc blocks were detected", async () => {
    let bestBlock = new BtcBlock(3, "", "");

    var getBestBlock = sinon.stub(btcApi, <any>'getBestBlock');
    getBestBlock.returns(bestBlock);

    var getLastBlockDetected = sinon.stub(btcService, <any>'getLastBlockDetected');
    getLastBlockDetected.returns(null);

    let save = sinon.stub(btcService, <any>'save').withArgs(bestBlock).callsFake(()=>{});

    btcWatcher.start();

    await sleep(1000);

    //Validation
    expect(save.called);
    
  });

  it("Last block was detected is behind 2 blocks", async () => {
    let btcBlockSaved = new BtcBlock(1, "", "");
    let bestBlock2 = new BtcBlock(2, "", "");
    let bestBlock3 = new BtcBlock(3, "", "");

    var getBestBlock = sinon.stub(btcApi, <any>'getBestBlock');
    getBestBlock.returns(bestBlock3);

    var getBestBlock = sinon.stub(btcApi, <any>'getBlock');
    getBestBlock.withArgs(2).returns(bestBlock2)
    getBestBlock.withArgs(3).returns(bestBlock3);

    var getLastBlockDetected = sinon.stub(btcService, <any>'getLastBlockDetected');
    getLastBlockDetected.returns(btcBlockSaved);
    let save = sinon.stub(btcService, <any>'save')
    save.withArgs(bestBlock2).callsFake(()=>{});
    save.withArgs(bestBlock3).callsFake(()=>{});

    btcWatcher.start();

    await sleep(1000);
 
    //Validation
    expect(save.calledTwice);
  });


  it("Already sync, no need to save new blocks", async () => {
    let btcBlockSaved = new BtcBlock(1, "", "");

    var getBestBlock = sinon.stub(btcApi, <any>'getBestBlock');
    getBestBlock.returns(btcBlockSaved);

    var getLastBlockDetected = sinon.stub(btcService, <any>'getLastBlockDetected');
    getLastBlockDetected.returns(btcBlockSaved);

    btcWatcher.start();
  });
});