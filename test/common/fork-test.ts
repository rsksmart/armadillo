
import "mocha";
import { BtcHeaderInfo } from "../../src/common/btc-block";
import { expect } from "chai";
import { ForkDetectionData } from "../../src/common/fork-detection-data";
import { RskBlockInfo, RskForkItemInfo } from "../../src/common/rsk-block";
import { ForkItem, Fork, RangeForkInMainchain } from "../../src/common/forks";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0
const btcInfo1 = new BtcHeaderInfo(1, "", "");
const btcInfo2 = new BtcHeaderInfo(10, "", "");
const btcInfo3 = new BtcHeaderInfo(20, "", "");
const btcInfo4 = new BtcHeaderInfo(30, "", "");
const btcInfo5 = new BtcHeaderInfo(40, "", "");
const btcInfo6 = new BtcHeaderInfo(50, "", "");

//Before you run this test you have to run a mongo instance
describe("Fork class test", () => {
  it("Test all methods", async () => {
    let itemInMainnet = new RskBlockInfo(1, "", "", true, "", new ForkDetectionData(PREFIX + CPV + NU + "00000001"));
    let forkItem2 = new ForkItem(btcInfo1, new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000002"), 0));
    let forkItem3 = new ForkItem(btcInfo2, new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000003"), 0));
    let forkItem4 = new ForkItem(btcInfo3, new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000004"), 0));
    let forkItem5 = new ForkItem(btcInfo4, new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000005"), 0));
    let forkItem6 = new ForkItem(btcInfo5, new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000006"), 0));
    let forkItem7 = new ForkItem(btcInfo6, new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000007"), 0));

    let rangeForkInMainchain = new RangeForkInMainchain(itemInMainnet, itemInMainnet);
    let fork = new Fork(rangeForkInMainchain, [forkItem3,forkItem4,forkItem5]);
    expect(fork.getForkItems()).to.deep.equal([forkItem5,forkItem4,forkItem3]);
    expect(fork.getLastDetected()).to.deep.equal(forkItem5);
    expect(fork.getHeightForLastTagFoundInBTC()).to.deep.equal(30);
    expect(fork.forkLenght()).to.deep.equal(3);
    expect(fork.getFirstDetected()).to.deep.equal(forkItem3);

    fork = new Fork(rangeForkInMainchain, [forkItem3,forkItem4,forkItem5, forkItem6, forkItem2]);
    fork.addNewForkItem(forkItem7);

    let forksItems = [forkItem7,forkItem6,forkItem5, forkItem4, forkItem3, forkItem2];
    expect(fork.getForkItems()).to.deep.equal(forksItems);
    expect(fork.getLastDetected()).to.deep.equal(forkItem7);
    expect(fork.getHeightForLastTagFoundInBTC()).to.deep.equal(50);
    expect(fork.forkLenght()).to.deep.equal(6);
    expect(fork.getFirstDetected()).to.deep.equal(forkItem2);
  });
});