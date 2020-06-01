import "mocha";
import { BtcHeaderInfo } from "../../src/common/btc-block";
import { BtcWatcher } from "../../src/services/btc-watcher";
import { Fork, ForkItem, RangeForkInMainchain } from "../../src/common/forks";
import { expect } from "chai";
import { ForkDetector } from "../../src/services/fork-detector";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { stubObject } from "ts-sinon";
import sinon from "sinon";
import { RskBlockInfo, RskForkItemInfo } from "../../src/common/rsk-block";
import { RskApiService } from "../../src/services/rsk-api-service";
import { RskApiConfig } from "../../src/config/rsk-api-config";
import { numberToHex } from "../../src/util/helper";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const CPV1 = "112233d89d8bf4";
const NU = "00"; // 0
const BN = "000004c9"; // 1225
const RSKTAG_0X = "0x" + PREFIX + CPV + NU + BN;
const RSKTAG = PREFIX + CPV + NU + BN;
const RSKTAG1 = PREFIX + CPV1 + NU + BN;
let btcStub;
let rskApiConfig;
let mainchainService;
let rskService;
let forkDetector;

afterEach(function () {
  sinon.restore();
});

describe("Fork detection tag Tests", () => {
  it("well form with 0x", () => {
    const data: ForkDetectionData = new ForkDetectionData(RSKTAG_0X);

    expect(data.prefixHash).to.equal(PREFIX);
    expect(data.CPV).to.equal(CPV);
    expect(data.NU).to.equal(0);
    expect(data.BN).to.equal(1225);

  });

  it("well form", () => {
    let data: ForkDetectionData = new ForkDetectionData(RSKTAG);

    expect(data.prefixHash).to.equal(PREFIX);
    expect(data.CPV).to.equal(CPV);
    expect(data.NU).to.equal(0);
    expect(data.BN).to.equal(1225);
  });
});

describe("Overlap CPV", () => {

  beforeEach(function () {
    btcStub = stubObject<BtcWatcher>(BtcWatcher.prototype);
    rskApiConfig = new RskApiConfig("localhost:4444", 0);
    rskService = new RskApiService(rskApiConfig);
    forkDetector = new ForkDetector(null, mainchainService, btcStub, rskService, null);
  });

  it("cpv match with differents lengh", () => {
    let forkData = new ForkDetectionData(RSKTAG);

    //match with "d2", "e4", "34"
    let fdd = new ForkDetectionData(RSKTAG);
    let overlapped = forkData.overlapCPV(fdd, 1);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(fdd, 2);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(fdd, 3);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(fdd, 4);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(fdd, 5);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(fdd, 6);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(fdd, 7);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(fdd, 8);
    expect(overlapped).to.equal(false);
  });

  it("getForksThatOverlap return 1", async () => {
    const forkData = new ForkDetectionData(new ForkDetectionData(RSKTAG));
    const rskForkItem = new RskForkItemInfo(forkData, forkData.BN);
    const rskBlock = new RskBlockInfo(1, "hash", "prevHash", true, "", forkData);
    const btcInfo = stubObject<BtcHeaderInfo>(BtcHeaderInfo.prototype);

    let rangeForkInMainchain = new RangeForkInMainchain(rskBlock, rskBlock);

    sinon.stub(ForkDetector.prototype, <any>"getPossibleForks").returns([new Fork(rangeForkInMainchain, new ForkItem(btcInfo, rskForkItem, Date()))]);
    let posibleforks: Fork[] = await forkDetector.getForksThatOverlap(forkData);
    sinon.stub(rskService, <any>'getBestBlock').returns(rskBlock);

    //Validations
    expect(posibleforks.length).to.equal(1);
    expect(posibleforks[0].getFirstDetected().rskForkInfo.forkDetectionData).to.equal(forkData);
    expect(posibleforks[0].getFirstDetected().btcInfo).to.equal(btcInfo);
    expect(posibleforks[0].getLastDetected().btcInfo).to.equal(btcInfo);
    expect(posibleforks[0].getLastDetected().btcInfo).to.equal(btcInfo);
  });

  it("getForksThatOverlap return 2 elements", async () => {

    const forkData = new ForkDetectionData(RSKTAG);
    const rskBlock = new RskForkItemInfo(forkData, forkData.BN);
    const btcInfo = stubObject<BtcHeaderInfo>(BtcHeaderInfo.prototype);
    const forkData1 = new ForkDetectionData(RSKTAG1);
    const rskBlock2 = new RskForkItemInfo(forkData1, forkData.BN);
    const rskBlock1 = new RskBlockInfo(1, "hash", "prevHash", true, "", forkData);

    let rangeForkInMainchain = new RangeForkInMainchain(rskBlock1, rskBlock1);

    let list = [new Fork(rangeForkInMainchain, new ForkItem(btcInfo, rskBlock, Date())), new Fork(rangeForkInMainchain, new ForkItem(btcInfo, rskBlock2, Date()))]

    sinon.stub(ForkDetector.prototype, <any>"getPossibleForks").returns(list);
    let posibleForks: Fork[] = await forkDetector.getForksThatOverlap(forkData);
    expect(posibleForks.length).to.equal(1);
    expect(posibleForks[0].getFirstDetected().rskForkInfo.forkDetectionData).to.equal(forkData);
    expect(posibleForks[0].getLastDetected().rskForkInfo.forkDetectionData).to.equal(forkData);
  });
});

