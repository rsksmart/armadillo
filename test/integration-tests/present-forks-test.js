const expect = require('chai').expect;

describe("RSK no match at same height with matching CPV", ()=>{
    it("should not create branch for BTC block matching RSK tag, end to end, end to end");
    it("should create branch for first BTC blocks with no matching RSK tag, end to end");
    it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end");
    it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end");
    it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end");
    it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end");
    it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end");
    it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, end to end");
    it("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, end to end");
    it("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, end to end");
    it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end");
    it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, end to end");
});

describe("RSK no match at same height with difference in 2 bytes in CPV", ()=>{
    describe("No matching RSK tags match CPV among each other", ()=>{
        it("should create branch for first BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end");
        it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, end to end");
        it("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, end to end");
        it("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, end to end");
        it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end");
        it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, end to end");
    });
    describe("No matching RSK tags no match CPV among each other", ()=>{
        it("should create branch for first BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end");
        it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, end to end");
        it("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, end to end");
        it("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, end to end");
        it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end");
        it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, end to end");
    });
    
});

describe("RSK no match at same height with no match CPV", ()=>{
    describe("No matching RSK tags match CPV among each other", ()=>{
        it("should create branch for first BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end");
        it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, end to end");
        it("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, end to end");
        it("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, end to end");
        it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end");
        it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, end to end");
    });
    describe("No matching RSK tags no match CPV among each other", ()=>{
        it("should create branch for first BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first 2 consecutive BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first 2 non consecutive BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first 3 consecutive BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first 3 non consecutive BTC blocks with no matching RSK tag, end to end");
        it("should create branch for first BTC block with matching RSK tag, following consecutive BTC block with no matching RSK tag, end to end");
        it("should create branch for first BTC block with matching RSK tag, following non consecutive BTC block with no matching RSK tag, end to end");
        it("should create branch for first BTC block with matching RSK tag, following 2 consecutive BTC block with no matching RSK tag, end to end");
        it("should create branch for first BTC block with matching RSK tag, following 2 non consecutive BTC block with no matching RSK tag, end to end");
        it("should create branch for first BTC block with no matching RSK tag, following consecutive BTC block with matching RSK tag, end to end");
        it("should create branch for first BTC block with no matching RSK tag, following non consecutive BTC block with matching RSK tag, end to end");
    });
});