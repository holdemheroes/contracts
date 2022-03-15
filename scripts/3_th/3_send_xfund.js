require("dotenv").config()
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")
const netConfigs = require("../../config.json")

module.exports = async function(callback) {
  const network = config.network
  const th = await TexasHoldemV1.deployed()
  const xfund = await new web3.eth.Contract( netConfigs.abis.xfund, netConfigs.networks[network].addresses.xfund)

  const accounts = await web3.eth.getAccounts()
  const admin = accounts[0]
  const amount = process.argv[4]

  try {

    const balanceBefore = await xfund.methods.balanceOf(th.address).call()
    console.log("balanceBefore", balanceBefore.toString())

    const tx = await xfund.methods.transfer(th.address, amount).send({from: admin})
    console.log("transfer tx sent", tx.transactionHash)

    const balanceAfter = await xfund.methods.balanceOf(th.address).call()
    console.log("balanceAfter", balanceAfter.toString())
  } catch(e) {
    console.error(e)
    callback()
  }
  callback()
}
