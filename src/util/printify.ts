import {BtcBlock } from "../common/btc-block";
import { ForkItem, Item } from "../common/forks";

export class Printify {

    public static getPrintifyInfo(btcBlock: BtcBlock) {
        var info = {};

        if (btcBlock != null) {
            if(btcBlock.rskTag != null){
                info["rskInfo"] = { "rskTag": btcBlock.rskTag.toString(), "BN": btcBlock.rskTag.BN, "CPV": btcBlock.rskTag.CPV, "prefixHash": btcBlock.rskTag.prefixHash, "NU": btcBlock.rskTag.NU };
            }

            info["btcInfo"] = { "height": btcBlock.btcInfo.height, "hash": btcBlock.btcInfo.hash};
        }

        return " - " + JSON.stringify(info);
    }

    public static getPrintifyInfoForkItem(item: Item) {
        var info = {};

        if (item != null && item.btcInfo) {
            info["btcInfo"] = { "height": item.btcInfo.height, "hash": item.btcInfo.hash};
        }

        info["rskInfo"] = { "rskTag": item.rskInfo.forkDetectionData.toString(), "BN": item.rskInfo.forkDetectionData.BN, "CPV": item.rskInfo.forkDetectionData.CPV, "prefixHash": item.rskInfo.forkDetectionData.prefixHash, "NU": item.rskInfo.forkDetectionData.NU, "hash": item.rskInfo.hash }

        return " - " + JSON.stringify(info);
    }
}
