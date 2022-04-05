const { expect } = require("chai")
const {
  BN, // Big Number support
  expectEvent,
} = require("@openzeppelin/test-helpers")

const { vorDevConfig } = require("../helpers/test_data")

const { increaseBlockTime, mineOneBlock } = require( "../helpers/chain" )
const utils = require( "../helpers/utils" )

const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const xFUND = artifacts.require("MockERC20")
const HoldemHeroes = artifacts.require("MockHEH") // Loads a compiled contract
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator") // Loads a compiled contract
const MockVORDeterministic = artifacts.require("MockVORDeterministic")
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")

contract("TexasHoldemV1 - play", async function(accounts) {

  const testPipeline = [
    {
      action: "start",
      endId: 0,
      expectedIds: [1],
      expectedLength: 1,
    },
    {
      action: "start",
      endId: 0,
      expectedIds: [1, 2],
      expectedLength: 2,
    },
    {
      action: "start",
      endId: 0,
      expectedIds: [1, 2, 3],
      expectedLength: 3,
    },
    {
      action: "end",
      endId: 2,
      expectedIds: [1, 3],
      expectedLength: 2,
    },
    {
      action: "start",
      endId: 0,
      expectedIds: [1, 3, 4],
      expectedLength: 3,
    },
    {
      action: "start",
      endId: 0,
      expectedIds: [1, 3, 4, 5],
      expectedLength: 4,
    },
    {
      action: "end",
      endId: 1,
      expectedIds: [5, 3, 4],
      expectedLength: 3,
    },
    {
      action: "handbrake",
      endId: 4,
      expectedIds: [5, 3],
      expectedLength: 2,
    },
    {
      action: "start",
      endId: 0,
      expectedIds: [5, 3, 6],
      expectedLength: 3,
    },
    {
      action: "start",
      endId: 0,
      expectedIds: [5, 3, 6, 7],
      expectedLength: 4,
    },
    {
      action: "start",
      endId: 0,
      expectedIds: [5, 3, 6, 7, 8],
      expectedLength: 5,
    },
    {
      action: "end",
      endId: 6,
      expectedIds: [5, 3, 8, 7],
      expectedLength: 4,
    },
    {
      action: "handbrake",
      endId: 3,
      expectedIds: [5, 7, 8],
      expectedLength: 3,
    },
    {
      action: "end",
      endId: 5,
      expectedIds: [8, 7],
      expectedLength: 2,
    },
    {
      action: "handbrake",
      endId: 8,
      expectedIds: [7],
      expectedLength: 1,
    },
    {
      action: "end",
      endId: 7,
      expectedIds: [],
      expectedLength: 0,
    },
    {
      action: "start",
      endId: 0,
      expectedIds: [9],
      expectedLength: 1,
    },
    {
      action: "end",
      endId: 9,
      expectedIds: [],
      expectedLength: 0,
    },
  ]

  const flopRandomness = "115792089237316195423570985008687907853269984665640564039457584007913129639935"
  const roundTime = 200
  const maxConcurrentGames = 5

  describe('start & end games', function() {

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

    for(let i = 1; i <= 5; i += 1) {
      it( `start game ${i} & deal flop`, async function () {
        const receipt = await this.texasHoldem.startGame()
        await this.vor.fulfillRequest( utils.getRequestId( receipt ), flopRandomness )
        const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
        expect(gamesInProgress.length).to.be.eq(i)
      } )
    }

    it("...increaseBlockTime", async function() {
      await increaseBlockTime( 300 )
      await mineOneBlock()
      expect(true).to.equal(true)
    })

    // end games in different sequence
    it( `end game 4`, async function () {
      const gameId = 4
      const receipt = await this.texasHoldem.endGame( gameId, { from: accounts[0] } )
      expectEvent(receipt, "GameDeleted", {
        gameId: new BN(gameId),
      })

      const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
      expect(gamesInProgress.includes(new BN(gameId))).to.be.eq(false)
      expect(gamesInProgress.length).to.be.eq(4)

      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
    })

    it( `end game 2`, async function () {
      const gameId = 2
      const receipt = await this.texasHoldem.endGame( gameId, { from: accounts[0] } )
      expectEvent(receipt, "GameDeleted", {
        gameId: new BN(gameId),
      })

      const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
      expect(gamesInProgress.includes(new BN(gameId))).to.be.eq(false)
      expect(gamesInProgress.length).to.be.eq(3)

      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
    })

    it( `end game 5`, async function () {
      const gameId = 5
      const receipt = await this.texasHoldem.endGame( gameId, { from: accounts[0] } )
      expectEvent(receipt, "GameDeleted", {
        gameId: new BN(gameId),
      })

      const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
      expect(gamesInProgress.includes(new BN(gameId))).to.be.eq(false)
      expect(gamesInProgress.length).to.be.eq(2)

      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
    })

    it( `end game 1`, async function () {
      const gameId = 1
      const receipt = await this.texasHoldem.endGame( gameId, { from: accounts[0] } )
      expectEvent(receipt, "GameDeleted", {
        gameId: new BN(gameId),
      })

      const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
      expect(gamesInProgress.includes(new BN(gameId))).to.be.eq(false)
      expect(gamesInProgress.length).to.be.eq(1)

      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
    })

    it( `end game 3`, async function () {
      const gameId = 3
      const receipt = await this.texasHoldem.endGame( gameId, { from: accounts[0] } )
      expectEvent(receipt, "GameDeleted", {
        gameId: new BN(gameId),
      })

      const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
      expect(gamesInProgress.includes(new BN(gameId))).to.be.eq(false)
      expect(gamesInProgress.length).to.be.eq(0)

      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
    })


    it("...", async function () {
      expect(true).to.equal(true)
    })

  })

  describe('start & handbrake games', function() {

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

    for(let i = 1; i <= 5; i += 1) {
      it( `start game ${i} & deal flop`, async function () {
        const receipt = await this.texasHoldem.startGame()
        await this.vor.fulfillRequest( utils.getRequestId( receipt ), flopRandomness )
        const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
        expect(gamesInProgress.length).to.be.eq(i)
      } )
    }

    it("...increaseBlockTime", async function() {
      await increaseBlockTime( 300 )
      await mineOneBlock()
      expect(true).to.equal(true)
    })

    it( `handbrake game 4`, async function () {
      const gameId = 4
      const receipt = await this.texasHoldem.handbrake( gameId, { from: accounts[0] } )
      expectEvent(receipt, "GameDeleted", {
        gameId: new BN(gameId),
      })

      const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
      expect(gamesInProgress.includes(new BN(gameId))).to.be.eq(false)
      expect(gamesInProgress.length).to.be.eq(4)

      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
    })

    it( `handbrake game 1`, async function () {
      const gameId = 1
      const receipt = await this.texasHoldem.handbrake( gameId, { from: accounts[0] } )
      expectEvent(receipt, "GameDeleted", {
        gameId: new BN(gameId),
      })

      const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
      expect(gamesInProgress.includes(new BN(gameId))).to.be.eq(false)
      expect(gamesInProgress.length).to.be.eq(3)

      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
    })

    it( `handbrake game 3`, async function () {
      const gameId = 3
      const receipt = await this.texasHoldem.handbrake( gameId, { from: accounts[0] } )
      expectEvent(receipt, "GameDeleted", {
        gameId: new BN(gameId),
      })

      const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
      expect(gamesInProgress.includes(new BN(gameId))).to.be.eq(false)
      expect(gamesInProgress.length).to.be.eq(2)

      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
    })

    it( `handbrake game 5`, async function () {
      const gameId = 5
      const receipt = await this.texasHoldem.handbrake( gameId, { from: accounts[0] } )
      expectEvent(receipt, "GameDeleted", {
        gameId: new BN(gameId),
      })

      const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
      expect(gamesInProgress.includes(new BN(gameId))).to.be.eq(false)
      expect(gamesInProgress.length).to.be.eq(1)

      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
    })

    it( `handbrake game 2`, async function () {
      const gameId = 2
      const receipt = await this.texasHoldem.handbrake( gameId, { from: accounts[0] } )
      expectEvent(receipt, "GameDeleted", {
        gameId: new BN(gameId),
      })

      const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
      expect(gamesInProgress.includes(new BN(gameId))).to.be.eq(false)
      expect(gamesInProgress.length).to.be.eq(0)

      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('pipeline tests', function() {

    before( async function () {

      this.xfund = await xFUND.new()
      this.vor = await MockVORDeterministic.new();
      this.pokerHandEvaluator = await PokerHandEvaluator.new( 0 )
      this.playingCards = await PlayingCards.new()

      this.holdemHeroes = await HoldemHeroes.new( this.playingCards.address )

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

    for(let i = 0; i < testPipeline.length; i += 1) {
      const t = testPipeline[i]
      it( `#${i} ${t.action} ${t.endId > 0 ? t.endId + " " : ""}- expect ${JSON.stringify(t.expectedIds)}`, async function () {
        if(t.action === "start") {
          const receipt = await this.texasHoldem.startGame()
          await this.vor.fulfillRequest( utils.getRequestId( receipt ), flopRandomness )
          await increaseBlockTime( 300 )
          await mineOneBlock()
        }
        if(t.action === "end") {
          const receipt = await this.texasHoldem.endGame( t.endId )
          expectEvent(receipt, "GameDeleted", {
            gameId: new BN(t.endId),
          })
        }
        if(t.action === "handbrake") {
          const receipt = await this.texasHoldem.handbrake( t.endId, { from: accounts[0] } )
          expectEvent(receipt, "GameDeleted", {
            gameId: new BN(t.endId),
          })
        }

        const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
        // console.log(gamesInProgress)

        const gip = []
        for(let j = 0; j < gamesInProgress.length; j += 1) {
          gip.push(gamesInProgress[j].toNumber())
        }
        expect(gip).to.be.eql(t.expectedIds)
        expect(gamesInProgress.length).to.be.eq(t.expectedLength)
      })
    }

  })
})
