require("dotenv").config()
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator")
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")

function sleepFor (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = async function(callback) {
  const phe = await PokerHandEvaluator.deployed()
  const th = await TexasHoldemV1.deployed()

  const accounts = await web3.eth.getAccounts()
  const admin = accounts[0]

  console.log(`PHE Contract: ${phe.address}`)
  console.log(`TH Contract: ${th.address}`)

  try {
    let tx = await phe.ownerAddSubscriber( th.address, {
      from: admin,
    } )

    console.log( `tx sent`, tx.tx, tx.receipt.gasUsed )

    console.log("wait 1 block and check")
    for(let i = 0; i < 17; i += 1) {
      process.stdout.write(`${15-i}.`)
      await sleepFor(1000)
    }
    console.log("checking")

    const isSubscribed = await phe.subscribers(th.address)

    if ( isSubscribed ) {
      console.log( "subscribed" )
    } else {
      console.log( "something went wrong subscribing to phe. Check tx" )
    }
  } catch(e) {
    console.log(e)
    callback()
  }
  callback()
}
