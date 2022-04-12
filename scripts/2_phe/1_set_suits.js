require("dotenv").config()
const utils = require( "../utils/utils" )
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator")

function sleepFor (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = async function(callback) {
  try {

    const phe = await PokerHandEvaluator.deployed()
    const accounts = await web3.eth.getAccounts()
    const admin = accounts[0]
    const network = config.network
    let waitSecs = 16
    if(network === 'polygon' || network === 'polygon_mumbai') {
      waitSecs = 6
    }

    console.log(`PHE Contract: ${phe.address}`)

    let suitsSet = await phe.suitsSet()

    if ( suitsSet ) {
      console.log( "suits already uploaded. Exiting" )
      callback()
      process.exit( 1 )
    }

    const uploadJson = utils.getHandEvaluatorUploadJson()

    const tx = await phe.setSuits( uploadJson.suits.idxs, uploadJson.suits.values, {
      from: admin,
    } )

    console.log( `tx sent`, tx.tx, tx.receipt.gasUsed )

    console.log("wait 1 block and check")
    for(let i = 0; i <= waitSecs; i += 1) {
      process.stdout.write(`${waitSecs-i}.`)
      await sleepFor(1000)
    }
    console.log(" checking")

    suitsSet = await phe.suitsSet()

    if ( suitsSet ) {
      console.log( "suits set" )
    } else {
      console.log( "something went wrong. Check tx" )
    }
  } catch(e) {
    console.log(e)
  }
  callback()
}
