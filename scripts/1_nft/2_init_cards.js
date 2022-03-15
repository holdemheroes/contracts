require("dotenv").config()
const HoldemHeroes = artifacts.require("HoldemHeroes")
const HoldemHeroesL2 = artifacts.require("HoldemHeroesL2")

module.exports = async function(callback) {
  console.log("deprecated - cards auto initialised in PlayingCards contract")
  // const network = config.network
  //
  // let holdemHeroes
  //
  // if(network === "polygon" || network === "polygon_mumbai") {
  //   holdemHeroes = await HoldemHeroesL2.deployed()
  // } else {
  //   holdemHeroes = await HoldemHeroes.deployed()
  // }
  //
  // const accounts = await web3.eth.getAccounts()
  // const admin = accounts[0]
  //
  // try {
  //   const tx = await holdemHeroes.initCards( {
  //     from: admin,
  //   } )
  //   console.log( `tx sent`, tx.tx, tx.receipt.gasUsed )
  //
  //   const initialised = await holdemHeroes.CARDS_INITIALISED()
  //
  //   if ( initialised ) {
  //     console.log( "cards initialised" )
  //   } else {
  //     console.log( "something went wrong. Check tx" )
  //   }
  // } catch(e) {
  //   console.log(e)
  // }
  callback()
}
