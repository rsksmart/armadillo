import { readFileSync } from "fs";

export function scrumbleHash(hash) {
    let toReverse = hash;
    const hasPrefix = hash.indexOf("0x") !== -1;
    if (hasPrefix) {
        toReverse = hash.substring(2);
    }
    let toReverseArray = toReverse.split("");
    toReverseArray = toReverseArray.reverse();
    toReverse = toReverseArray.join("");
    if (hasPrefix) {
        return "0x" + toReverse;
    } else {
        return toReverse;
    }
}

export function filterObject(object, start, end) {
    let returnObject = {};
    let keys = Object.keys(object);
    for (let k in keys) {
        let key = parseInt(keys[k]);
        if (key >= start && key <= end) {
            returnObject[key] = object[key];
        }
    }
    return returnObject;
}

export async function mongoResponseToBlockchainsForksResponseFromArmadilloApi(forksFromDBPath) {
    let forks = JSON.parse(readFileSync(forksFromDBPath).toString());
    let forksArmadilloApi = [];
    for (let fork in forks) {
        let forkArray = forks[fork].items.reverse();
        forkArray = forkArray.concat([
            {
                "btcInfo": null,
                "rskInfo": forks[fork].mainchainRangeForkCouldHaveStarted.endBlock
            }
        ]);
        forkArray = forkArray.concat([
            {
                "btcInfo": null,
                "rskInfo": forks[fork].mainchainRangeForkCouldHaveStarted.startBlock
            }
        ]);
        forksArmadilloApi = forksArmadilloApi.concat([forkArray]);
    }
    return forksArmadilloApi;
}

export async function mongoResponseToBlockchainsFromArmadilloApi(forksFromDbPath, mainchainFromDbPath) {

    let forks = [];
    let mainchain = [];
    forks = await mongoResponseToBlockchainsForksResponseFromArmadilloApi(forksFromDbPath)
    mainchain = JSON.parse(readFileSync(mainchainFromDbPath).toString());
    
    return {
        "message": "Get mainchain and forks in the last N blocks",
        "success": true,
        "data": {
            "forks": forks,
            "mainchain": mainchain.reverse()
        }
    }
}
