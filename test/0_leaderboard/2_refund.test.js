const { expect } = require("chai")

const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")

const Leaderboard = artifacts.require("Leaderboard") // Loads a compiled contract
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator") // Loads a compiled contract

contract("Leaderboard - refunds", async function(accounts) {

  describe('should succeed', function() {

    before(async function () {
      this.pokerHandEvaluator = await PokerHandEvaluator.new(0)
      this.leaderboard = await Leaderboard.new(this.pokerHandEvaluator.address)
      this.FEE = await this.leaderboard.FEE()
    })

    it("add hands and fees", async function () {
      await this.leaderboard.mockPlayFinalHand(1, 3325, {from: accounts[0], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 3302, {from: accounts[1], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 5555, {from: accounts[2], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 3324, {from: accounts[3], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 8888, {from: accounts[4], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 500, {from: accounts[5], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 9999, {from: accounts[6], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 4444, {from: accounts[7], value: this.FEE})

      const game = await this.leaderboard.games(1)
      expect(game.totalPaidIn).to.be.bignumber.eq(this.FEE.mul(new BN(8)))

      const lbBalance = await web3.eth.getBalance(this.leaderboard.address)
      expect(lbBalance).to.be.bignumber.eq(this.FEE.mul(new BN(8)))
    })

    it("simulate ending stale game", async function () {

      let game = await this.leaderboard.games(1)
      expect(game.refundable).to.be.eq(false)

      const receipt = await this.leaderboard.endGame(1, true)

      expectEvent(receipt, "RefundableGame", {
        gameId: new BN(1),
      })

      game = await this.leaderboard.games(1)
      expect(game.refundable).to.be.eq(true)

    })

    it("accounts[0] can claimRefund", async function() {
      const player = accounts[0]
      const receipt = await this.leaderboard.claimRefund(1, {from: player})

      expectEvent(receipt, "Refunded", {
        gameId: new BN(1),
        player: player,
        amount: this.FEE,
      })

      expectEvent.notEmitted(receipt, "GameDeleted")

      const amountOwed = await this.leaderboard.userWithdrawables(player)
      expect(amountOwed).to.be.bignumber.eq(this.FEE)

      const game = await this.leaderboard.games(1)
      expect(game.totalPaidIn).to.be.bignumber.eq(this.FEE.mul(new BN(8)).sub(this.FEE))
    })

    it("accounts[1] can claimRefund", async function() {
      const player = accounts[1]
      const receipt = await this.leaderboard.claimRefund(1, {from: player})

      expectEvent(receipt, "Refunded", {
        gameId: new BN(1),
        player: player,
        amount: this.FEE,
      })

      expectEvent.notEmitted(receipt, "GameDeleted")

      const amountOwed = await this.leaderboard.userWithdrawables(player)
      expect(amountOwed).to.be.bignumber.eq(this.FEE)

      const game = await this.leaderboard.games(1)
      expect(game.totalPaidIn).to.be.bignumber.eq(this.FEE.mul(new BN(8)).sub(this.FEE.mul(new BN(2))))
    })

    it("accounts[2] can claimRefund", async function() {
      const player = accounts[2]
      const receipt = await this.leaderboard.claimRefund(1, {from: player})

      expectEvent(receipt, "Refunded", {
        gameId: new BN(1),
        player: player,
        amount: this.FEE,
      })

      expectEvent.notEmitted(receipt, "GameDeleted")

      const amountOwed = await this.leaderboard.userWithdrawables(player)
      expect(amountOwed).to.be.bignumber.eq(this.FEE)

      const game = await this.leaderboard.games(1)
      expect(game.totalPaidIn).to.be.bignumber.eq(this.FEE.mul(new BN(8)).sub(this.FEE.mul(new BN(3))))
    })

    it("accounts[3] can claimRefund", async function() {
      const player = accounts[3]
      const receipt = await this.leaderboard.claimRefund(1, {from: player})

      expectEvent(receipt, "Refunded", {
        gameId: new BN(1),
        player: player,
        amount: this.FEE,
      })

      expectEvent.notEmitted(receipt, "GameDeleted")

      const amountOwed = await this.leaderboard.userWithdrawables(player)
      expect(amountOwed).to.be.bignumber.eq(this.FEE)

      const game = await this.leaderboard.games(1)
      expect(game.totalPaidIn).to.be.bignumber.eq(this.FEE.mul(new BN(8)).sub(this.FEE.mul(new BN(4))))
    })

    it("accounts[4] can claimRefund", async function() {
      const player = accounts[4]
      const receipt = await this.leaderboard.claimRefund(1, {from: player})

      expectEvent(receipt, "Refunded", {
        gameId: new BN(1),
        player: player,
        amount: this.FEE,
      })

      expectEvent.notEmitted(receipt, "GameDeleted")

      const amountOwed = await this.leaderboard.userWithdrawables(player)
      expect(amountOwed).to.be.bignumber.eq(this.FEE)

      const game = await this.leaderboard.games(1)
      expect(game.totalPaidIn).to.be.bignumber.eq(this.FEE.mul(new BN(8)).sub(this.FEE.mul(new BN(5))))
    })

    it("accounts[5] can claimRefund", async function() {
      const player = accounts[5]
      const receipt = await this.leaderboard.claimRefund(1, {from: player})

      expectEvent(receipt, "Refunded", {
        gameId: new BN(1),
        player: player,
        amount: this.FEE,
      })

      expectEvent.notEmitted(receipt, "GameDeleted")

      const amountOwed = await this.leaderboard.userWithdrawables(player)
      expect(amountOwed).to.be.bignumber.eq(this.FEE)

      const game = await this.leaderboard.games(1)
      expect(game.totalPaidIn).to.be.bignumber.eq(this.FEE.mul(new BN(8)).sub(this.FEE.mul(new BN(6))))
    })

    it("accounts[6] can claimRefund", async function() {
      const player = accounts[6]
      const receipt = await this.leaderboard.claimRefund(1, {from: player})

      expectEvent(receipt, "Refunded", {
        gameId: new BN(1),
        player: player,
        amount: this.FEE,
      })

      expectEvent.notEmitted(receipt, "GameDeleted")

      const amountOwed = await this.leaderboard.userWithdrawables(player)
      expect(amountOwed).to.be.bignumber.eq(this.FEE)

      const game = await this.leaderboard.games(1)
      expect(game.totalPaidIn).to.be.bignumber.eq(this.FEE)
    })

    it("accounts[7] can claimRefund", async function() {
      const player = accounts[7]
      const receipt = await this.leaderboard.claimRefund(1, {from: player})

      expectEvent(receipt, "Refunded", {
        gameId: new BN(1),
        player: player,
        amount: this.FEE,
      })

      // last player claims - game is deleted
      expectEvent(receipt, "GameDeleted", {
        gameId: new BN(1),
      })

      const amountOwed = await this.leaderboard.userWithdrawables(player)
      expect(amountOwed).to.be.bignumber.eq(this.FEE)

      const game = await this.leaderboard.games(1)
      expect(game.totalPaidIn).to.be.bignumber.eq(new BN(0))
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('should fail', function() {

    before( async function () {
      this.pokerHandEvaluator = await PokerHandEvaluator.new(0)
      this.leaderboard = await Leaderboard.new(this.pokerHandEvaluator.address)
      this.FEE = await this.leaderboard.FEE()
    } )

    it( "add hands and fees", async function () {
      await this.leaderboard.mockPlayFinalHand( 1, 24, { from: accounts[0], value: this.FEE } )
      await this.leaderboard.mockPlayFinalHand( 1, 25, { from: accounts[1], value: this.FEE } )
    } )

    it( "cannot claimRefund if game still valid", async function () {
      expectRevert(
        this.leaderboard.claimRefund(1, { from: accounts[0] } ),
        "game not refundable!"
      )
    } )

    it("simulate ending stale game", async function () {
      await this.leaderboard.endGame(1, true)
    })

    it( "cannot claimRefund if didn't play", async function () {
      expectRevert(
        this.leaderboard.claimRefund(1, { from: accounts[2] } ),
        "nothing paid in"
      )

      const withdrawable = await this.leaderboard.userWithdrawables(accounts[2])
      expect(withdrawable).to.be.bignumber.eq(new BN(0))

    } )

    it("...", async function () {
      expect(true).to.equal(true)
    })

  })
})
