require("dotenv").config()
const PlayingCards = artifacts.require("PlayingCards")
const utils = require('./utils')

module.exports = function(deployer, network) {
  const contractAddresses = utils.getContractAddresses(network)
  deployer.then(async () => {

    await deployer.deploy(
      PlayingCards,
    )

    if(contractAddresses[network]) {
      contractAddresses[network].playing_cards = PlayingCards.address
    } else {
      contractAddresses[network] = {
        playing_cards: PlayingCards.address,
      }
    }

    utils.writeContractAddresses(contractAddresses, network)
  })
}
