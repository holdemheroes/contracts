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
  const numPlayers = 10  // max 10

  const expectedRefundFlop  = new BN("400000000000000000") // 0.4 eth - added 4 NFTs in flop @0.1 ea
  const expectedRefundTurn  = new BN("1000000000000000000") // 1 eth - added 4 NFTs in flop @0.1 ea, 3 in turn @0.2 ea

  // array of token IDs safe to add in flop
  const flopTest5HandsSucceed = [
    [0, 1, 2, 3, 4],   // accounts[0]
    [5, 6, 7, 8, 9],  // accounts[1]
    [10, 11, 12, 13, 14],  // accounts[2]
    [15, 16, 17, 18, 19],  // accounts[3]
    [20, 21, 22, 23, 24],  // accounts[4]
    [25, 26, 27, 28, 29], // accounts[5]
    [30, 31, 32, 33, 34], // accounts[6]
    [35, 36, 37, 38, 39],   // accounts[7]
    [40, 41, 42, 43, 44],   // accounts[8]
    [45, 46, 47, 48, 49],   // accounts[9]
  ]

  // [tokenId, [c1Id, c2Id, c3Id]] where cnId = card ID from river
  // and tokenId has been added to Turn
  const finalHands = [
    [0, [0, 5, 7]], // accounts[0]
    [5, [5, 7, 15]], // accounts[1]
    [11, [7, 15, 49]], // accounts[2]
    [15, [0, 5, 7]], // accounts[3]
    [21, [0, 5, 7]], // accounts[4]
    [25, [0, 15, 7]], // accounts[5]
    [30, [0, 5, 7]], // accounts[6]
    [36, [5, 7, 49]], // accounts[7]
    [40, [7, 15, 49]], // accounts[8]
    [46, [7, 15, 49]], // accounts[9]
  ]

  // array of token ids containing cards dealt in flop
  const flopTest1CardsDealt = [
    50, // accounts[0]
    51, // accounts[1]
    52, // accounts[2]
    53, // accounts[3]
    54, // accounts[4]
    55, // accounts[5]
    56, // accounts[6]
    57, // accounts[7]
    58, // accounts[8]
    59, // accounts[9]
  ]

  // array of token ids containing cards dealt in turn
  const turnTest1CardsDealt = [
    60, // accounts[0]
    61, // accounts[1]
    62, // accounts[2]
    63, // accounts[3]
    64, // accounts[4]
    65, // accounts[5]
    66, // accounts[6]
    67, // accounts[7]
    68, // accounts[8]
    69, // accounts[9]
  ]

  // array of token ids containing cards dealt in river
  const riverTest1CardsDealt = [
    70, // accounts[0]
    71, // accounts[1]
    72, // accounts[2]
    73, // accounts[3]
    74, // accounts[4]
    75, // accounts[5]
    76, // accounts[6]
    77, // accounts[7]
    78, // accounts[8]
    79, // accounts[9]
  ]

  before(async function () {

    this.xfund = await xFUND.new()
    this.vor = await MockVORDeterministic.new();
    this.playingCards = await PlayingCards.new()
    this.pokerHandEvaluator = await PokerHandEvaluator.new(0)

    this.holdemHeroes = await HoldemHeroes.new(this.playingCards.address)

    console.log("reveal test HEH hands")
    for( let i = 0; i < playTestData.hands.length; i += 1) {
      await this.holdemHeroes.setTestHand(i, playTestData.hands[i][0], playTestData.hands[i][1])
      process.stdout.write(`.`)
    }
    console.log(".")

    this.texasHoldem = await TexasHoldemV1.new(
      this.xfund.address,
      this.vor.address,
      this.holdemHeroes.address,
      this.pokerHandEvaluator.address,
      maxConcurrentGames,
      roundTime,
      vorDevConfig.vor_key_hash,
      vorDevConfig.vor_fee)

    // mint
    console.log("mint test tokens")
    for(let i = 0; i < numPlayers; i += 1) {
      for ( let j = 0; j < flopTest5HandsSucceed[i].length; j += 1 ) {
        await this.holdemHeroes.mint( flopTest5HandsSucceed[i][j], { from: accounts[i] } )
        process.stdout.write(".")
      }

      await this.holdemHeroes.mint( flopTest1CardsDealt[i], { from: accounts[i] } )
      await this.holdemHeroes.mint( turnTest1CardsDealt[i], { from: accounts[i] } )
      await this.holdemHeroes.mint( riverTest1CardsDealt[i], { from: accounts[i] } )
    }

    const ts = await this.holdemHeroes.totalSupply()
    console.log(`... ${ts.toNumber()} done`)

    this.ROUND_1_PRICE = await this.texasHoldem.DEFAULT_ROUND_1_PRICE()
    this.ROUND_2_PRICE = await this.texasHoldem.DEFAULT_ROUND_2_PRICE()

  })

  describe('game #1 - flop not dealt', function() {

    const gameId = 1

    it( "game must exist to endGame", async function () {
      expectRevert(
        this.texasHoldem.endGame( gameId, { from: accounts[0] } ),
        "game not in endable state"
      )
    } )

    it( "start game - flop never dealt", async function () {
      await this.texasHoldem.startGame()
    } )

    it("...time passes a little...", async function() {
      await increaseBlockTime( 300 )
      await mineOneBlock()
      expect(true).to.be.true
    })

    it("game should not yet be in refundable state", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.refundable).to.be.bignumber.eq(new BN(0))
    })

    it("cannot claimRefund if not in refundable state", async function() {
      expectRevert(
        this.texasHoldem.claimRefund( gameId, { from: accounts[0] } ),
        "game not refundable!"
      )
    })

    it("round not yet started", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(1)) //GameStatus.FLOP_WAIT
      expect(game.roundEndTime).to.be.bignumber.eq(new BN(0))
    })

    it("game is not stale yet", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.false
    })

    it("ending game when not stale or not finished will fail", async function() {
      expectRevert(
        this.texasHoldem.endGame( gameId, { from: accounts[0] } ),
        "game not in endable state"
      )
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(1)) //GameStatus.FLOP_WAIT
    })

    it("...increaseBlockTime", async function() {
      await increaseBlockTime( 4000 )
      await mineOneBlock()
      expect(true).to.equal(true)
    })

    it("game is stale", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.true
    })

    it("round ended", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(1)) //GameStatus.FLOP_WAIT
      expect(game.roundEndTime).to.be.bignumber.eq(new BN(0))
    })

    it( "can endGame when flop deal failed", async function () {
      const receipt = await this.texasHoldem.endGame( gameId, { from: accounts[0] } )
      expectEvent(receipt, "GameDeleted", {
        gameId: new BN(1),
      })
    } )

    it("game is no longer in progress", async function() {
      const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
      expect(gamesInProgress.length).to.be.eq(0)
      expect(gamesInProgress.includes(new BN(gameId))).to.be.eq(false)
    })

    it("game does not exist", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
    })

    it("contract balance should be 0", async function() {
      const balance = await web3.eth.getBalance(this.texasHoldem.address)
      expect(balance).to.be.bignumber.eq(new BN(0))
    })

    it("houseCut should be 0", async function() {
      const houseCut = await this.texasHoldem.houseCut()
      expect(houseCut).to.be.bignumber.eq(new BN(0))
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })

  })

  describe('game #2 - flop dealt, no hands added to flop', function() {

    const gameId = 2

    it( "start game & deal flop", async function () {
      const receipt = await this.texasHoldem.startGame()
      await this.vor.fulfillRequest( utils.getRequestId( receipt ), flopRandomness )
    } )

    it("game should not yet be in refundable state", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.refundable).to.be.bignumber.eq(new BN(0))
    })

    it("cannot claimRefund if not in refundable state", async function() {
      expectRevert(
        this.texasHoldem.claimRefund( gameId, { from: accounts[0] } ),
        "game not refundable!"
      )
    })

    it("round not yet ended", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(2)) //GameStatus.FLOP_DEALT
      const roundIsEnded = await this.texasHoldem.roundIsEnded(gameId)
      expect(roundIsEnded).to.be.false
    })

    it("game is not stale yet", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.false
    })

    it("...increaseBlockTime", async function() {
      await increaseBlockTime( 300 )
      await mineOneBlock()
      expect(true).to.equal(true)
    })

    it("game is stale", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.true
    })

    it("round ended", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(2)) //GameStatus.FLOP_DEALT
      const roundIsEnded = await this.texasHoldem.roundIsEnded(gameId)
      expect(roundIsEnded).to.be.true
    })

    it( "can endGame when flop round ended and no hands played", async function () {
      const receipt = await this.texasHoldem.endGame( gameId, { from: accounts[0] } )
      expectEvent(receipt, "GameDeleted", {
        gameId: new BN(gameId),
      })
    } )

    it("game is no longer in progress", async function() {
      const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
      expect(gamesInProgress.length).to.be.eq(0)
      expect(gamesInProgress.includes(new BN(gameId))).to.be.eq(false)
    })

    it("game does not exist", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
    })

    it("contract balance should be 0", async function() {
      const balance = await web3.eth.getBalance(this.texasHoldem.address)
      expect(balance).to.be.bignumber.eq(new BN(0))
    })

    it("houseCut should be 0", async function() {
      const houseCut = await this.texasHoldem.houseCut()
      expect(houseCut).to.be.bignumber.eq(new BN(0))
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })

  })

  describe('game #3 - flop dealt, hands added to flop, turn requested but not fulfilled', function() {

    const gameId = 3

    it( "start game, deal flop, players add NFTs", async function () {
      const receipt = await this.texasHoldem.startGame()
      await this.vor.fulfillRequest( utils.getRequestId( receipt ), flopRandomness )

      for ( let i = 0; i < numPlayers; i += 1 ) {
        // 1st
        await this.texasHoldem.addNFTFlop( flopTest5HandsSucceed[i][0], gameId, {
          value: this.ROUND_1_PRICE,
          from: accounts[i]
        } )
        // 2nd
        await this.texasHoldem.addNFTFlop( flopTest5HandsSucceed[i][1], gameId, {
          value: this.ROUND_1_PRICE,
          from: accounts[i]
        } )
        // 3rd
        await this.texasHoldem.addNFTFlop( turnTest1CardsDealt[i], gameId, { from: accounts[i], value: this.ROUND_1_PRICE } )
        // 4th
        await this.texasHoldem.addNFTFlop( riverTest1CardsDealt[i], gameId, { from: accounts[i], value: this.ROUND_1_PRICE } )

        const playerPaidIn = await this.texasHoldem.getPlayerAmountPaidIn(accounts[i], gameId)
        expect( playerPaidIn ).to.be.bignumber.eq( expectedRefundFlop )


        process.stdout.write(`.`)
      }
      console.log(".")
    } )

    it("flop round not yet ended", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(2)) //GameStatus.FLOP_DEALT
      const roundIsEnded = await this.texasHoldem.roundIsEnded(gameId)
      expect(roundIsEnded).to.be.false
    })

    it( "cannot endGame when flop not ended", async function () {

      // flop round not ended yet
      expectRevert(
        this.texasHoldem.endGame( gameId, { from: accounts[0] } ),
        "game not in endable state"
      )
    } )

    it("game should not yet be in refundable state", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.refundable).to.be.bignumber.eq(new BN(0))
    })

    it("cannot claimRefund if not in refundable state", async function() {
      expectRevert(
        this.texasHoldem.claimRefund( gameId, { from: accounts[0] } ),
        "game not refundable!"
      )
    })

    it("game is not stale yet", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.false
    })

    it("...increaseBlockTime to end flop round", async function() {
      await increaseBlockTime( 300 )
      await mineOneBlock()
      expect(true).to.be.true
    })

    it("flop round has ended", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(2)) //GameStatus.FLOP_DEALT
      const roundIsEnded = await this.texasHoldem.roundIsEnded(gameId)
      expect(roundIsEnded).to.be.true
    })

    it("game is not stale yet", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.false
    })

    it( "cannot endGame when flop ended, turn not dealt, but hands in flop", async function () {
      // flop round ended, has hands, turn not dealt
      expectRevert(
        this.texasHoldem.endGame( gameId, { from: accounts[0] } ),
        "game not in endable state"
      )
    } )

    it("request deal turn - never fulfilled", async function () {
      await this.texasHoldem.requestDeal(gameId, {from: accounts[0]})
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(3)) // GameStatus.TURN_WAITT
    })

    it("...time passes a little...", async function() {
      await increaseBlockTime( 300 )
      await mineOneBlock()
      expect(true).to.be.true
    })

    it("turn round not yet started", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(3)) //GameStatus.TURN_WAITT
    })

    it( "cannot endGame yet", async function () {
      // turn not ended yet
      expectRevert(
        this.texasHoldem.endGame( gameId, { from: accounts[0] } ),
        "game not in endable state"
      )
    } )

    it("game should not yet be in refundable state", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.refundable).to.be.bignumber.eq(new BN(0))
    })

    it("cannot claimRefund if not in refundable state", async function() {
      expectRevert(
        this.texasHoldem.claimRefund( gameId, { from: accounts[0] } ),
        "game not refundable!"
      )
    })

    it("game is not stale yet", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.false
    })

    it("...increaseBlockTime to simulate turn not being dealt", async function() {
      await increaseBlockTime( 4000 )
      await mineOneBlock()
      expect(true).to.be.true
    })

    it("game is stale", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.true
    })

    it("turn round never started", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(3)) //GameStatus.TURN_WAIT
    })

    it("can end game when turn round never started", async function () {

      const receipt = await this.texasHoldem.endGame( gameId, { from: accounts[0] } )

      expectEvent(receipt, "RefundableGame", {
        gameId: new BN(gameId),
      })

      // should not be deleted yet
      expectEvent.notEmitted(receipt, "GameDeleted")

    })

    it("game should be in refundable state", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.refundable).to.be.bignumber.eq(new BN(1))
    })

    it("game is no longer in progress", async function() {
      const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
      expect(gamesInProgress.length).to.be.eq(0)
      expect(gamesInProgress.includes(new BN(gameId))).to.be.eq(false)
    })

    it("game should still exist", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(3)) // GameStatus.TURN_WAIT
    })

    for ( let i = 0; i < numPlayers; i += 1 ) {
      it(`player ${i} can get refund`, async function() {
        const player = accounts[i]

        const withdrawableBefore = await this.texasHoldem.userWithdrawables(player)
        expect(withdrawableBefore).to.be.bignumber.eq(new BN(0))

        const receipt = await this.texasHoldem.claimRefund(gameId, { from: player })

        expectEvent(receipt, "Refunded", {
          gameId: new BN(gameId),
          player,
          amount: expectedRefundFlop,
        })

        const withdrawableAfter = await this.texasHoldem.userWithdrawables(player)
        expect(withdrawableAfter).to.be.bignumber.eq(expectedRefundFlop)

        if(i === numPlayers - 1) {
          expectEvent(receipt, "GameDeleted", {
            gameId: new BN(gameId),
          })
        } else {
          expectEvent.notEmitted(receipt, "GameDeleted")
        }
      })
    }

    for ( let i = 0; i < numPlayers; i += 1 ) {
      it( `player ${i} can withdraw refund`, async function () {
        const player = accounts[i]
        const playerBalanceBefore = await web3.eth.getBalance(player)

        receipt = await this.texasHoldem.withdrawWinnings( { from: player } )

        expectEvent(receipt, "Withdrawal", {
          player: player,
          amount: expectedRefundFlop,
        })

        const playerWithdrawable = await this.texasHoldem.userWithdrawables(player)
        expect(playerWithdrawable).to.be.bignumber.eq(new BN(0))

        const playerBalanceAfter = await web3.eth.getBalance(player)
        expect(playerBalanceAfter).to.be.bignumber.gt(playerBalanceBefore)
      } )
    }

    it("game does not exist", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
    })

    it("contract balance should be 0", async function() {
      const balance = await web3.eth.getBalance(this.texasHoldem.address)
      expect(balance).to.be.bignumber.eq(new BN(0))
    })

    it("houseCut should be 0", async function() {
      const houseCut = await this.texasHoldem.houseCut()
      expect(houseCut).to.be.bignumber.eq(new BN(0))
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('game #4 - flop & turn dealt, no hands added to turn', function() {

    const gameId = 4

    it( "start game, deal flop, players add NFTs", async function () {
      const receipt = await this.texasHoldem.startGame()
      await this.vor.fulfillRequest( utils.getRequestId( receipt ), flopRandomness )

      for ( let i = 0; i < numPlayers; i += 1 ) {
        // 1st
        await this.texasHoldem.addNFTFlop( flopTest5HandsSucceed[i][0], gameId, {
          value: this.ROUND_1_PRICE,
          from: accounts[i]
        } )
        // 2nd
        await this.texasHoldem.addNFTFlop( flopTest5HandsSucceed[i][1], gameId, {
          value: this.ROUND_1_PRICE,
          from: accounts[i]
        } )
        // 3rd
        await this.texasHoldem.addNFTFlop( turnTest1CardsDealt[i], gameId, { from: accounts[i], value: this.ROUND_1_PRICE } )
        // 4th
        await this.texasHoldem.addNFTFlop( riverTest1CardsDealt[i], gameId, { from: accounts[i], value: this.ROUND_1_PRICE } )

        const playerPaidIn = await this.texasHoldem.getPlayerAmountPaidIn(accounts[i], gameId)
        expect( playerPaidIn ).to.be.bignumber.eq( expectedRefundFlop )


        process.stdout.write(`.`)
      }
      console.log(".")
    } )

    it("flop round not yet ended", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(2)) //GameStatus.FLOP_DEALT
      const roundIsEnded = await this.texasHoldem.roundIsEnded(gameId)
      expect(roundIsEnded).to.be.false
    })

    it( "cannot endGame when flop not ended", async function () {

      // flop round not ended yet
      expectRevert(
        this.texasHoldem.endGame( gameId, { from: accounts[0] } ),
        "game not in endable state"
      )
    } )

    it("game should not yet be in refundable state", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.refundable).to.be.bignumber.eq(new BN(0))
    })

    it("cannot claimRefund if not in refundable state", async function() {
      expectRevert(
        this.texasHoldem.claimRefund( gameId, { from: accounts[0] } ),
        "game not refundable!"
      )
    })

    it("game is not stale yet", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.false
    })

    it("...increaseBlockTime to end flop round", async function() {
      await increaseBlockTime( 300 )
      await mineOneBlock()
      expect(true).to.be.true
    })

    it("flop round has ended", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(2)) //GameStatus.FLOP_DEALT
      const roundIsEnded = await this.texasHoldem.roundIsEnded(gameId)
      expect(roundIsEnded).to.be.true
    })

    it("game is not stale yet", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.false
    })

    it( "cannot endGame when flop ended, turn not dealt, but hands in flop", async function () {
      // flop round ended, has hands, turn not dealt
      expectRevert(
        this.texasHoldem.endGame( gameId, { from: accounts[0] } ),
        "game not in endable state"
      )
    } )

    it("deal turn", async function () {
      const receipt = await this.texasHoldem.requestDeal(gameId, {from: accounts[0]})
      await this.vor.fulfillRequest(utils.getRequestId( receipt ), flopRandomness)
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(4)) // GameStatus.TURN_DEALT
    })

    it("turn round not yet ended", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(4)) //GameStatus.TURN_DEALT
      const roundIsEnded = await this.texasHoldem.roundIsEnded(gameId)
      expect(roundIsEnded).to.be.false
    })

    it( "cannot endGame when turn not ended", async function () {
      // turn not ended yet
      expectRevert(
        this.texasHoldem.endGame( gameId, { from: accounts[0] } ),
        "game not in endable state"
      )
    } )

    it("game should not yet be in refundable state", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.refundable).to.be.bignumber.eq(new BN(0))
    })

    it("cannot claimRefund if not in refundable state", async function() {
      expectRevert(
        this.texasHoldem.claimRefund( gameId, { from: accounts[0] } ),
        "game not refundable!"
      )
    })

    it("game is not stale yet", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.false
    })

    it("...increaseBlockTime to end turn", async function() {
      await increaseBlockTime( 300 )
      await mineOneBlock()
      expect(true).to.be.true
    })

    it("game is stale", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.true
    })

    it("turn round has ended", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(4)) //GameStatus.TURN_DEALT
      const roundIsEnded = await this.texasHoldem.roundIsEnded(gameId)
      expect(roundIsEnded).to.be.true
    })

    it("can end game when turn round ended and no hands added to turn", async function () {

      const receipt = await this.texasHoldem.endGame( gameId, { from: accounts[0] } )

      expectEvent(receipt, "RefundableGame", {
        gameId: new BN(gameId),
      })

      // should not be deleted yet
      expectEvent.notEmitted(receipt, "GameDeleted")

    })

    it("game should be in refundable state", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.refundable).to.be.bignumber.eq(new BN(1))
    })

    it("game is no longer in progress", async function() {
      const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
      expect(gamesInProgress.length).to.be.eq(0)
      expect(gamesInProgress.includes(new BN(gameId))).to.be.eq(false)
    })

    it("game should still exist", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(4)) // GameStatus.TURN_DEALT
    })

    for ( let i = 0; i < numPlayers; i += 1 ) {
      it(`player ${i} can get refund`, async function() {
        const player = accounts[i]

        const withdrawableBefore = await this.texasHoldem.userWithdrawables(player)
        expect(withdrawableBefore).to.be.bignumber.eq(new BN(0))

        const receipt = await this.texasHoldem.claimRefund(gameId, { from: player })

        expectEvent(receipt, "Refunded", {
          gameId: new BN(gameId),
          player,
          amount: expectedRefundFlop,
        })

        const withdrawableAfter = await this.texasHoldem.userWithdrawables(player)
        expect(withdrawableAfter).to.be.bignumber.eq(expectedRefundFlop)

        if(i === numPlayers - 1) {
          expectEvent(receipt, "GameDeleted", {
            gameId: new BN(gameId),
          })
        } else {
          expectEvent.notEmitted(receipt, "GameDeleted")
        }
      })
    }

    for ( let i = 0; i < numPlayers; i += 1 ) {
      it( `player ${i} can withdraw refund`, async function () {
        const player = accounts[i]
        const playerBalanceBefore = await web3.eth.getBalance(player)

        receipt = await this.texasHoldem.withdrawWinnings( { from: player } )

        expectEvent(receipt, "Withdrawal", {
          player: player,
          amount: expectedRefundFlop,
        })

        const playerWithdrawable = await this.texasHoldem.userWithdrawables(player)
        expect(playerWithdrawable).to.be.bignumber.eq(new BN(0))

        const playerBalanceAfter = await web3.eth.getBalance(player)
        expect(playerBalanceAfter).to.be.bignumber.gt(playerBalanceBefore)
      } )
    }

    it("game does not exist", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
    })

    it("contract balance should be 0", async function() {
      const balance = await web3.eth.getBalance(this.texasHoldem.address)
      expect(balance).to.be.bignumber.eq(new BN(0))
    })

    it("houseCut should be 0", async function() {
      const houseCut = await this.texasHoldem.houseCut()
      expect(houseCut).to.be.bignumber.eq(new BN(0))
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('game #5 - flop & turn played. River requested but never fulfilled', function() {
    const gameId = 5

    it( "start game, deal flop, players add NFTs", async function () {
      const receipt = await this.texasHoldem.startGame()
      await this.vor.fulfillRequest( utils.getRequestId( receipt ), flopRandomness )

      for ( let i = 0; i < numPlayers; i += 1 ) {
        // 1st
        await this.texasHoldem.addNFTFlop( flopTest5HandsSucceed[i][0], gameId, {
          value: this.ROUND_1_PRICE,
          from: accounts[i]
        } )
        // 2nd
        await this.texasHoldem.addNFTFlop( flopTest5HandsSucceed[i][1], gameId, {
          value: this.ROUND_1_PRICE,
          from: accounts[i]
        } )
        // 3rd
        await this.texasHoldem.addNFTFlop( turnTest1CardsDealt[i], gameId, { from: accounts[i], value: this.ROUND_1_PRICE } )
        // 4th
        await this.texasHoldem.addNFTFlop( riverTest1CardsDealt[i], gameId, { from: accounts[i], value: this.ROUND_1_PRICE } )

        const playerPaidIn = await this.texasHoldem.getPlayerAmountPaidIn(accounts[i], gameId)
        expect( playerPaidIn ).to.be.bignumber.eq( expectedRefundFlop )


        process.stdout.write(`.`)
      }
      console.log(".")
    } )

    it( "end flop round, deal turn & players add NFTs to turn", async function () {
      await increaseBlockTime( 300 )
      await mineOneBlock()
      const receipt = await this.texasHoldem.requestDeal(gameId, {from: accounts[0]})
      await this.vor.fulfillRequest(utils.getRequestId( receipt ), flopRandomness)
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(4)) // GameStatus.TURN_DEALT

      for ( let i = 0; i < numPlayers; i += 1 ) {
        await this.texasHoldem.addNFTTurn(flopTest5HandsSucceed[i][0], gameId, {value: this.ROUND_2_PRICE, from: accounts[i]})
        await this.texasHoldem.addNFTTurn(flopTest5HandsSucceed[i][1], gameId, {value: this.ROUND_2_PRICE, from: accounts[i]})
        await this.texasHoldem.addNFTTurn( riverTest1CardsDealt[i], gameId, { value: this.ROUND_2_PRICE, from: accounts[i] } )
        process.stdout.write(`.`)
      }
      console.log(".")
    })

    it("turn round not yet ended", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(4)) //GameStatus.TURN_DEALT
      const roundIsEnded = await this.texasHoldem.roundIsEnded(gameId)
      expect(roundIsEnded).to.be.false
    })

    it( "cannot endGame when turn not ended", async function () {
      // turn not ended yet
      expectRevert(
        this.texasHoldem.endGame( gameId, { from: accounts[0] } ),
        "game not in endable state"
      )
    } )

    it("game should not yet be in refundable state", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.refundable).to.be.bignumber.eq(new BN(0))
    })

    it("cannot claimRefund if not in refundable state", async function() {
      expectRevert(
        this.texasHoldem.claimRefund( gameId, { from: accounts[0] } ),
        "game not refundable!"
      )
    })

    it("game is not stale yet", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.false
    })

    it("...increaseBlockTime to end turn", async function() {
      await increaseBlockTime( 300 )
      await mineOneBlock()
      expect(true).to.be.true
    })

    it("turn round has ended", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(4)) //GameStatus.TURN_DEALT
      const roundIsEnded = await this.texasHoldem.roundIsEnded(gameId)
      expect(roundIsEnded).to.be.true
    })

    it( "cannot endGame when turn ended but hands added", async function () {
      // turn not ended yet
      expectRevert(
        this.texasHoldem.endGame( gameId, { from: accounts[0] } ),
        "game not in endable state"
      )
    } )

    it("game should not yet be in refundable state", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.refundable).to.be.bignumber.eq(new BN(0))
    })

    it("game is not stale yet", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.false
    })

    it("request deal river - never fulfilled", async function() {
      await this.texasHoldem.requestDeal(gameId, {from: accounts[0]})
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(5)) // GameStatus.RIVER_WAIT
    })

    it("...time passes a little...", async function() {
      await increaseBlockTime( 300 )
      await mineOneBlock()
      expect(true).to.be.true
    })

    it("river round not yet ended", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(5)) //GameStatus.RIVER_WAIT
    })

    it( "cannot endGame when river not ended", async function () {
      // river not ended yet
      expectRevert(
        this.texasHoldem.endGame( gameId, { from: accounts[0] } ),
        "game not in endable state"
      )
    } )

    it("game should not yet be in refundable state", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.refundable).to.be.bignumber.eq(new BN(0))
    })

    it("cannot claimRefund if not in refundable state", async function() {
      expectRevert(
        this.texasHoldem.claimRefund( gameId, { from: accounts[0] } ),
        "game not refundable!"
      )
    })

    it("game is not stale yet", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.false
    })

    it("...increaseBlockTime to simulate river not being dealt", async function() {
      await increaseBlockTime( 4000 )
      await mineOneBlock()
      expect(true).to.be.true
    })

    it("game is stale", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.true
    })

    it("river round stuck", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(5)) //GameStatus.RIVER_WAIT
    })

    it("can end game when river deal request never fulfilled", async function () {

      const receipt = await this.texasHoldem.endGame( gameId, { from: accounts[0] } )

      expectEvent(receipt, "RefundableGame", {
        gameId: new BN(gameId),
      })

      // should not be deleted yet
      expectEvent.notEmitted(receipt, "GameDeleted")

    })

    it("game should be in refundable state", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.refundable).to.be.bignumber.eq(new BN(1))
    })

    it("game is no longer in progress", async function() {
      const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
      expect(gamesInProgress.length).to.be.eq(0)
      expect(gamesInProgress.includes(new BN(gameId))).to.be.eq(false)
    })

    it("game should still exist", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(5)) // GameStatus.RIVER_WAIT
    })

    for ( let i = 0; i < numPlayers; i += 1 ) {
      it(`player ${i} can get refund`, async function() {
        const player = accounts[i]

        const withdrawableBefore = await this.texasHoldem.userWithdrawables(player)
        expect(withdrawableBefore).to.be.bignumber.eq(new BN(0))

        const receipt = await this.texasHoldem.claimRefund(gameId, { from: player })

        expectEvent(receipt, "Refunded", {
          gameId: new BN(gameId),
          player,
          amount: expectedRefundTurn,
        })

        const withdrawableAfter = await this.texasHoldem.userWithdrawables(player)
        expect(withdrawableAfter).to.be.bignumber.eq(expectedRefundTurn)

        if(i === numPlayers - 1) {
          expectEvent(receipt, "GameDeleted", {
            gameId: new BN(gameId),
          })
        } else {
          expectEvent.notEmitted(receipt, "GameDeleted")
        }
      })
    }

    for ( let i = 0; i < numPlayers; i += 1 ) {
      it( `player ${i} can withdraw refund`, async function () {
        const player = accounts[i]
        const playerBalanceBefore = await web3.eth.getBalance(player)

        receipt = await this.texasHoldem.withdrawWinnings( { from: player } )

        expectEvent(receipt, "Withdrawal", {
          player: player,
          amount: expectedRefundTurn,
        })

        const playerWithdrawable = await this.texasHoldem.userWithdrawables(player)
        expect(playerWithdrawable).to.be.bignumber.eq(new BN(0))

        const playerBalanceAfter = await web3.eth.getBalance(player)
        expect(playerBalanceAfter).to.be.bignumber.gt(playerBalanceBefore)
      } )
    }

    it("game does not exist", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
    })

    it("contract balance should be 0", async function() {
      const balance = await web3.eth.getBalance(this.texasHoldem.address)
      expect(balance).to.be.bignumber.eq(new BN(0))
    })

    it("houseCut should be 0", async function() {
      const houseCut = await this.texasHoldem.houseCut()
      expect(houseCut).to.be.bignumber.eq(new BN(0))
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })

  })

  describe('game #6 - flop, turn & river dealt, no final hands played', function() {
    const gameId = 6

    it( "start game, deal flop, players add NFTs", async function () {
      const receipt = await this.texasHoldem.startGame()
      await this.vor.fulfillRequest( utils.getRequestId( receipt ), flopRandomness )

      for ( let i = 0; i < numPlayers; i += 1 ) {
        // 1st
        await this.texasHoldem.addNFTFlop( flopTest5HandsSucceed[i][0], gameId, {
          value: this.ROUND_1_PRICE,
          from: accounts[i]
        } )
        // 2nd
        await this.texasHoldem.addNFTFlop( flopTest5HandsSucceed[i][1], gameId, {
          value: this.ROUND_1_PRICE,
          from: accounts[i]
        } )
        // 3rd
        await this.texasHoldem.addNFTFlop( turnTest1CardsDealt[i], gameId, { from: accounts[i], value: this.ROUND_1_PRICE } )
        // 4th
        await this.texasHoldem.addNFTFlop( riverTest1CardsDealt[i], gameId, { from: accounts[i], value: this.ROUND_1_PRICE } )

        const playerPaidIn = await this.texasHoldem.getPlayerAmountPaidIn(accounts[i], gameId)
        expect( playerPaidIn ).to.be.bignumber.eq( expectedRefundFlop )


        process.stdout.write(`.`)
      }
      console.log(".")
    } )

    it( "end flop round, deal turn & players add NFTs to turn", async function () {
      await increaseBlockTime( 300 )
      await mineOneBlock()
      const receipt = await this.texasHoldem.requestDeal(gameId, {from: accounts[0]})
      await this.vor.fulfillRequest(utils.getRequestId( receipt ), flopRandomness)
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(4)) // GameStatus.TURN_DEALT

      for ( let i = 0; i < numPlayers; i += 1 ) {
        await this.texasHoldem.addNFTTurn(flopTest5HandsSucceed[i][0], gameId, {value: this.ROUND_2_PRICE, from: accounts[i]})
        await this.texasHoldem.addNFTTurn(flopTest5HandsSucceed[i][1], gameId, {value: this.ROUND_2_PRICE, from: accounts[i]})
        await this.texasHoldem.addNFTTurn( riverTest1CardsDealt[i], gameId, { value: this.ROUND_2_PRICE, from: accounts[i] } )
        process.stdout.write(`.`)
      }
      console.log(".")
    })

    it("turn round not yet ended", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(4)) //GameStatus.TURN_DEALT
      const roundIsEnded = await this.texasHoldem.roundIsEnded(gameId)
      expect(roundIsEnded).to.be.false
    })

    it( "cannot endGame when turn not ended", async function () {
      // turn not ended yet
      expectRevert(
        this.texasHoldem.endGame( gameId, { from: accounts[0] } ),
        "game not in endable state"
      )
    } )

    it("game should not yet be in refundable state", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.refundable).to.be.bignumber.eq(new BN(0))
    })

    it("cannot claimRefund if not in refundable state", async function() {
      expectRevert(
        this.texasHoldem.claimRefund( gameId, { from: accounts[0] } ),
        "game not refundable!"
      )
    })

    it("game is not stale yet", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.false
    })

    it("...increaseBlockTime to end turn", async function() {
      await increaseBlockTime( 300 )
      await mineOneBlock()
      expect(true).to.be.true
    })

    it("turn round has ended", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(4)) //GameStatus.TURN_DEALT
      const roundIsEnded = await this.texasHoldem.roundIsEnded(gameId)
      expect(roundIsEnded).to.be.true
    })

    it( "cannot endGame when turn ended but hands added", async function () {
      // turn not ended yet
      expectRevert(
        this.texasHoldem.endGame( gameId, { from: accounts[0] } ),
        "game not in endable state"
      )
    } )

    it("game should not yet be in refundable state", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.refundable).to.be.bignumber.eq(new BN(0))
    })

    it("game is not stale yet", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.false
    })

    it("deal river", async function() {
      const receipt = await this.texasHoldem.requestDeal(gameId, {from: accounts[0]})
      await this.vor.fulfillRequest(utils.getRequestId( receipt ), flopRandomness)
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(6)) // GameStatus.RIVER_DEALT
    })

    it("river round not yet ended", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(6)) //GameStatus.RIVER_DEALT
      const roundIsEnded = await this.texasHoldem.roundIsEnded(gameId)
      expect(roundIsEnded).to.be.false
    })

    it( "cannot endGame when river not ended", async function () {
      // river not ended yet
      expectRevert(
        this.texasHoldem.endGame( gameId, { from: accounts[0] } ),
        "game not in endable state"
      )
    } )

    it("game should not yet be in refundable state", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.refundable).to.be.bignumber.eq(new BN(0))
    })

    it("cannot claimRefund if not in refundable state", async function() {
      expectRevert(
        this.texasHoldem.claimRefund( gameId, { from: accounts[0] } ),
        "game not refundable!"
      )
    })

    it("game is not stale yet", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.false
    })

    it("...increaseBlockTime to end river", async function() {
      await increaseBlockTime( 300 )
      await mineOneBlock()
      expect(true).to.be.true
    })

    it("game is stale", async function() {
      const isStale = await this.texasHoldem.gameIsStale(gameId)
      expect(isStale).to.be.true
    })

    it("river round has ended", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(6)) //GameStatus.RIVER_DEALT
      const roundIsEnded = await this.texasHoldem.roundIsEnded(gameId)
      expect(roundIsEnded).to.be.true
    })

    it("can end game when river round ended and final hands played", async function () {

      const receipt = await this.texasHoldem.endGame( gameId, { from: accounts[0] } )

      expectEvent(receipt, "RefundableGame", {
        gameId: new BN(gameId),
      })

      // should not be deleted yet
      expectEvent.notEmitted(receipt, "GameDeleted")

    })

    it("game should be in refundable state", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.refundable).to.be.bignumber.eq(new BN(1))
    })

    it("game is no longer in progress", async function() {
      const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
      expect(gamesInProgress.length).to.be.eq(0)
      expect(gamesInProgress.includes(new BN(gameId))).to.be.eq(false)
    })

    it("game should still exist", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(6)) // GameStatus.RIVER_DEALT
    })

    for ( let i = 0; i < numPlayers; i += 1 ) {
      it(`player ${i} can get refund`, async function() {
        const player = accounts[i]

        const withdrawableBefore = await this.texasHoldem.userWithdrawables(player)
        expect(withdrawableBefore).to.be.bignumber.eq(new BN(0))

        const receipt = await this.texasHoldem.claimRefund(gameId, { from: player })

        expectEvent(receipt, "Refunded", {
          gameId: new BN(gameId),
          player,
          amount: expectedRefundTurn,
        })

        const withdrawableAfter = await this.texasHoldem.userWithdrawables(player)
        expect(withdrawableAfter).to.be.bignumber.eq(expectedRefundTurn)

        if(i === numPlayers - 1) {
          expectEvent(receipt, "GameDeleted", {
            gameId: new BN(gameId),
          })
        } else {
          expectEvent.notEmitted(receipt, "GameDeleted")
        }
      })
    }

    for ( let i = 0; i < numPlayers; i += 1 ) {
      it( `player ${i} can withdraw refund`, async function () {
        const player = accounts[i]
        const playerBalanceBefore = await web3.eth.getBalance(player)

        receipt = await this.texasHoldem.withdrawWinnings( { from: player } )

        expectEvent(receipt, "Withdrawal", {
          player: player,
          amount: expectedRefundTurn,
        })

        const playerWithdrawable = await this.texasHoldem.userWithdrawables(player)
        expect(playerWithdrawable).to.be.bignumber.eq(new BN(0))

        const playerBalanceAfter = await web3.eth.getBalance(player)
        expect(playerBalanceAfter).to.be.bignumber.gt(playerBalanceBefore)
      } )
    }

    it("game does not exist", async function() {
      const game = await this.texasHoldem.games(gameId)
      expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
    })

    it("contract balance should be 0", async function() {
      const balance = await web3.eth.getBalance(this.texasHoldem.address)
      expect(balance).to.be.bignumber.eq(new BN(0))
    })

    it("houseCut should be 0", async function() {
      const houseCut = await this.texasHoldem.houseCut()
      expect(houseCut).to.be.bignumber.eq(new BN(0))
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })

  })
})

