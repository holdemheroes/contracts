const { expect } = require("chai")
const { BN } = require( "@openzeppelin/test-helpers" )
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")

module.exports = async function(callback) {
  const th = await TexasHoldemV1.deployed()

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
  
  try {

    for(let i = 0; i < testCasses.length; i += 1) {
      const hand = testCasses[i][0]
      const expectedRank = testCasses[i][1]
      const expectedRankId = testCasses[i][2]
      const expectedRankName = testCasses[i][3]
      console.log(`${hand} should have rank ${expectedRank}, rankId ${expectedRankId} and is "${expectedRankName}"`)
      const rank = await th.calculateHandRank(hand)
      const rankId = await th.getRankId(rank)
      const rankName = await th.getRankName(rankId)

      expect(rank).to.be.bignumber.eq(new BN(expectedRank))
      expect(rankId).to.be.bignumber.eq(new BN(expectedRankId))
      expect(rankName).to.be.equal(expectedRankName)
    }
    
  } catch(e) {
    console.log(e)
    callback()
  }

  console.log("done")

  callback()
}
