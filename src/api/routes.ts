import * as express from "express"
import BlockController from './controllers/branch-controller';
import { BranchService } from "../services/branch-service";
import BranchController from "./controllers/branch-controller";
import { MongoStore } from "../storage/mongo-store";

export function routersConfig(branch: MongoStore, config: any): express.Router {

        const router: express.Router = express.Router();

        const branchService: BranchService = new BranchService(branch);
        const branchController: BlockController = new BranchController(branchService);

        router.get('/branch/getAll', branchController.getAllBranches.bind(branchController));

        return router;
}