const { expect } = require("chai")
const { expectEvent } = require( "@openzeppelin/test-helpers" )

const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract

contract("PlayingCards - deploy", async function(accounts) {
  describe('should succeed', function() {
    it("can deploy", async function () {
      const playingCards = await PlayingCards.new()
      expectEvent.inTransaction(playingCards.transactionHash, playingCards, "CardsInitialised", {})
      expect(playingCards.address).to.not.be.eq("0x0000000000000000000000000000000000000000")
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })
})

