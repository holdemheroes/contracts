const { expect } = require("chai")
const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")

const { devAddresses } = require("../helpers/test_data")

const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const HoldemHeroes = artifacts.require("HoldemHeroes") // Loads a compiled contract

contract("HoldemHeroes - deploy", async function(accounts) {
  describe('should succeed', function() {
    it("can deploy with correct params", async function () {
      const saleStart = Math.floor(Date.now() / 1000)
      const playingCards = await PlayingCards.new()
      const holdemHeroes = await HoldemHeroes.new(devAddresses.vor, devAddresses.xfund, playingCards.address, saleStart, 1, 0, 5)
      expect(holdemHeroes.address).to.not.be.eq("0x0000000000000000000000000000000000000000")
    })

    it("can deploy with 0 saleStart", async function () {
      const playingCards = await PlayingCards.new()
      const holdemHeroes = await HoldemHeroes.new(devAddresses.vor, devAddresses.xfund, playingCards.address, 0, 1, 0, 5)
      const saleStart = await holdemHeroes.SALE_START_TIMESTAMP()
      expect(saleStart).to.be.bignumber.gt(new BN(0))
    })

    it("params correctly set", async function () {
      const saleStart = Math.floor(Date.now() / 1000) + 100
      const revealTime = 86400
      const expectedRevealTime = saleStart + revealTime
      const whiteListTime = 600
      const expectedWhiteListTime = saleStart + whiteListTime
      const maxNfts = 5
      const playingCards = await PlayingCards.new()
      const holdemHeroes = await HoldemHeroes.new(devAddresses.vor, devAddresses.xfund, playingCards.address, saleStart, revealTime, whiteListTime, maxNfts)
      const reveal = await holdemHeroes.REVEAL_TIMESTAMP()
      const mNfts = await holdemHeroes.MAX_PER_ADDRESS_OR_TX()
      const revealed = await holdemHeroes.REVEALED()
      const ranksUploaded = await holdemHeroes.RANKS_UPLOADED()
      const handUploadId = await holdemHeroes.handUploadId()
      const whiteListMintTimestamp = await holdemHeroes.WHITELIST_MINT_TIMESTAMP()

      expect(reveal).to.be.bignumber.equal(new BN(expectedRevealTime))
      expect(mNfts).to.be.bignumber.equal(new BN(maxNfts))
      expect(revealed).to.be.equal(false)
      expect(ranksUploaded).to.be.equal(false)
      expect(handUploadId).to.be.bignumber.equal(new BN(0))
      expect(whiteListMintTimestamp).to.be.bignumber.equal(new BN(expectedWhiteListTime))
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })
})

