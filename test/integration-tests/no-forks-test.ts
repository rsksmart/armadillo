// import { mockBtcApiChangeRoute, setHeightInMockBTCApi, getNextBlockInMockBTCApi } from "./lib/btc-api-mocker";
// import { deleteDB, armadilloDB, findBlocks, armadilloMainchain, insertDocuments } from "./lib/mongo-utils";
// import { sleep } from "../../src/util/helper";
// import { apiPoolingTime, loadingTime } from "./lib/configs";
// import { validateMainchain, validateMainchainRskMongoDB } from "./lib/validators";
// import { setBlockAsLastChecked, getMainchainBlocks, fakeMainchainBlock, swapMainchainBlockWithSibling } from "./lib/armadillo-operations";

// const fs = require('fs');
// const expect = require('chai').expect;
// const firstBtcBlock = 8704;
// const heightOfNoRskTags = firstBtcBlock + 0;
// const heightOfConsecutiveRskTags = firstBtcBlock + 3;
// const rskheightOfConsecutiveRskTags = 470;
// const heightOfDistancedRskTags = firstBtcBlock + 5;
// const heightForSiblingRskTag = firstBtcBlock + 137;
// const rskHeightWithSibling = 6480;
// const dataInputPath = "test/integration-tests/data/";
// const consecutive2RskBlocks = "testInput_consecutive2RSKtags.json";
// const consecutive3RskBlocks = "testInput_consecutive3RSKtags.json";
// const jump3BtcBlocksToRskBlocks = "testInput_RskJumpOf3btcBlocks.json";
// describe("RSK no forks tests", () => {
//     it("should not generate any mainchain if BTC doesn't present RSK tags, end to end", async () => {
//         await mockBtcApiChangeRoute("raw");
//         await setHeightInMockBTCApi(heightOfNoRskTags);
//         await deleteDB(armadilloDB);
//         //Validate no response in monitor for mainchain
//         //Wait until the monitor can read the new block (pooling every 5s)
//         await sleep(apiPoolingTime);
//         await getNextBlockInMockBTCApi();
//         //Wait until the monitor can read the new block (pooling every 5s)
//         await sleep(apiPoolingTime + loadingTime);
//         await setHeightInMockBTCApi(heightOfNoRskTags);
//         //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
//         await validateMainchain(1000, 0);

//     });
//     it("should not generate any mainchain if BTC doesn't present RSK tags, mongo input validation", async () => {
//         await mockBtcApiChangeRoute("raw");
//         await setHeightInMockBTCApi(heightOfNoRskTags);
//         await deleteDB(armadilloDB);
//         //Validate no response in monitor for mainchain
//         //Wait until the monitor can read the new block (pooling every 5s)
//         await getNextBlockInMockBTCApi();
//         //Wait until the monitor can read the new block (pooling every 5s)
//         await sleep(apiPoolingTime + loadingTime);
//         const mongoBlocks = await findBlocks(armadilloDB, armadilloMainchain);
//         //Reset to original height
//         await setHeightInMockBTCApi(heightOfNoRskTags);
//         expect(mongoBlocks).to.be.an('array').that.is.empty;
//     });
//     it("should generate a mainchain connection between 2 consecutive BTC blocks with RSK tags, end to end", async () => {
//         await mockBtcApiChangeRoute("raw");
//         await setHeightInMockBTCApi(heightOfConsecutiveRskTags);
//         await deleteDB(armadilloDB);
//         await setBlockAsLastChecked(heightOfConsecutiveRskTags - 1);
//         await getNextBlockInMockBTCApi();
//         //Wait until the monitor can read the new block and process of getting 
//         //the mainchain is completed (pooling every 5s)
//         await sleep(apiPoolingTime + loadingTime);
//         //Reset to original height
//         await setHeightInMockBTCApi(heightOfNoRskTags);
//         //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
//         await validateMainchain(1000, 21);
//     });
//     it("should generate a mainchain connection between 2 consecutive BTC blocks with RSK tags, mongo input validation", async () => {
//         await mockBtcApiChangeRoute("raw");
//         await setHeightInMockBTCApi(heightOfConsecutiveRskTags);
//         await deleteDB(armadilloDB);
//         await setBlockAsLastChecked(heightOfConsecutiveRskTags - 1);
//         const blocksToAdvance = 1;
//         for (let i = 0; i < blocksToAdvance; i++) {
//             await getNextBlockInMockBTCApi();
//         }
//         //Wait until the monitor can read the new block and process of getting 
//         //the mainchain is completed (pooling every 5s)
//         await sleep(apiPoolingTime + loadingTime);
//         const mongoBlocks = await findBlocks(db, mainchain);
//         //Reset to original height
//         await setHeightInMockBTCApi(heightOfNoRskTags);
//         await validateMainchainRskMongoDB(mongoBlocks, 21);

