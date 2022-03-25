require("dotenv").config()
const HoldemHeroes = artifacts.require("HoldemHeroes")
const utils = require('./utils')
const netConfigs = require("../config.json")

module.exports = function(deployer, network) {
  const contractAddresses = utils.getContractAddresses(network)
  deployer.then(async () => {

    // TODO - SET THESE VALUES FOR TARGET NETWORK
    const saleStartBlockNum = 10376490 // block 0
    const revealTimestamp = Math.floor(Date.now() / 1000) + 345600 // in 96 hours
    const maxNftsPerTxOrAddress = 1326 // 1326 for Rinkeby/Vordev ONLY. For MN, use 6

    // CRISP
    const targetBlocksPerSale = 20
    const saleHalflife = 400
    const priceSpeed = 1
    const priceHalflife = 400
    const startingPrice = web3.utils.toWei("0.1", "ether")

    await deployer.deploy(
      HoldemHeroes,
      netConfigs.networks[network].addresses.vor,
      netConfigs.networks[network].addresses.xfund,
      contractAddresses[network].playing_cards,
      saleStartBlockNum,
      revealTimestamp,
      maxNftsPerTxOrAddress,
      targetBlocksPerSale,
      saleHalflife,
      priceSpeed,
      priceHalflife,
      startingPrice
    )

    if(contractAddresses[network]) {
      contractAddresses[network].holdem_heroes_nft = HoldemHeroes.address
      contractAddresses[network].xfund = netConfigs.networks[network].addresses.xfund
      contractAddresses[network].vor = netConfigs.networks[network].addresses.vor
    } else {
      contractAddresses[network] = {
        holdem_heroes_nft: HoldemHeroes.address,
        xfund: netConfigs.networks[network].addresses.xfund,
        vor: netConfigs.networks[network].addresses.vor,
      }
    }

    utils.writeContractAddresses(contractAddresses, network)
  })
}
