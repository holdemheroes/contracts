require("dotenv").config()
const utils = require('../utils/utils')
const net = require( "net" )
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
    const network = config.network
    let waitSecs = 16
    if(network === 'polygon' || network === 'polygon_mumbai') {
      waitSecs = 6
    }

    console.log(`PHE Contract: ${phe.address}`)

    let noFlushSet = await phe.noFlushSet()
    if ( noFlushSet ) {
      console.log( "all no_flush batches uploaded. Exiting" )
      callback()
      process.exit( 1 )
    }


    const uploadJson = utils.getHandEvaluatorUploadJson()

    const batches = uploadJson.no_flush

    let nextExpectedBatchId = ( await phe.nextExpectedNoFlushBatchId() ).toNumber()

    if ( nextExpectedBatchId !== batchId ) {
      console.log( `expected no_flush batch ${nextExpectedBatchId}. Got ${batchId}. Exiting` )
      callback()
      process.exit( 1 )
    }

    const batchesToUpload = batches[batchId]

    console.log( batchesToUpload )
    console.log( `Uploading no_flush batch ${batchId}` )
    const tx = await phe.setNoFlushBatch( batchesToUpload.idxs, batchesToUpload.values, batchId, {
      from: admin,
    } )

    if ( tx.tx ) {
      console.log( "phe.setNoFlushBatch tx", batchId, "sent", tx.tx, tx.receipt.gasUsed )
    } else {
      console.log( tx )
    }

    console.log("wait 1 block and check")
    for(let i = 0; i <= waitSecs; i += 1) {
      process.stdout.write(`${waitSecs-i}.`)
      await sleepFor(1000)
    }
    console.log("checking")

    noFlushSet = await phe.noFlushSet()
    console.log( "noFlushSet", noFlushSet )
    if ( !noFlushSet ) {
      nextExpectedBatchId = ( await phe.nextExpectedNoFlushBatchId() ).toNumber()
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
