import { expect } from "chai";
import "mocha";
import { BtcHeaderInfo } from "../../../../common/btc-block";
import { ForkDetectionData } from "../../../../common/fork-detection-data";
import { Fork, ForkItem } from "../../../../common/forks";
import { RskForkItemInfo } from "../../../../common/rsk-block";
import { DefconLevel } from "../../src/common/defcon-level";
import { ForkInformation } from "../../src/common/fork-information-builder";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0

function buildInfo(params : any) : ForkInformation {
    return Object.assign({
        btcGuessedMinersNames: [''],
        forkBTCitemsLength: 1,
        forkTime: '',
        distanceFromLastDetectedToBestBlock: 1,
        cpvInfo: '',
        distanceCPVtoPrevJump: 1,
        bestBlockInRskInThatMoment: 1,
        rangeWhereForkCouldHaveStarted: null,
        chainDistance: 1,
        btcListHeights: [1],
        forkLengthRskBlocks: 1,
        btcGuessedMinedInfo: [],
        minerListGuess: '',
        fork: new Fork(null, [
            new ForkItem(
                new BtcHeaderInfo(1, '', ''),
                new RskForkItemInfo(new ForkDetectionData(PREFIX + CPV + NU + "00000001"), 2),
                Date()
            )
        ]),
        nBlocksForBtcHashrateForRskMainchain: 1,
        btcHashrateForRskMainchain: 1,
        btcHashrateForRskMainchainDuringFork: 1,
        endingRskHeight: 1,
        btcForkBlockPercentageOverMergeMiningBlocks: 0,
        estimatedTimeFor4000Blocks: new Date()
    }, params);
}

describe("DefconLevel", () => {
    it("Active for ForkInformation (distance and fork hashrate over threshold)", async () => {
        const level: DefconLevel = new DefconLevel(1, 'URGENT', 500, 0.5, 10000000, 1, []);
        
        const forkInformation: ForkInformation = buildInfo({
            forkLengthRskBlocks: 550,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.51
        });

        expect(level.activeFor(forkInformation)).to.be.true;
    })

    it("Active for ForkInformation (distance and fork hashrate equal to threshold)", async () => {
        const level: DefconLevel = new DefconLevel(1, 'URGENT', 500, 0.5, 10000000, 1, []);
        
        const forkInformation: ForkInformation = buildInfo({
            forkLengthRskBlocks: 550,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.5
        });

        expect(level.activeFor(forkInformation)).to.be.true;
    })

    it("Inactive for ForkInformation (distance over threshold but fork hashrate not)", async () => {
        const level: DefconLevel = new DefconLevel(1, 'URGENT', 500, 0.5, 10000000, 1, []);
        
        const forkInformation: ForkInformation = buildInfo({
            forkLengthRskBlocks: 500,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.4
        });

        expect(level.activeFor(forkInformation)).to.be.false;
    })

    it("Inactive for ForkInformation (fork hashrate over threshold but distance not)", async () => {
        const level: DefconLevel = new DefconLevel(1, 'URGENT', 500, 0.5,  10000000, 1, []);
        
        const forkInformation: ForkInformation = buildInfo({
            forkLengthRskBlocks: 490,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.6
        });

        expect(level.activeFor(forkInformation)).to.be.false;
    })

    it("Inactive for ForkInformation (both distance and fork hashrate below thresholds)", async () => {
        const level: DefconLevel = new DefconLevel(1, 'URGENT', 500, 0.5, 10000000, 1, []);
        
        const forkInformation: ForkInformation = buildInfo({
            forkLengthRskBlocks: 490,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.45
        });

        expect(level.activeFor(forkInformation)).to.be.false;
    })

    it("Inactive for ForkInformation (distance to best block above threshold)", async () => {
        const level: DefconLevel = new DefconLevel(1, 'URGENT', 500, 0.51, 6000, 1, []);
        
        const forkInformation: ForkInformation = buildInfo({
            forkLengthRskBlocks: 500,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.51,
            bestBlockInRskInThatMoment: 100000,
            endingRskHeight: 2000
        });

        expect(level.activeFor(forkInformation)).to.be.false;
    })

    it("Active for ForkInformation (distance to best block below threshold)", async () => {
        const level: DefconLevel = new DefconLevel(1, 'URGENT', 500, 0.51, 6000, 1, []);
        
        const forkInformation: ForkInformation = buildInfo({
            forkLengthRskBlocks: 500,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.51,
            bestBlockInRskInThatMoment: 10000,
            endingRskHeight: 9000
        });

        expect(level.activeFor(forkInformation)).to.be.true;
    })

    it("Active for ForkInformation (fork item count above threshold", async () => {
        const level: DefconLevel = new DefconLevel(1, 'Urgent', 500, 0.51, 6000, 2, []);

        const forkInformation: ForkInformation = buildInfo({
            forkLengthRskBlocks: 500,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.51,
            bestBlockInRskInThatMoment: 10000,
            endingRskHeight: 9000,
            forkBTCitemsLength: 2
        });

        expect(level.activeFor(forkInformation)).to.be.true;
    })

    it("Active for ForkInformation (fork item count above threshold", async () => {
        const level: DefconLevel = new DefconLevel(1, 'Urgent', 500, 0.51, 6000, 3, []);

        const forkInformation: ForkInformation = buildInfo({
            forkLengthRskBlocks: 500,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.51,
            bestBlockInRskInThatMoment: 10000,
            endingRskHeight: 9000,
            forkBTCitemsLength: 2
        });

        expect(level.activeFor(forkInformation)).to.be.false;
    })
})