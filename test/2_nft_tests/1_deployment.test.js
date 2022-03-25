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

  const targetBlocksPerSale = 5
  const saleHalflife = 700
  const priceSpeed = 1
  const priceHalflife = 100
  const startingPrice = web3.utils.toWei("0.22", "ether")

  describe('should succeed', function() {
    it("can deploy with correct params", async function () {
      const saleStartBlockNum = 1
      const playingCards = await PlayingCards.new()
      const holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        playingCards.address,
        saleStartBlockNum,
        Math.floor(Date.now() / 1000) + 1,
        5,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceHalflife,
        startingPrice
      )
      expect(holdemHeroes.address).to.not.be.eq("0x0000000000000000000000000000000000000000")

    })

    it("can deploy with 0 saleStart", async function () {
      const playingCards = await PlayingCards.new()
      const holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        playingCards.address,
        0,
        1,
        5,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceHalflife,
        startingPrice
      )
      const saleStartBlockNum = await holdemHeroes.SALE_START_BLOCK_NUM()
      expect(saleStartBlockNum).to.be.bignumber.gt(new BN(0))
    })

    it("params correctly set", async function () {
      const saleStartBlockNum = 1
      const revealTime = Math.floor(Date.now() / 1000) + 86400
      const maxNfts = 5
      const playingCards = await PlayingCards.new()
      const holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        playingCards.address,
        saleStartBlockNum,
        revealTime,
        maxNfts,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceHalflife,
        startingPrice
      )
      const reveal = await holdemHeroes.REVEAL_TIMESTAMP()
      const mNfts = await holdemHeroes.MAX_PER_ADDRESS_OR_TX()
      const revealed = await holdemHeroes.REVEALED()
      const ranksUploaded = await holdemHeroes.RANKS_UPLOADED()
      const handUploadId = await holdemHeroes.handUploadId()

      expect(reveal).to.be.bignumber.equal(new BN(revealTime))
      expect(mNfts).to.be.bignumber.equal(new BN(maxNfts))
      expect(revealed).to.be.equal(false)
      expect(ranksUploaded).to.be.equal(false)
      expect(handUploadId).to.be.bignumber.equal(new BN(0))
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })
})