describe('Detection data equals', () => {
  it('returns true for the same instance', () => {
    const data: ForkDetectionData = new ForkDetectionData('8b3440daf197e8928c0953e0d7dd87129436269acd0ac8e711d44200000001c3');

    const result: boolean = data.equals(data);
    expect(result).to.be.true;
  });

  it('returns true for different instances', () => {
    const data: ForkDetectionData = new ForkDetectionData('8b3440daf197e8928c0953e0d7dd87129436269acd0ac8e711d44200000001c3');
    const otherData: ForkDetectionData = new ForkDetectionData('8b3440daf197e8928c0953e0d7dd87129436269acd0ac8e711d44200000001c3');

    const result: boolean = data.equals(otherData);
    expect(result).to.be.true;
  });

  it('returns false when preffix hash is not equal', () => {
    const data: ForkDetectionData = new ForkDetectionData('9b3440daf197e8928c0953e0d7dd87129436269acd0ac8e711d44200000001c3');
    const otherData: ForkDetectionData = new ForkDetectionData('8b3440daf197e8928c0953e0d7dd87129436269acd0ac8e711d44200000001c3');

    const result: boolean = data.equals(otherData);
    expect(result).to.be.false;
  });
  it('returns false when CPV is not equal', () => {
    const data: ForkDetectionData = new ForkDetectionData('8b3440daf197e8928c0953e0d7dd87129436269abd0ac8e711d44200000001c3');
    const otherData: ForkDetectionData = new ForkDetectionData('8b3440daf197e8928c0953e0d7dd87129436269acd0ac8e711d44200000001c3');

    const result: boolean = data.equals(otherData);
    expect(result).to.be.false;
  });
  it('returns false when NU is not equal', () => {
    const data: ForkDetectionData = new ForkDetectionData('8b3440daf197e8928c0953e0d7dd87129436269abd0ac8e711d44201000001c3');
    const otherData: ForkDetectionData = new ForkDetectionData('8b3440daf197e8928c0953e0d7dd87129436269abd0ac8e711d44200000001c3');

    const result: boolean = data.equals(otherData);
    expect(result).to.be.false;
  });
  it('returns false when BN is not equal', () => {
    const data: ForkDetectionData = new ForkDetectionData('8b3440daf197e8928c0953e0d7dd87129436269abd0ac8e711d44200000001c4');
    const otherData: ForkDetectionData = new ForkDetectionData('8b3440daf197e8928c0953e0d7dd87129436269abd0ac8e711d44200000001c3');

    const result: boolean = data.equals(otherData);
    expect(result).to.be.false;
  });
})


