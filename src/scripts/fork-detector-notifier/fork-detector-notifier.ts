import { Fork } from '../../common/forks';
import { BlockchainHistory } from '../../api/common/models';
import { reporters } from 'mocha';
const curl = new (require('curl-request'))();
const nodemailer = require('nodemailer');
const config = require('./config.json');
const { getLogger, configure } = require('log4js');
const INTERVAL = config.pollIntervalMs;
const MIN_LENGTH = config.minForkLength;
const logger = getLogger('fork-detector');
configure('./log-config.json')

let lastContent: string = '';

start();

async function start() {
    logger.info('Starting...')

    while (true) {
        var blockchainHistory: BlockchainHistory = await getCurrentMainchain();
        let consideredForks: Fork[] = blockchainHistory.forks.filter(f => f.getForkItems().length >= MIN_LENGTH);

        if (shouldNotify(consideredForks)) {
            logger.info(`Forks detected, sending notifications to ${config.recipients.join(', ')}`);

            let consideredForksString: string = formatForks(consideredForks);
            await sendAlert(consideredForksString);

            lastContent = consideredForksString;
        } else {
            logger.info("NO Forks detected");
        }

        await sleep(INTERVAL);
    }
}

function shouldNotify(forks: Fork[]): boolean {

    return forks.length > 0 &&
        (forks.some(x => x.getForkItems().length >= MIN_LENGTH)) &&
        (lastContent != formatForks(forks))
}

function formatForks(forks: Fork[]): string {
    return JSON.stringify(forks, () => {}, 2);
}

function sleep(ms): Promise<any> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCurrentMainchain(): Promise<BlockchainHistory> {
    var response = await curl.get(`${config.armadilloUrl}/blockchains/${config.chainDepth}`)
        .catch((e) => {
            logger.error(`Fail to check for forks: ERROR: ${e}`);
        });

    return BlockchainHistory.fromObject(JSON.parse(response.body).data);
}

async function sendAlert(content) {
    const options = {
        host: config.server,
        auth: {
            user: config.user,
            pass: config.pass
        }
    };

    let transport = nodemailer.createTransport(options);

    let info = await transport.sendMail({
        from: config.sender,
        to: config.recipients,
        subject: '[Armadillo Notifications] Forks detected',
        text: content
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
