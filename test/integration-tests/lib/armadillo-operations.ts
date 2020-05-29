import fetch from 'node-fetch';
import { Item } from '../../../src/common/forks';
import { MainchainService } from '../../../src/services/mainchain-service';
import { RskOperations } from './rsk-operations';
import { scrumbleHash } from './utils';
import { BlockchainHistory } from '../../../src/api/common/models';

export class ArmadilloOperations {
    private mainchainService: MainchainService;
    private rskOperations: RskOperations;
    private armadilloApiUrl: string;
    constructor(mainchainService: MainchainService, rskOperations: RskOperations, forksApiConfig: any) {
        this.mainchainService = mainchainService;
        this.rskOperations = rskOperations;
        this.armadilloApiUrl = `http://${forksApiConfig.host}:${forksApiConfig.port}/`;
    }

    public async getBlockchains(n: number = 2000): Promise<BlockchainHistory> {
        const response = await fetch(this.armadilloApiUrl + 'blockchains/' + n);
        const jsonResponse: any = await response.json();
        return jsonResponse.data;
    }

    public async fakeMainchainBlock(rskBlockNumber: number): Promise<void> {
        const blockInfo: Item = await this.mainchainService.getBlock(rskBlockNumber);
        const prefixHash = scrumbleHash(blockInfo.rskInfo.forkDetectionData.prefixHash);
        const rskHash = scrumbleHash(blockInfo.rskInfo.hash);
        blockInfo.rskInfo.forkDetectionData.prefixHash = prefixHash;
        blockInfo.rskInfo.hash = rskHash;
        await this.mainchainService.changeBlockInMainchain(rskBlockNumber, blockInfo);
    }

    public async swapMainchainBlockWithSibling(rskBlockNumber: number): Promise<void> {
        const siblingItem: Item = new Item(null, await this.rskOperations.getSiblingFromRsk(rskBlockNumber));
        await this.mainchainService.changeBlockInMainchain(rskBlockNumber, siblingItem);
    }
}
