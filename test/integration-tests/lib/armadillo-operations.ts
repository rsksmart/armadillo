import fetch from 'node-fetch';
import { Item } from '../../../src/common/forks';
import { MainchainService } from '../../../src/services/mainchain-service';
import {  } from './btc-api-mocker';
import { getSiblingFromRsk } from './rsk-operations';
import { scrumbleHash } from './utils';
import { RskApiService } from '../../../src/services/rsk-api-service';
import { BlockchainHistory } from '../../../src/api/common/models';

export class ArmadilloOperations {
    private mainchainService: MainchainService;
    private rskApiService: RskApiService;
    private armadilloApiUrl: string;
    constructor(mainchainService: MainchainService, rskApiService: RskApiService, forksApiConfig: any) {
        this.mainchainService = mainchainService;
        this.rskApiService = rskApiService;
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
        console.log('======== rskBN', rskBlockNumber);
        console.log('expected hash ', blockInfo.rskInfo.hash);
        console.log('scrumbled hash', rskHash);
        blockInfo.rskInfo.forkDetectionData.prefixHash = prefixHash;
        blockInfo.rskInfo.hash = rskHash;
        await this.mainchainService.changeBlockInMainchain(rskBlockNumber, blockInfo);
    }

    public async swapMainchainBlockWithSibling(rskBlockNumber: number): Promise<void> {
        const siblingItem: Item = await getSiblingFromRsk(rskBlockNumber, this.rskApiService);
        await this.mainchainService.changeBlockInMainchain(rskBlockNumber, siblingItem);
    }
}
