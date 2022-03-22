const { expect } = require("chai")
const {
  BN, // Big Number support
} = require("@openzeppelin/test-helpers")

const { provenance, devAddresses, getRanksForUpload, getHandsForUpload, getCardSvg, getHandSvg, getNft } = require( "../helpers/test_data" )
const { increaseBlockTime } = require("../helpers/chain")
const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const HoldemHeroes = artifacts.require("HoldemHeroesTestableDistribution") // Loads a compiled contract

contract("HoldemHeroes - getters should succeed", async function(accounts) {

  const distStartIndex = 24

  const targetBlocksPerSale = 5
  const saleHalflife = 700
  const priceSpeed = 1
  const priceHalflife = 100
  const startingPrice = web3.utils.toWei("0.22", "ether")

  // deploy contract once before this set of tests
  before(async function () {
    const saleStart = Math.floor(Date.now() / 1000)
    this.playingCards = await PlayingCards.new()
    this.holdemHeroes = await HoldemHeroes.new(
      devAddresses.vor,
      devAddresses.xfund,
      this.playingCards.address,
      saleStart,
      1,
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

  describe("hand getters - should succeed", function() {

    it( "getHandShape returns correct shape", async function () {
      let res = await this.holdemHeroes.getHandShape(24, false)
      expect(res).to.be.equal(provenance.hands[24].shape)
      res = await this.holdemHeroes.getHandShape(0, false)
      expect(res).to.be.equal(provenance.hands[0].shape)
      res = await this.holdemHeroes.getHandShape(6, false)
      expect(res).to.be.equal(provenance.hands[6].shape)
    })

    it( "getHandName returns correct name", async function () {
      let res = await this.holdemHeroes.getHandName(24)
      console.log(res)
      expect(res).to.be.equal(provenance.hands[24].hand)
      res = await this.holdemHeroes.getHandName(856)
      expect(res).to.be.equal(provenance.hands[856].hand)
    })

    it( "getHandRank returns correct rank", async function () {
      const res = await this.holdemHeroes.getHandRank(24)
      expect(res).to.be.bignumber.equal(new BN(provenance.hands[24].rank))
    })

    it( "getHandAsString returns correct string", async function () {
      const res = await this.holdemHeroes.getHandAsString(24)
      expect(res).to.be.equal(provenance.hands[24].name)
    })

    it( "getHandAsCardIds returns correct array", async function () {
      const res = await this.holdemHeroes.getHandAsCardIds(24)
      expect(res.card1).to.be.bignumber.equal(new BN(provenance.hands[24].card1.cards_array_idx))
      expect(res.card2).to.be.bignumber.equal(new BN(provenance.hands[24].card2.cards_array_idx))
    })

    it( "getHandAsSvg returns correct SVG", async function () {
      const svg = getHandSvg(24)
      const res = await this.holdemHeroes.getHandAsSvg(24)
      expect(res).to.be.equal(svg)
    })

    it( "getHandHash returns correct hash", async function () {
      const res = await this.holdemHeroes.getHandHash(24)
      expect(res).to.be.equal(provenance.hands[24].hash)
    })

    it( "...", async function () {
      expect( true ).to.equal( true )
    } )

  })

  describe("token URI getters - should succeed", function() {
    it( "tokenIdToHandId maps token to correct hand", async function () {
      const res = await this.holdemHeroes.tokenIdToHandId(0)
      expect(res).to.be.bignumber.equal(new BN(24))
    })

    it( "tokenURI gets correct NFT", async function () {
      const nft0 = getNft(0)
      const res0 = await this.holdemHeroes.tokenURI(0)
      expect(res0).to.be.equal(nft0.raw)

      const nft24 = getNft(24)
      const res24 = await this.holdemHeroes.tokenURI(24)
      expect(res24).to.be.equal(nft24.raw)
    })

    it( "...", async function () {
      expect( true ).to.equal( true )
    } )
  })
})

