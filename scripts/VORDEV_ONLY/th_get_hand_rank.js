require("dotenv").config()
const createCsvWriter = require("csv-writer").createObjectCsvWriter
const utils = require( "../utils/utils" )
const path = require( "path" )
const fs = require( "fs" )
const TexasHoldemV1 = artifacts.require("TexasHoldemV1Testable")
const HoldemHeroes = artifacts.require("HoldemHeroesTestableDistribution")

module.exports = async function(callback) {
  const newtworkType = await web3.eth.net.getNetworkType();
  if(newtworkType !== "private") {
    console.log("run with Ganache or vordev")
    process.exit(1)
  }
  const network = config.network

  const baseDataPath = path.resolve(__dirname, "../data")
  await fs.promises.mkdir(baseDataPath, { recursive: true })
  const csvPath = path.resolve(baseDataPath, "ranks.csv")

  const contractAddresses = utils.getContractAddresses()

  const hh = await new web3.eth.Contract(HoldemHeroes.abi, contractAddresses["vordev"].holdem_heroes_nft)
  const texasHoldem = await new web3.eth.Contract(TexasHoldemV1.abi, contractAddresses["vordev"].texas_holdem_v1)

  const csvWriter = createCsvWriter({
    path: csvPath,
    header: [
      {id: 'card1_id', title: 'Card 1 #'},
      {id: 'card2_id', title: 'Card 2 #'},
      {id: 'card3_id', title: 'Card 3 #'},
      {id: 'card4_id', title: 'Card 4 #'},
      {id: 'card5_id', title: 'Card 5 #'},
      {id: 'card1', title: 'Card 1'},
      {id: 'card2', title: 'Card 2'},
      {id: 'card3', title: 'Card 3'},
      {id: 'card4', title: 'Card 4'},
      {id: 'card5', title: 'Card 5'},
      {id: 'rank_score', title: 'Rank Score'},
      {id: 'rank_id', title: 'Rank ID'},
      {id: 'rank_name', title: 'Rank'},
    ]
  });

  try {
    // const freq = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ] // 9
    // const csvRecords = []
    //
    // for (let a = 0; a < 48; a++) {
    //   const c1 = await hh.methods.getCardAsString(a).call()
    //   for (let b = a + 1; b < 49; b++) {
    //     const c2 = await hh.methods.getCardAsString(b).call()
    //     for (let c = b + 1; c < 50; c++) {
    //       const c3 = await hh.methods.getCardAsString(c).call()
    //       for (let d = c + 1; d < 51; d++) {
    //         const c4 = await hh.methods.getCardAsString(d).call()
    //         for (let e = d + 1; e < 52; e++) {
    //           const c5 = await hh.methods.getCardAsString(e).call()
    //           const hand = [a, b, c, d, e]
    //           const rank = await texasHoldem.methods.calculateHandRank(hand).call()
    //           const rankId = await texasHoldem.methods.getRankId(rank).call()
    //           const rankName = await texasHoldem.methods.getRankName(rankId).call()
    //           console.log(hand, c1, c2, c3, c4, c5, rank, rankId, rankName)
    //           // const j = handRank(i)
    //           freq[rankId]++
    //
    //           const csvRec = {
    //             card1_id: a,
    //             card2_id: b,
    //             card3_id: c,
    //             card4_id: d,
    //             card5_id: e,
    //             card1: c1,
    //             card2: c2,
    //             card3: c3,
    //             card4: c4,
    //             card5: c5,
    //             rank_score: rank,
    //             rank_id: rankId,
    //             rank_name: rankName,
    //           }
    //           csvRecords.push(csvRec)
    //         }
    //       }
    //     }
    //   }
    // }
    //
    // console.log(freq)
    //
    // csvWriter.writeRecords(csvRecords)       // returns a promise
    //   .then(() => {
    //     console.log('CSV Done');
    //   });

    const tests = [
      [35,39,43,47,51],
      [34,38,42,46,50],
      [33,37,41,45,49],
      [32,36,40,44,48],
      [31,35,39,43,47],
      [1, 2, 3, 4, 5 ],
      [24, 32, 12, 51, 3]
    ]
    for(let i = 0; i < tests.length; i += 1) {
      const t = tests[i]
      const c1 = await hh.methods.getCardAsString(t[0]).call()
      const c2 = await hh.methods.getCardAsString(t[1]).call()
      const c3 = await hh.methods.getCardAsString(t[2]).call()
      const c4 = await hh.methods.getCardAsString(t[3]).call()
      const c5 = await hh.methods.getCardAsString(t[4]).call()
      const rank = await texasHoldem.methods.calculateHandRank(t).call()
      const rankId = await texasHoldem.methods.getRankId(rank).call()
      const rankName = await texasHoldem.methods.getRankName(rankId).call()
      console.log(t, c1, c2, c3, c4, c5, rank, rankId, rankName)
    }

    callback()

  } catch(e) {
    console.log(e)
  }
}
