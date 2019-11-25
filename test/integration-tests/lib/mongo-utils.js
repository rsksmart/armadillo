let MongoClient = require('mongodb').MongoClient;
const MongoUrl = "mongodb://localhost:27017/";
const ArmadilloDB = "armadillo";
const ArmadilloMainchain = "mainchain";
const ArmadilloStateTracker = "btc";
const ArmadilloForks = "branches";

let DeleteDB = async (_db) => {
    var connection = await MongoClient.connect(MongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    var dbo = await connection.db(_db);
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
        await connection.close();
    }
}

let updateLastCheckedBtcBlock = async (btcBlock) => {
    try {
        let db = await MongoClient.connect(MongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
        var dbo = await db.db(ArmadilloDB);
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
            await db.close();
        }
        return result;
    } catch (err) {
        throw err;
    }
}

let findBlocks = async (_db, _collection) => {
    try {
        let db = await MongoClient.connect(MongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
        var dbo = await db.db(_db);
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
            await db.close();
        }
        return result;
    } catch (err) {
        throw err;
    }
}

let insertDocuments = async (_db, _collection, _jsonData) => {
    try {
        let db = await MongoClient.connect(MongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
        var dbo = await db.db(_db);
        let result = [];
        //Delete the collection:
        try {
            await dbo.collection(_collection).insertMany(_jsonData);
        }
        catch (e) {
            console.error(e.message)
        }
        finally {
            await db.close();
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
    updateLastCheckedBtcBlock
}