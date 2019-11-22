import * as express from "express"
import { MainchainService } from "../services/mainchain-service";
import BranchController from "./controllers/branch-controller";
import { MongoStore } from "../storage/mongo-store";
import { BlockchainController } from "./controllers/blockchain-controller";
import { MainchainController } from "./controllers/mainchain-controller";
import { BranchService } from "../services/branch-service";

export function routersConfig(branchStore: MongoStore, mainchainStore: MongoStore, config: any): express.Router {
        const router: express.Router = express.Router();
        const mainchainService: MainchainService = new MainchainService(mainchainStore);
        const branchService: BranchService = new BranchService(branchStore);
        const branchController: BranchController = new BranchController(branchService);
        const mainchainController: MainchainController = new MainchainController(mainchainService);
        const blockchainsController: BlockchainController = new BlockchainController(mainchainService, branchService);

        //Forks routers
        router.get('/forks/getLastForks/:n', branchController.getForksDetected.bind(branchController));

        //Mainchain routers
        router.get('/mainchain/getLastBlocks/:n', mainchainController.getLastBlocks.bind(mainchainController));

        //Blockchain routers
        router.get('/blockchains/:n', blockchainsController.getLastBlockchains.bind(blockchainsController));

        //For testing 
        if (true) {
                router.get('/mainchain/getAll', mainchainController.getAll.bind(mainchainController));
                router.get('/mainchain/removeLastBLocks/:n', mainchainController.removeLastBlocks.bind(mainchainController));
                router.get('/forks/removeAll', branchController.removeAll.bind(branchController));
        }

        return router;
}