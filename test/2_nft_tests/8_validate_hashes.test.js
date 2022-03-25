const { expect } = require("chai")

const { devAddresses, getRanksForUpload, getHandsForUpload, provenance } = require( "../helpers/test_data" )
const { stripHexPrefix } = require("../helpers/utils")
const { increaseBlockTime } = require("../helpers/chain")
const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const HoldemHeroes = artifacts.require("HoldemHeroesTestableDistribution") // Loads a compiled contract

contract("HoldemHeroes - hashes", async function(accounts) {

  const distStartIndex = 24

  const targetBlocksPerSale = 5
  const saleHalflife = 700
  const priceSpeed = 1
  const priceHalflife = 100
  const startingPrice = web3.utils.toWei("0.22", "ether")

  // deploy contract once before this set of tests
  before(async function () {
    const saleStartBlockNum = 0
    this.playingCards = await PlayingCards.new()
    this.holdemHeroes = await HoldemHeroes.new(
      devAddresses.vor,
      devAddresses.xfund,
      this.playingCards.address,
      saleStartBlockNum,
      Math.floor(Date.now() / 1000) + 1,
      5,
      targetBlocksPerSale,
      saleHalflife,
      priceSpeed,
      priceHalflife,
      startingPrice
    )

    const rankData = getRanksForUpload()
    await this.holdemHeroes.uploadHandRanks(rankData.rankHashes, rankData.ranks)
    const hands = getHandsForUpload()
    await increaseBlockTime(10)
    for( let i = 0; i < hands.length; i += 1) {
      await this.holdemHeroes.reveal(hands[i], i, "")
    }
    await this.holdemHeroes.beginDistributionTestable( distStartIndex )
  })

  describe("validate provenance hashes", function() {
    it( "provenance hashes match", async function () {
      let chainHashesConcat = ""
      for(let i = 0; i < 1326; i += 1) {
        const provHash = provenance.hands[i].hash
        const chainHandHash = await this.holdemHeroes.getHandHash( i )
        expect(chainHandHash).to.be.equal(provHash)
        chainHashesConcat += stripHexPrefix(chainHandHash)
      }
      const chainProvenanceCalculated = web3.utils.soliditySha3(chainHashesConcat)
      const chainProvenance = await this.holdemHeroes.HAND_PROVENANCE_TESTABLE()
      const provProvenance = provenance.provenance

      expect(chainProvenanceCalculated).to.be.equal(provProvenance)
      expect(chainProvenance).to.be.equal(provProvenance)
      expect(chainProvenanceCalculated).to.be.equal(chainProvenance)
    })

    it( "...", async function () {
      expect( true ).to.equal( true )
    } )
  })

})