//     });
//     it("should generate a mainchain connection between 2 consecutive BTC blocks with RSK tags, mongo output validation", async () => {
//         await deleteDB(db);
//         await sleep(loadingTime);
//         const consecutive2RskBlocks = "testInput_consecutive2RSKtags.json";
//         const insertDataText = fs.readFileSync(dataInputPath + consecutive2RskBlocks);
//         const insertDataJSON = JSON.parse(insertDataText);
//         expect(insertDataJSON).to.be.an('array').that.is.not.empty;
//         await insertDocuments(db, mainchain, insertDataJSON);
//         const mongoBlocks = await findBlocks(db, mainchain);
//         expect(mongoBlocks).to.be.an('array').that.is.not.empty;
//         expect(mongoBlocks.length).to.be.equal(21);
//         const mainchainResponse = await getMainchainBlocks(1000);
//         const blocks = mainchainResponse.data;
//         expect(blocks).to.be.an('array').that.is.not.empty;
//         expect(blocks.length).to.be.equal(21);
//         expect(blocks).to.be.eql(mongoBlocks.reverse());
//     });
//     it("should generate a mainchain connection among 3 consecutive BTC blocks with RSK tags, end to end", async () => {
//         await mockBtcApiChangeRoute("raw");
//         await setHeightInMockBTCApi(heightOfConsecutiveRskTags);
//         await deleteDB(armadilloDB);
//         await setBlockAsLastChecked(heightOfConsecutiveRskTags - 1);
//         const blocksToAdvance = 2;
//         for (let i = 0; i < blocksToAdvance; i++) {
//             await getNextBlockInMockBTCApi();
//         }
//         //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
//         await sleep(10000);
//         await setHeightInMockBTCApi(heightOfNoRskTags);
//         //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
//         await validateMainchain(1000, 41);
//     });
//     it("should generate a mainchain connection among 3 consecutive BTC blocks with RSK, mongo input validation", async () => {
//         await mockBtcApiChangeRoute("raw");
//         await setHeightInMockBTCApi(heightOfConsecutiveRskTags);
//         await setBlockAsLastChecked(heightOfConsecutiveRskTags - 1);
//         await deleteDB(ArmadilloDB);
//         const blocksToAdvance = 2;
//         for (let i = 0; i < blocksToAdvance; i++) {
//             await getNextBlockInMockBTCApi();
//         }
//         //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
//         await sleep(10000);
//         const mongoBlocks = await findBlocks(armadilloDB, armadilloMainchain);
//         //Reset to original height
//         await setHeightInMockBTCApi(heightOfNoRskTags);
//         await validateMainchainRskMongoDB(mongoBlocks, 41);
//     });
//     it("should generate a mainchain connection among 3 consecutive BTC blocks with RSK, mongo output validation", async () => {
//         await deleteDB(db);
//         await sleep(loadingTime);
//         const insertDataText = fs.readFileSync(dataInputPath + consecutive3RskBlocks);
//         const insertDataJSON = JSON.parse(insertDataText);
//         expect(insertDataJSON).to.be.an('array').that.is.not.empty;
//         await insertDocuments(db, mainchain, insertDataJSON);
//         const mongoBlocks = await findBlocks(db, mainchain);
//         expect(mongoBlocks).to.be.an('array').that.is.not.empty;
//         expect(mongoBlocks.length).to.be.equal(41);
//         const mainchainResponse = await getMainchainBlocks(1000);
//         const blocks = mainchainResponse.data;
//         expect(blocks).to.be.an('array').that.is.not.empty;
//         expect(blocks.length).to.be.equal(41);
//         expect(blocks).to.be.eql(mongoBlocks.reverse());
//     });
//     it("should generate a mainchain connection between 2 BTC blocks with RSK tags, separated by 3 without RSK tags, end to end", async () => {
//         await mockBtcApiChangeRoute("raw");
//         await setHeightInMockBTCApi(heightOfDistancedRskTags);
//         await deleteDB(armadilloDB);
//         await setBlockAsLastChecked(heightOfDistancedRskTags - 1);
//         const blocksToAdvance = 4;
//         for (let i = 0; i < blocksToAdvance; i++) {
//             await getNextBlockInMockBTCApi();
//         }
//         //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
//         await sleep(apiPoolingTime + loadingTime);
//         await setHeightInMockBTCApi(heightOfNoRskTags);
//         //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
//         await validateMainchain(1000, 81);
//     });
//     it("should generate a mainchain connection between 2 BTC blocks with RSK tags, separated by 3 without RSK tags, mongo input validation", async () => {
//         await mockBtcApiChangeRoute("raw");
//         await setHeightInMockBTCApi(heightOfDistancedRskTags);//P5,H956
//         await deleteDB(armadilloDB);
//         await setBlockAsLastChecked(heightOfDistancedRskTags - 1);
//         const blocksToAdvance = 4;
//         for (let i = 0; i < blocksToAdvance; i++) {
//             await getNextBlockInMockBTCApi();
//         }
//         await sleep(apiPoolingTime + loadingTime);
//         const mongoBlocks = await findBlocks(armadilloDB, armadilloMainchain);
//         //Reset to original height
//         await setHeightInMockBTCApi(heightOfNoRskTags);
//         await validateMainchainRskMongoDB(mongoBlocks, 81);
//     });

