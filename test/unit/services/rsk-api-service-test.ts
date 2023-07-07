import "mocha";
import { expect, assert } from "chai";

import { RskApiService } from "../../../src/services/rsk-api-service";
import { RskApiConfig } from "../../../src/config/rsk-api-config";

let rskApiConfig: RskApiConfig;
let rskApiService: RskApiService;

describe('RSK API Service', () => {

    beforeEach(async function () {
        rskApiConfig = new RskApiConfig("localhost:4444", 0);
        rskApiService = new RskApiService(rskApiConfig)
    });

    describe('getBlock', () => {

        it('should return "undefined" when an exception happens', async () => {
            // Given
            let nod3 = {
                eth: {
                    getBlock: (height) => {
                        throw 'Error';
                    }
                }
            };
            
            rskApiService.setNod3(nod3); // Set Mocks

            // When
            let result = await rskApiService.getBlock(1);
            
            // Then
            assert.equal(typeof result, 'undefined');
        });

        it('should return "RskBlockInfo object" when everything works as expected', async () => {
            // Given
            let blockNumber = 1;

            let hashMock = 'hashMock';
            let parentHashMock = 'parentHashMock';
            let minerMock = 'minerMock';
            let hashForMergedMining = 'hashForMergedMiningMock';

            let nod3 = {
                eth: {
                    getBlock: (blockNumberParam) => {
                        return {
                            number: blockNumberParam,
                            hash: hashMock,
                            parentHash: parentHashMock,
                            miner: minerMock,
                            hashForMergedMining: hashForMergedMining
                        };
                    }
                }
            };
            
            rskApiService.setNod3(nod3); // Set Mocks

            // When
            let result = await rskApiService.getBlock(blockNumber);
            console.log(result);
            
            // Then
            assert.equal(typeof result, 'object');

            expect(result.height).to.equal(blockNumber);
            expect(result.hash).to.equal(hashMock);
            expect(result.prevHash).to.equal(parentHashMock);
            expect(result.miner).to.equal(minerMock);
            // TODO: Add fork detection data checks after using a correct hash
        });

    });

});