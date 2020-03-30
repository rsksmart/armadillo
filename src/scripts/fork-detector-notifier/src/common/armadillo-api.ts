import { Fork } from "../../../../common/forks";
import { getLogger } from "log4js";
import { Logger } from "log4js";
const curl = new (require('curl-request'))();

export interface ArmadilloApi {
    getCurrentMainchain(chainDepth: number) : Promise<Fork[]>;
}

export class ArmadilloApiImpl implements ArmadilloApi {
    private armadilloApiUrl : string;
    private logger : Logger;

    constructor (armadilloApiUrl: string) {
        this.armadilloApiUrl = armadilloApiUrl;
        this.logger = getLogger('armadillo-api');
    }
    
    async getCurrentMainchain(chainDepth : number) : Promise<Fork[]> {
        var response = await curl.get(`${this.armadilloApiUrl}/forks/getLastForks/${chainDepth}`)
            .catch((e) => {
                this.logger.error(`Fail to check for forks`);
                return { body: JSON.stringify({ data: [] }) };
            });

        return JSON.parse(response.body).data.map(x => Fork.fromObject(x));
    }
}