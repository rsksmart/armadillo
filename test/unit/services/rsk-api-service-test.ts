import "mocha";
import { expect, assert } from "chai";
import sinon from "sinon";

import { Nod3 } from 'nod3';
import { RskApiService } from "../../../src/services/rsk-api-service";
import { RskApiConfig } from "../../../src/config/rsk-api-config";
import { error } from "console";

let rskApiConfig: RskApiConfig;
let rskApiService: RskApiService;

describe('RSK API Service', function() {
    
    beforeEach(async function () {
        rskApiConfig = new RskApiConfig("localhost:4444", 0);
        rskApiService = new RskApiService(rskApiConfig);
    });

    describe('getBlock', function() {
        it('should return "undefined" when an exception happens', function() {
            // Given
            let blockHeight = 1;

            let nod3 = new Nod3(
                new Nod3.providers.HttpProvider(this.config.completeUrl)
            );
            let ethStub = sinon.stub(nod3, <any>'eth');
            let ethGetBlockStub = sinon.stub(ethStub, <any>'getBlock');
            ethGetBlockStub.withArgs(blockHeight).throws(error);

            rskApiService.setNod3(nod3); // Set Mocks

            // When

            let result = rskApiService.getBlock(blockHeight);
            
            // Then
            assert.equal(typeof result, 'undefined');
            // expect(1).to.equal(1);
        })
    })
})