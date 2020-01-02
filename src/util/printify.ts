import { RskBlock } from "../common/rsk-block";
import { BtcHeaderInfo, BtcBlock } from "../common/btc-block";
import { BranchItem } from "../common/branch";

export class Printify {

    public static getPrintifyInfo(btcBlock: BtcBlock) {
        var info = {};

        if (btcBlock != null) {
            if(btcBlock.rskTag != null){
                info["rskInfo"] = { "height": btcBlock.rskTag.BN };
            }

            info["btcInfo"] = { "height": btcBlock.btcInfo.height, "hash": btcBlock.btcInfo.hash, "rskTag": btcBlock.rskTag.toString() };
        }

        return " - " + JSON.stringify(info);
    }

    public static getPrintifyInfoBranchItem(item: BranchItem) {
        var info = {};

        if (item != null) {
            info["btcInfo"] = { "height": item.btcInfo.height, "hash": item.btcInfo.hash, "rskTag": item.rskInfo.forkDetectionData.toString()};
        }

        return " - " + JSON.stringify(info);
    }
}
