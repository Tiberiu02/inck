import { MongoClient } from "mongodb";

const uri = "mongodb://127.0.0.1:27017/inck"

async function migratePremiumNotes(db) {
    const allNotes = await db.db("inck").collection("notes").find().toArray()

    for (let idx = 0; idx < allNotes.length; idx++) {
        const noteData = allNotes[idx]

        const strokes = noteData.strokes
        const newStrokes = {}

        for (let j = 0; j < strokes.length; j++) {
            const stroke = strokes[j];
            newStrokes[j] = stroke
        }
        await db.db("inck").collection("notes").updateOne({ id: noteData.id },
            {
            $set: {strokes: newStrokes},
        })

    }
}

async function run() {
    MongoClient.connect(uri, async (err, db) => {
        if (err) throw err
        // migrate free notes
        await migratePremiumNotes(db)
    })
}

run().then(() => {
    console.log("Done")
})