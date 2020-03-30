import "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { stubObject } from "ts-sinon";
import { RskApiService } from "../../../../services/rsk-api-service";
import { ArmadilloApi, ArmadilloApiImpl } from "../../src/common/armadillo-api";
import { Fork, RangeForkInMainchain, ForkItem, Item } from "../../../../common/forks";
import { ForkInformationBuilder, ForkInformationBuilderImpl, ForkInformation } from "../../src/common/fork-information-builder";
import { RskBlockInfo, RskForkItemInfo } from "../../../../common/rsk-block";
import { ForkDetectionData } from "../../../../common/fork-detection-data";
import { BtcHeaderInfo } from "../../../../common/btc-block";
import { CerebrusConfig } from "../../src/common/cerebrus";
import { RskApiConfig } from "../../../../config/rsk-api-config";

const PREFIX = "9bc86e9bfe800d46b85d48f4bc7ca056d2af88a0";
const CPV = "d89d8bf4d2e434"; // ["d8", "9d", "8b", "f4", "d2", "e4", "34"]
const NU = "00"; // 0

function buildConfig(nBlocksForBtcHashrateForRskMainchain = 144) : CerebrusConfig {
    return {
        chainDepth: 74,
        recipients: [],
        pollIntervalMs: 10000,
        minForkLength: 4,
        server: '',
        user: '',
        pass: '',
        sender: '',
        armadilloUrl: '',
        rskNodeUrl: '',
        nBlocksForBtcHashrateForRskMainchain: nBlocksForBtcHashrateForRskMainchain
    }
}

function buildItemList(n) : Item[] {
    const list: Item[] = [];
    for (let i = 0; i < n; i++) {
        list.push(new Item(
            new BtcHeaderInfo(100 + i, '', ''),
            new RskBlockInfo(1000 + i, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000"))
        ));
    }
    return list;
}

describe('ForkInformationBuilder', () => {
    it("builds forkBTCitemsLength field", async () => {
        const rskApiConfig: RskApiConfig = new RskApiConfig('localhost:4444', 0);
        const rskApi: RskApiService = new RskApiService(rskApiConfig);
        var getBestBlock = sinon.stub(rskApi, <any>'getBlock');
        getBestBlock.returns(new RskBlockInfo(1000, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000")));

        // const armadilloApi: ArmadilloApi = stubObject<ArmadilloApiImpl>(ArmadilloApiImpl.prototype)
        const armadilloApi: ArmadilloApi = new ArmadilloApiImpl('localhost:6000');
        const getLastBtcBlocksBetweenHeight: any = sinon.stub(armadilloApi, 'getLastBtcBlocksBetweenHeight');
        getLastBtcBlocksBetweenHeight.returns([]);

        const infoBuilder: ForkInformationBuilder = new ForkInformationBuilderImpl(rskApi, armadilloApi, buildConfig());

        const startBlock: RskBlockInfo = new RskBlockInfo(1000, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000001"))
        const endBlock: RskBlockInfo = new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000002"))
        const range: RangeForkInMainchain = new RangeForkInMainchain(startBlock, endBlock);
        const fork: Fork = new Fork(range, [
            new ForkItem(new BtcHeaderInfo(1000, '', ''), new RskForkItemInfo(endBlock.forkDetectionData, 1110)),
            new ForkItem(new BtcHeaderInfo(1001, '', ''), new RskForkItemInfo(endBlock.forkDetectionData, 1110))
        ]);

        const forkInfo: ForkInformation = await infoBuilder.build(fork);

        expect(forkInfo.forkBTCitemsLength).to.equal(2);
    });

    it("builds btcHashrateForRskMainchain field", async () => {
        const rskApiConfig: RskApiConfig = new RskApiConfig('localhost:4444', 0);
        const rskApi: RskApiService = new RskApiService(rskApiConfig);
        var getBestBlock = sinon.stub(rskApi, <any>'getBlock');
        getBestBlock.returns(new RskBlockInfo(1000, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000000")));

        // const armadilloApi: ArmadilloApi = stubObject<ArmadilloApiImpl>(ArmadilloApiImpl.prototype)
        const armadilloApi: ArmadilloApi = new ArmadilloApiImpl('localhost:6000');
        const getLastBtcBlocksBetweenHeight: any = sinon.stub(armadilloApi, 'getLastBtcBlocksBetweenHeight');
        getLastBtcBlocksBetweenHeight.returns(buildItemList(36));

        const infoBuilder: ForkInformationBuilder = new ForkInformationBuilderImpl(rskApi, armadilloApi, buildConfig());

        const startBlock: RskBlockInfo = new RskBlockInfo(1000, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000001"))
        const endBlock: RskBlockInfo = new RskBlockInfo(1100, '', '', true, '', new ForkDetectionData(PREFIX + CPV + NU + "00000002"))
        const range: RangeForkInMainchain = new RangeForkInMainchain(startBlock, endBlock);
        const fork: Fork = new Fork(range, [
            new ForkItem(new BtcHeaderInfo(1000, '', ''), new RskForkItemInfo(endBlock.forkDetectionData, 1110)),
            new ForkItem(new BtcHeaderInfo(1001, '', ''), new RskForkItemInfo(endBlock.forkDetectionData, 1110))
        ]);

        const forkInfo: ForkInformation = await infoBuilder.build(fork);

        expect(forkInfo.nBlocksForBtcHashrateForRskMainchain).to.equal(144);
        expect(forkInfo.btcHashrateForRskMainchain).to.equal(0.25);
    });
})