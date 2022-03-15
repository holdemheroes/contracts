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

  const minters = []
  for(let i = 1; i < accounts.length; i += 1) {
    minters.push(accounts[i])
  }

  console.log("public mint")
  try {
    for ( let i = 1; i <= 250; i += 1 ) {
      const m = i % minters.length

      const numToMint = 5
      const nftPrice = await holdemHeroes.getNftPrice()
      const cost = nftPrice.mul(new web3.utils.BN(numToMint))
      const tx = await holdemHeroes.mintNFTPreReveal( numToMint, { value: cost, from: minters[m] } )
      if(tx.tx) {
        console.log( `tx ${i}/250 sent`, tx.tx, tx.receipt.gasUsed )
      } else {
        console.log(tx)
      }
    }
  } catch(e) {
    console.error(e)
  }

  const totalSupply = await holdemHeroes.totalSupply()

  console.log("minting complete. totalSupply:", totalSupply.toString())
  callback()
}
