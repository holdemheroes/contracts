const { expect } = require("chai")
const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")

const { devAddresses, vorDevConfig } = require("../helpers/test_data")

const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const HoldemHeroes = artifacts.require("HoldemHeroes") // Loads a compiled contract
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator") // Loads a compiled contract

contract("TexasHoldemV1 - deploy", async function(accounts) {
  describe('should succeed', function() {

    const pheSubFee = 1

    before(async function () {
      const saleStart = Math.floor(Date.now() / 1000)
      this.playingCards = await PlayingCards.new()

      this.holdemHeroes = await HoldemHeroes.new(devAddresses.vor, devAddresses.xfund, this.playingCards.address, saleStart, 1, 0, 5)
      this.pokerHandEvaluator = await PokerHandEvaluator.new(pheSubFee)
      this.texasHoldem = null
    })

    it("can deploy with correct params", async function () {
      this.texasHoldem = await TexasHoldemV1.new(
        devAddresses.xfund,
        devAddresses.vor,
        this.holdemHeroes.address,
        this.pokerHandEvaluator.address,
        5,
        3600,
        vorDevConfig.vor_key_hash,
        vorDevConfig.vor_fee)

      expect(this.texasHoldem.address).to.not.be.eq("0x0000000000000000000000000000000000000000")
    })

    it("can subscribe to PHE data", async function () {
      const receipt = await this.pokerHandEvaluator.subscribe(this.texasHoldem.address, {from: accounts[1], value: pheSubFee})
      expectEvent(receipt, "Subscribed", {
        sender: accounts[1],
        subscriber: this.texasHoldem.address,
        fee: new BN(pheSubFee),
      })
      const isSubscribed = await this.pokerHandEvaluator.subscribers(this.texasHoldem.address)
      expect(isSubscribed).to.be.eq(true)
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })
})

