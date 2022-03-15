require("dotenv").config()
const HoldemHeroes = artifacts.require("HoldemHeroes")
const path = require( "path" )
const fs = require( "fs" )
const utils = require( "../utils/utils" )

const cardSvgDir = path.resolve(__dirname, "../../data/svgs/cards")
const handSvgDir = path.resolve(__dirname, "../../data/svgs/hands")

module.exports = async function(callback) {
  const contractAddresses = utils.getContractAddresses()
  const holdemHeroes = await new web3.eth.Contract(HoldemHeroes.abi, contractAddresses["vordev"].holdem_heroes_nft)

  await fs.promises.mkdir(cardSvgDir, { recursive: true })
  await fs.promises.mkdir(handSvgDir, { recursive: true })

  console.log("write card SVGs")
  for(let i = 0; i < 52; i += 1) {
    const cardName = await holdemHeroes.methods.getCardAsString(i).call()
    const cardSvg = await holdemHeroes.methods.getCardAsSvg(i).call()
    const cardAsNameSvgFile = path.resolve(cardSvgDir, `${cardName}.svg`)
    const cardAsIdSvgFile = path.resolve(cardSvgDir, `${i}.svg`)
    console.log("writing", cardAsNameSvgFile)
    fs.writeFileSync(cardAsNameSvgFile, cardSvg)
    fs.writeFileSync(cardAsIdSvgFile, cardSvg)
  }

  console.log("write hand SVGs")
  for(let i = 0; i < 1326; i += 1) {
    const handName = await holdemHeroes.methods.getHandAsString( i ).call()
    const handSvg = await holdemHeroes.methods.getHandAsSvg(i).call()
    const handAsNameSvgFile = path.resolve(handSvgDir, `${handName}.svg`)
    const handAsIdSvgFile = path.resolve(handSvgDir, `${i}.svg`)
    console.log("writing", handAsNameSvgFile)
    fs.writeFileSync(handAsNameSvgFile, handSvg)
    fs.writeFileSync(handAsIdSvgFile, handSvg)
  }

  console.log("done")

  callback()
}
