import express from "express";
import * as bodyParser from "body-parser";
import  { routersConfig} from "./api/routes";
import { MongoStore } from "./storage/mongo-store";
import { ApiConfig } from "./config/api-config";
import { MessageResponse } from "./api/common/message-response";

const DEFAULT_CONFIG_PATH = "./config.json";
const apiConfig = ApiConfig.getMainConfig(DEFAULT_CONFIG_PATH);
const forks : MongoStore = new MongoStore(apiConfig.store.forks);
const mainchain : MongoStore = new MongoStore(apiConfig.store.mainchain);

forks.connect().then(function(){
    mainchain.connect().then(function(){
        starBtcApi();
    });
});

function logErrors(err, req, res, next) {
    apiConfig.logger.log.error(err);

    next(err);
}

function errorHandler(err, req, res, next) {
    res.status(500).send(new MessageResponse("Something was wrong", false));
}

function starBtcApi(){
    // Set up the express app
    const app = express();
    // Parse incoming requests data
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    //added a middleware 
    
    const routers = routersConfig(forks, mainchain, apiConfig.forkApi);
    app.use(routers);
    app.use(logErrors);
    app.use(errorHandler);

    var apiServer = app.listen(apiConfig.forkApi.PORT, () => {
        apiConfig.logger.log.debug(`API server running on port ${apiConfig.forkApi.PORT}`);
    });
  
    process.on('SIGINT', async () => {
        
        apiConfig.logger.log.debug(`Caught interrupt signal - closing API server running on port ${apiConfig.forkApi.PORT}`);
        apiServer.close();
        process.exit();
    });
}