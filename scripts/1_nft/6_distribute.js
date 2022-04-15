require("dotenv").config()
const HoldemHeroes = artifacts.require("HoldemHeroes")
const netConfigs = require("../../config.json")

module.exports = async function(callback) {
  const network = config.network
  console.log(`Distribute for ${network}`)

  const holdemHeroes = await HoldemHeroes.deployed()
  const xfund = await new web3.eth.Contract( netConfigs.abis.xfund, netConfigs.networks[network].addresses.xfund)
  const accounts = await web3.eth.getAccounts()
  const admin = accounts[0]
  const handUploadId = await holdemHeroes.handUploadId()
  console.log("handUploadId", handUploadId.toString())
  console.log("distribute")
  try {
    let tx = await xfund.methods.transfer(holdemHeroes.address, netConfigs.networks[network].vor_fee).send({from: admin})
    console.log("transfer xfund tx sent", tx.transactionHash)
    tx = await holdemHeroes.beginDistribution( netConfigs.networks[network].vor_key_hash,  netConfigs.networks[network].vor_fee, {from: admin})
    if(tx.tx) {
      console.log( "beginDistribution tx sent", tx.tx, tx.receipt.gasUsed )
    } else {
      console.log( tx )
    }
  } catch(e) {
    console.error(e)
  }

  const totalSupply = await holdemHeroes.totalSupply()

  console.log("totalSupply:", totalSupply.toString())

  console.log("complete")
  callback()
}
