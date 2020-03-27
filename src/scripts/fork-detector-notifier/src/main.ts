import { RskApiService } from '../../../services/rsk-api-service';
import { RskApiConfig } from '../../../config/rsk-api-config';
import { CerebrusConfig, Cerebrus } from './common/cerebrus';
import { ArmadilloApi, ArmadilloApiImpl } from './common/armadillo-api';
import { AlertSender, MailAlertSender } from './common/alert-sender';
import { getLogger, configure } from 'log4js';

const logger = getLogger('fork-detector');

async function main() {
    configure('./log-config.json');

    const cerebrusConfig: CerebrusConfig = require('./config.json');

    const rskApiService: RskApiService = new RskApiService(new RskApiConfig(cerebrusConfig.rskNodeUrl, 0));
    const armadilloApi: ArmadilloApi = new ArmadilloApiImpl(cerebrusConfig.armadilloUrl);
    const alertSender: AlertSender = new MailAlertSender(cerebrusConfig, rskApiService);
    const cerebrus: Cerebrus = new Cerebrus(cerebrusConfig, armadilloApi, alertSender);

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
