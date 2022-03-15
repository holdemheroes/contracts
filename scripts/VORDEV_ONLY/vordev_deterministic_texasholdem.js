require("dotenv").config()
const utils = require( "../utils/utils" )
const netConfigs = require("../../config.json")
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator")

module.exports = async function(callback) {
  const newtworkType = await web3.eth.net.getNetworkType();
  if(newtworkType !== "private") {
    console.log("run with Ganache or vordev")
    process.exit(1)
  }
  
  const networkName = "vordev"

  try {
    const contractAddresses = utils.getContractAddresses()
    const accounts = await web3.eth.getAccounts()
    const admin = accounts[0]

    const xfund = await new web3.eth.Contract( netConfigs.abis.xfund, netConfigs.networks[networkName].addresses.xfund)
    const amount = "10000000000" // 10 xFUND

    const roundTime = 300
    const maxConcurrentGames = 5

    const texasHoldem = await TexasHoldemV1.new(
      netConfigs.networks[networkName].addresses.xfund,
      netConfigs.networks[networkName].addresses.vor,
      contractAddresses[networkName].holdem_heroes_nft,
      contractAddresses[networkName].hand_evaluator,
      maxConcurrentGames,
      roundTime,
      netConfigs.networks[networkName].vor_key_hash,
      netConfigs.networks[networkName].vor_fee)


    console.log("TH deployed to", texasHoldem.address)
    const deployTx = await web3.eth.getTransactionReceipt(texasHoldem.transactionHash)
    console.log("deploy", texasHoldem.transactionHash, web3.utils.hexToNumber(deployTx.gasUsed))

    contractAddresses[networkName].texas_holdem_v1 = texasHoldem.address
    utils.writeContractAddresses(contractAddresses)

    const handEval = await new web3.eth.Contract(PokerHandEvaluator.abi, contractAddresses[networkName].hand_evaluator)
    let tx = await handEval.methods.ownerAddSubscriber(texasHoldem.address).send({from: admin})

    if(tx.transactionHash) {
      console.log( "handEval.ownerAddSubscriber", tx.transactionHash, tx.gasUsed )
    } else {
      console.log(tx)
    }

    tx = await texasHoldem.increaseVorCoordinatorAllowance( "115792089237316195423570985008687907853269984665640564039457584007913129639935")

    if(tx.tx) {
      console.log("increaseVorCoordinatorAllowance tx sent", tx.tx, tx.receipt.gasUsed)
    } else {
      console.log(tx)
    }

    const balanceBefore = await xfund.methods.balanceOf(texasHoldem.address).call()
    console.log("balanceBefore", balanceBefore.toString())

    tx = await xfund.methods.transfer(texasHoldem.address, amount).send({from: admin})
    console.log("transfer tx sent", tx.transactionHash)

    const balanceAfter = await xfund.methods.balanceOf(texasHoldem.address).call()
    console.log("balanceAfter", balanceAfter.toString())

    callback()

  } catch(e) {
    console.log(e)
    callback()
  }
}