describe('getNumberOfBytesThatCPVMatch method', () => {
  describe('PRESENT', () => {
    it('match 7 bytes', () => {
      const fdd1: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU + numberToHex(1000));
      const fdd2: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU + numberToHex(1000));
      let matchBytes = fdd1.getNumberOfBytesThatCPVMatch(fdd2);

      expect(matchBytes).to.be.equals(7);
    });

    it('match 4 bytes', () => {
      const fdd1: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU + numberToHex(1000));
      const fdd2: ForkDetectionData = new ForkDetectionData(PREFIX + "00112244556677" + NU + numberToHex(1000));
      let matchBytes = fdd1.getNumberOfBytesThatCPVMatch(fdd2);

      expect(matchBytes).to.be.equals(4);
    });

    it('match 0 bytes', () => {
      const fdd1: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556611" + NU + numberToHex(1000));
      const fdd2: ForkDetectionData = new ForkDetectionData(PREFIX + "00112244556677" + NU + numberToHex(1000));
      let matchBytes = fdd1.getNumberOfBytesThatCPVMatch(fdd2);

      expect(matchBytes).to.be.equals(0);
    });
  });

  describe('FUTURE', () => {
    it('match 0 bytes', () => {
      const fdd1: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556611" + NU + numberToHex(1000));
      const fdd2: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556611" + NU + numberToHex(2024));
      let matchBytes = fdd1.getNumberOfBytesThatCPVMatch(fdd2);

      expect(matchBytes).to.be.equals(0);
    });

    it('match 0 bytes', () => {
      const fdd1: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU +numberToHex(1000));
      const fdd2: ForkDetectionData = new ForkDetectionData(PREFIX + "00000000000022" + NU + numberToHex(1400));
      let matchBytes = fdd1.getNumberOfBytesThatCPVMatch(fdd2);

      expect(matchBytes).to.be.equals(0);
    });

    it('match 1 bytes', () => {
      const fdd1: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU + numberToHex(1000));
      const fdd2: ForkDetectionData = new ForkDetectionData(PREFIX + "00000000000011" + NU + numberToHex(1345));
      let matchBytes = fdd1.getNumberOfBytesThatCPVMatch(fdd2);

      expect(matchBytes).to.be.equals(1);
    });

    it('match 5 bytes', () => {
      const fdd1: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU + numberToHex(1000));
      const fdd2: ForkDetectionData = new ForkDetectionData(PREFIX + "00001122334455" + NU + numberToHex(1089)); 
      let matchBytes = fdd1.getNumberOfBytesThatCPVMatch(fdd2);

      expect(matchBytes).to.be.equals(5);
    });

    it('match 6 bytes', () => {
      const fdd1: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU + numberToHex(1000));
      const fdd2: ForkDetectionData = new ForkDetectionData(PREFIX + "00112233445566" + NU + numberToHex(1025));
      let matchBytes = fdd1.getNumberOfBytesThatCPVMatch(fdd2);

      expect(matchBytes).to.be.equals(6);
    });

    it('match 7 bytes', () => {
      const fdd1: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU + numberToHex(1000));
      const fdd2: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU + numberToHex(1023));
      let matchBytes = fdd1.getNumberOfBytesThatCPVMatch(fdd2);

      expect(matchBytes).to.be.equals(7);
    });

    it('match 7 bytes', () => {
      const fdd1: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU + numberToHex(1000));
      const fdd2: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU + numberToHex(1001));
      let matchBytes = fdd1.getNumberOfBytesThatCPVMatch(fdd2);

      expect(matchBytes).to.be.equals(7);
    });
  });

  describe('PAST', () => {
    it('match 0 bytes', () => {
      //height different is 6 bytes but cpv is bad form for that height
      const fdd1: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU +numberToHex(1000));
      const fdd2: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU + numberToHex(632));

      let matchBytes = fdd1.getNumberOfBytesThatCPVMatch(fdd2);

      expect(matchBytes).to.be.equals(0);
    });

    it('match 0 bytes', () => {
      //height different is 7 bytes but cpv is bad form for that height.
      const fdd1: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU + numberToHex(1000));
      const fdd2: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU + numberToHex(552));
      let matchBytes = fdd1.getNumberOfBytesThatCPVMatch(fdd2);

      expect(matchBytes).to.be.equals(0);
    });

    it('match 1 bytes', () => {

      //height different is 6 bytes and cpv is well form.
      const fdd1: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU + numberToHex(1000));
      const fdd2: ForkDetectionData = new ForkDetectionData(PREFIX + "77000000000000" + NU + numberToHex(577));
      let matchBytes = fdd1.getNumberOfBytesThatCPVMatch(fdd2);

      expect(matchBytes).to.be.equals(1);
    });

    it('match 5 bytes', () => {
      //height different is 2 bytes and cpv is well form.
      const fdd1: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU + numberToHex(448));
      const fdd2: ForkDetectionData = new ForkDetectionData(PREFIX + "33445566770000" + NU + numberToHex(320));
      let matchBytes = fdd1.getNumberOfBytesThatCPVMatch(fdd2);

      expect(matchBytes).to.be.equals(5);
    });

    it('match 6 bytes', () => {
      const fdd1: ForkDetectionData = new ForkDetectionData(PREFIX + "11223344556677" + NU + numberToHex(448));
      const fdd2: ForkDetectionData = new ForkDetectionData(PREFIX + "33445566770000" + NU + numberToHex(320));
      let matchBytes = fdd1.getNumberOfBytesThatCPVMatch(fdd2);

      expect(matchBytes).to.be.equals(5);
    });
   });
})