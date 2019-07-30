import { BtcMonitorConfig } from "../config/btc-monitor-config";
import { BlockBTC } from "../common/block";
import { EventEmitter } from "events";

//This service emit a new block
export class BtcMonitor extends EventEmitter {

    constructor(config: BtcMonitorConfig) {
        super();
        //config hash port and host to connect btc 

    }

    public checkForNewBlock() {
        let block = new BlockBTC(1, "hash", "tag loco");

        //Here for know we should be polling to check if there is a new block
        this.emit('onBlock', block);
    }

    run() {
    }

    stop() {
    }
}
