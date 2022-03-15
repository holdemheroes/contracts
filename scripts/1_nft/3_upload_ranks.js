const utils = require( "../utils/utils" )
require("dotenv").config()
const HoldemHeroes = artifacts.require("HoldemHeroes")
const HoldemHeroesL2 = artifacts.require("HoldemHeroesL2")

module.exports = async function(callback) {
  const network = config.network

  let holdemHeroes

  if(network === "polygon" || network === "polygon_mumbai") {
    holdemHeroes = await HoldemHeroesL2.deployed()
  } else {
    holdemHeroes = await HoldemHeroes.deployed()
  }

  const accounts = await web3.eth.getAccounts()
  const admin = accounts[0]

  const uploadJson = utils.getUploadJson(network)
  console.log(`Upload ranks for ${network}`)

  const rankHashes = []
  const ranks = []

  for(let i = 0; i < uploadJson.ranks.length; i += 1) {
    rankHashes.push(uploadJson.ranks[i].hash)
    ranks.push(uploadJson.ranks[i].rank)
  }

  try {
    const tx = await holdemHeroes.uploadHandRanks( rankHashes, ranks, {
      from: admin,
    } )
    console.log( `tx sent`, tx.tx, tx.receipt.gasUsed )

    const ranksUploaded = await holdemHeroes.RANKS_UPLOADED()

    if ( ranksUploaded ) {
      console.log( "ranks upload complete" )
    } else {
      console.log( "something went wrong. Check tx" )
    }
  } catch(e) {
    console.log(e)
  }

  callback()
}
