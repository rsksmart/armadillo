import { Fork, ForkItem } from '../../common/forks';
import { RskApiService } from '../../services/rsk-api-service';
import { ForkInformationEmail as ForkBodyEmail, GuessMinedBlockInfo } from './common/model';
import { RskApiConfig } from '../../config/rsk-api-config';
import { readFileSync } from 'fs';
const curl = new (require('curl-request'))();
const nodemailer = require('nodemailer');
const config = require('./config.json');
const { getLogger, configure } = require('log4js');
const INTERVAL = config.pollIntervalMs;
const MIN_LENGTH = config.minForkLength;
const logger = getLogger('fork-detector');

configure('./log-config.json');

let lastBtcHeightLastTagFound: number[] = [];

start();

async function start() {
    logger.info('Starting...');

    while (true) {
        var forks: Fork[] = await getCurrentMainchain();
        // let forksFilted: Fork[] = forks.filter(f => f.items.length >= MIN_LENGTH);
        if (shouldNotify(forks)) {
            logger.info(`Forks detected, sending notifications to ${config.recipients.join(', ')}`);

            for (var i = 0; i < forks.length; i++) {
                let forkToSend = forks[i];
                sendAlert(forkToSend);
            }

            lastBtcHeightLastTagFound = forks.map(x => x.getHeightForLastTagFoundInBTC());
        } else {
            logger.info("NO Forks detected");
        }

        await sleep(INTERVAL);
    }
}

function shouldNotify(forks: Fork[]): boolean {
    var forkFilted = forks.filter(x => !lastBtcHeightLastTagFound.includes(x.getHeightForLastTagFoundInBTC()));
    return forkFilted.length > 0 && forkFilted.some(x => x.items.length >= MIN_LENGTH);;
}

function sleep(ms): Promise<any> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCurrentMainchain(): Promise<Fork[]> {
    var response = await curl.get(`${config.armadilloUrl}/forks/getLastForks/${config.chainDepth}`)
        .catch((e) => {
            logger.error(`Fail to check for forks: ERROR: ${e}`);
        });

    return JSON.parse(response.body).data.map(x => Fork.fromObject(x));
}

async function forkBody(fork: Fork): Promise<string> {
    let info: ForkBodyEmail = new ForkBodyEmail();
    info.forkBTCitemsLength = fork.items.length;
    info.forkTime = getWhenForkIsHappening(fork);
    info.distanceFirstItemToBestBlock = getDistanceToBestBlock(fork);
    info.cpvInfo = await getInformationCPVDidNotMatch(fork);
    info.distanceCPVtoPrevJump = await getCPVdistanceToPreviousJump(fork);
    info.bestBlockInRskInThatMoment = fork.getFirstDetected().rskForkInfo.rskBestBlockHeight;
    info.rangeWhereForkCouldHaveStarted = fork.mainchainRangeWhereForkCouldHaveStarted;
    info.chainDistance = getChainDistance(fork);
    info.btcListHeights = getBtcListHeight(fork);
    info.forkLengthRskBlocks = getForkLengthInRskBlocks(fork);
    info.btcGuessedMinedInfo = getBtcGuessMinedInfo(fork);
    info.btcGuessedMinersNames = fork.items.map(x => x.btcInfo.guessedMiner);
    info.fork = fork;
    return body(info);
}

function getBtcGuessMinedInfo(fork: Fork): GuessMinedBlockInfo[] {
    let btcInfoList: GuessMinedBlockInfo[] = [];

    let minersJustChecked: string[] = [];
    for (var i = 0; i < fork.items.length; i++) {
        let name = fork.items[i].btcInfo.guessedMiner;

        if (!minersJustChecked.some(x => x == name)) {
            let infoMiner = new GuessMinedBlockInfo();
            infoMiner.numberOfBlocksMined = fork.items.filter(x => x.btcInfo.guessedMiner == name).length;
            infoMiner.poolName = name;
            infoMiner.totalPorcentageOfBlocksMined = infoMiner.numberOfBlocksMined / fork.items.length * 100;
            btcInfoList.push(infoMiner);
            minersJustChecked.push(name);
        }
    }

    return btcInfoList;
}

function getChainDistance(fork: Fork): string {
    var chainDistance = [];

    for (var i = 0; i < fork.items.length; i++) {
        chainDistance.push(Math.abs(fork.items[i].rskForkInfo.forkDetectionData.BN - fork.items[i].rskForkInfo.rskBestBlockHeight))
    }

    return chainDistance.toString();
}

function getForkLengthInRskBlocks(fork: Fork): number {
    return Math.abs(fork.getFirstDetected().rskForkInfo.forkDetectionData.BN - fork.getLastDetected().rskForkInfo.forkDetectionData.BN);
}

function getBtcListHeight(fork: Fork): number[] {
    var btcHeightList = [];

    for (var i = 0; i < fork.items.length; i++) {
        btcHeightList.push(Math.abs(fork.items[i].btcInfo.height));
    }

    return btcHeightList;
}

