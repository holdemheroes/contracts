require("dotenv").config()
const {
  BN
} = require("@openzeppelin/test-helpers")
const utils = require( "../utils/utils" )
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator")

module.exports = async function(callback) {
  const newtworkType = await web3.eth.net.getNetworkType();
  if(newtworkType !== "private") {
    console.log("run with Ganache or vordev")
    process.exit(1)
  }

  try {
    const contractAddresses = utils.getContractAddresses()

    const uploadJson = utils.getHandEvaluatorUploadJson()

    let totalGas = new BN( 0 );

    const handEvaluator = await PokerHandEvaluator.new(0)

    console.log("PHE deployed to", handEvaluator.address)

    contractAddresses["vordev"].hand_evaluator = handEvaluator.address

    const deployTx = await web3.eth.getTransactionReceipt(handEvaluator.transactionHash)
    console.log("deploy", handEvaluator.transactionHash, web3.utils.hexToNumber(deployTx.gasUsed))

    // uncomment to include deploy gas
    // totalGas = totalGas.add(new BN(web3.utils.hexToNumber(deployTx.gasUsed)))

    utils.writeContractAddresses(contractAddresses)

    let tx = await handEvaluator.setSuits(uploadJson.suits.idxs, uploadJson.suits.values)
    console.log( "handEvaluator.setSuits tx sent", tx.tx, tx.receipt.gasUsed )
    totalGas = totalGas.add(new BN(tx.receipt.gasUsed))

    let totalFlushes = 0
    for(let i = 0; i < uploadJson.flush.length; i += 1) {
      console.log("batch", i, uploadJson.flush[i].idxs.length)
      totalFlushes = totalFlushes + uploadJson.flush[i].idxs.length
      tx = await handEvaluator.setFlushBatch(uploadJson.flush[i].idxs, uploadJson.flush[i].values, i)
      console.log( "handEvaluator.setFlushBatch tx", i, "sent", tx.tx, tx.receipt.gasUsed )
      totalGas = totalGas.add(new BN(tx.receipt.gasUsed))
    }
    console.log("totalFlushes sent", totalFlushes)

    let totalNoFlushes = 0
    for(let i = 0; i < uploadJson.no_flush.length; i += 1) {
      console.log("batch", i, uploadJson.no_flush[i].idxs.length)
      totalNoFlushes = totalNoFlushes + uploadJson.no_flush[i].idxs.length
      tx = await handEvaluator.setNoFlushBatch(uploadJson.no_flush[i].idxs, uploadJson.no_flush[i].values, i)
      console.log( "handEvaluator.setNoFlushBatch tx", i, "sent", tx.tx, tx.receipt.gasUsed )
      totalGas = totalGas.add(new BN(tx.receipt.gasUsed))
    }
    console.log("totalNoFlushes sent", totalNoFlushes)

    for(let i = 0; i < uploadJson.dp.length; i += 1) {
      let tx = await handEvaluator.setDpBatch(uploadJson.dp[i].values, uploadJson.dp[i].idx, i)
      if(tx.tx) {
        console.log( "handEvaluator.setDpBatch tx", uploadJson.dp[i].idx, "sent", tx.tx, tx.receipt.gasUsed )
        totalGas = totalGas.add(new BN(tx.receipt.gasUsed))
      } else {
        console.log(tx)
      }
    }

    console.log("totalGas", totalGas.toString())

    callback()

  } catch(e) {
    console.log(e)
    callback()
  }
}
