const { expect } = require("chai")
const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
  constants,
} = require("@openzeppelin/test-helpers")

const { devAddresses, getRanksForUpload, getHandsForUpload, getCardSvgs } = require( "../helpers/test_data" )
const { increaseBlockTime } = require("../helpers/chain")
const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const HoldemHeroes = artifacts.require("HoldemHeroesTestableDistribution") // Loads a compiled contract

contract("HoldemHeroes - getters should fail", async function(accounts) {

  const targetBlocksPerSale = 5
  const saleHalflife = 700
  const priceSpeed = 1
  const priceSpeedDenominator = 1
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
      priceSpeedDenominator,
      priceHalflife,
      startingPrice
    )
  })

  describe("hand getters - should fail", function() {
    it( "getHandShape hands must be revealed", async function () {
      try {
        await this.holdemHeroes.getHandShape(99, false)
      } catch(e) {
        const errorFound = e.message.match("not revealed")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getHandName hands must be revealed", async function () {
      try {
        await this.holdemHeroes.getHandName(99)
      } catch(e) {
        const errorFound = e.message.match("not revealed")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getHandRank hands must be revealed", async function () {
      try {
        await this.holdemHeroes.getHandRank(99)
      } catch(e) {
        const errorFound = e.message.match("not revealed")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getHandAsString hands must be revealed", async function () {
      try {
        await this.holdemHeroes.getHandAsString(99)
      } catch(e) {
        const errorFound = e.message.match("not revealed")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getHandAsCardIds hands must be revealed", async function () {
      try {
        await this.holdemHeroes.getHandAsCardIds(99)
      } catch(e) {
        const errorFound = e.message.match("not revealed")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getHandAsSvg hands must be revealed", async function () {
      try {
        await this.holdemHeroes.getHandAsSvg(99)
      } catch(e) {
        const errorFound = e.message.match("not revealed")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getHandHash hands must be revealed", async function () {
      try {
        await this.holdemHeroes.getHandHash(99)
      } catch(e) {
        const errorFound = e.message.match("not revealed")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getHandShape handId must be valid", async function () {
      try {
        await this.holdemHeroes.getHandShape(1326, false)
      } catch(e) {
        const errorFound = e.message.match("invalid handId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getHandName handId must be valid", async function () {
      try {
        await this.holdemHeroes.getHandName(1326)
      } catch(e) {
        const errorFound = e.message.match("invalid handId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getHandRank handId must be valid", async function () {
      try {
        await this.holdemHeroes.getHandRank(1326)
      } catch(e) {
        const errorFound = e.message.match("invalid handId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getHandAsString handId must be valid", async function () {
      try {
        await this.holdemHeroes.getHandAsString(1326)
      } catch(e) {
        const errorFound = e.message.match("invalid handId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getHandAsCardIds handId must be valid", async function () {
      try {
        await this.holdemHeroes.getHandAsCardIds(1326)
      } catch(e) {
        const errorFound = e.message.match("invalid handId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getHandAsSvg handId must be valid", async function () {
      try {
        await this.holdemHeroes.getHandAsSvg(1326)
      } catch(e) {
        const errorFound = e.message.match("invalid handId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getHandHash handId must be valid", async function () {
      try {
        await this.holdemHeroes.getHandHash(1326)
      } catch(e) {
        const errorFound = e.message.match("invalid handId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "...", async function () {
      expect( true ).to.equal( true )
    } )
  })

  describe("token URI getters - should fail", function() {
    it( "tokenIdToHandId handId must be valid", async function () {
      try {
        await this.holdemHeroes.tokenIdToHandId(1326)
      } catch(e) {
        const errorFound = e.message.match("invalid id")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "tokenURI tokenId must be valid", async function () {
      try {
        await this.holdemHeroes.tokenURI(1326)
      } catch(e) {
        const errorFound = e.message.match("invalid id")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "tokenIdToHandId hands must be distributed", async function () {
      try {
        await this.holdemHeroes.tokenIdToHandId(99)
      } catch(e) {
        const errorFound = e.message.match("not distributed")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "tokenURI hands must be distributed", async function () {
      try {
        await this.holdemHeroes.tokenURI(99)
      } catch(e) {
        const errorFound = e.message.match("not distributed")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "...", async function () {
      expect( true ).to.equal( true )
    } )
  })
})

