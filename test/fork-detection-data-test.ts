import "mocha";
import { BtcHeaderInfo } from "../src/common/btc-block";
import { BtcWatcher } from "../src/services/btc-watcher";
import { Branch, BranchItem } from "../src/common/branch";
import { expect } from "chai";
import { ForkDetector } from "../src/services/fork-detector";
import { ForkDetectionData } from "../src/common/fork-detection-data";
import { stubObject } from "ts-sinon";
import sinon from "sinon";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const CPV1 = "112233d89d8bf4"; // ["11", "22", "33", "d8", "9d", "8b", "f4"]
const NU = "00"; // 0
const BN = "000004c9"; // 1225
const RSKTAG_0X = "0x" + PREFIX + CPV + NU + BN;
const RSKTAG = PREFIX + CPV + NU + BN;
const RSKTAG1 = PREFIX + CPV1 + NU + BN;

afterEach(function() {
  sinon.restore();
});

describe("For detection tag", () => {
  it("well form with 0x", () => {
    const data: ForkDetectionData = new ForkDetectionData(RSKTAG_0X);
    expect(data.prefixHash).to.equal(PREFIX);
    expect(data.CPV).to.equal(CPV);
    expect(data.NU).to.equal(parseInt("0x" + NU));
    expect(data.BN).to.equal(parseInt("0x" + BN));
  });

  it("well form", () => {
    let data: ForkDetectionData = new ForkDetectionData(RSKTAG);
    expect(data.prefixHash).to.equal(PREFIX);
    expect(data.CPV).to.equal(CPV);
    expect(data.NU).to.equal(parseInt("0x" + NU));
    expect(data.BN).to.equal(parseInt("0x" + BN));
  });
});

const cpv1 = "d89d8bf4d2e434"; // [d8, 9d, 8b, f4, d2, e4, 34]
const forkData = new ForkDetectionData(RSKTAG);

describe("Overlap CPV", () => {
  describe("both CPVs are the same to be compared", () => {
    it("should match at least 1 of the bytes in the CPV to be compared", () => {
      //match with "d2", "e4", "34"
      let overlapped = forkData.overlapCPV(cpv1, 1);
      expect(overlapped).to.equal(true);
    });
    it("should match at least 2 of the bytes in the CPV to be compared", () => {
      let overlapped = forkData.overlapCPV(cpv1, 2);
      expect(overlapped).to.equal(true);
    });
    it("should match at least 3 of the bytes in the CPV to be compared", () => {
      let overlapped = forkData.overlapCPV(cpv1, 3);
      expect(overlapped).to.equal(true);
    });
    it("should match at least 4 of the bytes in the CPV to be compared", () => {
      let overlapped = forkData.overlapCPV(cpv1, 4);
      expect(overlapped).to.equal(true);
    });
    it("should match at least 5 of the bytes in the CPV to be compared", () => {
      let overlapped = forkData.overlapCPV(cpv1, 5);
      expect(overlapped).to.equal(true);
    });
    it("should match at least 6 of the bytes in the CPV to be compared", () => {
      let overlapped = forkData.overlapCPV(cpv1, 6);
      expect(overlapped).to.equal(true);
    });
    it("should match 7 of the bytes in the CPV to be compared", () => {
      let overlapped = forkData.overlapCPV(cpv1, 7);
      expect(overlapped).to.equal(true);
    });
    it("should not match more than 7 of the bytes in the CPV to be compared", () => {
      let overlapped = forkData.overlapCPV(cpv1, 8);
      expect(overlapped).to.equal(false);
    });
  });

  // const CPV  = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
  describe("CPV matches 3 length tests", () => {
    it("should match 3 bytes in CPVs compared, CPVs matches in 3 bytes at the end", () => {
      //match with "d2", "e4", "34"
      let cpv1 = "d2e43411223344"; //["d2", "e4", "34", "11", "22", "33", "44"]
      let overlapped = forkData.overlapCPV(cpv1, 3);
      expect(overlapped).to.equal(true);
    });

    it("should match 3 bytes in CPVs compared, CPVs matches in 3 bytes at the middle", () => {
      //match with "d2", "e4", "34"
      let cpv1 = "1122d2e4343344"; //["d2", "e4", "34", "11", "22", "33", "44"]
      let overlapped = forkData.overlapCPV(cpv1, 3);
      expect(overlapped).to.equal(true);
    });

    it("should not match 3 bytes in CPVs compared, CPVs matches in 2 bytes at the end", () => {
      //match with "e4", "34"
      let cpv1 = "e4341122334455"; //["e4", "34", "11", "22", "33", "44", "55"]
      let overlapped = forkData.overlapCPV(cpv1, 3);
      expect(overlapped).to.equal(false);
    });

    it("should not match 3 bytes in CPVs compared, CPVs matches in 1 bytes at the end", () => {
      //match with "34"
      let cpv1 = "34112233445566"; //["34", "11", "22", "33", "44", "55", "66"]
      let overlapped = forkData.overlapCPV(cpv1, 3);
      expect(overlapped).to.equal(false);
    });

    it("should not match 3 bytes in CPVs compared, CPVs doesn't match in any byte", () => {
      //doesn"t match match anything
      let cpv1 = "34112233445566"; //["11", "22", "33", "44", "55", "66", "77"]
      let overlapped = forkData.overlapCPV(cpv1, 3);
      expect(overlapped).to.equal(false);
    });
  });

  //TODO: Review these tests
  describe("tests for branches overlap", () => {
    it("getBranchesThatOverlap return 1", async () => {
      const forkData = new ForkDetectionData(RSKTAG);
      const btcStub = stubObject<BtcWatcher>(BtcWatcher.prototype);
      const btcInfo = stubObject<BtcHeaderInfo>(BtcHeaderInfo.prototype);
      const forkDetector = new ForkDetector(null, btcStub, null);

      sinon
        .stub(ForkDetector.prototype, <any>"getPossibleForks")
        .returns([new Branch(new BranchItem(btcInfo, forkData))]);
      let posibleBranches: Branch[] = await forkDetector.getBranchesThatOverlap(
        forkData
      );

      //Validations
      expect(posibleBranches.length).to.equal(1);
      expect(posibleBranches[0].getStart().forkDetectionData).to.equal(
        forkData
      );
      expect(posibleBranches[0].getStart().btcInfo).to.equal(btcInfo);
      expect(posibleBranches[0].getLast().btcInfo).to.equal(btcInfo);
    });

    it("getBranchesThatOverlap return 2 elements", async () => {
      const forkData = new ForkDetectionData(RSKTAG);
      const btcStub = stubObject<BtcWatcher>(BtcWatcher.prototype);
      const btcInfo = stubObject<BtcHeaderInfo>(BtcHeaderInfo.prototype);
      const forkDetector = new ForkDetector(null, btcStub, null);
      const forkData1 = new ForkDetectionData(RSKTAG1);

      let list = [
        new Branch(new BranchItem(btcInfo, forkData)),
        new Branch(new BranchItem(btcInfo, forkData1))
      ];

      sinon.stub(ForkDetector.prototype, <any>"getPossibleForks").returns(list);
      let posibleBranches: Branch[] = await forkDetector.getBranchesThatOverlap(
        forkData
      );
      expect(posibleBranches.length).to.equal(2);
      expect(posibleBranches[0].getStart().forkDetectionData).to.equal(
        forkData
      );
      expect(posibleBranches[0].getLast().forkDetectionData).to.equal(forkData);
      expect(posibleBranches[1].getStart().forkDetectionData).to.equal(
        forkData1
      );
      expect(posibleBranches[1].getLast().forkDetectionData).to.equal(
        forkData1
      );
    });
  });
});

