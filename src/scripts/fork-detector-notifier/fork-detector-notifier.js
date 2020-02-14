const curl = new (require('curl-request'))();
const nodemailer = require('nodemailer');
const config = require('./config.json');
const { getLogger, configure } = require('log4js');

const INTERVAL = config.pollIntervalMs;
const MIN_LENGTH = config.minForkLength;

configure('./log-config.json')
const logger = getLogger('fork-detector');

let lastContent = '';

start();

async function start(){
    logger.info('Starting...')

    while (true) {
        var response = await getCurrentMainchain();

        if (!response.ok){
            logger.error(`Failed to check for forks. Error: ${response.error}`)
        } else {
            const forks = response.data.forks || [];
            const consideredForks = forks.filter(f => f.length >= MIN_LENGTH)

            if (shouldNotify(consideredForks)) {
                logger.info(`Forks detected, sending notifications to ${config.recipients.join(', ')}`);

                await sendAlert(formatForks(consideredForks));
            }
        }

        await sleep(INTERVAL);
    }
}

function shouldNotify(forks) {
    return  (forks != null && forks.length > 0) &&
            (forks.some(x => x.length > 3)) &&
            (lastContent != formatForks(forks))
}

function formatForks(forks) {
    return JSON.stringify(forks, 0, 2)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getCurrentMainchain() {
    return curl.get(`${config.armadilloUrl}/blockchains/${config.chainDepth}`)
        .then(({ body }) => {
            return { ok: true, data: JSON.parse(body).data}
        })
        .catch((e) => {
            return { ok: false, error: e }
        });
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

    lastContent = content;

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
