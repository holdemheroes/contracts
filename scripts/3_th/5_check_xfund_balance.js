require("dotenv").config()
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")
const { BN } = require( "@openzeppelin/test-helpers" )
const netConfigs = require("../../config.json")

module.exports = async function(callback) {
  const network = config.network
  const th = await TexasHoldemV1.deployed()
  const xfund = await new web3.eth.Contract( netConfigs.abis.xfund, netConfigs.networks[network].addresses.xfund)

  try {
    const accounts = await web3.eth.getAccounts()
    const admin = accounts[0]

    const ownerBalance = await xfund.methods.balanceOf(admin).call()
    const obBn = new BN(ownerBalance)
    console.log("xFUND balance of Owner", admin, "on", network, "=", obBn.toString())

    const balance = await xfund.methods.balanceOf(th.address).call()
    const bBn = new BN(balance)
    console.log("xFUND balance of TH", th.address, "on", network, "=", bBn.toString())

  } catch(e) {
    console.error(e)
    callback()
  }
  callback()
}