describe("tests for equals function of ForkDetectionData class", () => {
  it("returns true for the same instance", () => {
    const data: ForkDetectionData = new ForkDetectionData(
      "8b3440daf197e8928c0953e0d7dd87129436269acd0ac8e711d44200000001c3"
    );
    const result: boolean = data.equals(data);
    expect(result).to.be.true;
  });

  it("returns true for different instances", () => {
    const data: ForkDetectionData = new ForkDetectionData(
      "8b3440daf197e8928c0953e0d7dd87129436269acd0ac8e711d44200000001c3"
    );
    const otherData: ForkDetectionData = new ForkDetectionData(
      "8b3440daf197e8928c0953e0d7dd87129436269acd0ac8e711d44200000001c3"
    );
    const result: boolean = data.equals(otherData);
    expect(result).to.be.true;
  });

  it("returns false when preffix hash is not equal", () => {
    const data: ForkDetectionData = new ForkDetectionData(
      "9b3440daf197e8928c0953e0d7dd87129436269acd0ac8e711d44200000001c3"
    );
    const otherData: ForkDetectionData = new ForkDetectionData(
      "8b3440daf197e8928c0953e0d7dd87129436269acd0ac8e711d44200000001c3"
    );

    const result: boolean = data.equals(otherData);
    expect(result).to.be.false;
  });
  it("returns false when CPV is not equal", () => {
    const data: ForkDetectionData = new ForkDetectionData(
      "8b3440daf197e8928c0953e0d7dd87129436269abd0ac8e711d44200000001c3"
    );
    const otherData: ForkDetectionData = new ForkDetectionData(
      "8b3440daf197e8928c0953e0d7dd87129436269acd0ac8e711d44200000001c3"
    );

    const result: boolean = data.equals(otherData);
    expect(result).to.be.false;
  });
  it("returns false when NU is not equal", () => {
    const data: ForkDetectionData = new ForkDetectionData(
      "8b3440daf197e8928c0953e0d7dd87129436269abd0ac8e711d44201000001c3"
    );
    const otherData: ForkDetectionData = new ForkDetectionData(
      "8b3440daf197e8928c0953e0d7dd87129436269abd0ac8e711d44200000001c3"
    );

    const result: boolean = data.equals(otherData);
    expect(result).to.be.false;
  });
  it("returns false when BN is not equal", () => {
    const data: ForkDetectionData = new ForkDetectionData(
      "8b3440daf197e8928c0953e0d7dd87129436269abd0ac8e711d44200000001c4"
    );
    const otherData: ForkDetectionData = new ForkDetectionData(
      "8b3440daf197e8928c0953e0d7dd87129436269abd0ac8e711d44200000001c3"
    );

    const result: boolean = data.equals(otherData);
    expect(result).to.be.false;
  });
});
