require("dotenv").config()
const utils = require('./utils')
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
  
  const provenance = utils.getProvenanceJson(network)

  let chainHashesConcat = ""
  let provHashesConcat = ""
  console.log(`validate hand hashes for ${holdemHeroes.address} on ${network}`)

  for(let i = 0; i < 1326; i += 1) {

    const prov = provenance.hands[i]
    const pHash = prov.hash
    const pHandStr = prov.name
    const pHandShape = prov.shape
    const pHandHand = prov.hand
    const pHandRank = prov.rank
    const chainHandHash = await holdemHeroes.getHandHash( i )
    const chainHandStr = await holdemHeroes.getHandAsString(i)
    const chainHandShape = await holdemHeroes.getHandShape(i, false)
    const chainHandHand = await holdemHeroes.getHandName(i)
    const chainHandRank = (await holdemHeroes.getHandRank(i)).toNumber()

    const strMatch = (pHandStr === chainHandStr)
    const hashMatch = (pHash === chainHandHash)
    const shapeMatch = (chainHandShape === pHandShape)
    const handMatch = (chainHandHand === pHandHand)
    const rankMatch = (chainHandRank === pHandRank)

    console.log("hand ID         :", i)
    console.log("on chain str    :", chainHandStr)
    console.log("prov json str   :", pHandStr)
    console.log("name match      :", strMatch)
    console.log("on chain hash   :", chainHandHash)
    console.log("prov json hash  :", pHash)
    console.log("hash match      :", hashMatch)
    console.log("on chain shape  :", chainHandShape)
    console.log("prov json shape :", pHandShape)
    console.log("shape match     :", shapeMatch)
    console.log("on chain hand   :", chainHandHand)
    console.log("prov json hand  :", pHandHand)
    console.log("hand match      :", handMatch)
    console.log("on chain rank   :", chainHandRank)
    console.log("prov json rank  :", pHandRank)
    console.log("rank match      :", rankMatch)

    chainHashesConcat += utils.stripHexPrefix(chainHandHash)
    provHashesConcat += utils.stripHexPrefix(pHash)

    if(!strMatch || !hashMatch || !shapeMatch || !handMatch || !rankMatch) {
      if(!strMatch) {
        console.log( "Error: str mismatch" )
      }
      if(!hashMatch) {
        console.log( "Error: hash mismatch" )
      }
      if(!shapeMatch) {
        console.log( "Error: shape mismatch" )
      }
      if(!handMatch) {
        console.log( "Error: hand mismatch" )
      }
      if(!rankMatch) {
        console.log( "Error: rank mismatch" )
      }
      process.exit(1)
    }
    console.log("all match :)")
    console.log("----------------------------")
  }

  const concatMatch1 = (chainHashesConcat === provHashesConcat)
  console.log("concatMatch1", concatMatch1)
  const concatMatch2 = (chainHashesConcat === provenance.hand_hashes_concat)
  console.log("concatMatch2", concatMatch2)
  const concatMatch3 = (provHashesConcat === provenance.hand_hashes_concat)
  console.log("concatMatch3", concatMatch3)

  console.log("gen chain concat   :", chainHashesConcat.length)
  console.log("gen prov concat    :", provHashesConcat.length)
  console.log("source prov concat :", provenance.hand_hashes_concat.length)

  const chainProvenanceCalculated = web3.utils.soliditySha3(chainHashesConcat)
  const provProvenanceCalculated = web3.utils.soliditySha3(provHashesConcat)
  const provFromProvJsonConcat = web3.utils.soliditySha3(provenance.hand_hashes_concat)
  const chainProvenance = await holdemHeroes.HAND_PROVENANCE()

  console.log("calculated provenance :", chainProvenanceCalculated)
  console.log("prov calc provenance  :", provProvenanceCalculated)
  console.log("prov json concat      :", provFromProvJsonConcat)
  console.log("on-chain provenance   :", chainProvenance)
  console.log("prov json provenance  :", provenance.provenance)

  const checks = [chainProvenanceCalculated, provProvenanceCalculated, provFromProvJsonConcat, chainProvenance, provenance.provenance]

  for(let i = 0; i < checks.length; i += 1) {
    for(let j = 0; j < checks.length; j += 1) {
      if(i !== j) {
        const c1 = checks[i]
        const c2 = checks[j]
        if(c1 !== c2) {
          console.log("provenance hash mismatch!", c1, c2)
          process.exit(1)
        }
      }
    }
  }

  console.log("all provenance hashes match :)")
  console.log("done")

  callback()
}
