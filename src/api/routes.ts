import * as express from "express"
import BlockController from './controllers/branch-controller';
import { MainchainService } from "../services/mainchain-service";
import BranchController from "./controllers/branch-controller";
import { MongoStore } from "../storage/mongo-store";
import MainchainController from "./controllers/mainchain-controller";
import { BranchService } from "../services/branch-service";

export function routersConfig(branchStore: MongoStore, mainchainStore: MongoStore, config: any): express.Router {
        const router: express.Router = express.Router();
        const mainchainService: MainchainService = new MainchainService(mainchainStore);
        const branchService: BranchService = new BranchService(branchStore);
        const branchController: BlockController = new BranchController(branchService);
        const mainchainController: MainchainController = new MainchainController(mainchainService);

        // router.get('/branch/getLastBrac', branchController.bind(branchController));
        router.get('/mainchain/getLastBlocks/:n', mainchainController.getLastBlocksMainchain.bind(mainchainController));

        return router;
}