import { configure, getLogger } from 'log4js';
import { RskApiConfig } from '../../../config/rsk-api-config';
import { RskApiService } from '../../../services/rsk-api-service';
import { AlertSender, MailAlertSender } from './common/alert-sender';
import { ArmadilloApi, ArmadilloApiImpl } from './common/armadillo-api';
import { Cerebrus, CerebrusConfig } from './common/cerebrus';
import ForkEmailBuilderImpl, { ForkEmailBuilder } from './common/fork-email-builder';
import { ForkInformationBuilder, ForkInformationBuilderImpl } from './common/fork-information-builder';
import { DefconLevel } from './common/defcon-level';
import ArmadilloPollingService from './common/armadillo-polling-service';

const logger = getLogger('main');

async function main() {
    configure('./log-config.json');

    const cerebrusConfig: CerebrusConfig = require('./config.json');
    logger.debug('Loaded config: ', cerebrusConfig);

    const defconLevels: DefconLevel[] = loadDefconLevels();
    logger.debug('Loaded defcon levels: ', defconLevels.map(d => d.getName()));

    const rskApiService: RskApiService = new RskApiService(new RskApiConfig(cerebrusConfig.rskNodeUrl, 0));
    const armadilloApi: ArmadilloApi = new ArmadilloApiImpl(cerebrusConfig.armadilloUrl);

    const forkInformationBuilder: ForkInformationBuilder = new ForkInformationBuilderImpl(rskApiService, armadilloApi, cerebrusConfig);
    const forkEmailBuilder: ForkEmailBuilder = new ForkEmailBuilderImpl();
    const alertSender: AlertSender = new MailAlertSender(cerebrusConfig, forkEmailBuilder);

    const cerebrus: Cerebrus = new Cerebrus(cerebrusConfig, alertSender, forkInformationBuilder, defconLevels);

    const pollingService: ArmadilloPollingService = new ArmadilloPollingService(cerebrusConfig, cerebrus, armadilloApi);

    pollingService.start();
}

function loadDefconLevels() : DefconLevel[] {
    const levels: any[] = require('./defcon-levels.json');

    return levels.map(l => new DefconLevel(l.level, l.name, l.forkLengthThreshold, l.hashrateThreshold))
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