//     it("should generate a mainchain connection between 2 BTC blocks with RSK tags, separated by 3 without RSK tags, mongo output validation", async () => {
//         await deleteDB(db, mainchain);
//         await sleep(loadingTime);
//         const insertDataText = fs.readFileSync(dataInputPath + jump3BtcBlocksToRskBlocks);
//         const insertDataJSON = JSON.parse(insertDataText);
//         expect(insertDataJSON).to.be.an('array').that.is.not.empty;
//         await insertDocuments(db, mainchain, insertDataJSON);
//         const mongoBlocks = await findBlocks(db, mainchain);
//         expect(mongoBlocks).to.be.an('array').that.is.not.empty;
//         expect(mongoBlocks.length).to.be.equal(81);
//         const mainchainResponse = await getMainchainBlocks(1000);
//         const blocks = mainchainResponse.data;
//         expect(blocks).to.be.an('array').that.is.not.empty;
//         expect(blocks.length).to.be.equal(81);
//         expect(blocks).to.be.eql(mongoBlocks.reverse());
//     });
//     it("should generate a mainchain connection between 2 BTC blocks with RSK tags, second RSK tag is of a sibling block, end to end", async () => {
//         await mockBtcApiChangeRoute("raw");
//         await setHeightInMockBTCApi(heightForSiblingRskTag);
//         await deleteDB(armadilloDB);
//         await setBlockAsLastChecked(heightForSiblingRskTag - 1);
//         const blocksToAdvance = 1;
//         for (let i = 0; i < blocksToAdvance; i++) {
//             await getNextBlockInMockBTCApi();
//         }
//         //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
//         await sleep(apiPoolingTime + loadingTime);
//         await setHeightInMockBTCApi(heightOfNoRskTags);
//         //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
//         await validateMainchain(2, 11);
//         await validateMainchain(100, 11);
//     });

