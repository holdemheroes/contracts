require("dotenv").config()
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")
const utils = require('./utils')
const netConfigs = require( "../config.json" )

module.exports = function(deployer, network) {
  const contractAddresses = utils.getContractAddresses()

  const maxConcurrentGames = 5
  const roundTime = 3600

  deployer.then(async () => {
    await deployer.deploy(
      TexasHoldemV1,
      netConfigs.networks[network].addresses.xfund,
      netConfigs.networks[network].addresses.vor,
      contractAddresses[network].holdem_heroes_nft,
      contractAddresses[network].hand_evaluator,
      maxConcurrentGames,
      roundTime,
      netConfigs.networks[network].vor_key_hash,
      netConfigs.networks[network].vor_fee
    )

    if(contractAddresses[network]) {
      contractAddresses[network].texas_holdem_v1 = TexasHoldemV1.address
    }

    utils.writeContractAddresses(contractAddresses)
  })
}
