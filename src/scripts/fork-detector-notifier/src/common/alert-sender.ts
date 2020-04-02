import { getLogger, Logger } from "log4js";
import nodemailer from "nodemailer";
import { CerebrusConfig } from "./cerebrus";
import { ForkEmailBuilder } from "./fork-email-builder";
import { ForkInformation } from "./fork-information-builder";
import { ForkEmail } from "./model";
import { DefconLevel } from "./defcon-level";

export interface AlertSender {
    sendAlert(forkInfo: ForkInformation, defconLevel: DefconLevel): Promise<void>;
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

    async sendAlert(forkInfo: ForkInformation, defconLevel: DefconLevel): Promise<void> {
        const options = {
            host: this.config.server,
            auth: {
                user: this.config.user,
                pass: this.config.pass
            }
        };

        const email: ForkEmail = await this.emailBuilder.build(forkInfo, defconLevel);

        const transport = nodemailer.createTransport(options);
        let info = await transport.sendMail({
            from: this.config.sender,
            to: this.config.recipients,
            subject: email.subject,
            text: email.body
        });

        this.logger.info(`Sent message: ${info.messageId}`)
        this.logger.debug(`Subject: ${email.subject}`)
        this.logger.debug(`Body: ${email.body}`)
    }
}