function body(data: ForkBodyEmail): string {
    let minerListGuess = getGuessMinedBlocksList(data.btcGuessedMinedInfo);
    let body : string =  data.forkBTCitemsLength > 1 ? readFileSync("./templates/body/multiple-item-fork.txt").toString() : readFileSync("./templates/body/one-item-fork.txt").toString();
    body = body
            .replace('#forkTime', data.forkTime)
            .replace('#minerMinedFirstItem', data.btcGuessedMinedInfo[0].poolName.toString())
            .replace('#distanceFirstItemToBestBlock', data.distanceFirstItemToBestBlock.toString())
            .replace('#startRangeWhereForkCouldHaveStarted', data.rangeWhereForkCouldHaveStarted.startBlock.height.toString())
            .replace('#endRangeWhereForkCouldHaveStarted', data.rangeWhereForkCouldHaveStarted.endBlock.height.toString())
            .replace('#diferenceInBlocksBetweenEndAndStart',  Math.abs((data.rangeWhereForkCouldHaveStarted.startBlock.height - data.rangeWhereForkCouldHaveStarted.endBlock.height)).toString())
            .replace('#distanceCPVtoPrevJump', data.distanceCPVtoPrevJump.toString())
            .replace('#btcListHeights', data.btcListHeights.join(", "))
            .replace('#forkLengthRskBlocks', data.forkLengthRskBlocks.toString())
            .replace('#forkBTCitemsLength', data.forkBTCitemsLength.toString())
            .replace('#minerListGuess', minerListGuess)
            .replace('#btcGuessedMinedInfo', data.btcGuessedMinersNames.join(" | "))
            .replace('#completeForkData', JSON.stringify(data.fork));

    console.log(body)

    return body;
}

function getGuessMinedBlocksList(list: GuessMinedBlockInfo[]): string {
    let minerListInfo: string[] = [];

    for (var i = 0; i < list.length; i++) {
        minerListInfo.push(`${list[i].poolName} had mined ${list[i].totalPorcentageOfBlocksMined}% of total fork's blocks (# blocks: ${list[i].numberOfBlocksMined})`);
    }

    return minerListInfo.join('\n');
}

function forkTitle(fork: Fork): string {
    var forkLength = fork.items.length;
    var title : string =  forkLength > 1 ? readFileSync("./templates/title/multiple-item-fork.txt").toString() : readFileSync("./templates/title/one-item-fork.txt").toString();
    var statingRSKHeight = fork.getFirstDetected().rskForkInfo.forkDetectionData.BN;

    title = title.replace('#forkLength', forkLength.toString())
            .replace('#statingRSKHeight', statingRSKHeight.toString())
            .replace('#btcGuessMined', getBtcGuessMinedInfo(fork)[0].poolName)
            .replace('#endingRSKHeight', fork.getLastDetected().rskForkInfo.forkDetectionData.BN.toString());

    return title;
}

function getCPVdistanceToPreviousJump(fork: Fork): number {
    var realForkHeight = fork.getLastDetected().rskForkInfo.forkDetectionData.BN;
    var cpvWhereForkJump = Math.floor((fork.getLastDetected().rskForkInfo.forkDetectionData.BN - 1) / 64) * 64;
    return realForkHeight - cpvWhereForkJump;
}

async function getInformationCPVDidNotMatch(fork: Fork): Promise<any> {
    const rskApiService = new RskApiService(new RskApiConfig("https://public-node.rsk.co/1.2.1", 0));

    let heightToFind = fork.getFirstDetected().rskForkInfo.forkDetectionData.BN;

    if (fork.getFirstDetected().rskForkInfo.forkDetectionData.BN > fork.getFirstDetected().rskForkInfo.rskBestBlockHeight) {
        //Future case
        heightToFind = fork.getFirstDetected().rskForkInfo.rskBestBlockHeight;
    }

    var block = await rskApiService.getBlock(heightToFind);
    let info: any = {};
    info.bytesMatch = fork.getFirstDetected().rskForkInfo.forkDetectionData.getNumberOfOverlapInCPV(block.forkDetectionData.toString());

    //TODO: Do we need more info ?

    return info;
}

function getWhenForkIsHappening(fork: Fork): string {
    let forkTime = "PRESENT";

    if (fork.getFirstDetected().rskForkInfo.forkDetectionData.BN > fork.getFirstDetected().rskForkInfo.rskBestBlockHeight) {
        forkTime = "FUTURE";
    }

    if (fork.getFirstDetected().rskForkInfo.forkDetectionData.BN < fork.getFirstDetected().rskForkInfo.rskBestBlockHeight) {
        forkTime = "PAST";
    }

    return forkTime;
}

function getDistanceToBestBlock(fork: Fork): number {
    return Math.abs(fork.getFirstDetected().rskForkInfo.forkDetectionData.BN - fork.getFirstDetected().rskForkInfo.rskBestBlockHeight);
}

async function sendAlert(fork: Fork) {
    const options = {
        host: config.server,
        auth: {
            user: config.user,
            pass: config.pass
        }
    };

    let transport = nodemailer.createTransport(options);
    let text = await forkBody(fork);
    let info = await transport.sendMail({
        from: config.sender,
        to: config.recipients,
        subject: forkTitle(fork),
        text: text
    });

    logger.info(`Sent message: ${info.messageId}`)
}

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Shutting down...');
    process.exit(1);
})
process.on('SIGINT', () => {
    logger.info('Received SIGINT. Shutting down...');
    process.exit(1);
})
