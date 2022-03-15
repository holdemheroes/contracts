const path = require( "path" )
const fs = require( "fs" )
const utils = require( "../utils/utils" )
require("dotenv").config()
const HoldemHeroes = artifacts.require("HoldemHeroes")

module.exports = async function(callback) {

    const network = config.network

    const contractAddresses = utils.getContractAddresses()

    const holdemHeroes = await new web3.eth.Contract(HoldemHeroes.abi, contractAddresses[network].holdem_heroes_nft)

    const startIndex = await holdemHeroes.methods.startingIndex().call()

    console.log(`${network} startIndex: ${startIndex.toString()}`)

    callback()
}
