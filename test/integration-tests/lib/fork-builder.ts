import { MonitorConfig } from "../../../src/config/monitor-config";
import { HttpBtcApi } from "../../../src/services/btc-api";
import { RskApiService } from "../../../src/services/rsk-api-service";
import { DEFAULT_CONFIG_PATH, bestRskBlock } from "./configs";
import {
  getCPVStartHeightMainchain,
  getCPVEndHeightMainchain,
} from "./validators";
import {
  RangeForkInMainchain,
  ForkItem,
  Fork,
} from "../../../src/common/forks";
import { RskForkItemInfo } from "../../../src/common/rsk-block";

let monitorConfig: MonitorConfig = MonitorConfig.getMainConfig(
  DEFAULT_CONFIG_PATH
);
let btcApiService = new HttpBtcApi(monitorConfig.btcApi);
let rskApiService = new RskApiService(monitorConfig.rskApi);

export async function buildExpectedFork(
  btcBlockHeights: number[],
  cpvDiffExpected: number
): Promise<Fork> {
  const firstDetected = await btcApiService.getBlock(btcBlockHeights[0]);
  const heightStart = getCPVStartHeightMainchain(
    firstDetected.rskTag.BN,
    cpvDiffExpected
  );
  const start = await rskApiService.getBlock(heightStart);
  if (heightStart == 1) {
    start.forkDetectionData = null;
  }

  const heightEnd = getCPVEndHeightMainchain(
    firstDetected.rskTag.BN,
    cpvDiffExpected,
    bestRskBlock
  );
  const end = await rskApiService.getBlock(heightEnd);
  const range = new RangeForkInMainchain(start, end);
  let rskForkItemInfo = new RskForkItemInfo(firstDetected.rskTag, bestRskBlock);
  firstDetected.btcInfo.guessedMiner = null;
  const firstDetectedForkItem = new ForkItem(
    firstDetected.btcInfo,
    rskForkItemInfo,
    "time out of scope"
  );
  let forkItems = [firstDetectedForkItem];
  for (let i = 1; i < btcBlockHeights.length; i++) {
    const btcBlock = await btcApiService.getBlock(btcBlockHeights[i]);
    console.log(24);
    btcBlock.btcInfo.guessedMiner = null;
    rskForkItemInfo = new RskForkItemInfo(btcBlock.rskTag, bestRskBlock);
    const btcBlockForkItem = new ForkItem(
      btcBlock.btcInfo,
      rskForkItemInfo,
      "time out of scope"
    );
    forkItems.push(btcBlockForkItem);
  }
  return new Fork(range, forkItems);
}
