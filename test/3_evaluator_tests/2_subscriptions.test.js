const { expect } = require("chai")

const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")

const PokerHandEvaluator = artifacts.require("PokerHandEvaluator") // Loads a compiled contract
const PokerHandEvaluatorSubscriber = artifacts.require("PokerHandEvaluatorSubscriber") // Loads a compiled contract

contract("PokerHandEvaluator - subscriptions", async function(accounts) {
  describe('should succeed', function() {

    beforeEach(async function () {
      this.pokerHandEvaluator = await PokerHandEvaluator.new(0)
      this.pokerHandEvaluatorSubscriber = await PokerHandEvaluatorSubscriber.new(this.pokerHandEvaluator.address)
    })

    it("can setSubscriptionFee", async function () {
      const receipt = await this.pokerHandEvaluator.setSubscriptionFee(1)
      expectEvent(receipt, "SubscriptionFeeSet", {
        setBy: accounts[0],
        oldValue: new BN(0),
        newValue: new BN(1)
      })
      const subscriptionFee = await this.pokerHandEvaluator.subscriptionFee()
      expect(subscriptionFee).to.be.bignumber.eq(new BN(1))
    })

    it("can subscribe for contract", async function () {
      const subscriptionFee = await this.pokerHandEvaluator.subscriptionFee()
      const receipt = await this.pokerHandEvaluator.subscribe(this.pokerHandEvaluatorSubscriber.address, {from: accounts[1], value: subscriptionFee})
      expectEvent(receipt, "Subscribed", {
        sender: accounts[1],
        subscriber: this.pokerHandEvaluatorSubscriber.address,
        fee: subscriptionFee,
      })
      const isSubscribed = await this.pokerHandEvaluator.subscribers(this.pokerHandEvaluatorSubscriber.address)
      expect(isSubscribed).to.be.eq(true)
    })

    it("owner can ownerAddSubscriber", async function () {
      const receipt = await this.pokerHandEvaluator.ownerAddSubscriber(this.pokerHandEvaluatorSubscriber.address, {from: accounts[0]})
      expectEvent(receipt, "Subscribed", {
        sender: accounts[0],
        subscriber: this.pokerHandEvaluatorSubscriber.address,
        fee: new BN(0),
      })
      const isSubscribed = await this.pokerHandEvaluator.subscribers(this.pokerHandEvaluatorSubscriber.address)
      expect(isSubscribed).to.be.eq(true)
    })

    it("subscriber can get data", async function () {
      await this.pokerHandEvaluator.ownerAddSubscriber(this.pokerHandEvaluatorSubscriber.address, {from: accounts[0]})
      const rank = await this.pokerHandEvaluatorSubscriber.calculateHandRank([1, 2, 3, 4, 5])
      expect(rank).to.be.bignumber.eq(new BN(0))
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('should fail', function() {
    before(async function () {
      this.pokerHandEvaluator = await PokerHandEvaluator.new(1)
    })

    it("only owner can setSubscriptionFee", async function () {
      await expectRevert(
        this.pokerHandEvaluator.setSubscriptionFee(2, { from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
      const subscriptionFee = await this.pokerHandEvaluator.subscriptionFee()
      expect(subscriptionFee).to.be.bignumber.eq(new BN(1))
    })

    it("cannot subscribe for eoa", async function () {
      const subscriptionFee = await this.pokerHandEvaluator.subscriptionFee()
      await expectRevert(
        this.pokerHandEvaluator.subscribe(accounts[1], {from: accounts[1], value: subscriptionFee}),
        "can only subscribe for contract",
      )

      const isSubscribed = await this.pokerHandEvaluator.subscribers(accounts[1])
      expect(isSubscribed).to.be.eq(false)
    })

    it("only owner can ownerAddSubscriber", async function () {
      const pheSubs = await PokerHandEvaluatorSubscriber.new(this.pokerHandEvaluator.address)
      await expectRevert(
        this.pokerHandEvaluator.ownerAddSubscriber(pheSubs.address, { from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
      const isSubscribed = await this.pokerHandEvaluator.subscribers(pheSubs.address)
      expect(isSubscribed).to.be.eq(false)
    })

    it("can only subscribe once", async function () {
      const pheSubs = await PokerHandEvaluatorSubscriber.new(this.pokerHandEvaluator.address)
      const subscriptionFee = await this.pokerHandEvaluator.subscriptionFee()
      await this.pokerHandEvaluator.subscribe(pheSubs.address, {from: accounts[1], value: subscriptionFee})

      await expectRevert(
        this.pokerHandEvaluator.subscribe(pheSubs.address, {from: accounts[1], value: subscriptionFee}),
        "already subscribed",
      )
      await expectRevert(
        this.pokerHandEvaluator.ownerAddSubscriber(pheSubs.address, {from: accounts[0]}),
        "already subscribed",
      )

      const isSubscribed = await this.pokerHandEvaluator.subscribers(pheSubs.address)
      expect(isSubscribed).to.be.eq(true)
    })

    it("non subscriber cannot get data", async function () {
      await expectRevert(
        this.pokerHandEvaluator.calculateHandRank([1, 2, 3, 4, 5]),
        "not subscribed",
      )
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })
})
