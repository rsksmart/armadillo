import { getLogger, Logger } from "log4js";
import nodemailer from "nodemailer";
import { CerebrusConfig } from "./cerebrus";
import { ForkEmailBuilder } from "./fork-email-builder";
import { ForkInformation } from "./fork-information-builder";
import { ForkEmail } from "./model";
import { DefconLevel } from "./defcon-level";
import { Alert } from "./alert-type";


export interface AlertSender {
    sendAlert(alert: Alert): Promise<void>;
}

export class MailAlertSender implements AlertSender {
    private config: CerebrusConfig;
    private emailBuilder: ForkEmailBuilder;
    private logger: Logger;
    
    constructor(config: CerebrusConfig, emailBuilder: ForkEmailBuilder) {
        this.config = config;
        this.logger = getLogger('mail-alert-sender');
        this.emailBuilder = emailBuilder;
    }

    async sendAlert(alert: Alert): Promise<void> {
        const options = {
            host: this.config.server,
            auth: {
                user: this.config.user,
                pass: this.config.pass
            }
        };

        const subject = alert.getSubject();
        const body = alert.getBody();

        const transport = nodemailer.createTransport(options);
        const info = await transport.sendMail({
            from: this.config.sender,
            to: this.config.recipients,
            subject: alert.getSubject(),
            text: alert.getBody()
        });

        this.logger.info(`Sent message: ${info.messageId}`)
        this.logger.debug(`Subject: ${subject}`)
        this.logger.debug(`Body: ${body}`)
    }
}