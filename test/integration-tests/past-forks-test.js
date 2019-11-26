const expect = require('chai').expect;
const utils = require('./lib/utils');
const mongo_utils = require('./lib/mongo-utils');
const rskBlockHeightsWithBtcBlock = utils.rskBlockHeightsWithBtcBlock();
const firstBtcBlock = 8704;
const heightOfConsecutiveRSKnoMatchPastSameBranch = firstBtcBlock;
const heightOfNonConsecutiveRSKnoMatchPastSameBranch = firstBtcBlock;
const heightOfConsecutiveRSKnoMatchPastDiffBranch = firstBtcBlock;
const heightOfNonConsecutiveRSKnoMatchPastDiffBranch = firstBtcBlock;
const heightOfConsecutiveRSKnoMatchPastFollowingMatch = firstBtcBlock;
const heightOfNonConsecutiveRSKnoMatchPastFollowingMatch = firstBtcBlock;

describe("RSK no match at same height with matching CPV, RSK height in the past regarding BTC chain", () => {
    it.skip("should detect a past fork with the first RSK tag in BTC that height is lesser than "
    +"previous RSK tag found", async () => {

    });
    it.skip("should detect a past fork with the first RSK tag in BTC that height is lesser than "
    +"previous RSK tag found and there is a not match of same branch in the following consecutive BTC block", async () => {

    });
    it.skip("should detect a past fork with the first RSK tag in BTC that height is lesser than "
    +"previous RSK tag found and there is a not match of same branch in the following non consecutive BTC block", async () => {

    });
    it.skip("should detect a past fork with the first RSK tag in BTC that height is lesser than "
    +"previous RSK tag found and there is a not match of different branch in the following consecutive BTC block", async () => {


    });
    it.skip("should detect a past fork with the first RSK tag in BTC that height is lesser than "
    +"previous RSK tag found and there is a not match of different branch in the following non consecutive BTC block", async () => {


    });
    it.skip("should detect a past fork with the first RSK tag in BTC that height is lesser than "
    +"previous RSK tag found and there is a RSK tag match in the following consecutive BTC block", async () => {


    });
    it.skip("should detect a past fork with the first RSK tag in BTC that height is lesser than "
    +"previous RSK tag found and there is a RSK tag match in the following non consecutive BTC block", async () => {


    });
});