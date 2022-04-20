require("dotenv").config()
const HoldemHeroes = artifacts.require("HoldemHeroes")
const utils = require('./utils')
const netConfigs = require("../config.json")

module.exports = function(deployer, network) {
  const contractAddresses = utils.getContractAddresses(network)
  deployer.then(async () => {

    // Mainnet Deployment times
    const saleStartBlockNum = 14622300 // block # Estimated Target Date: Wed Apr 20 2022 14:02:24 GMT+0000
    const revealTimestamp = 1650722400 // Sat Apr 23 2022 14:00:00 GMT+0000
    const maxNftsPerTxOrAddress = 9

    // CRISP
    const targetBlocksPerSale = 14
    const saleHalflife = 196
    const priceSpeed = 1 // must be an integer > 0. For fractions, set priceSpeedDenominator to a value > 1
    const priceSpeedDenominator = 4 // divide priceSpeed by this. E.g. priceSpeed=1, denominator=4, final speed = 0.25
    const priceHalflife = 196
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
      priceSpeedDenominator,
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
