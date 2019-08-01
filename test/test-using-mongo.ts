import "mocha";
import { BtcHeaderInfo } from "../src/common/btc-block";
import { Branch, BranchItem } from "../src/common/branch";
import { expect } from "chai";
import { ForkDetectionData } from "../src/common/fork-detection-data";
import { MainConfig } from "../src/config/main-config";
import { MongoStore } from "../src/storage/mongo-store";
import { BranchService } from "../src/services/branch-service";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0
const BN = "000004c9"; // 1225
const RSKTAG = PREFIX + CPV + NU + BN;
const btcInfo = new BtcHeaderInfo(0, "");
const mainConfig = MainConfig.getMainConfig( './config.json');
const mongoStore = new MongoStore(mainConfig.store.branches);
const branchService = new BranchService(mongoStore); 

describe("save branch correctly", () => {
  it.only("tests", async () => {
    
    var branchItem = new BranchItem(btcInfo, new ForkDetectionData(RSKTAG))
    var branch = new Branch(branchItem);
    
    await branchService.connect();
    await branchService.addBranchItem(branch.firstDetected.prefixHash, branchItem);

    var branches : Branch[] = await branchService.getForksDetected();

    expect(branches.length).to.equal(1);
    expect(branches).to.deep.equal([branch]);
  });
});