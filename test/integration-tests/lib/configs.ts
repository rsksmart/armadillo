const curl = require('node-libcurl').Curl;
export const armadilloApiURL = "http://localhost:6000/";
export const CURL_DEFAULT_HTTP_VERSION = "	1.1";
export const timeoutTests = 5 * 60 * 1000;//5 minutes
export const apiPoolingTime = 200;
export const loadingTime = 800;

export const config = {
    "rskd": {
        "url": "localhost",
        "rpcport": 4444,
        "user": "user",
        "pass": "pass"
    },
    "bitcoind": {
        "url": "localhost",
        "rpcport": 32591,
        "user": "admin",
        "pass": "admin"
    }
}
export const host = config.rskd.url + ":" + config.rskd.rpcport;
export const context = {
    headers: [
        "Content-Type: application/json",
        `Host: ${host}`,
        "Accept: */*"
    ],
    httpversion: "	1.1"
}

export const curlHttpVersions = {
    "	1.0": curl.http.VERSION_1_0,
    "	1.1": curl.http.VERSION_1_1,
    "NONE": curl.http.VERSION_NONE
}
//This arrays must match the same from btc-api-mocker
//TODO: source both projects from the same dataset
export const mapRskMatch = {
    "3": 450,
    "4": 470,
    "5": 490,
    "9": 570,
    "13": 650,
    "17": 730,
    "28": 820,
    "29": 835,
    "32": 865,
    "43": 1168,
    "51": 1453,
    "55": 3533,
    "63": 4573,
    "67": 4973,
    "77": 5228,
    "81": 6234,
    "92": 7274,
    "95": 7304,
    "97": 7319,
    "107": 7380,
    "115": 7385,
    "118": 7415,
    "119": 7435,
    "129": 7490,
    "131": 7372,
    "133": 7374,
    "135": 7489,
    "137": 6470,
    "140": 6530
};

export const mapRskNoMatchMatchCPV = {
    "19": 770,
    "20": 780,
    "21": 785,
    "24": 800,
    "27": 815,
    "30": 845,
    "31": 855,
    "34": 875,
    "37": 890,
    "38": 897,
    "39": 898,
    "40": 1028,
    "41": 1033,
    "42": 1038,
    "44": 1298,
    "47": 1313,
    "49": 1323,
    "52": 1973,
    "53": 2493,
    "54": 3013,
    "57": 4053,
    "59": 4073,
    "61": 4093,
    "64": 4713,
    "70": 5093,
    "78": 5728,
    "84": 6744,
    "93": 7264,
    "94": 7284,
    "96": 7299,
    "100": 7304,
    "104": 7320,
    "110": 7365,
    "116": 7375,
    "124": 7425
};

export const mapRskNoMatchNoMatchCPV2B = {
    "65": 4723,
    "66": 4733,
    "73": 5102,
    "75": 5108,
    "117": 7395,
    "127": 7440
};

export const mapRskNoMatchNoMatchCPV7B = {
    "79": 5731,
    "80": 5734,
    "86": 6754,
    "90": 6774
};

export function rskBlockHeightsWithBtcBlock() {
    return {
        ...mapRskMatch,
        ...mapRskNoMatchMatchCPV,
        ...mapRskNoMatchNoMatchCPV2B,
        ...mapRskNoMatchNoMatchCPV7B
    }
}
