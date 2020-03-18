import { Fork } from '../../common/forks';
import { RskApiService } from '../../services/rsk-api-service';
import { ForkInformationEmail as ForkBodyEmail, GuessMinedBlockInfo } from './common/model';
import { RskApiConfig } from '../../config/rsk-api-config';
const curl = new (require('curl-request'))();
const nodemailer = require('nodemailer');
const config = require('./config.json');
const { getLogger, configure } = require('log4js');
const INTERVAL = config.pollIntervalMs;
const MIN_LENGTH = config.minForkLength;
const logger = getLogger('fork-detector');
var equal = require('deep-equal');

configure('./log-config.json');

let lastContent: string;

start();

async function start() {
    logger.info('Starting...');

    while (true) {
        var forks: Fork[] = await getCurrentMainchain();
        // let forksFilted: Fork[] = forks.filter(f => f.items.length >= MIN_LENGTH);
        if (shouldNotify(forks)) {
            logger.info(`Forks detected, sending notifications to ${config.recipients.join(', ')}`);

            for (var i = 0; i < forks.length; i++) {
               let forkToSend =forks[i];
            //    sendAlert(forkToSend);
            }

         
            lastContent = formatForks(forks);
        } else {
            logger.info("NO Forks detected");
        }

        await sleep(INTERVAL);
    }
}

function shouldNotify(forks: Fork[]): boolean {
    var shouldNotify = forks.length > 0 &&
        lastContent != formatForks(forks) &&
        forks.some(x => x.items.length >= MIN_LENGTH)

    return shouldNotify;
}

function formatForks(forks: any): string {
    return JSON.stringify(forks, ()=> {}, 2);
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

    return `
    - Range distance where fork could have started: (${data.rangeWhereForkCouldHaveStarted.startBlock.height}, ${data.rangeWhereForkCouldHaveStarted.endBlock.height})
        - Diference between end and start: ${data.rangeWhereForkCouldHaveStarted.endBlock.height - data.rangeWhereForkCouldHaveStarted.startBlock.height}
        - Distance to last jump: ${data.distanceCPVtoPrevJump}
        
    - Fork started in: ${data.forkTime}
        - Distance first item in fork detected to the RSK best block: ${data.distanceFirstItemToBestBlock}
        - Distances to the RSK best block: ${data.chainDistance}

    - Fork length in RSK blocks (from the first block up to last block detected): ${data.forkLengthRskBlocks}

    - Number of BTC blocks found in fork: ${data.forkBTCitemsLength}
        - list of BTC blocks height: ${data.btcListHeights.join(", ")}

    - List of miners which mined BTC blocks in fork:
        ${minerListGuess}

    - Big picture of pools that mined each BTC block:
        ${data.btcGuessedMinedInfo.map(x => x.poolName).join(" | ")}

    - Fork data complete:
        ${JSON.stringify(data.fork)}
    `
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
    var statingRSKHeight = fork.getFirstDetected().rskForkInfo.forkDetectionData.BN;
    return `Fork length ${forkLength}, starting at RSK height ${statingRSKHeight}`
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
