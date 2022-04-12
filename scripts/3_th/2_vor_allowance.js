require("dotenv").config()
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")

module.exports = async function(callback) {
  const th = await TexasHoldemV1.deployed()

  const accounts = await web3.eth.getAccounts()
  const admin = accounts[0]

  console.log(`TH Contract: ${th.address}`)

  try {
    let tx = await th.increaseVorCoordinatorAllowance( "115792089237316195423570985008687907853269984665640564039457584007913129639935", {
      from: admin,
    } )

    console.log( `tx sent`, tx.tx, tx.receipt.gasUsed )

  } catch(e) {
    console.log(e)
    callback()
  }
  callback()
}
