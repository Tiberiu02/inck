import { randomUUID } from "crypto";
import mongoose from "mongoose";

export class Timer {
  constructor() {
    this.start = performance.now();
  }

  elapsed() {
  const stop = performance.now();
  const inSeconds = (stop - this.start) / 1000;
  const rounded = Number(inSeconds).toFixed(3);
  return Number(rounded)
  }
}

function mean(runs) {
  let total = 0
  for (const v of runs) {
    total += v
  }
  return total / runs.length
}

function std(runs) {
  const m = mean(runs)
  let total = 0
  for (const v of runs) {
    total += (v - m) ** 2
  }
  return Math.sqrt(total / runs.length)
}


const noteBenchmarkSchema = new mongoose.Schema({
  id: { type: String },
  strokes: { type: Array, default: [] },
});

const newNoteBenchmarkSchema = new mongoose.Schema({
  id: { type: String },
  strokes: { type: Object },
});

export const NoteBenchmarkModel = mongoose.model("note-benchmark", noteBenchmarkSchema);
export const NewNoteBenchMarkModel = mongoose.model("new-note-benchmark", newNoteBenchmarkSchema);

function generateObject() {
  return {
    id: Date.now().toString(),
    deserializer: "stroke",
    zIndex: 1,
    width: 0.000012,
    color: [0, 0, 0],
    data: [
      0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069,
      0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069,
      0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069,
      0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069,
      0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069,
      0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069,
      0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069,
      0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069,
      0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069,
      0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069,
      0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069, 0.14793969542536903, 2050, 0.3019095416045069,
      
    ],
  };
}

async function oldFormatBenchmark(experimentId, nRuns) {
  await NoteBenchmarkModel.create({
    id: experimentId,
  });
  const obj = generateObject();
  for (let idx = 0; idx < nRuns; idx++) {
    await NoteBenchmarkModel.updateOne({ id: experimentId }, { $push: { strokes: obj } });
  }
}

async function newFormatBenchmark(experimentId, nRuns) {
  await NewNoteBenchMarkModel.create({
    id: experimentId,
  });
  const obj = generateObject();

  for (let idx = 0; idx < nRuns; idx++) {
    const newField = {}
    const key = `strokes.${obj.id}-${idx}`
    newField[key] = obj
    await NewNoteBenchMarkModel.updateOne(
      { id: experimentId , },
      {
        $set: newField
      }
    );
  }
}

async function insertBenchmark() {
  mongoose.connect("mongodb://127.0.0.1:27017/benchmark");

  const nRuns = 4
  const entriesPerRun = 4000

  const oldFormatRuns = []
  const newFormatRuns = []

  for (let idx = 0; idx < nRuns; idx++ ) {
  const expName = `${nRuns} runs, ${entriesPerRun} entries, run ${idx}`

    console.log(`Starting run ${idx}`)
    const oldTimer = new Timer()
    await oldFormatBenchmark(expName, entriesPerRun)
    oldFormatRuns.push(oldTimer.elapsed())

    const newTimer = new Timer()
    await newFormatBenchmark(expName, entriesPerRun)
    newFormatRuns.push(newTimer.elapsed())
  }

  const oldMean = mean(oldFormatRuns)
  const oldStd = std(oldFormatRuns)

  const newMean = mean(newFormatRuns)
  const newStd = std(newFormatRuns)

  console.log("Old format:")
  console.log("Mean: " + oldMean)
  console.log("Std: " + oldStd)
  console.log("-------")
  console.log("New format:")
  console.log("Mean: " + newMean)
  console.log("Std: " + newStd)


  //await NewNoteBenchMarkModel.remove({})
  //await NoteBenchmarkModel.remove({})
  console.log("DONE")

}

await insertBenchmark()