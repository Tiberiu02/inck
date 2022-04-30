const { MongoClient } = require('mongodb')
// Load environment variables
require('dotenv').config();

const url = process.env.MONGO_URI

function UpdateDB(dbName, collection, query, update) {
  MongoClient.connect(url, (err, db) => {
    if (err) throw err
    
    db.db(dbName).collection(collection).updateOne(query, update, (err, res) => {
      if (err) throw err
      db.close()
    })
  })
}

function QueryDB(dbName, collection, query, cb) {
  MongoClient.connect(url, (err, db) => {
    if (err) throw err

    db.db(dbName).collection(collection).findOne(query, (err, result) => {
      if (err) throw err
      cb(result)
      db.close()
    })
  })
}

function QueryAllDB(dbName, collection, query, mask, cb) {
  MongoClient.connect(url, (err, db) => {
    if (err) throw err
    db.db(dbName).collection(collection).find(query, { projection: mask }).toArray((err, result) => {
      if (err) throw err
      cb(result)
      db.close()
    })
  })
}

function InsertDB(dbName, collection, obj) {
  MongoClient.connect(url, (err, db) => {
    if (err) throw err
    db.db(dbName).collection(collection).insertOne(obj, (err, result) => {
      if (err) throw err
      db.close()
    })
  })
}

module.exports = {
  UpdateDB,
  QueryDB,
  QueryAllDB,
  InsertDB
}