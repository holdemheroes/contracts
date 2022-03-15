require("dotenv").config()
const utils = require('../utils/utils')
const HoldemHeroes = artifacts.require("HoldemHeroes")
let uploaded = 0

module.exports = async function(callback) {
  const newtworkType = await web3.eth.net.getNetworkType();
  if(newtworkType !== "private") {
    console.log("run with Ganache or vordev")
    process.exit(1)
  }

  const holdemHeroes = await HoldemHeroes.deployed()
  const accounts = await web3.eth.getAccounts()
  const admin = accounts[0]
  const network = config.network
  const uploadJson = utils.getUploadJson(network)
  const hands = uploadJson.hands
  const contractAddresses = utils.getContractAddresses()

  console.log(`Revealing for ${network}`)

  let revealed = await holdemHeroes.REVEALED()
  if(revealed) {
    console.log("all hands revealed. Exiting")
    callback()
    process.exit(1)
  }

  const batchesRevealed = utils.getRevealedBatches(network)

  for( let i = 0; i < hands.length; i += 1) {
    const nextExpectedBatchId = (await holdemHeroes.nextExpectedBatchId()).toNumber()
    if(nextExpectedBatchId !== i) {
      console.log(`expected batch ${nextExpectedBatchId}. Got ${i}. skipping`)
      continue
    }
    let ipfsProvHash = ""
    if(i === 13) {
      ipfsProvHash = contractAddresses[network].provenance_ipfs_hash
    }
    console.log(hands[i])
    const tx = await holdemHeroes.reveal(hands[i], i, ipfsProvHash, {
      from: admin,
    })
    const numInThis = hands[i].length
    uploaded = uploaded + numInThis
    console.log(`tx ${i+1}/${hands.length} sent`, tx.tx, tx.receipt.gasUsed, numInThis, uploaded )
    console.log( "BatchRevealed", tx.receipt.logs[0].args.batchId.toString(), tx.receipt.logs[0].args.startHandId.toString(), "-", tx.receipt.logs[0].args.endHandId.toString(), tx.receipt.logs[0].args.batchHash )

    batchesRevealed[tx.receipt.logs[0].args.batchHash] = hands[i]
    batchesRevealed.last_batch_revealed = i

    utils.saveRevealedBatches( network, batchesRevealed )
  }

  revealed = await holdemHeroes.REVEALED()
  console.log("revealed", revealed)

  console.log("init complete")
  callback()
}
