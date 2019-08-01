import "mocha";
import { BtcHeaderInfo } from "../src/common/btc-block";
import { BtcMonitor } from "../src/services/btc-monitor";
import { Branch, BranchItem } from "../src/common/branch";
import { expect } from "chai";
import { ForkDetector } from "../src/services/fork-detector";
import { ForkDetectionData } from "../src/common/fork-detection-data";
import { stubObject } from "ts-sinon";
import sinon from "sinon";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const CPV1 = "112233d89d8bf4";
const NU = "00"; // 0
const BN = "000004c9"; // 1225
const RSKTAG_0X = "0x" + PREFIX + CPV + NU + BN;
const RSKTAG = PREFIX + CPV + NU + BN;
const RSKTAG1 = PREFIX + CPV1 + NU + BN;

describe("For detection tag", () => {
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

  it("cpv match with differents lengh", () => {

    let forkData = new ForkDetectionData(RSKTAG);

    //match with "d2", "e4", "34"
    let cpv1 = "d89d8bf4d2e434";
    let overlapped = forkData.overlapCPV(cpv1, 1);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(cpv1, 2);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(cpv1, 3);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(cpv1, 4);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(cpv1, 5);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(cpv1, 6);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(cpv1, 7);
    expect(overlapped).to.equal(true);

    overlapped = forkData.overlapCPV(cpv1, 8);
    expect(overlapped).to.equal(false);
  });

  it("cpv match 3 lengh", () => {

    let forkData = new ForkDetectionData(RSKTAG);

    //match with "d2", "e4", "34"
    let cpv1 = "d2e43411223344"; //["d2", "e4", "34", "11", "22", "33", "44"]
    let overlapped = forkData.overlapCPV(cpv1, 3);
    expect(overlapped).to.equal(true);

    //match with "e4", "34"
    cpv1 = "e4341122334455"; //["e4", "34", "11", "22", "33", "44", "55"]
    overlapped = forkData.overlapCPV(cpv1, 3);
    expect(overlapped).to.equal(false);

    //match with "34"
    cpv1 = "34112233445566"; //["34", "11", "22", "33", "44", "55", "66"]
    overlapped = forkData.overlapCPV(cpv1, 3);
    expect(overlapped).to.equal(false);

    //doesn"t match match anything
    cpv1 = "34112233445566"; //["11", "22", "33", "44", "55", "66", "77"]
    overlapped = forkData.overlapCPV(cpv1, 3);
    expect(overlapped).to.equal(false);
  });

  it("getBranchesThatOverlap return 1", async () => {
    const forkData = new ForkDetectionData(RSKTAG);
    const btcStub = stubObject<BtcMonitor>(BtcMonitor.prototype);
    const btcInfo = stubObject<BtcHeaderInfo>(BtcHeaderInfo.prototype);
    const forkDetector = new ForkDetector(null, btcStub, null);

    sinon.stub(ForkDetector.prototype, <any>"getPossibleForks").returns([new Branch(new BranchItem(btcInfo, forkData))]);
    let posibleBranches: Branch[] = await forkDetector.getBranchesThatOverlap(forkData);

    //Validations
    expect(posibleBranches.length).to.equal(1);
    expect(posibleBranches[0].getStart().forkDetectionData).to.equal(forkData);
    expect(posibleBranches[0].getStart().btcInfo).to.equal(btcInfo);
    expect(posibleBranches[0].getLast().btcInfo).to.equal(btcInfo);
    expect(posibleBranches[0].getLast().btcInfo).to.equal(btcInfo);
  });

  it.only("getBranchesThatOverlap return 2", async () => {

    const forkData = new ForkDetectionData(RSKTAG);
    const btcStub = stubObject<BtcMonitor>(BtcMonitor.prototype);
    const btcInfo = stubObject<BtcHeaderInfo>(BtcHeaderInfo.prototype);
    const forkDetector = new ForkDetector(null, btcStub, null);
    const forkData1 = new ForkDetectionData(RSKTAG1);

    let list = [new Branch(new BranchItem(btcInfo, forkData)), new Branch(new BranchItem(btcInfo, forkData1))]

    sinon.stub(ForkDetector.prototype, <any>"getPossibleForks").returns(list);
    let posibleBranches: Branch[] = await forkDetector.getBranchesThatOverlap(forkData);
    expect(posibleBranches.length).to.equal(2);
    expect(posibleBranches[0].getStart().forkDetectionData).to.equal(forkData);
    expect(posibleBranches[0].getLast().forkDetectionData).to.equal(forkData);
    expect(posibleBranches[1].getStart().forkDetectionData).to.equal(forkData1);
    expect(posibleBranches[1].getLast().forkDetectionData).to.equal(forkData1);
  });
});