import PromiseRouter from "express-promise-router"
import express from "express"
import { MainchainService } from "../services/mainchain-service";
import ForkController from "./controllers/fork-controller";
import { MongoStore } from "../storage/mongo-store";
import { BlockchainController } from "./controllers/blockchain-controller";
import { MainchainController } from "./controllers/mainchain-controller";
import { ForkService } from "../services/fork-service";

export function routersConfig(forkStore: MongoStore, mainchainStore: MongoStore, config: any): express.Router {
        const router: express.Router = PromiseRouter();
        const mainchainService: MainchainService = new MainchainService(mainchainStore);
        const forkService: ForkService = new ForkService(forkStore);
        const forkController: ForkController = new ForkController(forkService);
        const mainchainController: MainchainController = new MainchainController(mainchainService);
        const blockchainsController: BlockchainController = new BlockchainController(mainchainService, forkService);

        //Forks routers
        router.get('/forks/getLastForks/:n', blockchainsController.getLastForksInChain.bind(blockchainsController));

        //Mainchain routers
        router.get('/mainchain/getLastBlocks/:n', mainchainController.getLastBlocks.bind(mainchainController));
        router.get('/mainchain/getLastBtcBlocksBetweenHeight/:startHeight/:endHeight', mainchainController.getLastBtcBlocksBetweenHeight.bind(mainchainController));
        router.get('/mainchain/getBtcBlocksBetweenRskHeight/:startHeight/:endHeight', mainchainController.getBtcBlocksBetweenRskHeight.bind(mainchainController));

        //Blockchain routers
        router.get('/blockchains/:n', blockchainsController.getLastBlocksInChain.bind(blockchainsController));

        //For testing 
        //TODO: move this into a new routerConfigTest, also manchain and service controllers should have a testing class with the their corresponding methods
        if (false) {
                router.get('/mainchain/getAll', mainchainController.getAll.bind(mainchainController));
                router.get('/mainchain/removeLastBLocks/:n', mainchainController.removeLastBlocks.bind(mainchainController));
                router.get('/forks/removeAll', forkController.removeAll.bind(forkController));
                router.get('/forks/getAll', forkController.getAll.bind(forkController));
                router.get('/forks/getForksFrom/:n', forkController.getForksFrom.bind(forkController));
        }

        return router;
}