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
        var data = await getCurrentMainchain();

        if (!data.ok){
            logger.error(`Failed to check for forks. Error: ${data.error}`)
        } else {
            if(data.data.forks != null && data.data.forks.length > 0 ){
                if(data.data.forks.some(x => x.length > 3)){
                    logger.info("New forks!!!");
                    await sendAlert(data.data);
                }
            }
        }

        await sleep(INTERVAL);
    }
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

async function sendAlert(data) {
    const options = {
        host: config.server,
        auth: {
            user: config.user,
            pass: config.pass
        }
    };

    let transport = nodemailer.createTransport(options);

    let info = await transport.sendMail({
        from: 'armadillo@monitor.io',
        to: config.recipients,
        subject: '[Armadillo Notifications] Forks detected',
        text: JSON.stringify(data.forks)
    });

    logger.info(`Sent message: ${info.messageId}`)
}
