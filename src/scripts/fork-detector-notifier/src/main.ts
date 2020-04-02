import { configure, getLogger } from 'log4js';
import { RskApiConfig } from '../../../config/rsk-api-config';
import { RskApiService } from '../../../services/rsk-api-service';
import { AlertSender, MailAlertSender } from './common/alert-sender';
import { ArmadilloApi, ArmadilloApiImpl } from './common/armadillo-api';
import { Cerebrus, CerebrusConfig } from './common/cerebrus';
import ForkEmailBuilderImpl, { ForkEmailBuilder } from './common/fork-email-builder';
import { ForkInformationBuilder, ForkInformationBuilderImpl } from './common/fork-information-builder';

const logger = getLogger('fork-detector');

async function main() {
    configure('./log-config.json');

    const cerebrusConfig: CerebrusConfig = require('./config.json');

    const rskApiService: RskApiService = new RskApiService(new RskApiConfig(cerebrusConfig.rskNodeUrl, 0));
    const armadilloApi: ArmadilloApi = new ArmadilloApiImpl(cerebrusConfig.armadilloUrl);

    const forkInformationBuilder: ForkInformationBuilder = new ForkInformationBuilderImpl(rskApiService, armadilloApi, cerebrusConfig);
    const forkEmailBuilder: ForkEmailBuilder = new ForkEmailBuilderImpl();
    const alertSender: AlertSender = new MailAlertSender(cerebrusConfig, forkEmailBuilder);

    const cerebrus: Cerebrus = new Cerebrus(cerebrusConfig, armadilloApi, alertSender, forkInformationBuilder);

    cerebrus.start();
}

main();

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM. Shutting down...');
    process.exit(1);
})

process.on('SIGINT', () => {
    logger.info('Received SIGINT. Shutting down...');
    process.exit(1);
})
