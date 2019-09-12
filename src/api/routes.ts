import * as express from "express"
import BlockController from './controllers/branch-controller';
import { MainchainService } from "../services/mainchain-service";
import BranchController from "./controllers/branch-controller";
import { MongoStore } from "../storage/mongo-store";

export function routersConfig(branch: MongoStore, config: any): express.Router {
        const router: express.Router = express.Router();
        const branchService: MainchainService = new MainchainService(branch);
        const branchController: BlockController = new BranchController(branchService);

        router.get('/branch/getAll', branchController.getLastBlocksMainchain.bind(branchController));
        router.get('/branch/getMainchain/:n', branchController.getLastBlocksMainchain.bind(branchController));

        return router;
}