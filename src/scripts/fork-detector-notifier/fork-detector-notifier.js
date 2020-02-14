const curl = new (require('curl-request'))();
const nodemailer = require('nodemailer');
const config = require('./config.json');
const { getLogger, configure } = require('log4js');

const INTERVAL = config.pollIntervalMs;

configure('./log-config.json')
const logger = getLogger('fork-detector');

start();

async function start(){
    logger.info('Starting...')

    while (true) {
        var response = await getCurrentMainchain();

        if (!response.ok){
            logger.error(`Failed to check for forks. Error: ${response.error}`)
        } else {
            const forks = response.data.forks;

            if (shouldNotify(forks)) {
                logger.info(`Forks detected, sending notifications to ${config.recipients.join(', ')}`);

                await sendAlert(forks);
            }
        }

        await sleep(INTERVAL);
    }
}

function shouldNotify(forks) {
    return (forks != null && forks.length > 0) && (forks.some(x => x.length > 3));
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

async function sendAlert(forks) {
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
        text: JSON.stringify(forks, 0, 2)
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
