import "mocha";
import { RskApiService } from "../../src/services/rsk-api-service";
import { RskApiConfig } from "../../src/config/rsk-api-config";
import { stubObject } from "ts-sinon";
import { RskBlock } from "../../src/common/rsk-block";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import sinon from "sinon";
import { expect } from "chai";
import { RangeForkInMainchain } from "../../src/common/branch";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPVMatch0 = "77665544332211";
const CPVMatch2 = "5544332211d89d";
const CPVMatch3 = "332211d89d8bf4";
const CPVMatch4 = "44332211d89d8b";
const CPVMatch5 = "2211d89d8bf4d2";
const CPVMatch6 = "11d89d8bf4d2e4"; // [ "11","d8", "9d", "8b", "f4", "d2", "e4"]
const CPVMatch7 = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]

const NU = "00"; // 0
const BN = "000004c9"; // 1225
const RskTagMatch0 = PREFIX + CPVMatch0 + NU + BN;
const RskTagMatch2 = PREFIX + CPVMatch2 + NU + BN;
const RskTagMatch3 = PREFIX + CPVMatch3 + NU + BN;
const RskTagMatch5 = PREFIX + CPVMatch5 + NU + BN;
const RskTagMatch4 = PREFIX + CPVMatch4 + NU + BN;
const RSKTagMatch6 = PREFIX + CPVMatch6 + NU + BN;
const RskTagMatch7 = PREFIX + CPVMatch7 + NU + BN;
const rskBlock = new RskBlock(1000, "", "", true, new ForkDetectionData(RskTagMatch7));
let rskApiConfig: RskApiConfig;
let rskApiService: RskApiService;

//Before you run this test you have to run a mongo instance
describe("Rsk Service api tests", () => {
  beforeEach(async function () {
    rskApiConfig = stubObject<RskApiConfig>(RskApiConfig.prototype);
    rskApiService = new RskApiService(rskApiConfig)
  });

  it("getRskBlockAtCertainHeight method, match in 0 bytes the CPV, then get Block from rsk that connect fork with mainchain", async () => {

    let blockSameHeightMatch3 = new RskBlock(1000, "", "", true, new ForkDetectionData(RskTagMatch0));
    let blockHeight1 = new RskBlock(1, "", "", true, new ForkDetectionData(RskTagMatch7));
    let bestBlock = new RskBlock(10, "", "", true, new ForkDetectionData(RskTagMatch7));
    var getBlockAtHeight1 = sinon.stub(rskApiService, <any>'getBlock');
    getBlockAtHeight1.withArgs(1).returns(blockHeight1);
    var getBestBlock = sinon.stub(rskApiService, <any>'getBestBlock');
    getBestBlock.returns(bestBlock);
    
    let blockReturn : RangeForkInMainchain = await rskApiService.getRskBlockAtCertainHeight(rskBlock, blockSameHeightMatch3);

    let rangeExpected = new RangeForkInMainchain(blockHeight1, bestBlock);
    expect(blockReturn).to.deep.equal(rangeExpected);
  });

  it("getRskBlockAtCertainHeight method, match in 3 bytes the CPV, then get Block from rsk that connect fork with mainchain", async () => {

    let blockSameHeightDontMatch = new RskBlock(1000, "", "", true, new ForkDetectionData(RskTagMatch3));
    let block768 = new RskBlock(768, "", "", true, new ForkDetectionData(RskTagMatch2));
    let block832 = new RskBlock(832, "", "", true, new ForkDetectionData(RskTagMatch2));
    var getBlock = sinon.stub(rskApiService, <any>'getBlock');
    getBlock.withArgs(768).returns(block768);
    getBlock.withArgs(832).returns(block832);

    let blockReturn : RangeForkInMainchain = await rskApiService.getRskBlockAtCertainHeight(rskBlock, blockSameHeightDontMatch);
    let rangeExpected = new RangeForkInMainchain(block768, block832);

    expect(rangeExpected).to.deep.equal(blockReturn);
  });

  it("getRskBlockAtCertainHeight method, match in 5 bytes the CPV, then get Block from rsk that connect fork with mainchain", async () => {

    let blockSameHeightDontMatch = new RskBlock(1000, "", "", true, new ForkDetectionData(RskTagMatch5));
    let block832 = new RskBlock(832, "", "", true, new ForkDetectionData(RskTagMatch5));
    let block896 = new RskBlock(896, "", "", true, new ForkDetectionData(RskTagMatch5));
    var getBlock = sinon.stub(rskApiService, <any>'getBlock');
    getBlock.withArgs(832).returns(block832);
    getBlock.withArgs(896).returns(block896);

    let blockReturn : RangeForkInMainchain = await rskApiService.getRskBlockAtCertainHeight(rskBlock, blockSameHeightDontMatch);

    let rangeExpected = new RangeForkInMainchain(block832, block896);

    expect(rangeExpected).to.deep.equal(blockReturn);
  });

  it("getRskBlockAtCertainHeight method, match in 7 bytes the CPV, then get Block from rsk that connect fork with mainchain", async () => {

    let block960 = new RskBlock(960, "", "", true, new ForkDetectionData(RskTagMatch7));
    let block1000 = new RskBlock(1000, "", "", true, new ForkDetectionData(RskTagMatch7));
    var getBlock = sinon.stub(rskApiService, <any>'getBlock');
    getBlock.withArgs(960).returns(block960);
    getBlock.withArgs(1000).returns(block1000);
    let blockReturn : RangeForkInMainchain = await rskApiService.getRskBlockAtCertainHeight(rskBlock, rskBlock);

    let rangeExpected = new RangeForkInMainchain(block960, block1000);
    
    expect(rangeExpected).to.deep.equal(blockReturn);
  });
});