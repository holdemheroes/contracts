const { expect } = require("chai")
const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")

const { vorDevConfig } = require("../helpers/test_data")

const { increaseBlockTime, mineOneBlock } = require("../helpers/chain")
const utils = require( "../helpers/utils" )

const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const xFUND = artifacts.require("MockERC20")
const HoldemHeroes = artifacts.require("HoldemHeroes") // Loads a compiled contract
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator") // Loads a compiled contract
const MockVORDeterministic = artifacts.require("MockVORDeterministic")
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")

contract("TexasHoldemV1 - deal", async function(accounts) {
  const admin = accounts[0]
  const dealer = accounts[1]
  const pheSubFee = 1
  const roundTime = 10
  const maxConcurrentGames = 5

  const flopRandomness = "115792089237316195423570985008687907853269984665640564039457584007913129639935"

  const targetBlocksPerSale = 5
  const saleHalflife = 700
  const priceSpeed = 1
  const priceHalflife = 100
  const startingPrice = web3.utils.toWei("0.22", "ether")

  describe('should succeed', function() {
    before(async function () {
      const saleStart = Math.floor(Date.now() / 1000)
      this.xfund = await xFUND.new()
      this.vor = await MockVORDeterministic.new();
      this.playingCards = await PlayingCards.new()

      this.holdemHeroes = await HoldemHeroes.new(
        this.vor.address,
        this.xfund.address,
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

      this.pokerHandEvaluator = await PokerHandEvaluator.new(pheSubFee)
      this.texasHoldem = await TexasHoldemV1.new(
        this.xfund.address,
        this.vor.address,
        this.holdemHeroes.address,
        this.pokerHandEvaluator.address,
        maxConcurrentGames,
        roundTime,
        vorDevConfig.vor_key_hash,
        vorDevConfig.vor_fee)

      await this.pokerHandEvaluator.ownerAddSubscriber(this.texasHoldem.address, {from: admin})

      // grant dealer role
      const DEALER_ROLE = await this.texasHoldem.DEALER_ROLE()
      await this.texasHoldem.grantRole(DEALER_ROLE, dealer, {from: admin})

      const receipt = await this.texasHoldem.startGame()
      this.requestId = utils.getRequestId(receipt)
    })

    it("can deal flop", async function () {

      let game = await this.texasHoldem.games(1)
      expect(game.status).to.be.bignumber.equal(new BN(1)) // GameStatus.FLOP_WAIT

      // request is initialised in startGame function
      // simulate request being fulfilled by VOR
      const receipt = await this.vor.fulfillRequest(this.requestId, flopRandomness)

      expectEvent.inTransaction(receipt.tx, this.texasHoldem,  "CardDealt", {
        gameId: new BN(1),
        requestId: this.requestId,
        round: new BN(2), // GameStatus.FLOP_DEALT
        cardId: new BN(0), // 2c
      })

      expectEvent.inTransaction(receipt.tx, this.texasHoldem, "CardDealt", {
        gameId: new BN(1),
        requestId: this.requestId,
        round: new BN(2), // GameStatus.FLOP_DEALT
        cardId: new BN(5), // 3d
      })

      expectEvent.inTransaction(receipt.tx, this.texasHoldem, "CardDealt", {
        gameId: new BN(1),
        requestId: this.requestId,
        round: new BN(2), // GameStatus.FLOP_DEALT
        cardId: new BN(7), // 3s
      })

      game = await this.texasHoldem.games(1)
      expect(game.status).to.be.bignumber.equal(new BN(2)) // GameStatus.FLOP_DEALT

      const cardsDealt = await this.texasHoldem.getCardsDealt(1)

      expect(cardsDealt[0]).to.be.bignumber.equal(new BN(0))
      expect(cardsDealt[1]).to.be.bignumber.equal(new BN(5))
      expect(cardsDealt[2]).to.be.bignumber.equal(new BN(7))

      expect((await this.texasHoldem.cardIsDealt(0, 1))).to.be.equal(true)
      expect((await this.texasHoldem.cardIsDealt(5, 1))).to.be.equal(true)
      expect((await this.texasHoldem.cardIsDealt(7, 1))).to.be.equal(true)

      const gameDeck = await this.texasHoldem.getGameDeck(1)
      expect(gameDeck.includes(new BN(0))).to.be.equal(false)
      expect(gameDeck.includes(new BN(5))).to.be.equal(false)
      expect(gameDeck.includes(new BN(7))).to.be.equal(false)
    })

    it("can request deal for turn", async function () {
      let game = await this.texasHoldem.games(1)
      expect(game.status).to.be.bignumber.equal(new BN(2)) // GameStatus.FLOP_DEALT

      await increaseBlockTime(roundTime+1)
      const receipt = await this.texasHoldem.requestDeal(1)

      this.requestId = utils.getRequestId(receipt)

      expectEvent(receipt, "CardDealRequested", {
        gameId: new BN(1),
        requestId: this.requestId,
        turnRequested: new BN(3), // GameStatus.TURN_WAIT
      })

      game = await this.texasHoldem.games(1)
      expect(game.status).to.be.bignumber.equal(new BN(3)) // GameStatus.TURN_WAIT
    })

    it("can fulfill deal for turn", async function () {
      let game = await this.texasHoldem.games(1)
      expect(game.status).to.be.bignumber.equal(new BN(3)) // GameStatus.TURN_WAIT

      // request is initialised in startGame function
      // simulate request being fulfilled by VOR
      const receipt = await this.vor.fulfillRequest(this.requestId, flopRandomness)

      expectEvent.inTransaction(receipt.tx, this.texasHoldem,  "CardDealt", {
        gameId: new BN(1),
        requestId: this.requestId,
        round: new BN(4), // GameStatus.TURN_DEALT
        cardId: new BN(15), // 5s
      })

      game = await this.texasHoldem.games(1)
      expect(game.status).to.be.bignumber.equal(new BN(4)) // GameStatus.TURN_DEALT

      const cardsDealt = await this.texasHoldem.getCardsDealt(1)

      expect(cardsDealt[0]).to.be.bignumber.equal(new BN(0))
      expect(cardsDealt[1]).to.be.bignumber.equal(new BN(5))
      expect(cardsDealt[2]).to.be.bignumber.equal(new BN(7))
      expect(cardsDealt[3]).to.be.bignumber.equal(new BN(15))

      expect((await this.texasHoldem.cardIsDealt(15, 1))).to.be.equal(true)

      const gameDeck = await this.texasHoldem.getGameDeck(1)
      expect(gameDeck.includes(new BN(15))).to.be.equal(false)
    })

    it("can request deal for river", async function () {
      let game = await this.texasHoldem.games(1)
      expect(game.status).to.be.bignumber.equal(new BN(4)) // GameStatus.TURN_DEALT

      await increaseBlockTime(roundTime+1)
      const receipt = await this.texasHoldem.requestDeal(1)

      this.requestId = utils.getRequestId(receipt)

      expectEvent(receipt, "CardDealRequested", {
        gameId: new BN(1),
        requestId: this.requestId,
        turnRequested: new BN(5), // GameStatus.RIVER_WAIT
      })

      game = await this.texasHoldem.games(1)
      expect(game.status).to.be.bignumber.equal(new BN(5)) // GameStatus.RIVER_WAIT
    })

    it("can fulfill deal for river", async function () {
      let game = await this.texasHoldem.games(1)
      expect(game.status).to.be.bignumber.equal(new BN(5)) // GameStatus.RIVER_WAIT

      // request is initialised in startGame function
      // simulate request being fulfilled by VOR
      const receipt = await this.vor.fulfillRequest(this.requestId, flopRandomness)

      expectEvent.inTransaction(receipt.tx, this.texasHoldem,  "CardDealt", {
        gameId: new BN(1),
        requestId: this.requestId,
        round: new BN(6), // GameStatus.RIVER_DEALT
        cardId: new BN(49), // Ad
      })

      game = await this.texasHoldem.games(1)
      expect(game.status).to.be.bignumber.equal(new BN(6)) // GameStatus.RIVER_DEALT

      const cardsDealt = await this.texasHoldem.getCardsDealt(1)

      expect(cardsDealt[0]).to.be.bignumber.equal(new BN(0))
      expect(cardsDealt[1]).to.be.bignumber.equal(new BN(5))
      expect(cardsDealt[2]).to.be.bignumber.equal(new BN(7))
      expect(cardsDealt[3]).to.be.bignumber.equal(new BN(15))
      expect(cardsDealt[4]).to.be.bignumber.equal(new BN(49))

      expect((await this.texasHoldem.cardIsDealt(49, 1))).to.be.equal(true)

      const gameDeck = await this.texasHoldem.getGameDeck(1)
      expect(gameDeck.includes(new BN(49))).to.be.equal(false)
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('should fail', function() {
    before(async function () {
      const saleStart = Math.floor(Date.now() / 1000)
      this.xfund = await xFUND.new()
      this.vor = await MockVORDeterministic.new();
      this.playingCards = await PlayingCards.new()
      this.holdemHeroes = await HoldemHeroes.new(
        this.vor.address,
        this.xfund.address,
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

      this.pokerHandEvaluator = await PokerHandEvaluator.new(pheSubFee)
      this.texasHoldem = await TexasHoldemV1.new(
        this.xfund.address,
        this.vor.address,
        this.holdemHeroes.address,
        this.pokerHandEvaluator.address,
        maxConcurrentGames,
        roundTime,
        vorDevConfig.vor_key_hash,
        vorDevConfig.vor_fee)

      await this.pokerHandEvaluator.ownerAddSubscriber(this.texasHoldem.address, {from: admin})

      // grant dealer role
      const DEALER_ROLE = await this.texasHoldem.DEALER_ROLE()
      await this.texasHoldem.grantRole(DEALER_ROLE, dealer, {from: admin})

      const receipt = await this.texasHoldem.startGame()
      this.requestId = utils.getRequestId(receipt)
    })


    it("cannot request deal for game that does not exist", async function () {
      await expectRevert(
        this.texasHoldem.requestDeal(2),
        "not time to deal",
      )
    })

    it("cannot request deal before round end time", async function () {

      let game = await this.texasHoldem.games(1)
      expect(game.status).to.be.bignumber.equal(new BN(1)) // GameStatus.FLOP_WAIT

      await this.vor.fulfillRequest(this.requestId, flopRandomness)

      await expectRevert(
        this.texasHoldem.requestDeal(1),
        "cannot request deal yet",
      )

      game = await this.texasHoldem.games(1)
      expect(game.status).to.be.bignumber.equal(new BN(2)) // GameStatus.FLOP_DEALT
    })

    it("cannot fulfill deal if no requestId", async function () {
      let game = await this.texasHoldem.games(1)
      expect(game.status).to.be.bignumber.equal(new BN(2)) // GameStatus.FLOP_DEALT

      await this.vor.fulfillRequest("0x12345", flopRandomness)

      game = await this.texasHoldem.games(1)
      expect(game.status).to.be.bignumber.equal(new BN(2)) // GameStatus.FLOP_DEALT

      await this.vor.fulfillRequest(this.requestId, flopRandomness)

      game = await this.texasHoldem.games(1)
      expect(game.status).to.be.bignumber.equal(new BN(2)) // GameStatus.FLOP_DEALT

    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('check stale status', function() {
    before( async function () {
      const saleStart = Math.floor( Date.now() / 1000 )
      this.xfund = await xFUND.new()
      this.vor = await MockVORDeterministic.new();
      this.playingCards = await PlayingCards.new()
      this.holdemHeroes = await HoldemHeroes.new(
        this.vor.address,
        this.xfund.address,
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

      this.pokerHandEvaluator = await PokerHandEvaluator.new( pheSubFee )
      this.texasHoldem = await TexasHoldemV1.new(
        this.xfund.address,
        this.vor.address,
        this.holdemHeroes.address,
        this.pokerHandEvaluator.address,
        maxConcurrentGames,
        roundTime,
        vorDevConfig.vor_key_hash,
        vorDevConfig.vor_fee )

    } )

    it("check stale status during flop", async function() {

      // flop
      const receipt = await this.texasHoldem.startGame()
      await this.vor.fulfillRequest(utils.getRequestId( receipt ), flopRandomness)

      let game = await this.texasHoldem.games(1)
      expect(game.status).to.be.bignumber.equal(new BN(2)) // GameStatus.FLOP_DEALT

      let stale = await this.texasHoldem.gameIsStale( 1 )
      expect( stale ).to.be.eq( false )

      await increaseBlockTime(roundTime + 10)
      await mineOneBlock()

      stale = await this.texasHoldem.gameIsStale( 1 )
      expect( stale ).to.be.eq( true )
    })

    it("check stale status during turn", async function() {

      // flop
      let receipt = await this.texasHoldem.startGame()
      await this.vor.fulfillRequest(utils.getRequestId( receipt ), flopRandomness)

      let game = await this.texasHoldem.games(2)
      expect(game.status).to.be.bignumber.equal(new BN(2)) // GameStatus.FLOP_DEALT

      //turn
      await increaseBlockTime(roundTime + 10)
      await mineOneBlock()
      receipt = await this.texasHoldem.requestDeal(2)
      await this.vor.fulfillRequest(utils.getRequestId( receipt ), flopRandomness)

      game = await this.texasHoldem.games(2)
      expect(game.status).to.be.bignumber.equal(new BN(4)) // GameStatus.TURN_DEALT

      let stale = await this.texasHoldem.gameIsStale( 2 )
      expect( stale ).to.be.eq( false )

      await increaseBlockTime(roundTime + 10)
      await mineOneBlock()

      stale = await this.texasHoldem.gameIsStale( 2 )
      expect( stale ).to.be.eq( true )
    })

    it("check stale status during river", async function() {

      // flop
      let receipt = await this.texasHoldem.startGame()
      await this.vor.fulfillRequest(utils.getRequestId( receipt ), flopRandomness)

      let game = await this.texasHoldem.games(3)
      expect(game.status).to.be.bignumber.equal(new BN(2)) // GameStatus.FLOP_DEALT

      //turn
      await increaseBlockTime(roundTime + 10)
      await mineOneBlock()
      receipt = await this.texasHoldem.requestDeal(3)
      await this.vor.fulfillRequest(utils.getRequestId( receipt ), flopRandomness)

      game = await this.texasHoldem.games(3)
      expect(game.status).to.be.bignumber.equal(new BN(4)) // GameStatus.TURN_DEALT

      //river
      await increaseBlockTime(roundTime + 10)
      await mineOneBlock()
      receipt = await this.texasHoldem.requestDeal(3)
      await this.vor.fulfillRequest(utils.getRequestId( receipt ), flopRandomness)

      game = await this.texasHoldem.games(3)
      expect(game.status).to.be.bignumber.equal(new BN(6)) // GameStatus.RIVER_DEALT

      let stale = await this.texasHoldem.gameIsStale( 3 )
      expect( stale ).to.be.eq( false )

      await increaseBlockTime(roundTime + 10)
      await mineOneBlock()

      stale = await this.texasHoldem.gameIsStale( 3 )
      expect( stale ).to.be.eq( true )
    })

    it("non-existent game will be false", async function () {
      let stale = await this.texasHoldem.gameIsStale( 99 )
      expect( stale ).to.be.eq( false )
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })

  })
})
