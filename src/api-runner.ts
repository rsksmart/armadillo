import express from "express";
import * as bodyParser from 'body-parser';
import  { routersConfig} from './api/routes';
import { MainConfig } from './config/main-config';
import { MongoStore } from "./storage/mongo-store";

const DEFAULT_CONFIG_PATH = './config.json';
const mainConfig = MainConfig.getMainConfig(DEFAULT_CONFIG_PATH);
const branches : MongoStore = new MongoStore(mainConfig.store.branches);

branches.connect().then(function(){
        starBtcApi();
});

function starBtcApi(){
    // Set up the express app
    const app = express();
    // Parse incoming requests data
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    //added a middleware 
    
    const routers = routersConfig(branches, mainConfig.forkApi);
    app.use(routers);
    
    var apiServer = app.listen(mainConfig.forkApi.PORT, () => {
        mainConfig.logger.log.debug(`API server running on port ${mainConfig.forkApi.PORT}`);
    });

    process.on('SIGINT', async () => {
        mainConfig.logger.log.debug(`Caught interrupt signal - closing API server running on port ${mainConfig.forkApi.PORT}`);
        apiServer.close();
        process.exit();
    });
}