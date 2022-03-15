const { expect } = require("chai")

const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")
const { handEvalUploadJson } = require( "../helpers/test_data" )

const PokerHandEvaluator = artifacts.require("PokerHandEvaluator") // Loads a compiled contract
const PokerHandEvaluatorSubscriber = artifacts.require("PokerHandEvaluatorSubscriber") // Loads a compiled contract

contract("PokerHandEvaluator - withdrawals", async function(accounts) {

  const subFee = 10

  describe('should succeed', function() {

    before(async function () {
      this.pokerHandEvaluator = await PokerHandEvaluator.new(subFee)
      this.pokerHandEvaluatorSubscriber = await PokerHandEvaluatorSubscriber.new(this.pokerHandEvaluator.address)
      await this.pokerHandEvaluator.subscribe(this.pokerHandEvaluatorSubscriber.address, {from: accounts[1], value: subFee})
    })

    it("owner can withdrawETH", async function () {
      const receipt = await this.pokerHandEvaluator.withdrawETH({from: accounts[0]})
      expectEvent(receipt, "EthWithdrawn", {
        recipient: accounts[0],
        amount: new BN(subFee)
      })
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('should fail', function() {
    before(async function () {
      this.pokerHandEvaluator = await PokerHandEvaluator.new(subFee)
      this.pokerHandEvaluatorSubscriber = await PokerHandEvaluatorSubscriber.new(this.pokerHandEvaluator.address)
      await this.pokerHandEvaluator.subscribe(this.pokerHandEvaluatorSubscriber.address, {from: accounts[1], value: subFee})
    })

    it("only owner can withdrawETH", async function () {
      await expectRevert(
        this.pokerHandEvaluator.withdrawETH({ from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
    })

    it("must have balance", async function () {
      await this.pokerHandEvaluator.withdrawETH({from: accounts[0]})
      await expectRevert(
        this.pokerHandEvaluator.withdrawETH({ from: accounts[0] }),
        "noting to withdraw",
      )
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })
})
