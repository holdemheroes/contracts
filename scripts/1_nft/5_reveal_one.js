require("dotenv").config()
const utils = require('../utils/utils')
const HoldemHeroes = artifacts.require("HoldemHeroes")
const HoldemHeroesL2 = artifacts.require("HoldemHeroesL2")

module.exports = async function(callback) {

  const batchToReveal = parseInt(process.argv[4], 10)

  const network = config.network

  let holdemHeroes

  if(network === "polygon" || network === "polygon_mumbai") {
    holdemHeroes = await HoldemHeroesL2.deployed()
  } else {
    holdemHeroes = await HoldemHeroes.deployed()
  }

  const accounts = await web3.eth.getAccounts()
  const admin = accounts[0]
  const contractAddresses = utils.getContractAddresses()

  let revealed = await holdemHeroes.REVEALED()
  if(revealed) {
    console.log("all hands revealed. Exiting")
    callback()
    process.exit(1)
  }

  const batchesRevealed = utils.getRevealedBatches(network)

  const uploadJson = utils.getUploadJson(network)
  const hands = uploadJson.hands

  const nextExpectedBatchId = (await holdemHeroes.nextExpectedBatchId()).toNumber()

  if(nextExpectedBatchId !== batchToReveal) {
    console.log(`expected batch ${nextExpectedBatchId}. Got ${batchToReveal}. Exiting`)
    callback()
    process.exit(1)
  }

  const handsToReveal = hands[batchToReveal]

  // save gas
  let ipfsProvHash = ""
  if(batchToReveal === 13) {
    ipfsProvHash = contractAddresses[network].provenance_ipfs_hash
  }

  console.log(handsToReveal)
  console.log(`Revealing ${batchToReveal} for ${network}, ipfs hash: ${ipfsProvHash}`)
  const tx = await holdemHeroes.reveal(handsToReveal, batchToReveal, ipfsProvHash, {
    from: admin,
  })
  if(tx.tx) {
    console.log( `tx sent`, tx.tx, tx.receipt.gasUsed )
    console.log( "BatchRevealed", tx.receipt.logs[0].args.startHandId.toString(), "-", tx.receipt.logs[0].args.endHandId.toString(), tx.receipt.logs[0].args.batchHash )

    batchesRevealed[tx.receipt.logs[0].args.batchHash] = handsToReveal
    batchesRevealed.last_batch_revealed = batchToReveal

    utils.saveRevealedBatches( network, batchesRevealed )
  } else {
    console.log(tx)
  }

  revealed = await holdemHeroes.REVEALED()
  const handUploadId = await holdemHeroes.handUploadId()
  console.log("revealed", revealed, "next handId", handUploadId.toString())
  if(!revealed) {
    console.log("next reveal", batchToReveal+1)
  }

  callback()
}
