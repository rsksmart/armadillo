
import "mocha";
import { BtcHeaderInfo } from "../../src/common/btc-block";
import { expect } from "chai";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { RskBlock } from "../../src/common/rsk-block";
import { BranchItem, Branch, RangeForkInMainchain } from "../../src/common/branch";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0
const btcInfo = new BtcHeaderInfo(0, "");

//Before you run this test you have to run a mongo instance
describe("Branch class test", () => {
  it("Test all methods", async () => {

    let branchItem1 = new BranchItem(btcInfo, new RskBlock(1, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000001")));
    let branchItem2 = new BranchItem(btcInfo, new RskBlock(2, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000002")));
    let branchItem3 = new BranchItem(btcInfo, new RskBlock(3, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000003")));
    let branchItem4 = new BranchItem(btcInfo, new RskBlock(4, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000004")));
    let branchItem5 = new BranchItem(btcInfo, new RskBlock(5, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000005")));
    let branchItem6 = new BranchItem(btcInfo, new RskBlock(6, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000006")));
    let branchItem7 = new BranchItem(btcInfo, new RskBlock(7, "hash", "prevHash", new ForkDetectionData(PREFIX + CPV + NU + "00000007")));

    let rangeForkInMainchain = new RangeForkInMainchain(branchItem1.rskInfo, branchItem1.rskInfo);
    let branch = new Branch(rangeForkInMainchain, [branchItem3,branchItem4,branchItem5]);
    expect(branch.getCompleteBranch()).to.deep.equal([branchItem5,branchItem4,branchItem3].concat([new BranchItem(null, branchItem1.rskInfo)]));
    expect(branch.getForkItems()).to.deep.equal([branchItem5,branchItem4,branchItem3]);
    expect(branch.getLastDetected()).to.deep.equal(branchItem5);
    expect(branch.getLastDetectedHeight()).to.deep.equal(5);
    expect(branch.forkLenght()).to.deep.equal(3);
    expect(branch.getFirstDetected()).to.deep.equal(branchItem3);

    branch = new Branch(rangeForkInMainchain, [branchItem3,branchItem4,branchItem5, branchItem6, branchItem2]);
    branch.addNewForkItem(branchItem7);

    let forksItems = [branchItem7,branchItem6,branchItem5, branchItem4, branchItem3, branchItem2];
    expect(branch.getCompleteBranch()).to.deep.equal(forksItems.concat([new BranchItem(null, branchItem1.rskInfo)]));
    expect(branch.getForkItems()).to.deep.equal(forksItems);
    expect(branch.getLastDetected()).to.deep.equal(branchItem7);
    expect(branch.getLastDetectedHeight()).to.deep.equal(7);
    expect(branch.forkLenght()).to.deep.equal(6);
    expect(branch.getFirstDetected()).to.deep.equal(branchItem2);
  });
});