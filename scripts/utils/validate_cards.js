require("dotenv").config()
const utils = require('./utils')
const HoldemHeroes = artifacts.require("HoldemHeroes")

module.exports = async function(callback) {
  const holdemHeroes = await HoldemHeroes.deployed()

  const network = config.network
  const provenance = utils.getProvenanceJson(network)
  const provCards = provenance.cards

  console.log(`validate cards for ${holdemHeroes.address} on ${network}`)

  for(let i = 0; i < 52; i += 1) {

    const prov = provCards.cards_as_idxs[i]
    const chainCard = await holdemHeroes.getCardAsComponents( i )

    const provCardName = `${provCards.numbers[prov.n]}${provCards.suits[prov.s]}`
    const chainCardName = await holdemHeroes.getCardAsString( i )

    console.log("card ID         :", i)
    console.log("on chain number :", chainCard.number.toNumber())
    console.log("prov number     :", prov.n)
    console.log("on chain suit   :", chainCard.suit.toNumber())
    console.log("prov suit       :", prov.s)
    console.log("on chain name   :", chainCardName)
    console.log("prov name       :", provCardName)

    const suitsMatch = chainCard.suit.toNumber() === prov.s
    const numbersMatch = chainCard.number.toNumber() === prov.n
    const namesMatch = chainCardName === provCardName

    if(!suitsMatch || !numbersMatch || !namesMatch) {
      if(!suitsMatch) {
        console.log( "Error: suit mismatch" )
      }
      if(!numbersMatch) {
        console.log( "Error: number mismatch" )
      }
      if(!namesMatch) {
        console.log( "Error: name mismatch" )
      }
      process.exit(1)
    }

    console.log("all match :)")
    console.log("----------------------------")
  }


  console.log("done")

  callback()
}
