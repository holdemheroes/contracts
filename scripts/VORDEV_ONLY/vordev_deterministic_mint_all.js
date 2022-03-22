require("dotenv").config()
const utils = require( "../utils/utils" )
const HoldemHeroes = artifacts.require("HoldemHeroesTestableDistribution")

module.exports = async function(callback) {
  const newtworkType = await web3.eth.net.getNetworkType();
  if(newtworkType !== "private") {
    console.log("run with Ganache or vordev")
    process.exit(1)
  }

  const accounts = await web3.eth.getAccounts()

  const minters = []
  for(let i = 1; i < accounts.length; i += 1) {
    minters.push(accounts[i])
  }

  const contractAddresses = utils.getContractAddresses()
  const hh = await new web3.eth.Contract(HoldemHeroes.abi, contractAddresses["vordev"].holdem_heroes_nft)

  try {

    const nftPrice = await hh.methods.getNftPrice().call()

    // mint NFTs
    for(let i = 0; i < 1326; i += 1) {
      const m = i % minters.length
      const tx = await hh.methods.mintNFTPostReveal( i ).send({ value: nftPrice, from: minters[m] })

      if(tx.transactionHash) {
        console.log( `tx sent to mint token ${i} for ${web3.utils.fromWei(nftPrice)} ETH`, tx.transactionHash, tx.gasUsed )
      } else {
        console.log(tx)
      }
    }

    callback()

  } catch(e) {
    console.log(e)
  }
}
