import { MongoClient } from "mongodb";

const uri = "mongodb://127.0.0.1:27017/inck"

async function migrateFreeNotes(db) {
    const rawNotesData = await db.db("data").collection("notes").find().toArray()

    for (let idx = 0; idx < rawNotesData.length; idx++) {
        const data = rawNotesData[idx]
        await db.db("inck").collection("notes").insertOne({
            id: data.id,
            strokes: data.strokes,
            creationDate: Date.now(),
            isFreeNote: true
        })
    }
}

async function migratePremiumNotes(db) {
    const rawFilesData = await db.db("inck").collection("files").find().toArray()

    for (let idx = 0; idx < rawFilesData.length; idx++) {
        const fileData = rawFilesData[idx]
        const noteData = await db.db("data").collection("notes").findOne({ id: fileData.fileId })
        let strokes

        if (noteData == null) {
            strokes = []

        } else {
            strokes = noteData.strokes
        }

        await db.db("inck").collection("notes").insertOne({
            id: fileData.fileId,
            strokes: strokes,
            creationData: Date.now(),
            isFreeNote: false
        })

    }
}

async function run() {
    MongoClient.connect(uri, async (err, db) => {
        if (err) throw err


        // migrate free notes
        await migrateFreeNotes(db)
        await migratePremiumNotes(db)
    })
}

run().then(() => {
    console.log("Done")
})