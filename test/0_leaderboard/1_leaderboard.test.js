const { expect } = require("chai")

const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")

const Leaderboard = artifacts.require("Leaderboard") // Loads a compiled contract
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator") // Loads a compiled contract
contract("Leaderboard - update & query", async function(accounts) {

  before(async function () {
    this.pokerHandEvaluator = await PokerHandEvaluator.new(0)
    this.leaderboard = await Leaderboard.new(this.pokerHandEvaluator.address)
  })

  describe('should succeed', function() {

    // 0 = 3325
    it("can add account[0] 3325, will be at pos #0", async function () {
      await this.leaderboard.recordRankOnLeaderboard(1, 3325, {from: accounts[0]})

      const top10 = await this.leaderboard.getTopPlayersInGame(1, 11)
      expect(top10.indexOf(accounts[0])).to.be.eq(0)

      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[0])
      expect(pos).to.be.bignumber.eq(new BN(0))
    })

    // 0 = 3302
    // 1 = 3325
    it("can add account[1] 3302, will be at pos #0", async function () {
      await this.leaderboard.recordRankOnLeaderboard(1, 3302, {from: accounts[1]})

      const top10 = await this.leaderboard.getTopPlayersInGame(1, 11)
      expect(top10.indexOf(accounts[1])).to.be.eq(0)

      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[1])
      expect(pos).to.be.bignumber.eq(new BN(0))
    })

    // 0 = 3302
    // 1 = 3325
    // 2 = 5555
    it("can add account[2] 5555, will be at pos #2", async function () {
      await this.leaderboard.recordRankOnLeaderboard(1, 5555, {from: accounts[2]})

      const top10 = await this.leaderboard.getTopPlayersInGame(1, 11)
      expect(top10.indexOf(accounts[2])).to.be.eq(2)

      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[2])
      expect(pos).to.be.bignumber.eq(new BN(2))
    })

    // 0 = 3302
    // 1 = 3324
    // 2 = 3325
    // 3 = 5555
    it("can add account[3] 3324, will be at pos #1", async function () {
      await this.leaderboard.recordRankOnLeaderboard(1, 3324, {from: accounts[3]})

      const top10 = await this.leaderboard.getTopPlayersInGame(1, 11)
      expect(top10.indexOf(accounts[3])).to.be.eq(1)

      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[3])
      expect(pos).to.be.bignumber.eq(new BN(1))
    })

    // 0 = 3302
    // 1 = 3324
    // 2 = 3325
    // 3 = 5555
    // 4 = 8888
    it("can add account[4] 8888, will be at pos #4", async function () {
      await this.leaderboard.recordRankOnLeaderboard(1, 8888, {from: accounts[4]})

      const top10 = await this.leaderboard.getTopPlayersInGame(1, 11)
      expect(top10.indexOf(accounts[4])).to.be.eq(4)

      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[4])
      expect(pos).to.be.bignumber.eq(new BN(4))
    })

    // 0 = 500
    // 1 = 3302
    // 2 = 3324
    // 3 = 3325
    // 4 = 5555
    // 5 = 8888
    it("can add account[5] 500, will be at pos #0", async function () {
      await this.leaderboard.recordRankOnLeaderboard(1, 500, {from: accounts[5]})

      const top10 = await this.leaderboard.getTopPlayersInGame(1, 11)
      expect(top10.indexOf(accounts[5])).to.be.eq(0)

      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[5])
      expect(pos).to.be.bignumber.eq(new BN(0))
    })

    // 0 = 500
    // 1 = 3302
    // 2 = 3324
    // 3 = 3325
    // 4 = 5555
    // 5 = 8888
    // 6 = 9999
    it("can add account[6] 9999, will be at pos #6", async function () {
      await this.leaderboard.recordRankOnLeaderboard(1, 9999, {from: accounts[6]})

      const top10 = await this.leaderboard.getTopPlayersInGame(1, 11)
      expect(top10.indexOf(accounts[6])).to.be.eq(6)

      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[6])
      expect(pos).to.be.bignumber.eq(new BN(6))
    })

    // 0 = 500
    // 1 = 3302
    // 2 = 3324
    // 3 = 3325
    // 4 = 4444
    // 5 = 5555
    // 6 = 8888
    // 7 = 9999
    it("can add account[7] 4444, will be at pos #4", async function () {
      await this.leaderboard.recordRankOnLeaderboard(1, 4444, {from: accounts[7]})

      const top10 = await this.leaderboard.getTopPlayersInGame(1, 11)
      expect(top10.indexOf(accounts[7])).to.be.eq(4)

      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[7])
      expect(pos).to.be.bignumber.eq(new BN(4))
    })

    // 0 = 500
    // 1 = 3302
    // 2 = 3324
    // 3 = 3325
    // 4 = 4444
    // 5 = 5555
    // 6 = 6666
    // 7 = 8888
    // 8 = 9999
    it("can add account[8] 6666, will be at pos #6", async function () {
      await this.leaderboard.recordRankOnLeaderboard(1, 6666, {from: accounts[8]})

      const top10 = await this.leaderboard.getTopPlayersInGame(1, 11)
      expect(top10.indexOf(accounts[8])).to.be.eq(6)

      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[8])
      expect(pos).to.be.bignumber.eq(new BN(6))
    })

    // 0 = 500
    // 1 = 3302
    // 2 = 3324
    // 3 = 3325
    // 4 = 4444
    // 5 = 5555
    // 6 = 6666
    // 7 = 8888
    // 8 = 9090
    // 9 = 9999
    it("can add account[9] 9090, will be at pos #8", async function () {
      await this.leaderboard.recordRankOnLeaderboard(1, 9090, {from: accounts[9]})

      const top10 = await this.leaderboard.getTopPlayersInGame(1, 11)
      expect(top10.indexOf(accounts[9])).to.be.eq(8)

      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[9])
      expect(pos).to.be.bignumber.eq(new BN(8))
    })

    it("will return pos -1 if not on leaderboard", async function() {
      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, this.leaderboard.address)
      expect(pos).to.be.bignumber.eq(new BN(-1))
    })

    it("can check getPlayerLeaderboardPosition account[0] is at #3", async function () {
      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[0])
      expect(pos).to.be.bignumber.eq(new BN(3))
    })

    it("can check getPlayerLeaderboardPosition account[1] is at #1", async function () {
      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[1])
      expect(pos).to.be.bignumber.eq(new BN(1))
    })

    it("can check getPlayerLeaderboardPosition account[2] is at #5", async function () {
      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[2])
      expect(pos).to.be.bignumber.eq(new BN(5))
    })

    it("can check getPlayerLeaderboardPosition account[3] is at #2", async function () {
      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[3])
      expect(pos).to.be.bignumber.eq(new BN(2))
    })

    it("can check getPlayerLeaderboardPosition account[4] is at #7", async function () {
      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[4])
      expect(pos).to.be.bignumber.eq(new BN(7))
    })

    it("can check getPlayerLeaderboardPosition account[5] is at #0", async function () {
      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[5])
      expect(pos).to.be.bignumber.eq(new BN(0))
    })

    it("can check getPlayerLeaderboardPosition account[6] is at #9", async function () {
      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[6])
      expect(pos).to.be.bignumber.eq(new BN(9))
    })

    it("can check getPlayerLeaderboardPosition account[7] is at #4", async function () {
      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[7])
      expect(pos).to.be.bignumber.eq(new BN(4))
    })

    it("can check getPlayerLeaderboardPosition account[8] is at #6", async function () {
      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[8])
      expect(pos).to.be.bignumber.eq(new BN(6))
    })

    it("can check getPlayerLeaderboardPosition account[9] is at #8", async function () {
      const pos = await this.leaderboard.getPlayerLeaderboardPosition(1, accounts[9])
      expect(pos).to.be.bignumber.eq(new BN(8))
    })

    it("can check leaderboard pos #0 is accounts[5] with rank 500, rank 4", async function () {
      const lb = await this.leaderboard.getLeaderboardAtPosition(1, 0)
      expect(lb.player).to.be.eq(accounts[5])
      expect(lb.rank).to.be.bignumber.eq(new BN(500))
      expect(lb.rankId).to.be.bignumber.eq(new BN(4))
    })

    it("can check leaderboard pos #1 is accounts[1] with rank 3302, rank 7", async function () {
      const lb = await this.leaderboard.getLeaderboardAtPosition(1, 1)
      expect(lb.player).to.be.eq(accounts[1])
      expect(lb.rank).to.be.bignumber.eq(new BN(3302))
      expect(lb.rankId).to.be.bignumber.eq(new BN(7))
    })

    it("can check leaderboard pos #2 is accounts[3] with rank 3324, rank 7", async function () {
      const lb = await this.leaderboard.getLeaderboardAtPosition(1, 2)
      expect(lb.player).to.be.eq(accounts[3])
      expect(lb.rank).to.be.bignumber.eq(new BN(3324))
      expect(lb.rankId).to.be.bignumber.eq(new BN(7))
    })

    it("can check leaderboard pos #3 is accounts[0] with rank 3325, rank 7", async function () {
      const lb = await this.leaderboard.getLeaderboardAtPosition(1, 3)
      expect(lb.player).to.be.eq(accounts[0])
      expect(lb.rank).to.be.bignumber.eq(new BN(3325))
      expect(lb.rankId).to.be.bignumber.eq(new BN(7))
    })

    it("can check leaderboard pos #4 is accounts[7] with rank 4444, rank 8", async function () {
      const lb = await this.leaderboard.getLeaderboardAtPosition(1, 4)
      expect(lb.player).to.be.eq(accounts[7])
      expect(lb.rank).to.be.bignumber.eq(new BN(4444))
      expect(lb.rankId).to.be.bignumber.eq(new BN(8))
    })

    it("can check leaderboard pos #5 is accounts[2] with rank 5555, rank 8", async function () {
      const lb = await this.leaderboard.getLeaderboardAtPosition(1, 5)
      expect(lb.player).to.be.eq(accounts[2])
      expect(lb.rank).to.be.bignumber.eq(new BN(5555))
      expect(lb.rankId).to.be.bignumber.eq(new BN(8))
    })

    it("can check leaderboard pos #6 is accounts[8] with rank 6666, rank 9", async function () {
      const lb = await this.leaderboard.getLeaderboardAtPosition(1, 6)
      expect(lb.player).to.be.eq(accounts[8])
      expect(lb.rank).to.be.bignumber.eq(new BN(6666))
      expect(lb.rankId).to.be.bignumber.eq(new BN(9))
    })

    it("can check leaderboard pos #7 is accounts[4] with rank 8888, rank 9", async function () {
      const lb = await this.leaderboard.getLeaderboardAtPosition(1, 7)
      expect(lb.player).to.be.eq(accounts[4])
      expect(lb.rank).to.be.bignumber.eq(new BN(8888))
      expect(lb.rankId).to.be.bignumber.eq(new BN(9))
    })

    it("can check leaderboard pos #8 is accounts[9] with rank 9090, rank 9", async function () {
      const lb = await this.leaderboard.getLeaderboardAtPosition(1, 8)
      expect(lb.player).to.be.eq(accounts[9])
      expect(lb.rank).to.be.bignumber.eq(new BN(9090))
      expect(lb.rankId).to.be.bignumber.eq(new BN(9))
    })

    it("can check leaderboard pos #9 is accounts[6] with rank 9999, rank 9", async function () {
      const lb = await this.leaderboard.getLeaderboardAtPosition(1, 9)
      expect(lb.player).to.be.eq(accounts[6])
      expect(lb.rank).to.be.bignumber.eq(new BN(9999))
      expect(lb.rankId).to.be.bignumber.eq(new BN(9))
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })
})
