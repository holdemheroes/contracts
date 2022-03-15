const { expect } = require("chai")
const {
  BN, // Big Number support
} = require("@openzeppelin/test-helpers")

const {  vorDevConfig, handEvalUploadJson, devAddresses, getRanksForUpload, getHandsForUpload } = require("../helpers/test_data")
const { increaseBlockTime } = require( "../helpers/chain" )

const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const xFUND = artifacts.require("MockERC20")
const HoldemHeroes = artifacts.require("HoldemHeroesTestableDistribution") // Loads a compiled contract
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator") // Loads a compiled contract
const MockVORDeterministic = artifacts.require("MockVORDeterministic")

contract("TexasHoldemV1 - misc", async function(accounts) {

  const testCasses = [
    [[35, 39, 43, 47, 51], 1, 0, "Royal Flush"],
    [[31, 35, 39, 43, 47], 2, 1, "Straight Flush"],
    [[1, 48, 49, 50, 51], 22, 2, "Four of a Kind"],
    [[1, 2, 3, 4, 5], 322, 3, "Full House"],
    [[27, 19, 39, 47, 51], 383, 4, "Flush"],
    [[4, 10, 15, 19, 20], 1607, 5, "Straight"],
    [[20, 22, 21, 38, 51], 2074, 6, "Three of a Kind"],
    [[20, 22, 17, 18, 51], 3161, 7, "Two Pairs"],
    [[20, 22, 2, 18, 51], 4914, 8, "Pair"],
    [[24, 32, 12, 51, 3], 6586, 9, "High Card"]
  ]

  // @skip-on-coverage
  describe('should succeed', function() {
    before(async function () {
      const saleStart = Math.floor(Date.now() / 1000)
      this.xfund = await xFUND.new()
      this.vor = await MockVORDeterministic.new();

      this.playingCards = await PlayingCards.new()

      this.holdemHeroes = await HoldemHeroes.new(this.vor.address, this.xfund.address, this.playingCards.address, saleStart, 1, 0, 1326)

      const rankData = getRanksForUpload()
      console.log("upload HEH ranks")
      await this.holdemHeroes.uploadHandRanks(rankData.rankHashes, rankData.ranks)
      const hands = getHandsForUpload()

      await increaseBlockTime(10)
      console.log(`reveal ${hands.length} HEH hands`)
      for( let i = 0; i < hands.length; i += 1) {
        await this.holdemHeroes.reveal(hands[i], i, "")
        process.stdout.write(`.${i}`)
      }
      console.log("done")

      const randDistribution = Math.floor(Math.random() * 1325)
      console.log("start dist id", randDistribution)
      await this.holdemHeroes.beginDistributionTestable( randDistribution )

      this.pokerHandEvaluator = await PokerHandEvaluator.new(0)

      console.log("phe setSuits")
      await this.pokerHandEvaluator.setSuits(handEvalUploadJson.suits.idxs, handEvalUploadJson.suits.values)

      console.log(`phe setNoFlushBatch (${handEvalUploadJson.no_flush.length})`)
      for(let batchNum = 0; batchNum < handEvalUploadJson.no_flush.length; batchNum += 1) {
        process.stdout.write(`.${batchNum}`)
        await this.pokerHandEvaluator.setNoFlushBatch(handEvalUploadJson.no_flush[batchNum].idxs, handEvalUploadJson.no_flush[batchNum].values, batchNum)
      }
      console.log("done")
      console.log(`phe setFlushBatch (${handEvalUploadJson.flush.length})`)
      for(let batchNum = 0; batchNum < handEvalUploadJson.flush.length; batchNum += 1) {
        process.stdout.write(`.${batchNum}`)
        await this.pokerHandEvaluator.setFlushBatch(handEvalUploadJson.flush[batchNum].idxs, handEvalUploadJson.flush[batchNum].values, batchNum)
      }
      console.log("done")
      console.log(`phe setDpBatch (${handEvalUploadJson.dp.length})`)
      for(let batchIdx = 0; batchIdx < handEvalUploadJson.dp.length; batchIdx += 1) {
        process.stdout.write(`.${batchIdx}`)
        await this.pokerHandEvaluator.setDpBatch(handEvalUploadJson.dp[batchIdx].values, handEvalUploadJson.dp[batchIdx].idx, batchIdx)
      }
      console.log("done")

      this.texasHoldem = await TexasHoldemV1.new(
        this.xfund.address,
        this.vor.address,
        this.holdemHeroes.address,
        this.pokerHandEvaluator.address,
        1,
        1,
        vorDevConfig.vor_key_hash,
        vorDevConfig.vor_fee)

      // subscribe to phe
      await this.pokerHandEvaluator.ownerAddSubscriber(this.texasHoldem.address, {from: accounts[0]})
    })

    for(let i = 0; i < testCasses.length; i += 1) {
      const hand = testCasses[i][0]
      const expectedRank = testCasses[i][1]
      const expectedRankId = testCasses[i][2]
      const expectedRankName = testCasses[i][3]
      it(`${hand} should have rank ${expectedRank}, rankId ${expectedRankId} and is ${expectedRankName}`, async function () {
        const rank = await this.texasHoldem.calculateHandRank(hand)
        const rankId = await this.texasHoldem.getRankId(rank)
        const rankName = await this.texasHoldem.getRankName(rankId)

        expect(rank).to.be.bignumber.eq(new BN(expectedRank))
        expect(rankId).to.be.bignumber.eq(new BN(expectedRankId)) // RankNames.ROYAL_FLUSH
        expect(rankName).to.be.equal(expectedRankName)
      })
    }

    for(let i = 0; i < 1326; i += 1) {
      it(`token #${i} should have matching data in HEH and TH`, async function () {
        const hehHandId = await this.holdemHeroes.tokenIdToHandId(i)
        const hehCardIds = await this.holdemHeroes.getHandAsCardIds(hehHandId)

        const thCardIdsWithHandId = await this.texasHoldem.getTokenDataWithHandId(i)
        const thCardIds = await this.texasHoldem.getTokenDataWithoutHandId(i)

        expect(thCardIdsWithHandId.handId).to.be.bignumber.eq(hehHandId)
        expect(thCardIdsWithHandId.card1).to.be.bignumber.eq(hehCardIds.card1)
        expect(thCardIdsWithHandId.card2).to.be.bignumber.eq(hehCardIds.card2)

        expect(thCardIds.card1).to.be.bignumber.eq(hehCardIds.card1)
        expect(thCardIds.card2).to.be.bignumber.eq(hehCardIds.card2)
      })
    }

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })
})

