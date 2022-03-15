const { expect } = require("chai")
const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")

const { vorDevConfig, getRanksForUpload, getHandsForUpload, playTestData, handEvalUploadJson } = require("../helpers/test_data")

const { increaseBlockTime, mineOneBlock } = require( "../helpers/chain" )
const utils = require( "../helpers/utils" )

const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const xFUND = artifacts.require("MockERC20")
const HoldemHeroes = artifacts.require("MockHEH") // Loads a compiled contract
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator") // Loads a compiled contract
const MockVORDeterministic = artifacts.require("MockVORDeterministic")
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")

contract("TexasHoldemV1 - play", async function(accounts) {

  const flopRandomness = "115792089237316195423570985008687907853269984665640564039457584007913129639935"
  const roundTime = 200
  const maxConcurrentGames = 5

  before(async function () {

    this.xfund = await xFUND.new()
    this.vor = await MockVORDeterministic.new();
    this.pokerHandEvaluator = await PokerHandEvaluator.new(0)
    this.playingCards = await PlayingCards.new()

    this.holdemHeroes = await HoldemHeroes.new(this.playingCards.address)

    this.texasHoldem = await TexasHoldemV1.new(
      this.xfund.address,
      this.vor.address,
      this.holdemHeroes.address,
      this.pokerHandEvaluator.address,
      maxConcurrentGames,
      roundTime,
      vorDevConfig.vor_key_hash,
      vorDevConfig.vor_fee)
  })

  describe('games', function() {

    for(let i = 1; i <= 5; i += 1) {
      it( `start game ${i} & deal flop`, async function () {
        const receipt = await this.texasHoldem.startGame()
        await this.vor.fulfillRequest( utils.getRequestId( receipt ), flopRandomness )
      } )
    }

    it("...increaseBlockTime", async function() {
      await increaseBlockTime( 300 )
      await mineOneBlock()
      expect(true).to.equal(true)
    })

    for(let i = 1; i <= 5; i += 1) {
      it( `end game ${i}`, async function () {
        const receipt = await this.texasHoldem.endGame( i, { from: accounts[0] } )
        expectEvent(receipt, "GameDeleted", {
          gameId: new BN(i),
        })

        const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
        expect(gamesInProgress.includes(new BN(i))).to.be.eq(false)

        const game = await this.texasHoldem.games(i)
        expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
      })
    }


    it("...", async function () {
      expect(true).to.equal(true)
    })

  })


})

