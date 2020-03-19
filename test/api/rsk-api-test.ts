import "mocha";
import { RskApiService } from "../../src/services/rsk-api-service";
import { RskApiConfig } from "../../src/config/rsk-api-config";
import { RskBlockInfo, RskForkItemInfo } from "../../src/common/rsk-block";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import sinon from "sinon";
import { expect } from "chai";
import { RangeForkInMainchain } from "../../src/common/forks";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const NU = "00";
const blockAtHeight1 = new RskBlockInfo(1, "", "", true, "", null);
let rskApiConfig: RskApiConfig;
let rskApiService: RskApiService;

//Before you run this test you have to run a mongo instance
describe("Rsk Service api tests, getRangeForkWhenItCouldHaveStarted method", () => {
  beforeEach(async function () {
    rskApiConfig = new RskApiConfig("localhost:4444", 0);
    rskApiService = new RskApiService(rskApiConfig)
  });

  describe("Far future case:", () => {
    it("Far Future case. CPV match 0 bytes. fork range should go from 1 to best block", async () => {
      const bestBlock = new RskBlockInfo(500, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "000001F4"));

      sinon.stub(rskApiService, <any>'getBlock').withArgs(1).returns(blockAtHeight1);
      sinon.stub(rskApiService, <any>'getBestBlock').returns(bestBlock);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted(new ForkDetectionData(PREFIX + "d89d8bf4d2e434" + NU + "000003E8"), bestBlock);
      let rangeExpected = new RangeForkInMainchain(blockAtHeight1, bestBlock);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });
  });

  describe("Near future case:", () => {
    it("CPV match 7 bytes.", async () => {
      const bestBlock = new RskBlockInfo(1000, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "000003E8"));
      let block960 = new RskBlockInfo(960, "", "", true, "", null);

      const getBlockStub = sinon.stub(rskApiService, <any>'getBlock')
      getBlockStub.withArgs(960).returns(block960);

      sinon.stub(rskApiService, <any>'getBestBlock').returns(bestBlock);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted(new ForkDetectionData(PREFIX + "77665544332211" + NU + "000003ED"), bestBlock);

      let rangeExpected = new RangeForkInMainchain(block960, bestBlock);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });

    it("CPV match 6 bytes.", async () => {
      const bestBlock = new RskBlockInfo(1000, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "000003E8"));
      let block896 = new RskBlockInfo(896, "", "", true, "", null);
      let block960 = new RskBlockInfo(960, "", "", true, "", null);

      const getBlockStub = sinon.stub(rskApiService, <any>'getBlock');
      getBlockStub.withArgs(896).returns(block896);
      getBlockStub.withArgs(960).returns(block960);

      sinon.stub(rskApiService, <any>'getBestBlock').returns(bestBlock);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted(new ForkDetectionData(PREFIX + "665544332211AA" + NU + "000003ED"), bestBlock);
      let rangeExpected = new RangeForkInMainchain(block896, block960);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });

    it("CPV match 5 bytes.", async () => {
      const bestBlock = new RskBlockInfo(1000, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "000003E8"));
      let block832 = new RskBlockInfo(832, "", "", true, "", null);
      let block896 = new RskBlockInfo(896, "", "", true, "", null);

      const getBlockStub = sinon.stub(rskApiService, <any>'getBlock');
      getBlockStub.withArgs(896).returns(block896);
      getBlockStub.withArgs(832).returns(block832);

      sinon.stub(rskApiService, <any>'getBestBlock').returns(bestBlock);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted(new ForkDetectionData(PREFIX + "5544332211AABB" + NU + "000003ED"), bestBlock);
      let rangeExpected = new RangeForkInMainchain(block832, block896);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });

    it("CPV match 4 bytes.", async () => {
      const bestBlock = new RskBlockInfo(1000, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "000003E8"));
      let block832 = new RskBlockInfo(832, "", "", true, "", null);
      let block768 = new RskBlockInfo(768, "", "", true, "", null);

      const getBlockStub = sinon.stub(rskApiService, <any>'getBlock');
      getBlockStub.withArgs(768).returns(block768);
      getBlockStub.withArgs(832).returns(block832);

      sinon.stub(rskApiService, <any>'getBestBlock').returns(bestBlock);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted( new ForkDetectionData(PREFIX + "44332211AABBCC" + NU + "000003ED"), bestBlock);
      let rangeExpected = new RangeForkInMainchain(block768, block832);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });

    it("CPV match 3 bytes.", async () => {
      const bestBlock = new RskBlockInfo(1000, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "000003E8"));
      let block704 = new RskBlockInfo(704, "", "", true, "", null);
      let block768 = new RskBlockInfo(768, "", "", true, "", null);

      const getBlockStub = sinon.stub(rskApiService, <any>'getBlock');
      getBlockStub.withArgs(768).returns(block768);
      getBlockStub.withArgs(704).returns(block704);

      sinon.stub(rskApiService, <any>'getBestBlock').returns(bestBlock);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted(new ForkDetectionData(PREFIX + "332211AABBCCDD" + NU + "000003ED"), bestBlock);
      let rangeExpected = new RangeForkInMainchain(block704, block768);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });

    it("CPV match 2 bytes.", async () => {
      const bestBlock = new RskBlockInfo(1000, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "000003E8"));
      let block704 = new RskBlockInfo(704, "", "", true, "", null);
      let block640 = new RskBlockInfo(640, "", "", true, "", null);

      const getBlockStub = sinon.stub(rskApiService, <any>'getBlock');
      getBlockStub.withArgs(640).returns(block640);
      getBlockStub.withArgs(704).returns(block704);

      sinon.stub(rskApiService, <any>'getBestBlock').returns(bestBlock);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted(new ForkDetectionData(PREFIX + "2211AABBCCDDEE" + NU + "000003ED"), bestBlock);
      let rangeExpected = new RangeForkInMainchain(block640, block704);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });


    it("CPV match 1 bytes.", async () => {
      const bestBlock = new RskBlockInfo(1000, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "000003E8"));
      let block576 = new RskBlockInfo(576, "", "", true, "", null);
      let block640 = new RskBlockInfo(640, "", "", true, "", null);

      const getBlockStub = sinon.stub(rskApiService, <any>'getBlock');
      getBlockStub.withArgs(640).returns(block640);
      getBlockStub.withArgs(576).returns(block576);

      sinon.stub(rskApiService, <any>'getBestBlock').returns(bestBlock);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted( new ForkDetectionData(PREFIX + "11AABBCCDDEEFF" + NU + "000003ED"), bestBlock);
      let rangeExpected = new RangeForkInMainchain(block576, block640);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });

    it("CPV match 0 bytes.", async () => {
      const bestBlock = new RskBlockInfo(1000, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "000003E8"));
      let block576 = new RskBlockInfo(576, "", "", true, "", null);

      const getBlockStub = sinon.stub(rskApiService, <any>'getBlock');
      getBlockStub.withArgs(1).returns(blockAtHeight1);
      getBlockStub.withArgs(576).returns(block576);

      sinon.stub(rskApiService, <any>'getBestBlock').returns(bestBlock);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted(new ForkDetectionData(PREFIX + "AABBCCDDEEFF99" + NU + "000003ED"), bestBlock);
      let rangeExpected = new RangeForkInMainchain(blockAtHeight1, block576);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });
  });

  describe("Past cases (far/near it's pritty the same):", () => {
    it("CPV match 7 bytes.", async () => {
      const blockSameHeight = new RskBlockInfo(5000, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "00002710"));
      let block5056 = new RskBlockInfo(5056, "", "", true, "", null);
      let block4992 = new RskBlockInfo(4992, "", "", true, "", null);

      const getBlockStub = sinon.stub(rskApiService, <any>'getBlock');
      getBlockStub.withArgs(4992).returns(block4992);
      getBlockStub.withArgs(5056).returns(block5056);

      sinon.stub(rskApiService, <any>'getBestBlock').returns(blockSameHeight);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted(new ForkDetectionData(PREFIX + "77665544332211" + NU + "00001388"), blockSameHeight);
      let rangeExpected = new RangeForkInMainchain(block4992, blockSameHeight);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });

    it("CPV match 6 bytes.", async () => {
      const blockSameHeight = new RskBlockInfo(5000, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "00002710"));
      let block4928 = new RskBlockInfo(4928, "", "", true, "", null);
      let block4992 = new RskBlockInfo(4992, "", "", true, "", null);

      const getBlockStub = sinon.stub(rskApiService, <any>'getBlock');
      getBlockStub.withArgs(4992).returns(block4992);
      getBlockStub.withArgs(4928).returns(block4928);

      sinon.stub(rskApiService, <any>'getBestBlock').returns(blockSameHeight);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted(new ForkDetectionData(PREFIX + "665544332211AA" + NU + "00001388"), blockSameHeight);
      let rangeExpected = new RangeForkInMainchain(block4928, block4992);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });

    it("CPV match 5 bytes.", async () => {
      const blockSameHeight = new RskBlockInfo(5000, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "00002710"));
      let block4928 = new RskBlockInfo(4928, "", "", true, "", null);
      let block4864 = new RskBlockInfo(4864, "", "", true, "", null);

      const getBlockStub = sinon.stub(rskApiService, <any>'getBlock');
      getBlockStub.withArgs(4864).returns(block4864);
      getBlockStub.withArgs(4928).returns(block4928);

      sinon.stub(rskApiService, <any>'getBestBlock').returns(blockSameHeight);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted(new ForkDetectionData(PREFIX + "5544332211AABB" + NU + "00001388"), blockSameHeight);
      let rangeExpected = new RangeForkInMainchain(block4864, block4928);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });

    it("CPV match 4 bytes.", async () => {
      const blockSameHeight = new RskBlockInfo(5000, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "00002710"));
      let block4800 = new RskBlockInfo(4800, "", "", true, "", null);
      let block4864 = new RskBlockInfo(4864, "", "", true, "", null);

      const getBlockStub = sinon.stub(rskApiService, <any>'getBlock');
      getBlockStub.withArgs(4864).returns(block4864);
      getBlockStub.withArgs(4800).returns(block4800);

      sinon.stub(rskApiService, <any>'getBestBlock').returns(blockSameHeight);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted(new ForkDetectionData(PREFIX + "44332211AABBCC" + NU + "00001388"), blockSameHeight);
      let rangeExpected = new RangeForkInMainchain(block4800, block4864);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });

    it("CPV match 3 bytes.", async () => {
      const blockSameHeight = new RskBlockInfo(5000, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "00002710"));
      let block4800 = new RskBlockInfo(4800, "", "", true, "", null);
      let block4736 = new RskBlockInfo(4736, "", "", true, "", null);

      const getBlockStub = sinon.stub(rskApiService, <any>'getBlock');
      getBlockStub.withArgs(4736).returns(block4736);
      getBlockStub.withArgs(4800).returns(block4800);

      sinon.stub(rskApiService, <any>'getBestBlock').returns(blockSameHeight);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted(new ForkDetectionData(PREFIX + "332211AABBCCDD" + NU + "00001388"), blockSameHeight);
      let rangeExpected = new RangeForkInMainchain(block4736, block4800);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });

    it("CPV match 2 bytes.", async () => {
      const blockSameHeight = new RskBlockInfo(5000, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "00002710"));
      let block4736 = new RskBlockInfo(4736, "", "", true, "", null);
      let block4672 = new RskBlockInfo(4672, "", "", true, "", null);

      const getBlockStub = sinon.stub(rskApiService, <any>'getBlock');
      getBlockStub.withArgs(4736).returns(block4736);
      getBlockStub.withArgs(4672).returns(block4672);

      sinon.stub(rskApiService, <any>'getBestBlock').returns(blockSameHeight);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted(new ForkDetectionData(PREFIX + "2211AABBCCDDEE" + NU + "00001388"), blockSameHeight);
      let rangeExpected = new RangeForkInMainchain(block4672, block4736);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });

    it("CPV match 1 bytes.", async () => {
      const blockSameHeight = new RskBlockInfo(5000, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "00002710"));
      let block4608 = new RskBlockInfo(4608, "", "", true, "", null);
      let block4672 = new RskBlockInfo(4672, "", "", true, "", null);

      const getBlockStub = sinon.stub(rskApiService, <any>'getBlock');
      getBlockStub.withArgs(4608).returns(block4608);
      getBlockStub.withArgs(4672).returns(block4672);

      sinon.stub(rskApiService, <any>'getBestBlock').returns(blockSameHeight);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted(new ForkDetectionData(PREFIX + "11AABBCCDDEEFF" + NU + "00001388"), blockSameHeight);
      let rangeExpected = new RangeForkInMainchain(block4608, block4672);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });

    it("CPV match 0 bytes.", async () => {
      const blockSameHeight = new RskBlockInfo(5000, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "00002710"));
      let block4608 = new RskBlockInfo(4608, "", "", true, "", null);

      const getBlockStub = sinon.stub(rskApiService, <any>'getBlock');
      getBlockStub.withArgs(1).returns(blockAtHeight1);
      getBlockStub.withArgs(4608).returns(block4608);

      sinon.stub(rskApiService, <any>'getBestBlock').returns(blockSameHeight);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted(new ForkDetectionData(PREFIX + "AABBCCDDEEFF99" + NU + "00001388"), blockSameHeight);
      let rangeExpected = new RangeForkInMainchain(blockAtHeight1, block4608);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });
  });

  describe("Present case, cpv is near to change :", () => {
    it("CPV match 7 bytes.", async () => {
      const blockSameHeight = new RskBlockInfo(4992, "", "", true, "", new ForkDetectionData(PREFIX + "77665544332211" + NU + "00001380"));
      let block4928 = new RskBlockInfo(4928, "", "", true, "", null);

      const getBlockStub = sinon.stub(rskApiService, <any>'getBlock');
      getBlockStub.withArgs(4928).returns(block4928);

      sinon.stub(rskApiService, <any>'getBestBlock').returns(blockSameHeight);

      let rangeReturn: RangeForkInMainchain = await rskApiService.getRangeForkWhenItCouldHaveStarted(new ForkDetectionData(PREFIX + "77665544332211" + NU + "00001388"), blockSameHeight);
      let rangeExpected = new RangeForkInMainchain(block4928, blockSameHeight);

      //Validations
      expect(rangeReturn).to.deep.equal(rangeExpected);
    });
  });
});