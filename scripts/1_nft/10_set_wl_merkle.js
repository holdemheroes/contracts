require("dotenv").config()
const HoldemHeroes = artifacts.require("HoldemHeroes")
const utils = require( "../utils/utils" )

module.exports = async function(callback) {
  const network = config.network
  console.log(`Set merkle root for ${network}`)

  const holdemHeroes = await HoldemHeroes.deployed()
  const accounts = await web3.eth.getAccounts()
  const admin = accounts[0]

  const whitelistJson = utils.getWhitelistJson(network)
  const rootHash = whitelistJson.merkleRootHash

  console.log("set merkle root hash", rootHash)

  try {
    const tx = await holdemHeroes.setWhitelistMerkleRoot( rootHash, true, {from: admin})
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
