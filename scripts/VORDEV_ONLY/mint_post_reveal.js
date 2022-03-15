require("dotenv").config()
const HoldemHeroes = artifacts.require("HoldemHeroes")

module.exports = async function(callback) {
  const newtworkType = await web3.eth.net.getNetworkType();
  if(newtworkType !== "private") {
    console.log("run with Ganache or vordev")
    process.exit(1)
  }

  const holdemHeroes = await HoldemHeroes.deployed()
  const accounts = await web3.eth.getAccounts()

  const nftPrice = await holdemHeroes.getNftPrice()
  try {
    const tx = await holdemHeroes.mintNFTPostReveal( 1327, { value: nftPrice, from: accounts[1] } )
    if(tx.tx) {
      console.log( `tx sent`, tx.tx )
    } else {
      console.log(tx)
    }
  } catch(e) {
    console.error(e)
  }

  const totalSupply = await holdemHeroes.totalSupply()

  console.log("minting complete. totalSupply:", totalSupply.toString())
  callback()
}
