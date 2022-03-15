const { expect } = require("chai")
const { BN } = require( "@openzeppelin/test-helpers" )
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")
const hammerTime = require("../../test/test_data/hammer.json")

module.exports = async function(callback) {
  const th = await TexasHoldemV1.deployed()

  let startIdx = parseInt( process.argv[4], 10 )
  if(!startIdx || isNaN(startIdx)) {
    startIdx = 0 // 83727
  }

  try {

    for(let i = startIdx; i < hammerTime.length; i += 1) {
      const hand = hammerTime[i][0]
      const expectedRank = hammerTime[i][1]
      const expectedRankId = hammerTime[i][2]
      const rank = await th.calculateHandRank(hand)
      const rankId = await th.getRankId(rank)

      console.log(`${i} - [${hand}] 
      Expected rank  : ${expectedRank}
      Actual rank    : ${rank.toString()}
      Expected rankId: ${expectedRankId}
      Actual rankId  : ${rankId.toString()}
      rank match     : ${expectedRank === rank.toNumber()}
      rankId match   : ${expectedRankId === rankId.toNumber()}
      `)

      expect(rank).to.be.bignumber.eq(new BN(expectedRank))
      expect(rankId).to.be.bignumber.eq(new BN(expectedRankId))
    }

  } catch(e) {
    console.log(e)
    callback()
  }

  console.log("done")

  callback()
}