//     it("should generate a mainchain connection between 3 BTC blocks with RSK tags, a reorganization of lenght 1 in RSK happens in between the second and third btc checkpoint, the monitor rebuilds mainchain to consider reorganization, end to end", async () => {
//         await mockBtcApiChangeRoute("raw");
//         await setHeightInMockBTCApi(heightOfConsecutiveRskTags);
//         await deleteDB(armadilloDB);
//         await setBlockAsLastChecked(heightOfConsecutiveRskTags - 1);
//         await sleep(apiPoolingTime + loadingTime);
//         await getNextBlockInMockBTCApi();
//         await sleep(loadingTime);
//         const reorgBlockInfo = await fakeMainchainBlock(rskheightOfConsecutiveRskTags, true);
//         await getNextBlockInMockBTCApi();
//         //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
//         await sleep(loadingTime + apiPoolingTime);
//         await setHeightInMockBTCApi(heightOfNoRskTags);
//         //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
//         let reorgBlocks = {};
//         reorgBlocks[reorgBlockInfo.rskInfo.height] = reorgBlockInfo;
//         await validateMainchain(2, 41, reorgBlocks);
//         await validateMainchain(100, 41, reorgBlocks);
//     });

//     it("should generate a mainchain connection between 3 BTC blocks with RSK tags, a reorganization of lenght 3 in RSK happens in between the second and third btc checkpoint, the monitor rebuilds mainchain to consider reorganization, end to end", async () => {
//         await mockBtcApiChangeRoute("raw");
//         await setHeightInMockBTCApi(heightOfConsecutiveRskTags);
//         await deleteDB(armadilloDB);
//         await setBlockAsLastChecked(heightOfConsecutiveRskTags - 1);
//         await sleep(apiPoolingTime + loadingTime);
//         await getNextBlockInMockBTCApi();
//         await sleep(loadingTime);
//         let reorgBlocks = {};
//         let reorgBlockInfo = await fakeMainchainBlock(rskheightOfConsecutiveRskTags);
//         reorgBlocks[reorgBlockInfo.rskInfo.height] = reorgBlockInfo;
//         reorgBlockInfo = await fakeMainchainBlock(rskheightOfConsecutiveRskTags - 1);
//         reorgBlocks[reorgBlockInfo.rskInfo.height] = reorgBlockInfo;
//         reorgBlockInfo = await fakeMainchainBlock(rskheightOfConsecutiveRskTags - 2);
//         reorgBlocks[reorgBlockInfo.rskInfo.height] = reorgBlockInfo;
//         await getNextBlockInMockBTCApi();
//         //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
//         await sleep(loadingTime + apiPoolingTime);
//         await setHeightInMockBTCApi(heightOfNoRskTags);
//         //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
//         await validateMainchain(2, 41, reorgBlocks);
//         await validateMainchain(100, 41, reorgBlocks);
//         });

//     it("should generate a mainchain connection between 3 BTC blocks with RSK tags, reorganization happens on second btc checkpoint, it goes as a sibling, end to end", async () => {
//         await mockBtcApiChangeRoute("raw");
//         await setHeightInMockBTCApi(heightForSiblingRskTag);
//         await deleteDB(armadilloDB);
//         await setBlockAsLastChecked(heightForSiblingRskTag - 1);
//         await sleep(apiPoolingTime + loadingTime);
//         await getNextBlockInMockBTCApi();
//         await sleep(loadingTime);
//         // const reorgBlockInfo = await fakeMainchainBlock(rskHeightWithSibling, true);
        
//         const reorgBlockInfo = await swapMainchainBlockWithSibling(rskHeightWithSibling);
//         await getNextBlockInMockBTCApi();
//         //Wait until the monitor can read the new block and process of getting the mainchain is completed (pooling every 5s)
//         await sleep(loadingTime + apiPoolingTime);
//         await setHeightInMockBTCApi(heightOfNoRskTags);
//         //validateMainchain(nbrOfMainchainBlocksToFetch,lengthOfExpectedMainchain)
//         let reorgBlocks = {};
//         reorgBlocks[reorgBlockInfo.rskInfo.height] = reorgBlockInfo;
//         await validateMainchain(2, 41, reorgBlocks);
//         await validateMainchain(100, 41, reorgBlocks);
//     });
// });