let MongoClient = require('mongodb').MongoClient;
const MongoUrl = "mongodb://localhost:27017/";
const ArmadilloDB = "armadillo";
const ArmadilloMainchain = "mainchain";
const ArmadilloStateTracker = "btc";
const ArmadilloForks = "branches";

let connectDB = async (_db) => {
    try {
        let db = await MongoClient.connect(MongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
        return {db: await db.db(_db), connection: db};
    } catch (e) {
        console.error("couldn't connect to mongoDB");
        return null;
    }
}

let DeleteDB = async (_db) => {
    let db = await connectDB(_db);
    let dbo = db.db;
    let colNames = [];
    try {
        colNames = await dbo.listCollections().toArray();
    }
    catch (e) {
        console.error("Problem getting collection names");
    }
    try {
        //remove all collections except btc
        for (let colName in colNames) {
            if (colNames[colName].name !== ArmadilloStateTracker) {
                await dbo.collection(colNames[colName].name).drop();
            }
        }
    }
    catch (e) {
        console.error("Problem dropping DB");
    }
    finally {
        await db.connection.close();
    }
}

let updateLastCheckedBtcBlock = async (btcBlock) => {
    try {
        let db = await connectDB(ArmadilloDB);
        let dbo = db.db;
        let result = [];
        //Delete the collection:
        var query = {};
        var newvalue = { $set: btcBlock };
        try {
            
            result = await dbo
                .collection(ArmadilloStateTracker)
                .updateOne(query, newvalue);
        }
        catch (e) {
            console.error(e.message)
        }
        finally {
            await db.connection.close();
        }
        return result;
    } catch (err) {
        throw err;
    }
}

async function updateOneMainchainBlock(RSKBlockNumber, isMainchain, armadilloBlock) {
    try {
        let db = await connectDB(ArmadilloDB);
        let dbo = db.db;
        let result = [];
        var query = {
            "rskInfo.height": RSKBlockNumber,
            "rskInfo.mainchain": isMainchain
        };
        var newvalue = { $set: armadilloBlock };
        try {
            // newValue.rskInfo.hash = newValue.rskInfo.hash
            result = await dbo
                .collection(ArmadilloMainchain)
                .updateOne(query, newvalue);
        }
        catch (e) {
            console.error("Problem doing update of armadillo block")
            console.error(e.message)
        }
        finally {
            await db.connection.close();
        }
        return result;
    } catch (err) {
        throw err;
    }
}

async function findOneMainchainBlock(RSKBlockNumber, isMainchain) {
    let query = {
        "rskInfo.height": RSKBlockNumber,
        "rskInfo.mainchain": isMainchain
    };
    try {
        let db = await connectDB(ArmadilloDB);
        let dbo = db.db;
        let result = [];
        try {
            result = await dbo
                .collection(ArmadilloMainchain)
                .find(query)
                .project({ _id: 0 })
                .toArray();
        }
        catch (e) {
            console.error(e.message)
        }
        finally {
            await db.connection.close();
        }
        return result[0];
    } catch (err) {
        throw err;
    }
}

let findBlocks = async (_db, _collection) => {
    try {
        let db = await connectDB(_db);
        let dbo = db.db;
        let result = [];
        //Delete the collection:
        try {
            result = await dbo
                .collection(_collection)
                .find({})
                .project({ _id: 0 })
                .toArray();
        }
        catch (e) {
            console.error(e.message)
        }
        finally {
            await db.connection.close();
        }
        return result;
    } catch (err) {
        throw err;
    }
}

let insertDocuments = async (_db, _collection, _jsonData) => {
    try {
        let db = await connectDB(_db);
        let dbo = db.db;
        let result = [];
        //Delete the collection:
        try {
            await dbo.collection(_collection).insertMany(_jsonData);
        }
        catch (e) {
            console.error(e.message)
        }
        finally {
            await db.connection.close();
        }
        return result;
    } catch (err) {
        throw err;
    }
}

module.exports = {
    DeleteDB,
    ArmadilloDB,
    ArmadilloMainchain,
    ArmadilloStateTracker,
    findBlocks,
    insertDocuments,
    ArmadilloForks,
    updateLastCheckedBtcBlock,
    findOneMainchainBlock,
    updateOneMainchainBlock
}