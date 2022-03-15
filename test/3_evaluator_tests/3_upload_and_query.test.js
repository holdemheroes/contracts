const { expect } = require("chai")
const {
  BN, // Big Number support
  expectRevert,
} = require("@openzeppelin/test-helpers")

const { handEvalUploadJson } = require("../helpers/test_data")

const PokerHandEvaluator = artifacts.require("PokerHandEvaluator") // Loads a compiled contract
const PokerHandEvaluatorSubscriber = artifacts.require("PokerHandEvaluatorSubscriber") // Loads a compiled contract
contract("PokerHandEvaluator - setSuits", async function(accounts) {
  before(async function () {
    this.pokerHandEvaluator = await PokerHandEvaluator.new(0)
    this.pokerHandEvaluatorSubscriber = await PokerHandEvaluatorSubscriber.new(this.pokerHandEvaluator.address)
    await this.pokerHandEvaluator.ownerAddSubscriber(this.pokerHandEvaluatorSubscriber.address, {from: accounts[0]})
  })

  describe('setSuits', function() {

    it("only owner can setSuits", async function () {
      await expectRevert(
        this.pokerHandEvaluator.setSuits(handEvalUploadJson.suits.idxs, handEvalUploadJson.suits.values, { from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
    })

    it("can setSuits", async function () {
      await this.pokerHandEvaluator.setSuits(handEvalUploadJson.suits.idxs, handEvalUploadJson.suits.values)
      const suitsSet = await this.pokerHandEvaluator.suitsSet()
      expect(suitsSet).to.be.eq(true)
    })

    it("can setSuits only once", async function () {
      await expectRevert(
        this.pokerHandEvaluator.setSuits(handEvalUploadJson.suits.idxs, handEvalUploadJson.suits.values),
        "suits already set",
      )
    })

    it("suits uploaded correctly", async function () {
      for(let i = 0; i < 4096;  i += 1) {
        const s = await this.pokerHandEvaluator.suits(i)
        if(handEvalUploadJson.suits.idxs.includes(i)) {
          const idx = handEvalUploadJson.suits.idxs.indexOf(i)
          expect(s).to.be.bignumber.equal(new BN(handEvalUploadJson.suits.values[idx]))
        } else {
          expect(s).to.be.bignumber.equal(new BN(0))
        }
      }
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('setNoFlushBatch', function() {
    it("only owner can setNoFlushBatch", async function () {
      await expectRevert(
        this.pokerHandEvaluator.setNoFlushBatch(handEvalUploadJson.no_flush[0].idxs, handEvalUploadJson.no_flush[0].values, 0, { from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
    })

    it("setNoFlushBatch must be set in order", async function () {
      await expectRevert(
        this.pokerHandEvaluator.setNoFlushBatch(handEvalUploadJson.no_flush[1].idxs, handEvalUploadJson.no_flush[1].values, 1),
        "batch sequence incorrect",
      )
    })

    for(let batchNum = 0; batchNum < handEvalUploadJson.no_flush.length; batchNum += 1) {
      it(`can setNoFlushBatch #${batchNum} / ${handEvalUploadJson.no_flush.length - 1}`, async function () {
        await this.pokerHandEvaluator.setNoFlushBatch(handEvalUploadJson.no_flush[batchNum].idxs, handEvalUploadJson.no_flush[batchNum].values, batchNum)
        if(batchNum === handEvalUploadJson.no_flush.length - 1) {
          const noFlushSet = await this.pokerHandEvaluator.noFlushSet()
          expect(noFlushSet).to.be.eq(true)
        } else {
          const nextBatchId = await this.pokerHandEvaluator.nextExpectedNoFlushBatchId()
          expect( nextBatchId ).to.be.bignumber.eq( new BN( batchNum + 1 ) )
        }
      })
    }

    for(let batchNum = 0; batchNum < handEvalUploadJson.no_flush.length; batchNum += 1) {
      it(`batch #${batchNum} / ${handEvalUploadJson.no_flush.length - 1} uploaded correctly`, async function () {
        for(let i = 0; i < handEvalUploadJson.no_flush[batchNum].idxs.length; i += 1) {
          const value = await this.pokerHandEvaluator.noFlush(handEvalUploadJson.no_flush[batchNum].idxs[i])
          expect(value).to.be.bignumber.eq(new BN(handEvalUploadJson.no_flush[batchNum].values[i]))
        }
      })
    }

    it("can setNoFlushBatch all batches only once", async function () {
      await expectRevert(
        this.pokerHandEvaluator.setNoFlushBatch(handEvalUploadJson.no_flush[0].idxs, handEvalUploadJson.no_flush[0].values, 0),
        "noFlush already set",
      )
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })

  })

  describe('setFlushBatch', function() {

    it("only owner can setFlushBatch", async function () {
      await expectRevert(
        this.pokerHandEvaluator.setFlushBatch(handEvalUploadJson.flush[0].idxs, handEvalUploadJson.flush[0].values, 0, { from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
    })

    it("setFlushBatch must be set in order", async function () {
      await expectRevert(
        this.pokerHandEvaluator.setFlushBatch(handEvalUploadJson.flush[1].idxs, handEvalUploadJson.flush[1].values, 1),
        "batch sequence incorrect",
      )
    })

    for(let batchNum = 0; batchNum < handEvalUploadJson.flush.length; batchNum += 1) {
      it(`can setFlushBatch #${batchNum} / ${handEvalUploadJson.flush.length - 1}`, async function () {
        await this.pokerHandEvaluator.setFlushBatch(handEvalUploadJson.flush[batchNum].idxs, handEvalUploadJson.flush[batchNum].values, batchNum)
        if(batchNum === handEvalUploadJson.flush.length - 1) {
          const flushSet = await this.pokerHandEvaluator.flushSet()
          expect(flushSet).to.be.eq(true)
        } else {
          const nextBatchId = await this.pokerHandEvaluator.nextExpectedFlushBatchId()
          expect( nextBatchId ).to.be.bignumber.eq( new BN( batchNum + 1 ) )
        }
      })
    }

    for(let batchNum = 0; batchNum < handEvalUploadJson.flush.length; batchNum += 1) {
      it(`batch #${batchNum} / ${handEvalUploadJson.flush.length - 1} uploaded correctly`, async function () {
        for(let i = 0; i < handEvalUploadJson.flush[batchNum].idxs.length; i += 1) {
          const value = await this.pokerHandEvaluator.flush(handEvalUploadJson.flush[batchNum].idxs[i])
          expect(value).to.be.bignumber.eq(new BN(handEvalUploadJson.flush[batchNum].values[i]))
        }
      })
    }

    it("can setFlushBatch all batches only once", async function () {
      await expectRevert(
        this.pokerHandEvaluator.setFlushBatch(handEvalUploadJson.flush[0].idxs, handEvalUploadJson.flush[0].values, 0),
        "flush already set",
      )
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })

  })

  describe('setDpBatch', function() {
    it("only owner can setDpBatch", async function () {
      await expectRevert(
        this.pokerHandEvaluator.setDpBatch(handEvalUploadJson.dp[0].values, handEvalUploadJson.dp[0].idx, 0, { from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
    })

    it("setDpBatch must be set in order", async function () {
      await expectRevert(
        this.pokerHandEvaluator.setDpBatch(handEvalUploadJson.dp[1].values, handEvalUploadJson.dp[1].idx, 1),
        "batch sequence incorrect",
      )
    })

    for(let batchIdx = 0; batchIdx < handEvalUploadJson.dp.length; batchIdx += 1) {
      it(`can setDpBatch #${batchIdx} / ${handEvalUploadJson.dp.length - 1}`, async function () {
        await this.pokerHandEvaluator.setDpBatch(handEvalUploadJson.dp[batchIdx].values, handEvalUploadJson.dp[batchIdx].idx, batchIdx)
        if(batchIdx === handEvalUploadJson.dp.length - 1) {
          const dpSet = await this.pokerHandEvaluator.dpSet()
          expect(dpSet).to.be.eq(true)
        } else {
          const nextBatchId = await this.pokerHandEvaluator.nextExpectedDpBatchId()
          expect( nextBatchId ).to.be.bignumber.eq( new BN( batchIdx + 1 ) )
        }
      })
    }

    for(let batchIdx = 0; batchIdx < handEvalUploadJson.dp.length; batchIdx += 1) {
      it(`batch #${batchIdx} / ${handEvalUploadJson.dp.length - 1} uploaded correctly`, async function () {
        const i = handEvalUploadJson.dp[batchIdx].idx
        const js = handEvalUploadJson.dp[batchIdx].values
        for(let j = 0; j < js.length; j += 1) {
          const ks = js[j]
          for(let k = 0; k < ks.length; k +=  1) {
            const dp = await this.pokerHandEvaluator.dp(i, j, k)
            expect(dp).to.be.bignumber.equal(new BN(ks[k]))
          }
        }
      })
    }

    it("can setDpBatch all batches only once", async function () {
      await expectRevert(
        this.pokerHandEvaluator.setDpBatch(handEvalUploadJson.dp[0].values, handEvalUploadJson.dp[0].idx, 0),
        "dp already set",
      )
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('queries', function() {

    it("[35, 39, 43, 47, 51] is Royal Flush", async function () {
      // pokerHandEvaluatorSubscriber contract is subscribed to data
      const rank = await this.pokerHandEvaluatorSubscriber.calculateHandRank([35,39,43,47,51])
      const rankId = await this.pokerHandEvaluator.getRankId(rank)
      const rankName = await this.pokerHandEvaluator.getRankName(rankId)

      expect(rank).to.be.bignumber.eq(new BN(1))
      expect(rankId).to.be.bignumber.eq(new BN(0)) // RankNames.ROYAL_FLUSH
      expect(rankName).to.be.equal("Royal Flush")
    })

    it("[31, 35, 39, 43, 47] is Straight Flush", async function () {
      const rank = await this.pokerHandEvaluatorSubscriber.calculateHandRank([31,35,39,43,47])
      const rankId = await this.pokerHandEvaluator.getRankId(rank)
      const rankName = await this.pokerHandEvaluator.getRankName(rankId)

      expect(rank).to.be.bignumber.eq(new BN(2))
      expect(rankId).to.be.bignumber.eq(new BN(1)) // RankNames.STRAIGHT_FLUSH
      expect(rankName).to.be.equal("Straight Flush")
    })

    it("[1, 48, 49, 50, 51] is Four of a Kind", async function () {
      const rank = await this.pokerHandEvaluatorSubscriber.calculateHandRank([1, 48, 49, 50, 51])
      const rankId = await this.pokerHandEvaluator.getRankId(rank)
      const rankName = await this.pokerHandEvaluator.getRankName(rankId)

      expect(rank).to.be.bignumber.eq(new BN(22))
      expect(rankId).to.be.bignumber.eq(new BN(2)) // RankNames.FOUR_OF_A_KIND
      expect(rankName).to.be.equal("Four of a Kind")
    })

    it("[1, 2, 3, 4, 5] is Full House", async function () {
      const rank = await this.pokerHandEvaluatorSubscriber.calculateHandRank([1, 2, 3, 4, 5 ])
      const rankId = await this.pokerHandEvaluator.getRankId(rank)
      const rankName = await this.pokerHandEvaluator.getRankName(rankId)

      expect(rank).to.be.bignumber.eq(new BN(322))
      expect(rankId).to.be.bignumber.eq(new BN(3)) // RankNames.FULL_HOUSE
      expect(rankName).to.be.equal("Full House")
    })

    it("[27, 19, 39, 47, 51] is Flush", async function () {
      const rank = await this.pokerHandEvaluatorSubscriber.calculateHandRank([27, 19, 39, 47, 51])
      const rankId = await this.pokerHandEvaluator.getRankId(rank)
      const rankName = await this.pokerHandEvaluator.getRankName(rankId)

      expect(rank).to.be.bignumber.eq(new BN(383))
      expect(rankId).to.be.bignumber.eq(new BN(4)) // RankNames.FLUSH
      expect(rankName).to.be.equal("Flush")
    })

    it("[4, 10, 15, 19, 20] is Straight", async function () {
      const rank = await this.pokerHandEvaluatorSubscriber.calculateHandRank([4, 10, 15, 19, 20])
      const rankId = await this.pokerHandEvaluator.getRankId(rank)
      const rankName = await this.pokerHandEvaluator.getRankName(rankId)

      expect(rank).to.be.bignumber.eq(new BN(1607))
      expect(rankId).to.be.bignumber.eq(new BN(5)) // RankNames.STRAIGHT
      expect(rankName).to.be.equal("Straight")
    })

    it("[20, 22, 21, 38, 51] is Three of a Kind", async function () {
      const rank = await this.pokerHandEvaluatorSubscriber.calculateHandRank([20, 22, 21, 38, 51])
      const rankId = await this.pokerHandEvaluator.getRankId(rank)
      const rankName = await this.pokerHandEvaluator.getRankName(rankId)

      expect(rank).to.be.bignumber.eq(new BN(2074))
      expect(rankId).to.be.bignumber.eq(new BN(6)) // RankNames.THREE_OF_A_KIND
      expect(rankName).to.be.equal("Three of a Kind")
    })

    it("[20, 22, 17, 18, 51] is Two Pairs", async function () {
      const rank = await this.pokerHandEvaluatorSubscriber.calculateHandRank([20, 22, 17, 18, 51])
      const rankId = await this.pokerHandEvaluator.getRankId(rank)
      const rankName = await this.pokerHandEvaluator.getRankName(rankId)

      expect(rank).to.be.bignumber.eq(new BN(3161))
      expect(rankId).to.be.bignumber.eq(new BN(7)) // RankNames.TWO_PAIRS
      expect(rankName).to.be.equal("Two Pairs")
    })

    it("[20, 22, 2, 18, 51] is Pair", async function () {
      const rank = await this.pokerHandEvaluatorSubscriber.calculateHandRank([20, 22, 2, 18, 51])
      const rankId = await this.pokerHandEvaluator.getRankId(rank)
      const rankName = await this.pokerHandEvaluator.getRankName(rankId)

      expect(rank).to.be.bignumber.eq(new BN(4914))
      expect(rankId).to.be.bignumber.eq(new BN(8)) // RankNames.TWO_PAIRS
      expect(rankName).to.be.equal("Pair")
    })

    it("[24, 32, 12, 51, 3] is High Card", async function () {
      const rank = await this.pokerHandEvaluatorSubscriber.calculateHandRank([24, 32, 12, 51, 3])
      const rankId = await this.pokerHandEvaluator.getRankId(rank)
      const rankName = await this.pokerHandEvaluator.getRankName(rankId)

      expect(rank).to.be.bignumber.eq(new BN(6586))
      expect(rankId).to.be.bignumber.eq(new BN(9)) // RankNames.HIGH_CARD
      expect(rankName).to.be.equal("High Card")
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
