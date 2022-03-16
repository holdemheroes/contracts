const { expect } = require("chai")
const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")

const { devAddresses, getRanksForUpload, getHandsForUpload } = require( "../helpers/test_data" )
const { increaseBlockTime } = require( "../helpers/chain" )
const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const HoldemHeroes = artifacts.require("HoldemHeroes") // Loads a compiled contract

contract("HoldemHeroes - init & admin", async function(accounts) {

  const targetBlocksPerSale = 5
  const saleHalflife = 700
  const priceSpeed = 1
  const priceHalflife = 100
  const startingPrice = web3.utils.toWei("0.22", "ether")

  describe('should succeed', function() {
    // deploy contract once before this set of tests
    before(async function () {
      const saleStart = Math.floor(Date.now() / 1000)
      const playingCards = await PlayingCards.new()
      this.holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        playingCards.address,
        saleStart,
        1,
        5,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceHalflife,
        startingPrice
      )
    })

    it("can uploadHandRanks", async function () {
      const rankData = getRanksForUpload()
      const receipt = await this.holdemHeroes.uploadHandRanks(rankData.rankHashes, rankData.ranks)
      expectEvent(receipt, "RanksInitialised", {})
      const ranksUploaded = await this.holdemHeroes.RANKS_UPLOADED()
      expect(ranksUploaded).to.be.equal(true)
    })

    it("can withdraw eth", async function () {
      const saleStart = Math.floor(Date.now() / 1000)
      const playingCards = await PlayingCards.new()
      const holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        playingCards.address,
        saleStart,
        100,
        5,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceHalflife,
        startingPrice
      )
      await increaseBlockTime(10)
      const pricePerNft = await holdemHeroes.getNftPrice()

      await holdemHeroes.mintNFTPreReveal( 1, { from: accounts[1], value: pricePerNft })
      const before = await web3.eth.getBalance(accounts[0])

      const hehBalBefore = await web3.eth.getBalance(holdemHeroes.address)

      expect( hehBalBefore ).to.be.bignumber.eq( pricePerNft )

      const receipt = await holdemHeroes.withdrawETH()

      expect(receipt.receipt.status).to.be.eq(true)

      const after = await web3.eth.getBalance(accounts[0])

      expect( after ).to.be.bignumber.gt( before )

      const hehBalAfter = await web3.eth.getBalance(holdemHeroes.address)

      expect( hehBalAfter ).to.be.bignumber.eq( new BN(0) )
    })

    it("can reveal", async function () {
      const hands = getHandsForUpload()
      await increaseBlockTime(10)
      for( let i = 0; i < hands.length; i += 1) {
        const receipt = await this.holdemHeroes.reveal(hands[i], i, "")
        expectEvent(receipt, "BatchRevealed", {
          batchId: new BN(i)
        })
      }

      const revealed = await this.holdemHeroes.REVEALED()
      expect(revealed).to.be.equal(true)

      const revealBlockNum = await this.holdemHeroes.revealBlock()
      expect( revealBlockNum ).to.be.bignumber.gt( new BN(0) )
    })

    it("can call fallbackDistribution only once", async function () {
      const revealBlockNum = await this.holdemHeroes.revealBlock()
      const MAX_NFT_SUPPLY = await this.holdemHeroes.MAX_NFT_SUPPLY()
      const revealBlock = await web3.eth.getBlock(revealBlockNum)
      const hashNum = web3.utils.toBN(revealBlock.hash)

      const expectedStartIndex = hashNum.mod(MAX_NFT_SUPPLY.sub(new BN(1)))

      const receipt = await this.holdemHeroes.fallbackDistribution()

      expectEvent(receipt, "DistributionResult", {
        requestId: "0x0000000000000000000000000000000000000000000000000000000000000000",
        randomness: new BN(0),
        startingIndex: expectedStartIndex,
      })

      const startingIndex = await this.holdemHeroes.startingIndex()

      expect( startingIndex ).to.be.bignumber.eq( expectedStartIndex )

      await expectRevert(
        this.holdemHeroes.fallbackDistribution(),
        "already executed",
      )
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('should fail', function() {
    // deploy contract before each
    beforeEach(async function () {
      const saleStart = Math.floor(Date.now() / 1000)
      const playingCards = await PlayingCards.new()
      this.holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        playingCards.address,
        saleStart,
        100,
        5,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceHalflife,
        startingPrice
      )
    })

    it("only owner can uploadHandRanks", async function () {
      const rankData = getRanksForUpload()
      await expectRevert(
        this.holdemHeroes.uploadHandRanks(rankData.rankHashes, rankData.ranks, { from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
    })

    it("can only call uploadHandRanks once", async function () {
      const rankData = getRanksForUpload()
      await this.holdemHeroes.uploadHandRanks(rankData.rankHashes, rankData.ranks)
      await expectRevert(
        this.holdemHeroes.uploadHandRanks(rankData.rankHashes, rankData.ranks),
        "ranks uploaded",
      )
    })

    it("can only reveal after the right time", async function () {
      const hands = getHandsForUpload()
      await expectRevert(
        this.holdemHeroes.reveal(hands[0], 0, ""),
        "not time to reveal yet",
      )
    })

    it("only owner can reveal", async function () {
      const hands = getHandsForUpload()
      await increaseBlockTime(110)
      await expectRevert(
        this.holdemHeroes.reveal(hands[0], 0, "", { from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
    })

    it("can only call fallbackDistribution after hands revealed", async function() {
      await expectRevert(
        this.holdemHeroes.fallbackDistribution(),
        "not revealed",
      )
    })

    it("must reveal batches in sequence", async function () {
      const hands = getHandsForUpload()
      await increaseBlockTime(110)
      await expectRevert(
        this.holdemHeroes.reveal(hands[0], 1, ""),
        "batch sequence incorrect",
      )
    })

    it("only owner can distribute", async function () {
      await expectRevert(
        this.holdemHeroes.beginDistribution("0x1234", 1, { from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
    })

    it("cannot distribute if not revealed", async function () {
      await expectRevert(
        this.holdemHeroes.beginDistribution("0x1234", 1),
        "not revealed",
      )
    })

    it("only owner can call fallbackDistribution", async function () {
      await expectRevert(
        this.holdemHeroes.fallbackDistribution({ from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
    })

    it("only admin can withdraw eth", async function () {
      await expectRevert(
        this.holdemHeroes.withdrawETH({ from: accounts[1]}),
        "Ownable: caller is not the owner",
      )
    })

    it("batch can only be revealed once", async function () {
      const hands = getHandsForUpload()
      await increaseBlockTime(110)
      // reveal 0
      await this.holdemHeroes.reveal(hands[0], 0, "")

      // send batch 0 with batch Id 1
      await expectRevert(
        this.holdemHeroes.reveal(hands[0], 1, ""),
        "batch already added",
      )
    })

    it("can only reveal 1326 hands", async function () {
      const hands = getHandsForUpload()
      await increaseBlockTime(110)
      for( let i = 0; i < hands.length; i += 1) {
        await this.holdemHeroes.reveal(hands[i], i, "")
      }
      await expectRevert(
        this.holdemHeroes.reveal(hands[0], 0, ""),
        "already revealed",
      )
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })
})

