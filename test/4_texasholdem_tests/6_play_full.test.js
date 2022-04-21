const { expect } = require("chai")
const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")

const { vorDevConfig, getRanksForUpload, getHandsForUpload, playTestData, handEvalUploadJson } = require("../helpers/test_data")

const { increaseBlockTime } = require( "../helpers/chain" )
const utils = require( "../helpers/utils" )

const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const xFUND = artifacts.require("MockERC20")
const HoldemHeroes = artifacts.require("MockHEH") // Loads a compiled contract
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator") // Loads a compiled contract
const MockVORDeterministic = artifacts.require("MockVORDeterministic")
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")

contract("TexasHoldemV1 - play 10 players", async function(accounts) {

  const flopRandomness = "115792089237316195423570985008687907853269984665640564039457584007913129639935"
  const roundTime = 200
  const maxConcurrentGames = 5
  const numPlayers = 10  // max 10

  // assumes 10 player game
  const expectedTotalPaidIn    = new BN("10000000000000000000") // 10 eth
  const houseCut               = new BN("500000000000000000")  // 5% of 10000000000000000000
  const expectedWinnerAmount   = new BN("5700000000000000000") // 60% of 9500000000000000000
  const expectedRunnerUpAmount = new BN("422222222222222222") // (40% of 9500000000000000000) / 9
  const expectedClaimPotRemainder  = new BN(2) // after dividing runner up pot by 9
  const expectedHouseCut = houseCut.add(expectedClaimPotRemainder) // remainder added, so 250000000000000003

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

  const finalHandsExpected = [
    [[ 8, 2, 0, 5, 7 ], 3325, 7],
    [[ 9, 11, 5, 7, 15 ], 3302, 7],
    [[ 23, 16, 7, 15, 49 ], 6666, 9],
    [[ 13, 14, 0, 5, 7 ], 3281, 7],
    [[ 25, 6, 0, 5, 7 ], 2391, 6],
    [[ 16, 12, 0, 15, 7 ], 5524, 8],
    [[ 17, 9, 0, 5, 7 ], 5964, 8],
    [[ 27, 18, 5, 7, 49 ], 5787, 8],
    [[ 20, 3, 7, 15, 49 ], 6673, 9],
    [[ 28, 26, 7, 15, 49 ], 6620, 9],
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

  // Leaderboard for 10 player game
  // 2391 accounts[4] 0 = winner
  // 3281 accounts[3] 1
  // 3302 accounts[1] 2
  // 3325 accounts[0] 3
  // 5524 accounts[5] 4
  // 5787 accounts[7] 5
  // 5964 accounts[6] 6
  // 6620 accounts[9] 7
  // 6666 accounts[2] 8
  // 6673 accounts[8] 9

  const winner = accounts[4]

  const runnersUp = [
    accounts[3],
    accounts[1],
    accounts[0],
    accounts[5],
    accounts[7],
    accounts[6],
    accounts[9],
    accounts[2],
    accounts[8]
  ]


  before(async function () {

    this.xfund = await xFUND.new()
    this.vor = await MockVORDeterministic.new();
    this.playingCards = await PlayingCards.new()

    this.pokerHandEvaluator = await PokerHandEvaluator.new(0)

    console.log("phe setSuits")
    await this.pokerHandEvaluator.setSuits(handEvalUploadJson.suits.idxs, handEvalUploadJson.suits.values)
    console.log(`phe setNoFlushBatch (${handEvalUploadJson.no_flush.length})`)
    for(let batchNum = 0; batchNum < handEvalUploadJson.no_flush.length; batchNum += 1) {
      process.stdout.write(`.${batchNum}`)
      await this.pokerHandEvaluator.setNoFlushBatch(handEvalUploadJson.no_flush[batchNum].idxs, handEvalUploadJson.no_flush[batchNum].values, batchNum)
    }
    console.log("done")
    console.log(`phe setFlushBatch (${handEvalUploadJson.flush.length})`)
    for(let batchNum = 0; batchNum < handEvalUploadJson.flush.length; batchNum += 1) {
      process.stdout.write(`.${batchNum}`)
      await this.pokerHandEvaluator.setFlushBatch(handEvalUploadJson.flush[batchNum].idxs, handEvalUploadJson.flush[batchNum].values, batchNum)
    }
    console.log("done")
    console.log(`phe setDpBatch (${handEvalUploadJson.dp.length})`)
    for(let batchIdx = 0; batchIdx < handEvalUploadJson.dp.length; batchIdx += 1) {
      process.stdout.write(`.${batchIdx}`)
      await this.pokerHandEvaluator.setDpBatch(handEvalUploadJson.dp[batchIdx].values, handEvalUploadJson.dp[batchIdx].idx, batchIdx)
    }
    console.log("done")

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

    // subscribe to phe
    await this.pokerHandEvaluator.ownerAddSubscriber(this.texasHoldem.address, {from: accounts[0]})

    const ts = await this.holdemHeroes.totalSupply()
    console.log(`... ${ts.toNumber()} done`)

    this.ROUND_1_PRICE = await this.texasHoldem.DEFAULT_ROUND_1_PRICE()
    this.ROUND_2_PRICE = await this.texasHoldem.DEFAULT_ROUND_2_PRICE()

    this.requestId = ""
    this.cardsDealt = ""

  })

  describe('start game & flop', function() {

    it( "p1 can start game", async function () {
      const receipt = await this.texasHoldem.startGame()
      this.requestId = utils.getRequestId( receipt )
    } )

    it( "flop must be dealt before players can addNFTsFlop", async function () {
      expectRevert(
        this.texasHoldem.addNFTFlop( flopTest5HandsSucceed[0][0], 1, { value: this.ROUND_1_PRICE, from: accounts[0] } ),
        "flop not dealt"
      )
    } )

    // dealt in flop
    // 0 2c
    // 5 3d
    // 7 3s
    it( "deal flop...", async function () {
      await this.vor.fulfillRequest( this.requestId, flopRandomness )
      this.cardsDealt = await this.texasHoldem.getCardsDealt( 1 )
    } )

    it( "must pay correct fee to addNFTFlop", async function () {
      expectRevert(
        this.texasHoldem.addNFTFlop( flopTest5HandsSucceed[0][0], 1, { from: accounts[0], value: 1 } ),
        "eth value incorrect"
      )
    } )

    it( "must own token to addNFTFlop", async function () {
      expectRevert(
        this.texasHoldem.addNFTFlop( flopTest5HandsSucceed[1][0], 1, { from: accounts[0], value: this.ROUND_1_PRICE } ),
        "you do not own this token"
      )
    } )

    it( "cannot addNFTFlop using cards already dealt in flop", async function () {
      expectRevert(
        this.texasHoldem.addNFTFlop( flopTest1CardsDealt[0], 1, { from: accounts[0], value: this.ROUND_1_PRICE } ),
        "cannot add cards already dealt"
      )
    } )

    // just a dummy to get correct gas prices in next tests...
    it( "...", async function () {
      await this.texasHoldem.setMaxConcurrentGames( 5, { from: accounts[0] } )
    } )

    for ( let i = 0; i < numPlayers; i += 1 ) {
      it( `player${i} can addNFTFlop with correct fee`, async function () {
        const tokenId = flopTest5HandsSucceed[i][0]

        const receipt = await this.texasHoldem.addNFTFlop( tokenId, 1, {
          value: this.ROUND_1_PRICE,
          from: accounts[i]
        } )

        const handId = await this.holdemHeroes.tokenIdToHandId( tokenId )
        const hand = await this.holdemHeroes.getHandAsCardIds( handId )
        expectEvent( receipt, "HandAdded", {
          player: accounts[i],
          gameId: new BN( 1 ),
          round: new BN( 2 ), // GameStatus.FLOP_DEALT
          tokenId: new BN( tokenId ),
          handId: new BN( handId ),
          card1: new BN( hand[0] ),
          card2: new BN( hand[1] ),
        } )

        expectEvent( receipt, "FeePaid", {
          player: accounts[i],
          gameId: new BN( 1 ),
          round: new BN( 2 ), // GameStatus.FLOP_DEALT
          amount: this.ROUND_1_PRICE,
        } )

        const tokenAddedInFlop = await this.texasHoldem.tokenAddedInFlop( accounts[i], tokenId, 1 )
        expect( tokenAddedInFlop ).to.be.eq( true )

        const game = await this.texasHoldem.games( 1 )
        expect( game.totalPaidIn ).to.be.bignumber.eq( this.ROUND_1_PRICE.mul( new BN( i + 1 ) ) )
        expect( game.numPlayersInRound ).to.be.bignumber.eq( new BN( i + 1 ) )

        // GameStatus.FLOP_DEALT
        const playerLastRoundSubmitted = await this.texasHoldem.getPlayerLastRoundSubmitted( accounts[i], 1 )
        expect( playerLastRoundSubmitted ).to.be.bignumber.eq( new BN( 2 ) )

        const playerPaidIn = await this.texasHoldem.getPlayerAmountPaidIn(accounts[i], 1)
        expect( playerPaidIn ).to.be.bignumber.eq( this.ROUND_1_PRICE )
      } )
    }

    it("correct fees paid during flop", async function() {
      const expectedPaidIn = this.ROUND_1_PRICE.mul(new BN(numPlayers))
      const game = await this.texasHoldem.games( 1 )
      expect( game.totalPaidIn ).to.be.bignumber.eq( expectedPaidIn )

    })

    for ( let i = 0; i < numPlayers; i += 1 ) {
      it( `player${i} can addNFTFlop with additional tokens and correct fee`, async function () {
        const tokenId = flopTest5HandsSucceed[i][1]
        const g = await this.texasHoldem.games(1)
        const receipt = await this.texasHoldem.addNFTFlop( tokenId, 1, { from: accounts[i], value: this.ROUND_1_PRICE } )

        const handId = await this.holdemHeroes.tokenIdToHandId( tokenId )
        const hand = await this.holdemHeroes.getHandAsCardIds( handId )
        expectEvent( receipt, "HandAdded", {
          player: accounts[i],
          gameId: new BN( 1 ),
          round: new BN( 2 ), // GameStatus.FLOP_DEALT
          tokenId: new BN( tokenId ),
          handId: new BN( handId ),
          card1: new BN( hand[0] ),
          card2: new BN( hand[1] ),
        } )

        expectEvent( receipt, "FeePaid", {
          player: accounts[i],
          gameId: new BN( 1 ),
          round: new BN( 2 ), // GameStatus.FLOP_DEALT
          amount: this.ROUND_1_PRICE,
        } )

        const tokenAddedInFlop = await this.texasHoldem.tokenAddedInFlop( accounts[i], tokenId, 1 )
        expect( tokenAddedInFlop ).to.be.eq( true )

        const totalPaidInFromFirst = this.ROUND_1_PRICE.mul( new BN(numPlayers) )
        const expectedTotalPaidIn = totalPaidInFromFirst.add(this.ROUND_1_PRICE.mul( new BN( i + 1 ) ))
        const game = await this.texasHoldem.games(1)
        expect( game.totalPaidIn ).to.be.bignumber.eq( expectedTotalPaidIn )

        expect( game.numPlayersInRound ).to.be.bignumber.eq( new BN( numPlayers ) )

        // GameStatus.FLOP_DEALT
        const playerLastRoundSubmitted = await this.texasHoldem.getPlayerLastRoundSubmitted( accounts[i], 1 )
        expect( playerLastRoundSubmitted ).to.be.bignumber.eq( new BN( 2 ) )

        const playerPaidIn = await this.texasHoldem.getPlayerAmountPaidIn(accounts[i], 1)
        expect( playerPaidIn ).to.be.bignumber.eq( this.ROUND_1_PRICE.mul(new BN(2)) )
      } )
    }

    it("correct fees paid during flop", async function() {
      const expectedPaidIn = this.ROUND_1_PRICE.mul(new BN(numPlayers)).mul(new BN(2))
      const game = await this.texasHoldem.games( 1 )
      expect( game.totalPaidIn ).to.be.bignumber.eq( expectedPaidIn )
    })

    for ( let i = 0; i < numPlayers; i += 1 ) {
      it( `player${i} addNFTFlop tokens which will be dealt in turn and river`, async function () {
        await this.texasHoldem.addNFTFlop( turnTest1CardsDealt[i], 1, { from: accounts[i], value: this.ROUND_1_PRICE } )
        await this.texasHoldem.addNFTFlop( riverTest1CardsDealt[i], 1, { from: accounts[i], value: this.ROUND_1_PRICE } )

        const playerPaidIn = await this.texasHoldem.getPlayerAmountPaidIn(accounts[i], 1)
        expect( playerPaidIn ).to.be.bignumber.eq( this.ROUND_1_PRICE.mul(new BN(4)) )

      } )
    }

    it("correct fees paid during flop", async function() {
      const expectedPaidIn = this.ROUND_1_PRICE.mul(new BN(numPlayers)).mul(new BN(4))
      const game = await this.texasHoldem.games( 1 )
      expect( game.totalPaidIn ).to.be.bignumber.eq( expectedPaidIn )
    })

    it("game is not stale", async function() {
      const stale = await this.texasHoldem.gameIsStale( 1 )
      expect( stale ).to.be.eq( false )
    })

    it( "cannot re-add same NFT to addNFTFlop", async function () {
      expectRevert(
        this.texasHoldem.addNFTFlop( flopTest5HandsSucceed[0][0], 1, { value: 1, from: accounts[0], value: this.ROUND_1_PRICE } ),
        "token already added"
      )
    } )

    it( "turn must be dealt before players can addNFTsTurn", async function () {
      expectRevert(
        this.texasHoldem.addNFTTurn( flopTest5HandsSucceed[0][0], 1, { value: this.ROUND_2_PRICE, from: accounts[0] } ),
        "turn not dealt"
      )
    } )

    it( "cannot addNFTsFlop when flop round ended", async function () {
      await increaseBlockTime( roundTime + 10 )

      expectRevert(
        this.texasHoldem.addNFTFlop( flopTest5HandsSucceed[0][2], 1, { from: accounts[0], value: this.ROUND_1_PRICE } ),
        "round ended"
      )
    } )

    it("...", async function () {
      expect(true).to.equal(true)
    })

  })

  describe('turn', function() {

    it("request deal turn...", async function () {
      const receipt = await this.texasHoldem.requestDeal(1, {from: accounts[0]})
      this.requestId = utils.getRequestId( receipt )
    })

    // dealt in turn
    // 15 5s
    it("deal turn...", async function () {
      await this.vor.fulfillRequest(this.requestId, flopRandomness)
      this.cardsDealt = await this.texasHoldem.getCardsDealt(1)
    })

    // just a dummy to get correct gas prices in next tests...
    it( "...", async function () {
      await this.texasHoldem.setMaxConcurrentGames( 5, { from: accounts[0] } )
    } )

    for ( let i = 0; i < numPlayers; i += 1 ) {
      it(`player${i} can addNFTTurn with correct fee`, async function () {
        const g = await this.texasHoldem.games(1)
        const tokenId = flopTest5HandsSucceed[i][0]

        const receipt = await this.texasHoldem.addNFTTurn(tokenId, 1, {value: this.ROUND_2_PRICE, from: accounts[i]})

        const handId = await this.holdemHeroes.tokenIdToHandId(tokenId)
        const hand = await this.holdemHeroes.getHandAsCardIds(handId)
        expectEvent(receipt, "HandAdded", {
          player: accounts[i],
          gameId: new BN(1),
          round: new BN(4), // GameStatus.TURN_DEALT
          tokenId: new BN(tokenId),
          handId: new BN(handId),
          card1: new BN(hand[0]),
          card2: new BN(hand[1]),
        })

        expectEvent(receipt, "FeePaid", {
          player: accounts[i],
          gameId: new BN(1),
          round: new BN(4), // GameStatus.TURN_DEALT
          amount: this.ROUND_2_PRICE,
        })

        const tokenAddedInTurn = await this.texasHoldem.tokenAddedInTurn(accounts[i], tokenId, 1)
        expect(tokenAddedInTurn).to.be.eq(true)

        // each account added 4 tokens in flop
        const totalPaidInFromFlop = this.ROUND_1_PRICE.mul( new BN(numPlayers * 4) )
        const expectedTotalPaidIn = totalPaidInFromFlop.add(this.ROUND_2_PRICE.mul(new BN(i + 1)))
        const game = await this.texasHoldem.games(1)
        expect(game.totalPaidIn).to.be.bignumber.eq(expectedTotalPaidIn)

        expect( game.numPlayersInRound ).to.be.bignumber.eq( new BN( i + 1 ) )

        // GameStatus.TURN_DEALT
        const playerLastRoundSubmitted = await this.texasHoldem.getPlayerLastRoundSubmitted(accounts[i], 1)
        expect(playerLastRoundSubmitted).to.be.bignumber.eq(new BN(4))

        const playerPaidIn = await this.texasHoldem.getPlayerAmountPaidIn(accounts[i], 1)
        expect( playerPaidIn ).to.be.bignumber.eq( this.ROUND_1_PRICE.mul(new BN(4)).add(this.ROUND_2_PRICE) )
      })
    }

    it("correct fees paid during turn", async function() {
      const expectedPaidInFlop = this.ROUND_1_PRICE.mul(new BN(numPlayers)).mul(new BN(4))
      const expectedPaidInTurn = this.ROUND_2_PRICE.mul(new BN(numPlayers))
      const expectedPaidIn = expectedPaidInFlop.add(expectedPaidInTurn)
      const game = await this.texasHoldem.games( 1 )
      expect( game.totalPaidIn ).to.be.bignumber.eq( expectedPaidIn )
    })

    for ( let i = 0; i < numPlayers; i += 1 ) {
      it(`player${i} can 2nd addNFTTurn with correct fee`, async function () {
        const tokenId = flopTest5HandsSucceed[i][1]

        const receipt = await this.texasHoldem.addNFTTurn(tokenId, 1, {value: this.ROUND_2_PRICE, from: accounts[i]})

        const handId = await this.holdemHeroes.tokenIdToHandId(tokenId)
        const hand = await this.holdemHeroes.getHandAsCardIds(handId)
        expectEvent(receipt, "HandAdded", {
          player: accounts[i],
          gameId: new BN(1),
          round: new BN(4), // GameStatus.TURN_DEALT
          tokenId: new BN(tokenId),
          handId: new BN(handId),
          card1: new BN(hand[0]),
          card2: new BN(hand[1]),
        })

        expectEvent(receipt, "FeePaid", {
          player: accounts[i],
          gameId: new BN(1),
          round: new BN(4), // GameStatus.TURN_DEALT
          amount: this.ROUND_2_PRICE,
        })

        const playerPaidIn = await this.texasHoldem.getPlayerAmountPaidIn(accounts[i], 1)
        expect( playerPaidIn ).to.be.bignumber.eq( this.ROUND_1_PRICE.mul(new BN(4)).add(this.ROUND_2_PRICE.mul(new BN(2))) )
        const game = await this.texasHoldem.games( 1 )
        expect( game.numPlayersInRound ).to.be.bignumber.eq( new BN( numPlayers ) )
      })
    }

    it("correct fees paid during turn", async function() {
      const expectedPaidInFlop = this.ROUND_1_PRICE.mul(new BN(numPlayers)).mul(new BN(4))
      const expectedPaidInTurn = this.ROUND_2_PRICE.mul(new BN(numPlayers)).mul(new BN(2))
      const expectedPaidIn = expectedPaidInFlop.add(expectedPaidInTurn)
      const game = await this.texasHoldem.games( 1 )
      expect( game.totalPaidIn ).to.be.bignumber.eq( expectedPaidIn )
    })

    for ( let i = 0; i < numPlayers; i += 1 ) {
      it( `player${i} addNFTTurn tokens which will be dealt in river`, async function () {
        await this.texasHoldem.addNFTTurn( riverTest1CardsDealt[i], 1, { from: accounts[i], value: this.ROUND_2_PRICE } )
        const playerPaidIn = await this.texasHoldem.getPlayerAmountPaidIn(accounts[i], 1)
        expect( playerPaidIn ).to.be.bignumber.eq( this.ROUND_1_PRICE.mul(new BN(4)).add(this.ROUND_2_PRICE.mul(new BN(3))) )
      } )
    }

    it("correct fees paid during turn", async function() {
      const expectedPaidInFlop = this.ROUND_1_PRICE.mul(new BN(numPlayers)).mul(new BN(4))
      const expectedPaidInTurn = this.ROUND_2_PRICE.mul(new BN(numPlayers)).mul(new BN(3))
      const expectedPaidIn = expectedPaidInFlop.add(expectedPaidInTurn)
      const game = await this.texasHoldem.games( 1 )
      expect( game.totalPaidIn ).to.be.bignumber.eq( expectedPaidIn )
    })

    it("game is not stale", async function() {
      const stale = await this.texasHoldem.gameIsStale( 1 )
      expect( stale ).to.be.eq( false )
    })

    it( "cannot addNFTTurn using cards already dealt in turn", async function () {
      expectRevert(
        this.texasHoldem.addNFTTurn( turnTest1CardsDealt[0], 1, { from: accounts[0], value: this.ROUND_2_PRICE } ),
        "cannot add cards already dealt"
      )
    } )

    it( "must pay correct fee to addNFTTurn", async function () {
      expectRevert(
        this.texasHoldem.addNFTTurn( flopTest5HandsSucceed[0][0], 1, { from: accounts[0], value: 1 } ),
        "eth value incorrect"
      )
    } )

    it( "cannot addNFTTurn token not added in flop round", async function () {
      expectRevert(
        this.texasHoldem.addNFTTurn( flopTest5HandsSucceed[0][3], 1, { from: accounts[0], value: this.ROUND_2_PRICE } ),
        "token not added in flop round"
      )
    } )

    it( "cannot addNFTTurn same token more than once", async function () {
      expectRevert(
        this.texasHoldem.addNFTTurn( flopTest5HandsSucceed[0][1], 1, { from: accounts[0], value: this.ROUND_2_PRICE } ),
        "token already added"
      )
    } )

    it( "river must be dealt before players can playFinalHand", async function () {
      expectRevert(
        this.texasHoldem.playFinalHand( flopTest5HandsSucceed[0][1], [0, 5, 7], 1, { from: accounts[0] } ),
        "river not dealt"
      )
    } )

    it( "cannot addNFTTurn when turn round ended", async function () {
      await increaseBlockTime( roundTime + 10 )

      expectRevert(
        this.texasHoldem.addNFTTurn( flopTest5HandsSucceed[0][0], 1, { from: accounts[0], value: this.ROUND_2_PRICE } ),
        "round ended"
      )
    } )

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('river', function() {

    it("request deal river...", async function () {
      const receipt = await this.texasHoldem.requestDeal(1, {from: accounts[0]})
      this.requestId = utils.getRequestId( receipt )
    })

    // dealt in river
    // 49 Ad
    it("deal river...", async function () {
      await this.vor.fulfillRequest(this.requestId, flopRandomness)
      this.cardsDealt = await this.texasHoldem.getCardsDealt(1)
    })

    it( "token must have been added in turn round", async function () {
      expectRevert(
        this.texasHoldem.playFinalHand( flopTest5HandsSucceed[0][3], [0, 5, 7], 1, { from: accounts[0] } ),
        "token not added in turn round"
      )
    } )

    it( "must submit exactly 3 cards from river", async function () {
      expectRevert(
        // only one from river
        this.texasHoldem.playFinalHand( flopTest5HandsSucceed[0][0], [0, 5], 1, { from: accounts[0] } ),
        "must submit 3 cards from river"
      )
    } )

    it( "all 3 cards must have been dealt in river", async function () {
      expectRevert(
        // only one from river
        this.texasHoldem.playFinalHand( flopTest5HandsSucceed[0][0], [12, 6, 15], 1, { from: accounts[0] } ),
        "submitted river card not in river"
      )
    } )

    it( "cannot add token containing cards already dealt in river", async function () {
      expectRevert(
        // only one from river
        this.texasHoldem.playFinalHand( riverTest1CardsDealt[0], [0, 5, 7], 1, { from: accounts[0] } ),
        "cannot add cards already dealt"
      )
    } )

    for ( let i = 0; i < numPlayers; i += 1 ) {
      it( `player${i} can playFinalHand`, async function () {
        const tokenId = finalHands[i][0]
        const riverCards = finalHands[i][1]

        const expectedFinalHand = finalHandsExpected[i][0]
        const expectedHandRank = finalHandsExpected[i][1]
        const expectedHandRankId = finalHandsExpected[i][2]

        // console.log(tokenId, riverCards)
        const receipt = await this.texasHoldem.playFinalHand(tokenId, riverCards, 1, {from: accounts[i]})

        const handId = await this.holdemHeroes.tokenIdToHandId(tokenId)
        const hand = await this.holdemHeroes.getHandAsCardIds(handId)
        const rank = await this.texasHoldem.calculateHandRankForPlayer(1, accounts[i])
        const rankId = await this.texasHoldem.getRankId(rank)

        expectEvent(receipt, "FinalHandPlayed", {
          player: accounts[i],
          gameId: new BN(1),
          tokenId: new BN(tokenId),
          handId: new BN(handId),
          card1: new BN(expectedFinalHand[0]),
          card2: new BN(expectedFinalHand[1]),
          card3: new BN(expectedFinalHand[2]),
          card4: new BN(expectedFinalHand[3]),
          card5: new BN(expectedFinalHand[4]),
          rank: new BN(expectedHandRank),
        })

        const finalHand = await this.texasHoldem.getPlayerFinalHand(1, accounts[i])
        expect(finalHand.tokenId).to.be.bignumber.eq(new BN(tokenId))
        expect(finalHand.handId).to.be.bignumber.eq(new BN(handId))
        expect(finalHand.cards[0]).to.be.bignumber.eq(new BN(expectedFinalHand[0]))
        expect(finalHand.cards[1]).to.be.bignumber.eq(new BN(expectedFinalHand[1]))
        expect(finalHand.cards[2]).to.be.bignumber.eq(new BN(expectedFinalHand[2]))
        expect(finalHand.cards[3]).to.be.bignumber.eq(new BN(expectedFinalHand[3]))
        expect(finalHand.cards[4]).to.be.bignumber.eq(new BN(expectedFinalHand[4]))

        expect(rank).to.be.bignumber.eq(new BN(expectedHandRank))
        expect(rankId).to.be.bignumber.eq(new BN(expectedHandRankId))

        const playerRank = await this.texasHoldem.getPlayerRank(1, accounts[i])
        expect(playerRank).to.be.bignumber.eq(new BN(expectedHandRank))

        // console.log(`[${hand[0].toString()}, ${hand[1].toString()}, ${riverCards[0]}, ${riverCards[1]}, ${riverCards[2]}]`)

        const game = await this.texasHoldem.games( 1 )
        expect( game.numPlayersInRound ).to.be.bignumber.eq( new BN( i + 1 ) )

      } )
    }

    it("game is not stale", async function() {
      const stale = await this.texasHoldem.gameIsStale( 1 )
      expect( stale ).to.be.eq( false )
    })

    it("can getPlayerLeaderboardPosition", async function () {

      // 2391 accounts[4] 0
      // 3281 accounts[3] 1
      // 3302 accounts[1] 2
      // 3325 accounts[0] 3
      // 5524 accounts[5] 4
      // 5787 accounts[7] 5
      // 5964 accounts[6] 6
      // 6620 accounts[9] 7
      // 6666 accounts[2] 8
      // 6673 accounts[8] 9

      const p0 = await this.texasHoldem.getPlayerLeaderboardPosition(1, accounts[0])
      expect(p0).to.be.bignumber.eq(new BN(3))

      const p1 = await this.texasHoldem.getPlayerLeaderboardPosition(1, accounts[1])
      expect(p1).to.be.bignumber.eq(new BN(2))

      const p2 = await this.texasHoldem.getPlayerLeaderboardPosition(1, accounts[2])
      expect(p2).to.be.bignumber.eq(new BN(8))

      const p3 = await this.texasHoldem.getPlayerLeaderboardPosition(1, accounts[3])
      expect(p3).to.be.bignumber.eq(new BN(1))

      const p4 = await this.texasHoldem.getPlayerLeaderboardPosition(1, accounts[4])
      expect(p4).to.be.bignumber.eq(new BN(0))

      const p5 = await this.texasHoldem.getPlayerLeaderboardPosition(1, accounts[5])
      expect(p5).to.be.bignumber.eq(new BN(4))

      const p6 = await this.texasHoldem.getPlayerLeaderboardPosition(1, accounts[6])
      expect(p6).to.be.bignumber.eq(new BN(6))

      const p7 = await this.texasHoldem.getPlayerLeaderboardPosition(1, accounts[7])
      expect(p7).to.be.bignumber.eq(new BN(5))

      const p8 = await this.texasHoldem.getPlayerLeaderboardPosition(1, accounts[8])
      expect(p8).to.be.bignumber.eq(new BN(9))

      const p9 = await this.texasHoldem.getPlayerLeaderboardPosition(1, accounts[9])
      expect(p9).to.be.bignumber.eq(new BN(7))

    })

    it("can getLeaderboardAtPosition", async function () {

      // 2391 accounts[4] 0
      // 3281 accounts[3] 1
      // 3302 accounts[1] 2
      // 3325 accounts[0] 3
      // 5524 accounts[5] 4
      // 5787 accounts[7] 5
      // 5964 accounts[6] 6
      // 6620 accounts[9] 7
      // 6666 accounts[2] 8
      // 6673 accounts[8] 9

      const winner = await this.texasHoldem.getLeaderboardAtPosition(1, 0)
      expect(winner.player).to.be.eq(accounts[4])
      expect(winner.rank).to.be.bignumber.eq(new BN(finalHandsExpected[4][1]))
      expect(winner.rankId).to.be.bignumber.eq(new BN(finalHandsExpected[4][2]))

      const r1 = await this.texasHoldem.getLeaderboardAtPosition(1, 1)
      expect(r1.player).to.be.eq(accounts[3])
      expect(r1.rank).to.be.bignumber.eq(new BN(finalHandsExpected[3][1]))
      expect(r1.rankId).to.be.bignumber.eq(new BN(finalHandsExpected[3][2]))

      const r2 = await this.texasHoldem.getLeaderboardAtPosition(1, 2)
      expect(r2.player).to.be.eq(accounts[1])
      expect(r2.rank).to.be.bignumber.eq(new BN(finalHandsExpected[1][1]))
      expect(r2.rankId).to.be.bignumber.eq(new BN(finalHandsExpected[1][2]))

      const r3 = await this.texasHoldem.getLeaderboardAtPosition(1, 3)
      expect(r3.player).to.be.eq(accounts[0])
      expect(r3.rank).to.be.bignumber.eq(new BN(finalHandsExpected[0][1]))
      expect(r3.rankId).to.be.bignumber.eq(new BN(finalHandsExpected[0][2]))

      const r4 = await this.texasHoldem.getLeaderboardAtPosition(1, 4)
      expect(r4.player).to.be.eq(accounts[5])
      expect(r4.rank).to.be.bignumber.eq(new BN(finalHandsExpected[5][1]))
      expect(r4.rankId).to.be.bignumber.eq(new BN(finalHandsExpected[5][2]))

      const r5 = await this.texasHoldem.getLeaderboardAtPosition(1, 5)
      expect(r5.player).to.be.eq(accounts[7])
      expect(r5.rank).to.be.bignumber.eq(new BN(finalHandsExpected[7][1]))
      expect(r5.rankId).to.be.bignumber.eq(new BN(finalHandsExpected[7][2]))

      const r6 = await this.texasHoldem.getLeaderboardAtPosition(1, 6)
      expect(r6.player).to.be.eq(accounts[6])
      expect(r6.rank).to.be.bignumber.eq(new BN(finalHandsExpected[6][1]))
      expect(r6.rankId).to.be.bignumber.eq(new BN(finalHandsExpected[6][2]))

      const r7 = await this.texasHoldem.getLeaderboardAtPosition(1, 7)
      expect(r7.player).to.be.eq(accounts[9])
      expect(r7.rank).to.be.bignumber.eq(new BN(finalHandsExpected[9][1]))
      expect(r7.rankId).to.be.bignumber.eq(new BN(finalHandsExpected[9][2]))

      const r8 = await this.texasHoldem.getLeaderboardAtPosition(1, 8)
      expect(r8.player).to.be.eq(accounts[2])
      expect(r8.rank).to.be.bignumber.eq(new BN(finalHandsExpected[2][1]))
      expect(r8.rankId).to.be.bignumber.eq(new BN(finalHandsExpected[2][2]))

      const r9 = await this.texasHoldem.getLeaderboardAtPosition(1, 9)
      expect(r9.player).to.be.eq(accounts[8])
      expect(r9.rank).to.be.bignumber.eq(new BN(finalHandsExpected[8][1]))
      expect(r9.rankId).to.be.bignumber.eq(new BN(finalHandsExpected[8][2]))
    })

    it("getPlayerLeaderboardPosition returns -1 if address not on leaderboard", async function() {
      const pos = await this.texasHoldem.getPlayerLeaderboardPosition(1, this.xfund.address)
      expect(pos).to.be.bignumber.eq(new BN(-1))
    })

    it( "cannot endGame before round time ends", async function () {
      expectRevert(
        this.texasHoldem.endGame( 1, { from: accounts[0] } ),
        "game not in endable state"
      )
    } )

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('end game', function() {

    it( "can endGame correctly and calculate winnings", async function () {

      await increaseBlockTime( roundTime + 10 )

      const receipt = await this.texasHoldem.endGame( 1, { from: accounts[0] } )

      expectEvent.notEmitted(receipt, "RefundableGame")

      expectEvent(receipt, "WinningsCalculated", {
        gameId: new BN(1),
        player: winner,
        winner: true,
        amount: expectedWinnerAmount,
      })

      const winnerWithdrawable = await this.texasHoldem.userWithdrawables(winner)
      expect(winnerWithdrawable).to.be.bignumber.eq(expectedWinnerAmount)

      for(let i = 0; i < runnersUp.length; i += 1) {
        const runnerUp = runnersUp[i]
        expectEvent(receipt, "WinningsCalculated", {
          gameId: new BN(1),
          player: runnerUp,
          winner: false,
          amount: expectedRunnerUpAmount,
        })

        const runnerUpWithdrawable = await this.texasHoldem.userWithdrawables(runnerUp)
        expect(runnerUpWithdrawable).to.be.bignumber.eq(expectedRunnerUpAmount)
      }

      const houseCutQuery = await this.texasHoldem.houseCut()
      expect(houseCutQuery).to.be.bignumber.eq(expectedHouseCut)

    })

    it( "cannot endGame more than once for same game", async function () {
      expectRevert(
        this.texasHoldem.endGame( 1, { from: accounts[0] } ),
        "game not in endable state"
      )
    } )

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('withdraw winnings', function() {

    it( "winner can withdrawWinnings", async function () {
      const winnerBalanceBefore = await web3.eth.getBalance(winner)

      let receipt = await this.texasHoldem.withdrawWinnings( { from: winner } )

      expectEvent(receipt, "Withdrawal", {
        player: winner,
        amount: expectedWinnerAmount,
      })

      const winnerWithdrawable = await this.texasHoldem.userWithdrawables(winner)
      expect(winnerWithdrawable).to.be.bignumber.eq(new BN(0))

      const winnerBalanceAfter = await web3.eth.getBalance(winner)
      expect(winnerBalanceAfter).to.be.bignumber.gt(winnerBalanceBefore)
    })

    for(let i = 0; i < runnersUp.length; i += 1) {
      it( `runner up #${i+1} can withdrawWinnings`, async function () {

        const runnerUp = runnersUp[i]
        const runnerUpBalanceBefore = await web3.eth.getBalance(runnerUp)

        receipt = await this.texasHoldem.withdrawWinnings( { from: runnerUp } )

        expectEvent(receipt, "Withdrawal", {
          player: runnerUp,
          amount: expectedRunnerUpAmount,
        })

        const runnerUpWithdrawable = await this.texasHoldem.userWithdrawables(runnerUp)
        expect(runnerUpWithdrawable).to.be.bignumber.eq(new BN(0))

        const runnerUpBalanceAfter = await web3.eth.getBalance(winner)
        expect(runnerUpBalanceAfter).to.be.bignumber.gt(runnerUpBalanceBefore)
      })
    }


    it( "players can withdrawWinnings only if funds available", async function () {
      expectRevert(
        this.texasHoldem.withdrawWinnings( { from: accounts[0] } ),
        "nothing to withdraw"
      )
    })

    it( "only owner can withdrawHouse", async function () {
      expectRevert(
        this.texasHoldem.withdrawHouse( { from: accounts[1] } ),
        "Ownable: caller is not the owner"
      )
    })

    it( "owner can withdrawHouse", async function () {
      const ownerBalanceBefore = await web3.eth.getBalance(accounts[0])
      const receipt = await  this.texasHoldem.withdrawHouse( { from: accounts[0] } )
      expectEvent(receipt, "HouseCutWithdrawn", {
        withdrawnBy: accounts[0],
        amount: expectedHouseCut
      })

      const hc = await this.texasHoldem.houseCut()
      expect(hc).to.be.bignumber.eq(new BN(0))

      const ownerBalanceAfter = await web3.eth.getBalance(accounts[0])
      expect(ownerBalanceAfter).to.be.bignumber.gt(ownerBalanceBefore)
    })

    it( "owner can withdrawHouse only if funds available", async function () {
      expectRevert(
        this.texasHoldem.withdrawHouse( { from: accounts[0] } ),
        "nothing to withdraw"
      )
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('game clenaup', function() {

    it("game is no longer in progress", async function() {
      const gamesInProgress = await this.texasHoldem.getGameIdsInProgress()
      for(let i = 0; i < gamesInProgress.length; i += 1) {
        console.log(gamesInProgress[i].toString())
      }
      expect(gamesInProgress.length).to.be.eq(0)
      expect(gamesInProgress.includes(new BN(1))).to.be.eq(false)
    })

    it("game does not exist", async function() {
      const game = await this.texasHoldem.games(1)
      expect(game.status).to.be.bignumber.eq(new BN(0)) // GameStatus.NOT_EXIST
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })
})

