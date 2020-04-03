import { expect } from "chai";
import { randomBytes } from "crypto";
import 'mocha';
import sinon from 'sinon';
import { BtcHeaderInfo } from "../../../../common/btc-block";
import { ForkDetectionData } from "../../../../common/fork-detection-data";
import { Fork, ForkItem, RangeForkInMainchain } from "../../../../common/forks";
import { RskForkItemInfo } from "../../../../common/rsk-block";
import { AlertSender, MailAlertSender } from '../../src/common/alert-sender';
import { Cerebrus, CerebrusConfig } from '../../src/common/cerebrus';
import { DefconLevel } from "../../src/common/defcon-level";
import { ForkInformation, ForkInformationBuilder, ForkInformationBuilderImpl } from '../../src/common/fork-information-builder';

function buildConfig() : CerebrusConfig {
    return {
        chainDepth: 74,
        recipients: [],
        pollIntervalMs: 10000,
        minForkLength: 2,
        server: '',
        user: '',
        pass: '',
        sender: '',
        armadilloUrl: '',
        rskNodeUrl: '',
        nBlocksForBtcHashrateForRskMainchain: 144
    }
}

function buildDefconLevels() : DefconLevel[] {
    return [
        new DefconLevel(1, 'low', 1, 0.0),
        new DefconLevel(2, 'high', 100, 0.5)
    ]
}

function randInt(max) {
    return Math.trunc(Math.random() * max);
}

function createForkWithItems(nItems: number) : Fork[] {
    let items: ForkItem[] = [];

    for (let i = 0; i < nItems; i++) {
        items.push(
            new ForkItem(
                new BtcHeaderInfo(randInt(10000), '', ''), 
                new RskForkItemInfo(new ForkDetectionData(randomBytes(32).toString('hex')), randInt(10000)))
        )
    }

    return [
        new Fork(
            sinon.createStubInstance(RangeForkInMainchain),
            items
        )
    ]
}

function buildForkInfo(params) : ForkInformation {
    return Object.assign({
        btcGuessedMinersNames: [''],
        forkBTCitemsLength: 1,
        forkTime: '',
        distanceFirstItemToBestBlock: 1,
        cpvInfo: '',
        distanceCPVtoPrevJump: 1,
        bestBlockInRskInThatMoment: 1,
        rangeWhereForkCouldHaveStarted: null,
        chainDistance: 1,
        btcListHeights: [1],
        forkLengthRskBlocks: 1,
        btcGuessedMinedInfo: [],
        minerListGuess: '',
        fork: sinon.createStubInstance(Fork),
        nBlocksForBtcHashrateForRskMainchain: 1,
        btcHashrateForRskMainchain: 1,
        btcHashrateForRskMainchainDuringFork: 1,
        endingRskHeight: 1,
        btcForkBlockPercentageOverMergeMiningBlocks: 0
    }, params);
}

