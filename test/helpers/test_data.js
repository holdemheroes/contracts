const path = require( "path" )
const fs = require( "fs" )
const uploadJson = require("../test_data/upload.json")
const handEvalUploadJson = require("../test_data/hand-evaluator-upload.json")
const provenance = require("../test_data/provenance.json")

const playTestData = require("../test_data/play_test_hands.json")

const cardSvgDir = path.resolve(__dirname, "../test_data/svgs/cards")
const handSvgDir = path.resolve(__dirname, "../test_data/svgs/hands")
const nftDir = path.resolve(__dirname, "../test_data/nfts")

const hammerTime = require("../test_data/hammer.json")

// note - not actually used, just dummy values
// to pass to contract constructor
const devAddresses = {
  "xfund": "0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab",
  "vor": "0xCfEB869F69431e42cdB54A4F4f105C19C080A601"
}

const vorDevConfig = {
  "vor_key_hash": "0x1a7a24165e904cb38eb8344affcf8fdee72ac11b5c542428b35eef5769c409f0",
  "vor_fee": "100000000"
}

function getRanksForUpload() {
  const rankHashes = []
  const ranks = []

  for(let i = 0; i < uploadJson.ranks.length; i += 1) {
    rankHashes.push(uploadJson.ranks[i].hash)
    ranks.push(uploadJson.ranks[i].rank)
  }

  return {
    rankHashes, ranks
  }
}

function getHandsForUpload() {
  return uploadJson.hands
}

function getCardSvg(cardId) {
  return fs.readFileSync(`${cardSvgDir}/${cardId}.svg`).toString()
}

function getHandSvg(handId) {
  return fs.readFileSync(`${handSvgDir}/${handId}.svg`).toString()
}

function getNft(tokenId) {
  const nft0Raw = fs.readFileSync(`${nftDir}/${tokenId}.txt`).toString()
  const nft0Decoded = fs.readFileSync(`${nftDir}/${tokenId}.json`).toString()
  return {
    raw: nft0Raw,
    decoded: nft0Decoded,
  }
}

module.exports = {
  getRanksForUpload,
  getHandsForUpload,
  devAddresses,
  getCardSvg,
  getHandSvg,
  getNft,
  provenance,
  vorDevConfig,
  handEvalUploadJson,
  playTestData,
  hammerTime
}
