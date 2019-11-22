let MongoClient = require('mongodb').MongoClient;
const MongoUrl = "mongodb://localhost:27017/";
const ArmadilloDB = "armadillo";
const ArmadilloMainchain = "mainchain";
const ArmadilloStateTracker = "btc";
const ArmadilloForks = "branches";

let DeleteCollection = async (_db, _collection) => {
    MongoClient.connect(MongoUrl, { useNewUrlParser: true, useUnifiedTopology: true }, async function (err, db) {
        if (err) throw err;
        var dbo = await db.db(_db);
        //Delete the collection:
        try {
            await dbo.collection(_collection).drop();
        }
        catch (e) { }
        finally {
            await db.close();
        }
    });
}

let DeleteDB = async (_db) => {
    MongoClient.connect(MongoUrl, { useNewUrlParser: true, useUnifiedTopology: true }, async function (err, db) {
        if (err) throw err;
        var dbo = await db.db(_db);
        //Delete the DBO:
        try {
            await dbo.dropDatabase();
            // console.log("db dropped correctly");
        }
        catch (e) { 
            console.error("Problem dropping DB"); 
        }
        finally {
            await db.close();
        }
    });
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
                .project({_id:0})
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
    DeleteCollection,
    DeleteDB,
    ArmadilloDB,
    ArmadilloMainchain,
    ArmadilloStateTracker,
    findBlocks,
    insertDocuments,
    ArmadilloForks
}