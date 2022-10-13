import { MongoClient } from "mongodb";

const uri = "mongodb+srv://inck:A9kQMoe0xZHGVI1A@cluster0.zs8rq.mongodb.net/inck"

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

async function migrateBackgroundOptions(db) {
    const allNotes = await db.db("inck").collection("notes").find({isFreeNote: false}).toArray()
    console.log(allNotes.length)
    for (const noteData of allNotes) {
        const bgt = noteData.backgroundType
        const bgo = noteData.backgroundOptions
        const fileId = noteData.id

        await db.db("inck").collection("files").updateOne({
            fileId: fileId,
        }, {$set: {
            backgroundType: bgt,
            backgroundOptions: bgo,
        }}
        )
    }
	console.log("Done")
}

async function run() {
    console.log
    MongoClient.connect(uri, async (err, db) => {
        if (err) throw err
        // migrate free notes
        await migrateBackgroundOptions(db)
    })
}

run().then(() => {

})
