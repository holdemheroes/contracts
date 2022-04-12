require("dotenv").config()
const HoldemHeroesL2 = artifacts.require("HoldemHeroesL2")
const utils = require('./utils')
const netConfigs = require("../config.json")

module.exports = function(deployer, network) {
  const contractAddresses = utils.getContractAddresses(network)
  deployer.then(async () => {

    let parentHeh
    let startIdx
    let parentNetworkId
    const playingCardsAddress = contractAddresses[network].playing_cards

    switch (network) {
      case "polygon_mumbai":
        parentHeh = contractAddresses["rinkeby"].holdem_heroes_nft
        startIdx = 232
        parentNetworkId = 4
        break
      case "polygon":
        parentHeh = contractAddresses["mainnet"].holdem_heroes_nft
        startIdx = 1078
        parentNetworkId = 1
        break
      default:
        console.log(`${network} not supported yet`)
        return
    }

    await deployer.deploy(
      HoldemHeroesL2,
      startIdx,
      parentHeh,
      parentNetworkId,
      playingCardsAddress,
    )

    if(contractAddresses[network]) {
      contractAddresses[network].holdem_heroes_nft = HoldemHeroesL2.address
      contractAddresses[network].xfund = netConfigs.networks[network].addresses.xfund
      contractAddresses[network].vor = netConfigs.networks[network].addresses.vor
    } else {
      contractAddresses[network] = {
        holdem_heroes_nft: HoldemHeroesL2.address,
        xfund: netConfigs.networks[network].addresses.xfund,
        vor: netConfigs.networks[network].addresses.vor,
      }
    }

    utils.writeContractAddresses(contractAddresses, network)
  })
}
