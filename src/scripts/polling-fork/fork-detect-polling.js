const curl = new (require('curl-request'))();
const nodemailer = require('nodemailer');
const config = require('./config.json');

const INTERVAL = 60000;

start();

async function start(){
    while (true) {
        var data = await getCurrentMainchain();

        if (!data.ok){
            console.log(`Failed to check for forks. Error: ${data.error}`)
        } else {
            if(data.data.forks != null && data.data.forks.length > 0 ){
                if(data.data.forks.some(x => x.length > 3)){
                    console.log("New forks!!!");
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

    console.log(`Sent message: ${info.messageId}`)
}