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

  const nftPrice = await holdemHeroes.getNftPrice()

  for(let i = 0; i < 1326; i += 1) {
    try {
      const owner = await holdemHeroes.ownerOf(i)
      console.log(i, "owned by", owner)
    } catch (e) {
      console.log(i, "no owner -  attempt to mint")
      const m = i % minters.length
      const tx = await holdemHeroes.mintNFTPostReveal( i, { value: nftPrice, from: minters[m] } )
      if(tx.tx) {
        console.log( `tx sent to mint token ${i}`, tx.tx, tx.receipt.gasUsed )
      } else {
        console.log(tx)
      }
    }
  }

  callback()
}
