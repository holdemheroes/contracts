const fs = require("fs")
const path = require("path")
const { suits, noflush, flush, dp } = require('./hash_tables')

async function generate() {

  const baseDataPath = path.resolve( __dirname, "../.." )
  await fs.promises.mkdir( baseDataPath, { recursive: true } )

  const dataUploadPath = path.resolve(baseDataPath, "data", "hand-evaluator-upload.json")
  const testDataUploadPath = path.resolve(baseDataPath, "test/test_data", "hand-evaluator-upload.json")

  const uploadJson = {}

  const suitsObj = {
    idxs: [],
    values: [],
  }
  for(let i = 0; i < suits.length; i += 1) {
    const s = suits[i]
    if(s > 0) {
      suitsObj.idxs.push(i)
      suitsObj.values.push(s)
    }
  }

  const noFlushObj = {
    idxs: [],
    values: [],
  }
  for(let i = 0; i < noflush.length; i += 1) {
    const f = noflush[i]
    if(f > 0) {
      noFlushObj.idxs.push(i)
      noFlushObj.values.push(f)
    }
  }

  const perNoFlushBatch = 200
  const noFlushBatches = []

  for(let i = 0; i < noFlushObj.idxs.length; i += perNoFlushBatch) {
    const fb = {}
    if(noFlushObj.idxs.length - i < perNoFlushBatch) {
      fb.idxs = noFlushObj.idxs.slice(i, noFlushObj.idxs.length)
      fb.values = noFlushObj.values.slice(i, noFlushObj.idxs.length)
    } else {
      fb.idxs = noFlushObj.idxs.slice(i, i + perNoFlushBatch)
      fb.values = noFlushObj.values.slice(i, i + perNoFlushBatch)
    }
    noFlushBatches.push(fb)
  }

  const flushObj = {
    idxs: [],
    values: [],
  }
  for(let i = 0; i < flush.length; i += 1) {
    const f = flush[i]
    if(f > 0) {
      flushObj.idxs.push(i)
      flushObj.values.push(f)
    }
  }

  //4719
  const perFlushBatch = 200
  const flushBatches = []

  for(let i = 0; i < flushObj.idxs.length; i += perFlushBatch) {
    const fb = {}
    if(flushObj.idxs.length - i < perFlushBatch) {
      fb.idxs = flushObj.idxs.slice(i, flushObj.idxs.length)
      fb.values = flushObj.values.slice(i, flushObj.idxs.length)
    } else {
      fb.idxs = flushObj.idxs.slice(i, i + perFlushBatch)
      fb.values = flushObj.values.slice(i, i + perFlushBatch)
    }
    flushBatches.push(fb)
  }

  const dpBatches = []
  for(let i = 0; i < dp.length; i += 1) {
    let upload = false
    for(let j = 0; j < dp[i].length; j += 1) {
      for(let k = 0; k < dp[i][j].length; k += 1) {
        if(dp[i][j][k] > 0) {
          upload = true
        }
      }
    }
    if(upload) {
      const d = {
        idx: i,
        values: dp[i]
      }
      dpBatches.push(d)
    }
  }

  uploadJson.suits = suitsObj
  uploadJson.no_flush = noFlushBatches
  uploadJson.flush = flushBatches
  uploadJson.dp = dpBatches



  fs.writeFileSync(
    dataUploadPath,
    JSON.stringify(uploadJson, null, 2)
  )
  fs.writeFileSync(
    testDataUploadPath,
    JSON.stringify(uploadJson, null, 2)
  )

}

generate()
