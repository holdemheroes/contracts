require("dotenv").config()
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator")
const utils = require('./utils')

module.exports = function(deployer, network) {
  const contractAddresses = utils.getContractAddresses()
  const subFee = "100000000000000000" // 0.1 Ether
  deployer.then(async () => {
    await deployer.deploy(PokerHandEvaluator, subFee)

    if(contractAddresses[network]) {
      contractAddresses[network].hand_evaluator = PokerHandEvaluator.address
    }

    utils.writeContractAddresses(contractAddresses)
  })
}
