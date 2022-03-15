const { expect } = require("chai")

const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")

const Leaderboard = artifacts.require("Leaderboard") // Loads a compiled contract
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator") // Loads a compiled contract

contract("Leaderboard - claim winnings", async function(accounts) {

  describe("10 players, one winner (60/40 pot), 9 runners up, small claimpot remainder", function() {

    const numPlayers             = 10
    const expectedTotalPaidIn    = new BN("1000000000000000000") // 1 eth
    const expectedHouseCut       = new BN("25000000000000003")  // 2.5% of 1000000000000000000 + 3 wei remainder
    const expectedWinnerAmount   = new BN("585000000000000000") // 60% of 975000000000000000
    const expectedRunnerUpAmount = new BN("43333333333333333") // 40% of 975000000000000000 / 9

    before( async function () {
      this.pokerHandEvaluator = await PokerHandEvaluator.new(0)
      this.leaderboard = await Leaderboard.new(this.pokerHandEvaluator.address)
      this.FEE = await this.leaderboard.FEE()
    } )

    it("add hands and fees", async function () {
      await this.leaderboard.mockPlayFinalHand(1, 1, {from: accounts[0], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 11, {from: accounts[1], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 1111, {from: accounts[2], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 2222, {from: accounts[3], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 3333, {from: accounts[4], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 4444, {from: accounts[5], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 5555, {from: accounts[6], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 6666, {from: accounts[7], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 7777, {from: accounts[8], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 8888, {from: accounts[9], value: this.FEE})

      const game = await this.leaderboard.games(1)
      expect(game.totalPaidIn).to.be.bignumber.eq(expectedTotalPaidIn)

      const lbBalance = await web3.eth.getBalance(this.leaderboard.address)
      expect(lbBalance).to.be.bignumber.eq(expectedTotalPaidIn)
    })

    it("simulate ending game & calculate winnings", async function () {

      let game = await this.leaderboard.games(1)
      expect(game.refundable).to.be.eq(false)

      const receipt = await this.leaderboard.endGame(1, false)

      expectEvent.notEmitted(receipt, "RefundableGame")

      game = await this.leaderboard.games(1)
      expect(game.refundable).to.be.eq(false)

      // winner
      expectEvent(receipt, "WinningsCalculated", {
        gameId: new BN(1),
        player: accounts[0],
        winner: true,
        amount: expectedWinnerAmount,
      })

      const acc0Withdrawable = await this.leaderboard.userWithdrawables(accounts[0])
      expect(acc0Withdrawable).to.be.bignumber.eq(expectedWinnerAmount)

      // runners up
      for(let i = 1; i < numPlayers; i += 1) {
        expectEvent(receipt, "WinningsCalculated", {
          gameId: new BN(1),
          player: accounts[i],
          winner: false,
          amount: expectedRunnerUpAmount,
        })

        const accWithdrawable = await this.leaderboard.userWithdrawables(accounts[i])
        expect(accWithdrawable).to.be.bignumber.eq(expectedRunnerUpAmount)
      }

    })

    it("house cut is correct", async function() {
      const houseCut = await this.leaderboard.houseCut()
      expect(houseCut).to.be.bignumber.eq(expectedHouseCut)
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
    
  })

  describe("10 players, two joint winners, 8 runners up (70/30 pot)", function() {

    const numPlayers             = 10
    const expectedTotalPaidIn    = new BN("1000000000000000000") // 1 eth
    const expectedHouseCut       = new BN("25000000000000000")  // 2.5% of 1000000000000000000
    const expectedWinnerAmount   = new BN("341250000000000000") // 60% of 975000000000000000 / 2
    const expectedRunnerUpAmount = new BN("36562500000000000") // 30% of 975000000000000000 / 8

    before( async function () {
      this.pokerHandEvaluator = await PokerHandEvaluator.new(0)
      this.leaderboard = await Leaderboard.new(this.pokerHandEvaluator.address)
      this.FEE = await this.leaderboard.FEE()
    } )

    it("add hands and fees", async function () {
      await this.leaderboard.mockPlayFinalHand(1, 1, {from: accounts[0], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 1, {from: accounts[1], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 1111, {from: accounts[2], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 2222, {from: accounts[3], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 3333, {from: accounts[4], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 4444, {from: accounts[5], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 5555, {from: accounts[6], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 6666, {from: accounts[7], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 7777, {from: accounts[8], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 8888, {from: accounts[9], value: this.FEE})

      const game = await this.leaderboard.games(1)
      expect(game.totalPaidIn).to.be.bignumber.eq(expectedTotalPaidIn)

      const lbBalance = await web3.eth.getBalance(this.leaderboard.address)
      expect(lbBalance).to.be.bignumber.eq(expectedTotalPaidIn)
    })

    it("simulate ending game & calculate winnings", async function () {

      let game = await this.leaderboard.games(1)
      expect(game.refundable).to.be.eq(false)

      const receipt = await this.leaderboard.endGame(1, false)

      expectEvent.notEmitted(receipt, "RefundableGame")

      game = await this.leaderboard.games(1)
      expect(game.refundable).to.be.eq(false)

      // winner 1
      expectEvent(receipt, "WinningsCalculated", {
        gameId: new BN(1),
        player: accounts[0],
        winner: true,
        amount: expectedWinnerAmount,
      })

      const acc0Withdrawable = await this.leaderboard.userWithdrawables(accounts[0])
      expect(acc0Withdrawable).to.be.bignumber.eq(expectedWinnerAmount)

      // winner 2
      expectEvent(receipt, "WinningsCalculated", {
        gameId: new BN(1),
        player: accounts[1],
        winner: true,
        amount: expectedWinnerAmount,
      })

      const acc1Withdrawable = await this.leaderboard.userWithdrawables(accounts[1])
      expect(acc1Withdrawable).to.be.bignumber.eq(expectedWinnerAmount)

      // runners up
      for(let i = 2; i < numPlayers; i += 1) {
        expectEvent(receipt, "WinningsCalculated", {
          gameId: new BN(1),
          player: accounts[i],
          winner: false,
          amount: expectedRunnerUpAmount,
        })

        const accWithdrawable = await this.leaderboard.userWithdrawables(accounts[i])
        expect(accWithdrawable).to.be.bignumber.eq(expectedRunnerUpAmount)
      }

    })

    it("house cut is correct", async function() {
      const houseCut = await this.leaderboard.houseCut()
      expect(houseCut).to.be.bignumber.eq(expectedHouseCut)
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })

  })

  describe('edge case, two players one winner (60/40 pot)', function() {
    const expectedTotalPaidIn    = new BN("200000000000000000") // 2 * 0.1 eth
    const expectedHouseCut       = new BN("5000000000000000")  // 2.5% of 300000000000000000
    const expectedWinnerAmount   = new BN("117000000000000000") // 60% of 195000000000000000
    const expectedRunnerUpAmount = new BN("78000000000000000") // 40% of 27050000000000000

    before( async function () {
      this.pokerHandEvaluator = await PokerHandEvaluator.new(0)
      this.leaderboard = await Leaderboard.new(this.pokerHandEvaluator.address)
      this.FEE = await this.leaderboard.FEE()
    } )

    it("add hands and fees", async function () {
      await this.leaderboard.mockPlayFinalHand(1, 500, {from: accounts[0], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 3000, {from: accounts[1], value: this.FEE})
      const game = await this.leaderboard.games(1)
      expect(game.totalPaidIn).to.be.bignumber.eq(expectedTotalPaidIn)

      const lbBalance = await web3.eth.getBalance(this.leaderboard.address)
      expect(lbBalance).to.be.bignumber.eq(expectedTotalPaidIn)
    })

    it("simulate ending game & calculate winnings", async function () {

      let game = await this.leaderboard.games(1)
      expect(game.refundable).to.be.eq(false)

      const receipt = await this.leaderboard.endGame(1, false)

      expectEvent.notEmitted(receipt, "RefundableGame")

      game = await this.leaderboard.games(1)
      expect(game.refundable).to.be.eq(false)

      // winner
      expectEvent(receipt, "WinningsCalculated", {
        gameId: new BN(1),
        player: accounts[0],
        winner: true,
        amount: expectedWinnerAmount,
      })

      const acc0Withdrawable = await this.leaderboard.userWithdrawables(accounts[0])
      expect(acc0Withdrawable).to.be.bignumber.eq(expectedWinnerAmount)

      // runner up
      expectEvent(receipt, "WinningsCalculated", {
        gameId: new BN(1),
        player: accounts[1],
        winner: false,
        amount: expectedRunnerUpAmount,
      })

      const acc1Withdrawable = await this.leaderboard.userWithdrawables(accounts[1])
      expect(acc1Withdrawable).to.be.bignumber.eq(expectedRunnerUpAmount)

    })

    it("house cut is correct", async function() {
      const houseCut = await this.leaderboard.houseCut()
      expect(houseCut).to.be.bignumber.eq(expectedHouseCut)
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('edge case, two players two winners (50/50 pot)', function() {
    const expectedTotalPaidIn    = new BN("200000000000000000") // 2 * 0.1 eth
    const expectedHouseCut       = new BN("5000000000000000")  // 2.5% of 300000000000000000
    const expectedWinnerAmount   = new BN("97500000000000000") // 50% of 195000000000000000
    const expectedRunnerUpAmount = new BN("0")

    before( async function () {
      this.pokerHandEvaluator = await PokerHandEvaluator.new(0)
      this.leaderboard = await Leaderboard.new(this.pokerHandEvaluator.address)
      this.FEE = await this.leaderboard.FEE()
    } )

    it("add hands and fees", async function () {
      await this.leaderboard.mockPlayFinalHand(1, 500, {from: accounts[0], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 500, {from: accounts[1], value: this.FEE})
      const game = await this.leaderboard.games(1)
      expect(game.totalPaidIn).to.be.bignumber.eq(expectedTotalPaidIn)

      const lbBalance = await web3.eth.getBalance(this.leaderboard.address)
      expect(lbBalance).to.be.bignumber.eq(expectedTotalPaidIn)
    })

    it("simulate ending game & calculate winnings", async function () {

      let game = await this.leaderboard.games(1)
      expect(game.refundable).to.be.eq(false)

      const receipt = await this.leaderboard.endGame(1, false)

      expectEvent.notEmitted(receipt, "RefundableGame")

      game = await this.leaderboard.games(1)
      expect(game.refundable).to.be.eq(false)

      // winner
      expectEvent(receipt, "WinningsCalculated", {
        gameId: new BN(1),
        player: accounts[0],
        winner: true,
        amount: expectedWinnerAmount,
      })

      const acc0Withdrawable = await this.leaderboard.userWithdrawables(accounts[0])
      expect(acc0Withdrawable).to.be.bignumber.eq(expectedWinnerAmount)

      // runner up
      expectEvent(receipt, "WinningsCalculated", {
        gameId: new BN(1),
        player: accounts[1],
        winner: true,
        amount: expectedWinnerAmount,
      })

      const acc1Withdrawable = await this.leaderboard.userWithdrawables(accounts[1])
      expect(acc1Withdrawable).to.be.bignumber.eq(expectedWinnerAmount)

    })

    it("house cut is correct", async function() {
      const houseCut = await this.leaderboard.houseCut()
      expect(houseCut).to.be.bignumber.eq(expectedHouseCut)
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('edge case, three players, 2 winners, 1 runner up (80/20 pot)', function() {

    // 3 players. 10 spaces on leaderboard
    // 2 joint winners, each receive 40%
    // runner up gets 20%
    const expectedTotalPaidIn    = new BN("300000000000000000") // 3 * 0.1 eth
    const expectedHouseCut       = new BN("7500000000000000")  // 2.5% of 300000000000000000
    const expectedWinnerAmount   = new BN("117000000000000000") // 80% of 292500000000000000 / 2
    const expectedRunnerUpAmount = new BN("58500000000000000") // 20% of 292500000000000000

    before( async function () {
      this.pokerHandEvaluator = await PokerHandEvaluator.new(0)
      this.leaderboard = await Leaderboard.new(this.pokerHandEvaluator.address)
      this.FEE = await this.leaderboard.FEE()
    } )

    it("add hands and fees", async function () {
      await this.leaderboard.mockPlayFinalHand(1, 500, {from: accounts[0], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 500, {from: accounts[1], value: this.FEE})
      await this.leaderboard.mockPlayFinalHand(1, 1000, {from: accounts[2], value: this.FEE})
      const game = await this.leaderboard.games(1)
      expect(game.totalPaidIn).to.be.bignumber.eq(expectedTotalPaidIn)

      const lbBalance = await web3.eth.getBalance(this.leaderboard.address)
      expect(lbBalance).to.be.bignumber.eq(expectedTotalPaidIn)
    })

    it("simulate ending game & calculate winnings", async function () {

      let game = await this.leaderboard.games(1)
      expect(game.refundable).to.be.eq(false)

      const receipt = await this.leaderboard.endGame(1, false)

      expectEvent.notEmitted(receipt, "RefundableGame")

      game = await this.leaderboard.games(1)
      expect(game.refundable).to.be.eq(false)

      // joint winner
      expectEvent(receipt, "WinningsCalculated", {
        gameId: new BN(1),
        player: accounts[0],
        winner: true,
        amount: expectedWinnerAmount,
      })

      const acc0Withdrawable = await this.leaderboard.userWithdrawables(accounts[0])
      expect(acc0Withdrawable).to.be.bignumber.eq(expectedWinnerAmount)

      // joint winner
      expectEvent(receipt, "WinningsCalculated", {
        gameId: new BN(1),
        player: accounts[1],
        winner: true,
        amount: expectedWinnerAmount,
      })

      const acc1Withdrawable = await this.leaderboard.userWithdrawables(accounts[1])
      expect(acc1Withdrawable).to.be.bignumber.eq(expectedWinnerAmount)

      expectEvent(receipt, "WinningsCalculated", {
        gameId: new BN(1),
        player: accounts[2],
        winner: false,
        amount: expectedRunnerUpAmount,
      })

      const acc2Withdrawable = await this.leaderboard.userWithdrawables(accounts[2])
      expect(acc2Withdrawable).to.be.bignumber.eq(expectedRunnerUpAmount)

    })

    it("house cut is correct", async function() {
      const houseCut = await this.leaderboard.houseCut()
      expect(houseCut).to.be.bignumber.eq(expectedHouseCut)
    })


    it("...", async function () {
      expect(true).to.equal(true)
    })

  })

})