describe("Cerebrus", async () => {
    it('ignores an empty fork array', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);

        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, buildDefconLevels());

        cerebrus.processForks([]);

        expect(alertSender.sendAlert.called).to.be.false;
    })

    it('ignores forks with less than the minimum item count', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);

        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, buildDefconLevels());

        const forks: Fork[] = createForkWithItems(1);

        await cerebrus.processForks(forks);

        expect(alertSender.sendAlert.called).to.be.false;
    })

    it('sends alert for forks with the configured item count', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);

        forkInfoBuilder.build.returns(Promise.resolve(buildForkInfo({
            forkLengthRskBlocks: 10000,
            btcForkBlockPercentageOverMergeMiningBlocks: 1
        })));

        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, buildDefconLevels());

        const forks: Fork[] = createForkWithItems(2);

        await cerebrus.processForks(forks);

        expect(alertSender.sendAlert.calledOnce).to.be.true;
    })

    it('does not send alert for a same fork twice', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);

        forkInfoBuilder.build.returns(Promise.resolve(buildForkInfo({
            forkLengthRskBlocks: 10000,
            btcForkBlockPercentageOverMergeMiningBlocks: 1
        })));

        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, buildDefconLevels());

        const forks: Fork[] = createForkWithItems(2);

        await cerebrus.processForks(forks);
        await cerebrus.processForks(forks);

        expect(alertSender.sendAlert.calledOnce).to.be.true;
        expect(alertSender.sendAlert.calledTwice).to.be.false;
    })

    it('sends alert for a fork and the base defconlevel (both parameters below higher levels thresholds)', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);

        const forkInfo = buildForkInfo({
            forkLengthRskBlocks: 15,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.8
        });
        forkInfoBuilder.build.returns(Promise.resolve(forkInfo));

        const defconLevels: DefconLevel[] = buildDefconLevels();
        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, defconLevels);

        const forks: Fork[] = createForkWithItems(2);

        await cerebrus.processForks(forks);

        const expectedDefconLevel: DefconLevel = defconLevels.find(d => d.getName() === 'low');

        expect(alertSender.sendAlert.calledOnce).to.be.true;
        expect(alertSender.sendAlert.calledWith(forkInfo, expectedDefconLevel)).to.be.true;
    })

    it('sends alert for a fork and a higher defconlevel (both parameters above higher levels thresholds)', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);

        const forkInfo = buildForkInfo({
            forkLengthRskBlocks: 150,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.8
        });
        forkInfoBuilder.build.returns(Promise.resolve(forkInfo));

        const defconLevels: DefconLevel[] = buildDefconLevels();
        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, defconLevels);

        const forks: Fork[] = createForkWithItems(2);

        await cerebrus.processForks(forks);

        const expectedDefconLevel: DefconLevel = defconLevels.find(d => d.getName() === 'high');

        expect(alertSender.sendAlert.calledOnce).to.be.true;
        expect(alertSender.sendAlert.calledWith(forkInfo, expectedDefconLevel)).to.be.true;
    })

    it('sends alert for a fork and the base defconlevel (only one parameter above higher levels thresholds)', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);

        const forkInfo = buildForkInfo({
            forkLengthRskBlocks: 1000000,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.4
        });
        forkInfoBuilder.build.returns(Promise.resolve(forkInfo));

        const defconLevels: DefconLevel[] = buildDefconLevels();
        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, defconLevels);

        const forks: Fork[] = createForkWithItems(2);

        await cerebrus.processForks(forks);

        const expectedDefconLevel: DefconLevel = defconLevels.find(d => d.getName() === 'low');

        expect(alertSender.sendAlert.calledOnce).to.be.true;
        expect(alertSender.sendAlert.calledWith(forkInfo, expectedDefconLevel)).to.be.true;
    })

    it('sends alert for a fork and a medium defcon level', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);

        const forkInfo = buildForkInfo({
            forkLengthRskBlocks: 75,
            btcForkBlockPercentageOverMergeMiningBlocks: 0.6
        });
        forkInfoBuilder.build.returns(Promise.resolve(forkInfo));

        const defconLevels: DefconLevel[] = [
            new DefconLevel(1, 'low', 1, 0.0),
            new DefconLevel(2, 'med', 50, 0.5),
            new DefconLevel(3, 'high', 100, 0.5)
        ];
        const cerebrus: Cerebrus = new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, defconLevels);

        const forks: Fork[] = createForkWithItems(2);

        await cerebrus.processForks(forks);

        const expectedDefconLevel: DefconLevel = defconLevels.find(d => d.getName() === 'med');

        expect(alertSender.sendAlert.calledOnce).to.be.true;
        expect(alertSender.sendAlert.calledWith(forkInfo, expectedDefconLevel)).to.be.true;
    })

    it('constructor fails due to null defcon levels array', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);
        
        expect(() => {
            new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, null);
        }).to.throw('No Defcon levels provided');
    })

    it('constructor fails due to empty defcon levels array', async () => {
        const alertSender: sinon.SinonStubbedInstance<AlertSender> = sinon.createStubInstance(MailAlertSender);
        const forkInfoBuilder: sinon.SinonStubbedInstance<ForkInformationBuilder> = sinon.createStubInstance(ForkInformationBuilderImpl);
        
        expect(() => {
            new Cerebrus(buildConfig(), alertSender, forkInfoBuilder, []);
        }).to.throw('No Defcon levels provided');
    })
})