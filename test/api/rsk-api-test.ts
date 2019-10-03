import "mocha";
import { BtcHeaderInfo } from "../../src/common/btc-block";
import { RskApiService } from "../../src/services/rsk-api-service";
import { RskApiConfig } from "../../src/config/rsk-api-config";
import { stubObject } from "ts-sinon";
import { RskBlock } from "../../src/common/rsk-block";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import sinon from "sinon";
import { expect } from "chai";

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
const rskBlock = new RskBlock(1000, "", "", new ForkDetectionData(RskTagMatch7));
let rskApiConfig: RskApiConfig;
let rskApiService: RskApiService;

//Before you run this test you have to run a mongo instance
describe("Rsk Service api tests", () => {
  beforeEach(async function () {
    rskApiConfig = stubObject<RskApiConfig>(RskApiConfig.prototype);
    rskApiService = new RskApiService(rskApiConfig)
  });

  it("getRskBlockAtCerteinHeight method, match in 0 bytes the CPV, then get Block from rsk that connect fork with mainchain", async () => {

    let blockSameHeightMatch3 = new RskBlock(1000, "", "", new ForkDetectionData(RskTagMatch0));
    let blockToBeReturn = new RskBlock(1, "", "", new ForkDetectionData(RskTagMatch7));
    let prevBlock = new RskBlock(960, "", "", new ForkDetectionData(RSKTagMatch6));
    var getBlock = sinon.stub(rskApiService, <any>'getBlock');
    getBlock.withArgs(1).returns(blockToBeReturn);
    let blockReturn = await rskApiService.getRskBlockAtCerteinHeight(rskBlock, blockSameHeightMatch3);

    expect(blockReturn).to.deep.equal(blockToBeReturn);
  });

  it("getRskBlockAtCerteinHeight method, match in 3 bytes the CPV, then get Block from rsk that connect fork with mainchain", async () => {

    let blockSameHeightDontMatch = new RskBlock(1000, "", "", new ForkDetectionData(RskTagMatch3));
    let blockToBeReturn = new RskBlock(769, "", "", new ForkDetectionData(RskTagMatch3));
    let prevBlock = new RskBlock(768, "", "", new ForkDetectionData(RskTagMatch2));
    var getBlock = sinon.stub(rskApiService, <any>'getBlock');
    getBlock.withArgs(768).returns(prevBlock);
    getBlock.withArgs(769).returns(blockToBeReturn);
    let blockReturn = await rskApiService.getRskBlockAtCerteinHeight(rskBlock, blockSameHeightDontMatch);

    expect(blockReturn).to.deep.equal(blockToBeReturn);
  });

  it("getRskBlockAtCerteinHeight method, match in 5 bytes the CPV, then get Block from rsk that connect fork with mainchain", async () => {

    let blockSameHeightDontMatch = new RskBlock(1000, "", "", new ForkDetectionData(RskTagMatch5));
    let blockToBeReturn = new RskBlock(833, "", "", new ForkDetectionData(RskTagMatch5));
    let prevBlock = new RskBlock(832, "", "", new ForkDetectionData(RskTagMatch4));
    var getBlock = sinon.stub(rskApiService, <any>'getBlock');
    getBlock.withArgs(832).returns(prevBlock);
    getBlock.withArgs(833).returns(blockToBeReturn);
    let blockReturn = await rskApiService.getRskBlockAtCerteinHeight(rskBlock, blockSameHeightDontMatch);

    expect(blockReturn).to.deep.equal(blockToBeReturn);
  });

  it("getRskBlockAtCerteinHeight method, match in 7 bytes the CPV, then get Block from rsk that connect fork with mainchain", async () => {

    let blockToBeReturn = new RskBlock(961, "", "", new ForkDetectionData(RskTagMatch7));
    let prevBlock = new RskBlock(960, "", "", new ForkDetectionData(RSKTagMatch6));
    var getBlock = sinon.stub(rskApiService, <any>'getBlock');
    getBlock.withArgs(960).returns(prevBlock);
    getBlock.withArgs(961).returns(blockToBeReturn);
    let blockReturn = await rskApiService.getRskBlockAtCerteinHeight(rskBlock, rskBlock);

    expect(blockReturn).to.deep.equal(blockToBeReturn);
  });
});