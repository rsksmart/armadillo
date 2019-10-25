import { ForkDetectionData } from "./fork-detection-data";
import { checkTag } from "../util/helper";
import { throws } from "assert";

export class BtcBlock {
  public btcInfo: BtcHeaderInfo;
  public rskTag: ForkDetectionData;

  constructor(_height: number, _hash: string, _rskTag: string) {
    this.btcInfo = new BtcHeaderInfo(_height, _hash);

    if (_rskTag && !checkTag(_rskTag)) {
      throw new Error(
        "RSK tag bad form comming from btc at height: " +
          _height +
          " with hash: " +
          _hash
      );
    }
    if (_rskTag) {
      this.rskTag = new ForkDetectionData(_rskTag);
<<<<<<< HEAD
    }
    
    if(_rskTag){
      this.rskTag = new ForkDetectionData(_rskTag);
=======
>>>>>>> 69cf957f377e021dec1571c27e90cfbb98727c2b
    }
  }
}

export class BtcHeaderInfo {
  public height?: number;
  public hash?: string;

  constructor(_height?: number, _hash?: string) {
    this.height = _height;
    this.hash = _hash;
  }

  public static fromObject(btcInfo: any): BtcHeaderInfo {
    if (btcInfo != null) {
      return new BtcHeaderInfo(btcInfo.height, btcInfo.hash);
    } else {
      return null;
    }
  }
}
