require("dotenv").config()
const utils = require('../utils/utils')
const HoldemHeroesL2 = artifacts.require("HoldemHeroesL2")

module.exports = async function(callback) {

  const network = config.network

  const accounts = await web3.eth.getAccounts()
  const admin = accounts[0]

  const holdemHeroes = await HoldemHeroesL2.deployed()

  const airdrop = utils.getAirdropJson(network)

  try {
    const onChainParentAddress = await holdemHeroes.parentChainContractAddress()

    if(onChainParentAddress !== airdrop.parentAddress) {
      console.log("address mismatch")
      console.log("l1", airdrop.parentAddress)
      console.log("l2", onChainParentAddress)
    }

    for(let i = 0; i < airdrop.batches.length; i += 1) {
      const b = airdrop.batches[i]

      console.log(`process batch id ${i}`)
      /// ToDo - check done_batches and skip if required

      const tx = await holdemHeroes.airdrop( b.tokenIds, b.owners, {
        from: admin,
      } )
      console.log( `tx sent`, tx.tx, tx.receipt.gasUsed )

      const res = {
        id: b.id,
        tx: tx.tx,
        gas: tx.receipt.gasUsed,
      }

      airdrop.done_batches.push(res)
    }


    utils.writeAirdropJson(airdrop, network)

  } catch(e) {
    console.log(e)
  }

  callback()

}
