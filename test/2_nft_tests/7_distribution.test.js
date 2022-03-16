const { expect } = require("chai")
const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")

const { getRanksForUpload, getHandsForUpload, vorDevConfig } = require( "../helpers/test_data" )
const { increaseBlockTime } = require( "../helpers/chain" )
const utils = require( "../helpers/utils" )
const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const HoldemHeroes = artifacts.require("HoldemHeroes") // Loads a compiled contract
const xFUND = artifacts.require("MockERC20")
const MockVORDeterministic = artifacts.require("MockVORDeterministic")

contract("HoldemHeroes - distribution", async function(accounts) {

  const flopRandomness = "115792089237316195423570985008687907853269984665640564039457584007913129639935"
  const randomnessResult = "910"

  before(async function () {
    const saleStart = Math.floor(Date.now() / 1000)
    this.xfund = await xFUND.new()
    this.vor = await MockVORDeterministic.new();
    this.playingCards = await PlayingCards.new()
    this.holdemHeroes = await HoldemHeroes.new(this.vor.address, this.xfund.address, this.playingCards.address, saleStart, 1, 0, 5)

    const amount = new BN(vorDevConfig.vor_fee).mul(new BN(2))
    await this.xfund.transfer(this.holdemHeroes.address, amount)

    const rankData = getRanksForUpload()
    await this.holdemHeroes.uploadHandRanks(rankData.rankHashes, rankData.ranks)
    const hands = getHandsForUpload()
    await increaseBlockTime(10)
    console.log(`upload ${hands.length} ranks`)
    for( let i = 0; i < hands.length; i += 1) {
      await this.holdemHeroes.reveal(hands[i], i, "")
      process.stdout.write(`.${i+1}`)
    }
    console.log(".")
  })

  it("can distribute using VOR", async function () {

    const requestReceipt = await this.holdemHeroes.beginDistribution(vorDevConfig.vor_key_hash, vorDevConfig.vor_fee)

    this.requestId = utils.getRequestId(requestReceipt)

    expectEvent(requestReceipt, "DistributionBegun", {
      requestId: this.requestId,
      sender: accounts[0],
    })

    const fulfilReceipt = await this.vor.fulfillRequest( this.requestId, flopRandomness )

    expectEvent.inTransaction(fulfilReceipt.tx, this.holdemHeroes,  "DistributionResult", {
      requestId: this.requestId,
      randomness: new BN(flopRandomness),
      startingIndex: new BN(randomnessResult),
    })

    const startingIndex = await this.holdemHeroes.startingIndex()

    expect( startingIndex ).to.be.bignumber.eq( new BN( randomnessResult ) )

  })

  it("cannot initiate distribution more than once", async function () {
    await expectRevert(
      this.holdemHeroes.beginDistribution(vorDevConfig.vor_key_hash, vorDevConfig.vor_fee),
      "already executed",
    )
  })

  it("cannot fulfill more than once", async function () {
    await expectRevert(
      this.vor.fulfillRequestUseSentContractAddress( this.requestId, flopRandomness, this.holdemHeroes.address),
      "already executed",
    )
  })

  it( "...", async function () {
    expect( true ).to.equal( true )
  } )
})
