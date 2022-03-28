const { expect } = require("chai")
const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")

const { devAddresses, vorDevConfig } = require("../helpers/test_data")
const utils = require("../helpers/utils")

const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const xFUND = artifacts.require("MockERC20")
const HoldemHeroes = artifacts.require("HoldemHeroes") // Loads a compiled contract
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator") // Loads a compiled contract
const MockVORDeterministic = artifacts.require("MockVORDeterministic")
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")

contract("TexasHoldemV1 - start game", async function(accounts) {
  const pheSubFee = 1
  const maxConcurrentGames = 5

  const targetBlocksPerSale = 5
  const saleHalflife = 700
  const priceSpeed = 1
  const priceSpeedDenominator = 1
  const priceHalflife = 100
  const startingPrice = web3.utils.toWei("0.22", "ether")

  before(async function () {
    const saleStartBlockNum = 0
    this.xfund = await xFUND.new()
    this.vor = await MockVORDeterministic.new();
    this.playingCards = await PlayingCards.new()
    this.holdemHeroes = await HoldemHeroes.new(
      this.vor.address,
      this.xfund.address,
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
    this.pokerHandEvaluator = await PokerHandEvaluator.new(pheSubFee)
    this.texasHoldem = await TexasHoldemV1.new(
      this.xfund.address,
      this.vor.address,
      this.holdemHeroes.address,
      this.pokerHandEvaluator.address,
      maxConcurrentGames,
      3600,
      vorDevConfig.vor_key_hash,
      vorDevConfig.vor_fee)

    await this.pokerHandEvaluator.ownerAddSubscriber(this.texasHoldem.address, {from: accounts[0]})
  })

  it("anyone can start a game with default round time", async function () {
    const receipt = await this.texasHoldem.startGame({from: accounts[1]})

    const requestId = utils.getRequestId(receipt)

    expectEvent(receipt, "GameStarted", {
      startedBy: accounts[1],
      gameId: new BN(1),
      requestId: requestId,
    })

    const gameId = await this.texasHoldem.currentGameId()
    expect(gameId).to.be.bignumber.equal(new BN(1))
    const game = await this.texasHoldem.games(gameId)
    expect(game.status).to.be.bignumber.equal(new BN(1))
  })

  it("starting game with invalid custom settings will fail", async function () {
    await expectRevert(
      this.texasHoldem.startCustomGame(0, 1, 1, {from: accounts[1]}),
      "invalid round time",
    )
    await expectRevert(
      this.texasHoldem.startCustomGame(1, 0, 1, {from: accounts[1]}),
      "round bets cannot be 0",
    )
    await expectRevert(
      this.texasHoldem.startCustomGame(1, 1, 0, {from: accounts[1]}),
      "round bets cannot be 0",
    )
  })

  it("anyone can start a game with valid custom settings", async function () {
    const receipt = await this.texasHoldem.startCustomGame(24, 1, 2, {from: accounts[1]})

    const requestId = utils.getRequestId(receipt)

    expectEvent(receipt, "GameStarted", {
      startedBy: accounts[1],
      gameId: new BN(2),
      requestId: requestId,
      gameRoundTimeSeconds: new BN(24),
      round1Price: new BN(1),
      round2Price: new BN(2),
    })

    const gameId = await this.texasHoldem.currentGameId()
    expect(gameId).to.be.bignumber.equal(new BN(2))
    const game = await this.texasHoldem.games(gameId)
    expect(game.status).to.be.bignumber.equal(new BN(1))
    expect(game.gameRoundTimeSeconds).to.be.bignumber.equal(new BN(24))
    expect(game.round1Price).to.be.bignumber.equal(new BN(1))
    expect(game.round2Price).to.be.bignumber.equal(new BN(2))
  })

  for(let i = 2; i < maxConcurrentGames; i += 1) {
    it(`anyone can start up to ${maxConcurrentGames} (start #${i+1}) games`, async function () {
      const receipt = await this.texasHoldem.startGame({from: accounts[1]})
      const requestId = utils.getRequestId(receipt)
      expectEvent(receipt, "GameStarted", {
        startedBy: accounts[1],
        gameId: new BN(i+1),
        requestId: requestId,
      })

      const gameId = await this.texasHoldem.currentGameId()
      expect(gameId).to.be.bignumber.equal(new BN(i+1))
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.equal(new BN(1))
    })
  }

  it(`games #1 - ${maxConcurrentGames} should be in progress`, async function () {
    const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
    expect(gamesInProgress.length).to.be.equal(maxConcurrentGames)
    for(let i = 0; i < gamesInProgress.length; i += 1) {
      const gId = gamesInProgress[i]
      const game = await this.texasHoldem.games(gId)
      expect(game.status).to.be.bignumber.eq(new BN(1))
    }
  })

  it(`cannot start a new game when ${maxConcurrentGames} already in progress`, async function () {
    await expectRevert(
      this.texasHoldem.startGame({from: accounts[1]}),
      "wait for another game to end",
    )
  })

  it("...", async function () {
    expect(true).to.equal(true)
  })
})

