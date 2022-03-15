require("dotenv").config()
const HoldemHeroes = artifacts.require("HoldemHeroes")

module.exports = async function(callback) {
  const network = config.network
  console.log(`Set merkle root for ${network}`)

  const holdemHeroes = await HoldemHeroes.deployed()
  const accounts = await web3.eth.getAccounts()
  const admin = accounts[0]

  console.log("disable merkle root hash")

  try {
    const tx = await holdemHeroes.setWhitelistMerkleRoot( "0x0", false, {from: admin})
    if(tx.tx) {
      console.log( "setWhitelistMerkleRoot tx sent", tx.tx )
    } else {
      console.log( tx )
    }
  } catch(e) {
    console.error(e)
  }

  console.log("complete")
  callback()
}
