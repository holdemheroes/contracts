require("dotenv").config()
const utils = require('../utils/utils')
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator")

function sleepFor (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = async function(callback) {

  try {
    const batchId = parseInt( process.argv[4], 10 )
    const phe = await PokerHandEvaluator.deployed()
    const accounts = await web3.eth.getAccounts()
    const admin = accounts[0]

    let flushSet = await phe.flushSet()
    if ( flushSet ) {
      console.log( "all flush batches uploaded. Exiting" )
      callback()
      process.exit( 1 )
    }


    const uploadJson = utils.getHandEvaluatorUploadJson()

    const batches = uploadJson.flush

    let nextExpectedBatchId = ( await phe.nextExpectedFlushBatchId() ).toNumber()

    if ( nextExpectedBatchId !== batchId ) {
      console.log( `expected flush batch ${nextExpectedBatchId}. Got ${batchId}. Exiting` )
      callback()
      process.exit( 1 )
    }

    const batchesToUpload = batches[batchId]

    console.log( batchesToUpload )
    console.log( `Uploading flush batch ${batchId}` )
    const tx = await phe.setFlushBatch( batchesToUpload.idxs, batchesToUpload.values, batchId, {
      from: admin,
    } )

    if ( tx.tx ) {
      console.log( "phe.setFlushBatch tx", batchId, "sent", tx.tx, tx.receipt.gasUsed )
    } else {
      console.log( tx )
    }

    console.log("wait 1 block and check")
    for(let i = 0; i < 17; i += 1) {
      process.stdout.write(`${16-i}.`)
      await sleepFor(1000)
    }
    console.log("checking")

    flushSet = await phe.flushSet()
    console.log( "flushSet", flushSet )
    if ( !flushSet ) {
      nextExpectedBatchId = ( await phe.nextExpectedFlushBatchId() ).toNumber()
      console.log( "next upload id", nextExpectedBatchId )
    } else {
      console.log( "done - no more batches expected" )
    }
  } catch(e) {
    console.log(e)
    callback()
  }

  callback()
}
