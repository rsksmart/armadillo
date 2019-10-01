let MongoClient = require('mongodb').MongoClient;
const MongoUrl = "mongodb://localhost:27017/";
const ArmadilloDB = "armadillo";
const ArmadilloMainchain = "mainchain";
const ArmadilloStateTracker = "btc";

let DeleteCollection = async (_db, _collection) => {
    MongoClient.connect(MongoUrl, { useNewUrlParser: true, useUnifiedTopology: true }, async function (err, db) {
        console.log("Deleting " + _collection + " from " + _db);
        if (err) throw err;
        var dbo = await db.db(_db);
        //Delete the collection:
        dbo.collection(_collection).drop(function (err, delOK) {
            if (err) { console.log("Collection didn't existed"); }
            if (delOK) { console.log("Collection deleted"); }
            db.close();
        });
    });
}

let findBlocks = async (_db, _collection, _rskHeight) => {
    MongoClient.connect(MongoUrl, { useNewUrlParser: true, useUnifiedTopology: true }, async function (err, db) {
        // console.log("Deleting " + _collection + " from " + _db);
        if (err) throw err;
        var dbo = await db.db(_db);

        //Delete the collection:
        try {
            let result = await dbo.collection(_collection).find({"rskInfo.height": _rskHeight});
            console.log(result);
        }
        catch(e){
            console.error(e.message)
        }
    });
}

module.exports = {
    DeleteCollection,
    ArmadilloDB,
    ArmadilloMainchain,
    ArmadilloStateTracker,
    findBlocks
}