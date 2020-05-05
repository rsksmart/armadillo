let MongoClient = require('mongodb').MongoClient;
const MongoUrl = "mongodb://localhost:27017/";
export const armadilloDB = "armadillo";
export const armadilloForks = "forks";
export const armadilloMainchain = "mainchain";
export const armadilloStateTracker = "btc";
import fs from 'fs';

export let connectDB = async (_db) => {
    let db = await MongoClient.connect(MongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    return { db: await db.db(_db), connection: db };
}

export let deleteDB = async (_db) => {
    let db = await connectDB(_db);
    let dbo = db.db;
    let colNames = await dbo.listCollections().toArray();
    
    for (let colName in colNames) {
        if (colNames[colName].name !== armadilloStateTracker) {
            await dbo.collection(colNames[colName].name).drop();
        }
    }
}

export async function saveCollectionToFile(_collection, _fileName) {
    let blocks = await findBlocks (armadilloDB, _collection);
    fs.writeFileSync(_fileName,JSON.stringify(blocks,null,2));
}

export let updateLastCheckedBtcBlock = async (btcBlock) => {
    let db = await connectDB(armadilloDB);
    let dbo = db.db;
    let result = [];
    //Delete the collection:
    var query = {};
    var newvalue = { $set: btcBlock };

        result = await dbo
            .collection(armadilloStateTracker)
            .updateOne(query, newvalue);
    return result;
}

export async function updateOneMainchainBlock(RSKBlockNumber, isMainchain, armadilloBlock) {
    let db = await connectDB(armadilloDB);
    let dbo = db.db;
    let result = [];
    var query = {
        "rskInfo.height": RSKBlockNumber,
        "rskInfo.mainchain": isMainchain
    };

    var newvalue = { $set: armadilloBlock };
        result = await dbo
            .collection(armadilloMainchain)
            .updateOne(query, newvalue);

    return result;
}

export async function findOneMainchainBlock(RSKBlockNumber, isMainchain) {
    let query = {
        "rskInfo.height": RSKBlockNumber,
        "rskInfo.mainchain": isMainchain
    };
    let db = await connectDB(armadilloDB);
    let dbo = db.db;
    let result = [];
        result = await dbo
            .collection(armadilloMainchain)
            .find(query)
            .project({ _id: 0 })
            .toArray();

    return result[0];
}

export let findBlocks = async (_db, _collection) => {
    let db = await connectDB(_db);
    let dbo = db.db;
    let result = [];
    result = await dbo
        .collection(_collection)
        .find({})
        .project({ _id: 0 })
        .toArray();
    return result;
}

export let insertDocuments = async (_db, _collection, _jsonData) => {
    let db = await connectDB(_db);
    let dbo = db.db;
    let result = [];
    await dbo.collection(_collection).insertMany(_jsonData);
    return result;
}

export async function insertToDbFromFile(fileName, collection) {
    const insertDataText = JSON.parse(fs.readFileSync(fileName).toString());

    if (insertDataText.length !== 0) {
        await insertDocuments(armadilloDB, collection, insertDataText);
    }
}
