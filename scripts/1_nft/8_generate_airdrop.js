require("dotenv").config()
const utils = require('../utils/utils')
const path = require( "path" )
const fs = require( "fs" )
const HoldemHeroes = artifacts.require("HoldemHeroes")

module.exports = async function(callback) {

  const network = config.network
  let targetNetwork = ""
  let startFromBlock = 0
  const batchSize = 50
  const tokenIds = []
  const owners = []

  const airdropDump = {
    parent: network,
    batches: [],
    done_batches: [],
  }

  const holdemHeroes = await HoldemHeroes.deployed()

  airdropDump.parentAddress = holdemHeroes.address

  switch(network) {
    case "rinkeby":
      targetNetwork = "polygon_mumbai"
      startFromBlock = 9417934	 // block contract was created
      airdropDump.parentId = 4
      break
    case "mainnet":
      targetNetwork = "polygon"
      startFromBlock = 0
      airdropDump.parentId = 1
      break
    default:
      console.log(`${network} not supported for airdrop`)
      callback()
  }

  try {

    let latestBlock = await web3.eth.getBlockNumber()
    let fromBlock = startFromBlock

    while(fromBlock <= latestBlock) {
      const toBlock = fromBlock + 100000
      console.log("from", fromBlock, "to", toBlock)

      // get mints (transfers from address 0x0)
      const mints = await holdemHeroes.getPastEvents(
        "Transfer",
        {
          filter: {from: "0x0000000000000000000000000000000000000000"},
          fromBlock: fromBlock,
          toBlock: toBlock,
        }
      )

      for(let i = 0; i < mints.length; i += 1) {
        const m = mints[i]
        tokenIds.push(m.returnValues.tokenId)
        owners.push(m.returnValues.to)
        console.log(`${m.returnValues.to} minted #${m.returnValues.tokenId}`)
      }

      fromBlock = toBlock
      latestBlock = await web3.eth.getBlockNumber()
    }

    const totalSupply = await holdemHeroes.totalSupply()

    console.log("totalSupply", totalSupply.toString())

    let batchId = 0

    while(tokenIds.length) {
      const b = {
        id: batchId,
        tokenIds: tokenIds.splice(0,batchSize),
        owners: owners.splice(0,batchSize),
      }
      airdropDump.batches.push(b)
      batchId += 1
    }

    utils.writeAirdropJson(airdropDump, targetNetwork)

  } catch(e) {
    console.log(e)
  }

  callback()

}
