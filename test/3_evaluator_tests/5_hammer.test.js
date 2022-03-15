// const { expect } = require("chai")
// const {
//   BN, // Big Number support
//   expectRevert,
// } = require("@openzeppelin/test-helpers")
//
// const { handEvalUploadJson, hammerTime } = require("../helpers/test_data")
//
// const PokerHandEvaluator = artifacts.require("PokerHandEvaluator") // Loads a compiled contract
// const PokerHandEvaluatorSubscriber = artifacts.require("PokerHandEvaluatorSubscriber") // Loads a compiled contract
// contract("PokerHandEvaluator - hammer time", async function(accounts) {
//   before(async function () {
//
//     this.pokerHandEvaluator = await PokerHandEvaluator.new(0)
//
//     console.log("phe setSuits")
//     await this.pokerHandEvaluator.setSuits(handEvalUploadJson.suits.idxs, handEvalUploadJson.suits.values)
//     console.log(`phe setNoFlushBatch (${handEvalUploadJson.no_flush.length})`)
//     for(let batchNum = 0; batchNum < handEvalUploadJson.no_flush.length; batchNum += 1) {
//       process.stdout.write(`.${batchNum}`)
//       await this.pokerHandEvaluator.setNoFlushBatch(handEvalUploadJson.no_flush[batchNum].idxs, handEvalUploadJson.no_flush[batchNum].values, batchNum)
//     }
//     console.log("done")
//     console.log(`phe setFlushBatch (${handEvalUploadJson.flush.length})`)
//     for(let batchNum = 0; batchNum < handEvalUploadJson.flush.length; batchNum += 1) {
//       process.stdout.write(`.${batchNum}`)
//       await this.pokerHandEvaluator.setFlushBatch(handEvalUploadJson.flush[batchNum].idxs, handEvalUploadJson.flush[batchNum].values, batchNum)
//     }
//     console.log("done")
//     console.log(`phe setDpBatch (${handEvalUploadJson.dp.length})`)
//     for(let batchIdx = 0; batchIdx < handEvalUploadJson.dp.length; batchIdx += 1) {
//       process.stdout.write(`.${batchIdx}`)
//       await this.pokerHandEvaluator.setDpBatch(handEvalUploadJson.dp[batchIdx].values, handEvalUploadJson.dp[batchIdx].idx, batchIdx)
//     }
//     console.log("done")
//
//     this.pokerHandEvaluatorSubscriber = await PokerHandEvaluatorSubscriber.new(this.pokerHandEvaluator.address)
//     await this.pokerHandEvaluator.ownerAddSubscriber(this.pokerHandEvaluatorSubscriber.address, {from: accounts[0]})
//   })
//
//   describe('attempt all 311,875,200 5-card combinations', function() {
//
//     for(let i = 0; i < hammerTime.length; i += 1) {
//       const hand = hammerTime[i][0]
//       const expectedRank = hammerTime[i][1]
//       // const expectedRankId = hammerTime[i][2]
//       // it(`${hand} has rank ${expectedRank} and rankId ${expectedRankId}`, async function () {
//       it(`${i}: ${hand} has rank ${expectedRank}`, async function () {
//         const rank = await this.pokerHandEvaluatorSubscriber.calculateHandRank(hand)
//         // const rankId = await this.pokerHandEvaluator.getRankId(rank)
//
//         expect(rank).to.be.bignumber.eq(new BN(expectedRank))
//         // expect(rankId).to.be.bignumber.eq(new BN(expectedRankId))
//       })
//     }
//
//     it("...", async function () {
//       expect(true).to.equal(true)
//     })
//   })
// })
