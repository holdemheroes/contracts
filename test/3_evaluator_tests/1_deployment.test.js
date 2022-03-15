const { expect } = require("chai")

const {
  BN, // Big Number support
} = require("@openzeppelin/test-helpers")

const PokerHandEvaluator = artifacts.require("PokerHandEvaluator") // Loads a compiled contract
contract("PokerHandEvaluator - deploy", async function(accounts) {
  describe('should succeed', function() {
    it("can deploy", async function () {
      const pokerHandEvaluator = await PokerHandEvaluator.new(1, {from: accounts[0]})
      expect(pokerHandEvaluator.address).to.not.be.eq("0x0000000000000000000000000000000000000000")
      const owner = await pokerHandEvaluator.owner()
      expect(owner).to.be.eq(accounts[0])
      const subscriptionFee = await pokerHandEvaluator.subscriptionFee()
      expect(subscriptionFee).to.be.bignumber.eq(new BN(1))
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })
})
