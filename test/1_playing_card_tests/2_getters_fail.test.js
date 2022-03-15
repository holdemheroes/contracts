const { expect } = require("chai")

const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract

contract("PlayingCards - getters should fail", async function(accounts) {
  // deploy contract once before this set of tests
  before(async function () {
    this.playingCards = await PlayingCards.new()
  })

  describe("card getters - should fail", function() {

    it( "getCardNumberAsUint cardId must be valid", async function () {
      try {
        await this.playingCards.getCardNumberAsUint(99)
      } catch(e) {
        const errorFound = e.message.match("invalid cardId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getCardSuitAsUint cardId must be valid", async function () {
      try {
        await this.playingCards.getCardSuitAsUint(99)
      } catch(e) {
        const errorFound = e.message.match("invalid cardId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getCardNumberAsStr cardId must be valid", async function () {
      try {
        await this.playingCards.getCardNumberAsStr(99)
      } catch(e) {
        const errorFound = e.message.match("invalid cardId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getCardSuitAsStr cardId must be valid", async function () {
      try {
        await this.playingCards.getCardSuitAsStr(99)
      } catch(e) {
        const errorFound = e.message.match("invalid cardId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getCardAsComponents cardId must be valid", async function () {
      try {
        await this.playingCards.getCardAsComponents(99)
      } catch(e) {
        const errorFound = e.message.match("invalid cardId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getCardBody suitId must be valid", async function () {
      try {
        await this.playingCards.getCardBody(0, 99, "0", "0", "0")
      } catch(e) {
        const errorFound = e.message.match("invalid suitId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getCardBody numberId must be valid", async function () {
      try {
        await this.playingCards.getCardBody(99, 0, "0", "0", "0")
      } catch(e) {
        const errorFound = e.message.match("invalid numberId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getSuitPath suitId must be valid", async function () {
      try {
        await this.playingCards.getSuitPath(99)
      } catch(e) {
        const errorFound = e.message.match("invalid suitId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getNumberPath numberId must be valid", async function () {
      try {
        await this.playingCards.getNumberPath(99)
      } catch(e) {
        const errorFound = e.message.match("invalid numberId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getCardAsString cardId must be valid", async function () {
      try {
        await this.playingCards.getCardAsString(99)
      } catch(e) {
        const errorFound = e.message.match("invalid cardId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "getCardAsSvg cardId must be valid", async function () {
      try {
        await this.playingCards.getCardAsSvg(99)
      } catch(e) {
        const errorFound = e.message.match("invalid cardId")
        expect(errorFound).to.not.be.equal(null)
      }
    })

    it( "...", async function () {
      expect( true ).to.equal( true )
    } )
  })

})

