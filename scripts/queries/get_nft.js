const path = require( "path" )
const fs = require( "fs" )
const utils = require( "../utils/utils" )
require("dotenv").config()
const HoldemHeroes = artifacts.require("HoldemHeroes")

module.exports = async function(callback) {
  const network = config.network
  const nftDecodedDumpPath = path.resolve(__dirname, "../../data/networks", network, "nft_dump/decoded")
  const nftRawDumpPath = path.resolve(__dirname, "../../data/networks", network, "nft_dump/raw")
  await fs.promises.mkdir(nftDecodedDumpPath, { recursive: true })
  await fs.promises.mkdir(nftRawDumpPath, { recursive: true })

  const contractAddresses = utils.getContractAddresses()

  const holdemHeroes = await new web3.eth.Contract(HoldemHeroes.abi, contractAddresses[network].holdem_heroes_nft)

  for(let i = 0; i < 1326; i += 1) {
    const nft = await holdemHeroes.methods.tokenURI(i).call()
    const nftBase64 = nft.replace("data:application/json;base64,", "")
    const buff = new Buffer(nftBase64, "base64")
    const text = buff.toString("ascii")
    const nftJson = JSON.stringify(JSON.parse(text), null, 2)
    const nftDecodedFile = path.resolve(nftDecodedDumpPath, `${i}.json`)
    const nftRawFile = path.resolve(nftRawDumpPath, `${i}.txt`)
    console.log("writing", i)
    fs.writeFileSync(nftDecodedFile, nftJson)
    fs.writeFileSync(nftRawFile, nft)
  }

  callback()
}
