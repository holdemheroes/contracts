const { expect } = require("chai")
const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
  constants,
} = require("@openzeppelin/test-helpers")

const { devAddresses, getRanksForUpload, getHandsForUpload } = require( "../helpers/test_data" )
const { increaseBlockTime } = require("../helpers/chain")
const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const HoldemHeroes = artifacts.require("HoldemHeroesTestableDistribution") // Loads a compiled contract

contract("HoldemHeroes - post reveal mint", async function(accounts) {
  // deploy contract once before this set of tests
  before(async function () {
    const saleStart = Math.floor(Date.now() / 1000)
    this.playingCards = await PlayingCards.new()
    this.holdemHeroes = await HoldemHeroes.new(devAddresses.vor, devAddresses.xfund, this.playingCards.address, saleStart, 1, 0, 5)
    await increaseBlockTime(10)

    const hands = getHandsForUpload()
    for( let i = 0; i < hands.length; i += 1) {
      await this.holdemHeroes.reveal(hands[i], i, "")
    }
  })

  describe("post reveal minting", function() {
    it( "cannot mintNFTPostReveal if not revealed yet", async function () {
      const saleStart = Math.floor( Date.now() / 1000 )
      const holdemHeroes = await HoldemHeroes.new( devAddresses.vor, devAddresses.xfund, this.playingCards.address, saleStart, 1, 0, 5 )
      const pricePerNft = await holdemHeroes.getNftPrice()
      await expectRevert(
        holdemHeroes.mintNFTPostReveal( 1, { from: accounts[1], value: pricePerNft } ),
        "not revealed",
      )
    } )

    it( "cannot mintNFTPostReveal if not distributed yet", async function () {
      const pricePerNft = await this.holdemHeroes.getNftPrice()
      await expectRevert(
        this.holdemHeroes.mintNFTPostReveal( 1, { from: accounts[1], value: pricePerNft } ),
        "not distributed",
      )
    } )

    it( "can mintNFTPostReveal when revealed and distributed", async function () {
      const minter = accounts[1]
      const tokenIdToMint = 0

      await this.holdemHeroes.beginDistributionTestable( 24 )

      const pricePerNft = await this.holdemHeroes.getNftPrice()

      const receipt = await this.holdemHeroes.mintNFTPostReveal( tokenIdToMint, { from: minter, value: pricePerNft } )
      expectEvent( receipt, "Transfer", {
        from: constants.ZERO_ADDRESS,
        to: minter,
        tokenId: new BN( tokenIdToMint ),
      } )
      const nftOwner = await this.holdemHeroes.ownerOf( tokenIdToMint )
      expect( nftOwner ).to.be.eq( minter )
    } )

    it("getNftPrice returns correct price per NFT after revealed", async function () {
      const postRevealPrice = await this.holdemHeroes.POST_REVEAL_MINT_PRICE()
      const pricePerNft = await this.holdemHeroes.getNftPrice()
      expect( pricePerNft ).to.be.bignumber.eq( postRevealPrice )
    })

    it( "must mintNFTPostReveal with a valid tokenId", async function () {
      const pricePerNft = await this.holdemHeroes.getNftPrice()
      await expectRevert(
        this.holdemHeroes.mintNFTPostReveal( 1326, { from: accounts[1], value: pricePerNft } ),
        "invalid tokenId",
      )
    } )

    it( "must mintNFTPostReveal with a valid price", async function () {
      await expectRevert(
        this.holdemHeroes.mintNFTPostReveal( 1, { from: accounts[1], value: 100 } ),
        "eth value incorrect",
      )
    } )

    // it( "cannot mintNFTPostReveal more than max", async function () {
    //   const pricePerNft = await this.holdemHeroes.getNftPrice()
    //   await this.holdemHeroes.mintNFTPostReveal( 1, { from: accounts[1], value: pricePerNft } )
    //   await this.holdemHeroes.mintNFTPostReveal( 2, { from: accounts[1], value: pricePerNft } )
    //   await this.holdemHeroes.mintNFTPostReveal( 3, { from: accounts[1], value: pricePerNft } )
    //   await this.holdemHeroes.mintNFTPostReveal( 4, { from: accounts[1], value: pricePerNft } )
    //   await expectRevert(
    //     this.holdemHeroes.mintNFTPostReveal( 5, { from: accounts[1], value: pricePerNft } ),
    //     "mint limit reached",
    //   )
    // } )

    it( "must mintNFTPostReveal with valid tokenId", async function () {

      const pricePerNft = await this.holdemHeroes.getNftPrice()

      await expectRevert(
        this.holdemHeroes.mintNFTPostReveal( 1326, { from: accounts[1], value: pricePerNft } ),
        "invalid tokenId",
      )
    } )

    it( "must mintNFTPostReveal available tokenId", async function () {

      const pricePerNft = await this.holdemHeroes.getNftPrice()

      await expectRevert(
        this.holdemHeroes.mintNFTPostReveal( 1, { from: accounts[2], value: pricePerNft } ),
        "ERC721: token already minted",
      )
    } )

    it( "...", async function () {
      expect( true ).to.equal( true )
    } )
  })
})

