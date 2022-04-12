require("dotenv").config()
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")

function sleepFor (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = async function(callback) {
  const th = await TexasHoldemV1.deployed()

  const accounts = await web3.eth.getAccounts()
  const admin = accounts[0]
  const dealer = process.argv[4]

  console.log(`TH Contract: ${th.address}`)
  console.log(`dealer: ${dealer}`)

  try {

    const DEALER_ROLE = await th.DEALER_ROLE()

    let tx = await th.grantRole(DEALER_ROLE, dealer, {
      from: admin,
    } )

    console.log( `tx sent`, tx.tx, tx.receipt.gasUsed )

    console.log("wait 1 block and check")
    for(let i = 0; i < 17; i += 1) {
      process.stdout.write(`${16-i}.`)
      await sleepFor(1000)
    }
    console.log("checking")

    const hasRole = await th.hasRole(DEALER_ROLE, dealer)

    if ( hasRole ) {
      console.log( "DEALER role granted to", dealer )
    } else {
      console.log( "something went wrong granting DEALER role. Check tx" )
    }
  } catch(e) {
    console.log(e)
    callback()
  }
  callback()
}
