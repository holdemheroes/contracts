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

contract("TexasHoldemV1 - play simple single player", async function(accounts) {

  const flopRandomness = "115792089237316195423570985008687907853269984665640564039457584007913129639935"
  const roundTime = 200
  const maxConcurrentGames = 5

  // array of token IDs safe to add in flop
  const flopTest5HandsSucceed = [0, 1, 2, 3, 4]

  // [tokenId, [c1Id, c2Id, c3Id]] where cnId = card ID from river
  // and tokenId has been added to Turn
  const finalHands = [0, [0, 5, 7]]

  // array of token ids containing cards dealt in flop
  const flopTest1CardsDealt = 50

  // array of token ids containing cards dealt in turn
  const turnTest1CardsDealt = 60

  // array of token ids containing cards dealt in river
  const riverTest1CardsDealt = 70

  const notOwnToken = 5

  const dealer = accounts[5]

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
    for ( let i = 0; i < flopTest5HandsSucceed.length; i += 1 ) {
      await this.holdemHeroes.mint( flopTest5HandsSucceed[i], { from: accounts[0] } )
      process.stdout.write(".")
    }


    await this.holdemHeroes.mint( flopTest1CardsDealt, { from: accounts[0] } )
    await this.holdemHeroes.mint( turnTest1CardsDealt, { from: accounts[0] } )
    await this.holdemHeroes.mint( riverTest1CardsDealt, { from: accounts[0] } )
    await this.holdemHeroes.mint(notOwnToken, { from: accounts[1] })

    // subscribe to phe
    await this.pokerHandEvaluator.ownerAddSubscriber(this.texasHoldem.address, {from: accounts[0]})

    const ts = await this.holdemHeroes.totalSupply()
    console.log(`... ${ts.toNumber()} done`)

    // grant dealer role
    const DEALER_ROLE = await this.texasHoldem.DEALER_ROLE()
    await this.texasHoldem.grantRole(DEALER_ROLE, dealer, {from: accounts[0]})

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
        this.texasHoldem.addNFTFlop( flopTest5HandsSucceed[0], 1, { value: this.ROUND_1_PRICE, from: accounts[0] } ),
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
        this.texasHoldem.addNFTFlop( flopTest5HandsSucceed[0], 1, { from: accounts[0], value: 1 } ),
        "eth value incorrect"
      )
    } )

    it( "must own token to addNFTFlop", async function () {
      expectRevert(
        this.texasHoldem.addNFTFlop( notOwnToken, 1, { from: accounts[0], value: this.ROUND_1_PRICE } ),
        "you do not own this token"
      )
    } )

    it( "cannot addNFTFlop using cards already dealt in flop", async function () {
      expectRevert(
        this.texasHoldem.addNFTFlop( flopTest1CardsDealt, 1, { from: accounts[0], value: this.ROUND_1_PRICE } ),
        "cannot add cards already dealt"
      )
    } )

    // just a dummy to get correct gas prices in next tests...
    it( "...", async function () {
      await this.texasHoldem.setMaxConcurrentGames( 5, { from: accounts[0] } )
    } )

    it( `player can addNFTFlop with correct fee`, async function () {
      const tokenId = flopTest5HandsSucceed[0]

      const receipt = await this.texasHoldem.addNFTFlop( tokenId, 1, {
        value: this.ROUND_1_PRICE,
        from: accounts[0]
      } )

      const handId = await this.holdemHeroes.tokenIdToHandId( tokenId )
      const hand = await this.holdemHeroes.getHandAsCardIds( handId )
      expectEvent( receipt, "HandAdded", {
        player: accounts[0],
        gameId: new BN( 1 ),
        round: new BN( 2 ), // GameStatus.FLOP_DEALT
        tokenId: new BN( tokenId ),
        handId: new BN( handId ),
        card1: new BN( hand[0] ),
        card2: new BN( hand[1] ),
      } )

      expectEvent( receipt, "FeePaid", {
        player: accounts[0],
        gameId: new BN( 1 ),
        round: new BN( 2 ), // GameStatus.FLOP_DEALT
        amount: this.ROUND_1_PRICE,
      } )

      const tokenAddedInFlop = await this.texasHoldem.tokenAddedInFlop( accounts[0], tokenId, 1 )
      expect( tokenAddedInFlop ).to.be.eq( true )

      const game = await this.texasHoldem.games( 1 )
      expect( game.totalPaidIn ).to.be.bignumber.eq( this.ROUND_1_PRICE )

      // GameStatus.FLOP_DEALT
      const playerLastRoundSubmitted = await this.texasHoldem.getPlayerLastRoundSubmitted( accounts[0], 1 )
      expect( playerLastRoundSubmitted ).to.be.bignumber.eq( new BN( 2 ) )

      const playerPaidIn = await this.texasHoldem.getPlayerAmountPaidIn(accounts[0], 1)
      expect( playerPaidIn ).to.be.bignumber.eq( this.ROUND_1_PRICE )
    } )

    it( `player can addNFTFlop with additional tokens and correct fee`, async function () {
      const tokenId = flopTest5HandsSucceed[1]
      const receipt = await this.texasHoldem.addNFTFlop( tokenId, 1, { from: accounts[0], value: this.ROUND_1_PRICE } )

      const handId = await this.holdemHeroes.tokenIdToHandId( tokenId )
      const hand = await this.holdemHeroes.getHandAsCardIds( handId )
      expectEvent( receipt, "HandAdded", {
        player: accounts[0],
        gameId: new BN( 1 ),
        round: new BN( 2 ), // GameStatus.FLOP_DEALT
        tokenId: new BN( tokenId ),
        handId: new BN( handId ),
        card1: new BN( hand[0] ),
        card2: new BN( hand[1] ),
      } )

      expectEvent( receipt, "FeePaid", {
        player: accounts[0],
        gameId: new BN( 1 ),
        round: new BN( 2 ), // GameStatus.FLOP_DEALT
        amount: this.ROUND_1_PRICE,
      } )

      const tokenAddedInFlop = await this.texasHoldem.tokenAddedInFlop( accounts[0], tokenId, 1 )
      expect( tokenAddedInFlop ).to.be.eq( true )

      const game = await this.texasHoldem.games(1)
      expect( game.totalPaidIn ).to.be.bignumber.eq( this.ROUND_1_PRICE.mul( new BN( 2 ) ) )

      // GameStatus.FLOP_DEALT
      const playerLastRoundSubmitted = await this.texasHoldem.getPlayerLastRoundSubmitted( accounts[0], 1 )
      expect( playerLastRoundSubmitted ).to.be.bignumber.eq( new BN( 2 ) )

      const playerPaidIn = await this.texasHoldem.getPlayerAmountPaidIn(accounts[0], 1)
      expect( playerPaidIn ).to.be.bignumber.eq( this.ROUND_1_PRICE.mul(new BN(2)) )
    } )

    it( `player addNFTFlop tokens which will be dealt in turn and river`, async function () {
      await this.texasHoldem.addNFTFlop( turnTest1CardsDealt, 1, { from: accounts[0], value: this.ROUND_1_PRICE } )
      await this.texasHoldem.addNFTFlop( riverTest1CardsDealt, 1, { from: accounts[0], value: this.ROUND_1_PRICE } )
    } )


    it( "cannot re-add same NFT to addNFTFlop", async function () {
      expectRevert(
        this.texasHoldem.addNFTFlop( flopTest5HandsSucceed[0], 1, { value: 1, from: accounts[0], value: this.ROUND_1_PRICE } ),
        "token already added"
      )
    } )

    it( "turn must be dealt before players can addNFTsTurn", async function () {
      expectRevert(
        this.texasHoldem.addNFTTurn( flopTest5HandsSucceed[0], 1, { value: this.ROUND_2_PRICE, from: accounts[0] } ),
        "turn not dealt"
      )
    } )

    it( "cannot addNFTsFlop when flop round ended", async function () {
      await increaseBlockTime( roundTime + 10 )

      expectRevert(
        this.texasHoldem.addNFTFlop( flopTest5HandsSucceed[2], 1, { from: accounts[0], value: this.ROUND_1_PRICE } ),
        "round ended"
      )
    } )

    it("...", async function () {
      expect(true).to.equal(true)
    })

  })

  describe('turn', function() {

    it("DEALER_ROLE dealer request deal turn...", async function () {
      const receipt = await this.texasHoldem.requestDeal(1, {from: dealer})
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

    it( "must pay correct fee to addNFTTurn", async function () {
      expectRevert(
        this.texasHoldem.addNFTTurn( flopTest5HandsSucceed[0], 1, { from: accounts[0], value: 1 } ),
        "eth value incorrect"
      )
    } )

    it(`player can addNFTTurn with correct fee`, async function () {
      const tokenId = flopTest5HandsSucceed[0]

      const receipt = await this.texasHoldem.addNFTTurn(tokenId, 1, {value: this.ROUND_2_PRICE, from: accounts[0]})

      const handId = await this.holdemHeroes.tokenIdToHandId(tokenId)
      const hand = await this.holdemHeroes.getHandAsCardIds(handId)
      expectEvent(receipt, "HandAdded", {
        player: accounts[0],
        gameId: new BN(1),
        round: new BN(4), // GameStatus.TURN_DEALT
        tokenId: new BN(tokenId),
        handId: new BN(handId),
        card1: new BN(hand[0]),
        card2: new BN(hand[1]),
      })

      expectEvent(receipt, "FeePaid", {
        player: accounts[0],
        gameId: new BN(1),
        round: new BN(4), // GameStatus.TURN_DEALT
        amount: this.ROUND_2_PRICE,
      })

      const tokenAddedInTurn = await this.texasHoldem.tokenAddedInTurn(accounts[0], tokenId, 1)
      expect(tokenAddedInTurn).to.be.eq(true)

      // 4 tokens added in flop
      const totalPaidInFromFlop = this.ROUND_1_PRICE.mul( new BN(4) )
      const expectedTotalPaidIn = totalPaidInFromFlop.add(this.ROUND_2_PRICE)
      const game = await this.texasHoldem.games(1)
      expect(game.totalPaidIn).to.be.bignumber.eq(expectedTotalPaidIn)

      // GameStatus.TURN_DEALT
      const playerLastRoundSubmitted = await this.texasHoldem.getPlayerLastRoundSubmitted(accounts[0], 1)
      expect(playerLastRoundSubmitted).to.be.bignumber.eq(new BN(4))

      const playerPaidIn = await this.texasHoldem.getPlayerAmountPaidIn(accounts[0], 1)
      expect( playerPaidIn ).to.be.bignumber.eq( expectedTotalPaidIn )
    })

    it(`player can 2nd addNFTTurn with correct fee`, async function () {
      const tokenId = flopTest5HandsSucceed[1]

      const receipt = await this.texasHoldem.addNFTTurn(tokenId, 1, {value: this.ROUND_2_PRICE, from: accounts[0]})

      const handId = await this.holdemHeroes.tokenIdToHandId(tokenId)
      const hand = await this.holdemHeroes.getHandAsCardIds(handId)
      expectEvent(receipt, "HandAdded", {
        player: accounts[0],
        gameId: new BN(1),
        round: new BN(4), // GameStatus.TURN_DEALT
        tokenId: new BN(tokenId),
        handId: new BN(handId),
        card1: new BN(hand[0]),
        card2: new BN(hand[1]),
      })

      expectEvent(receipt, "FeePaid", {
        player: accounts[0],
        gameId: new BN(1),
        round: new BN(4), // GameStatus.TURN_DEALT
        amount: this.ROUND_2_PRICE,
      })
    })

    it( `player addNFTTurn tokens which will be dealt in river`, async function () {
      await this.texasHoldem.addNFTTurn( riverTest1CardsDealt, 1, { from: accounts[0], value: this.ROUND_2_PRICE } )
    } )

    it( "cannot addNFTTurn using cards already dealt in turn", async function () {
      expectRevert(
        this.texasHoldem.addNFTTurn( turnTest1CardsDealt, 1, { from: accounts[0], value: this.ROUND_2_PRICE } ),
        "cannot add cards already dealt"
      )
    } )

    it( "cannot addNFTTurn token not added in flop round", async function () {
      expectRevert(
        this.texasHoldem.addNFTTurn( flopTest5HandsSucceed[3], 1, { from: accounts[0], value: this.ROUND_2_PRICE } ),
        "token not added in flop round"
      )
    } )

    it( "cannot addNFTTurn same token more than once", async function () {
      expectRevert(
        this.texasHoldem.addNFTTurn( flopTest5HandsSucceed[1], 1, { from: accounts[0], value: this.ROUND_2_PRICE } ),
        "token already added"
      )
    } )

    it( "river must be dealt before players can playFinalHand", async function () {
      expectRevert(
        this.texasHoldem.playFinalHand( flopTest5HandsSucceed[1], [0, 5, 7], 1, { from: accounts[0] } ),
        "river not dealt"
      )
    } )

    it( "cannot addNFTTurn when turn round ended", async function () {
      await increaseBlockTime( roundTime + 10 )

      expectRevert(
        this.texasHoldem.addNFTTurn( flopTest5HandsSucceed[0], 1, { from: accounts[0], value: this.ROUND_2_PRICE } ),
        "round ended"
      )
    } )

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('river', function() {

    it("DEALER_ROLE dealer request deal river...", async function () {
      const receipt = await this.texasHoldem.requestDeal(1, {from: dealer})
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
        this.texasHoldem.playFinalHand( flopTest5HandsSucceed[3], [0, 5, 7], 1, { from: accounts[0] } ),
        "token not added in turn round"
      )
    } )

    it( "must submit exactly 3 cards from river", async function () {
      expectRevert(
        // only one from river
        this.texasHoldem.playFinalHand( flopTest5HandsSucceed[0], [0, 5], 1, { from: accounts[0] } ),
        "must submit 3 cards from river"
      )
    } )

    it( "all 3 cards must have been dealt in river", async function () {
      expectRevert(
        // only one from river
        this.texasHoldem.playFinalHand( flopTest5HandsSucceed[0], [12, 6, 15], 1, { from: accounts[0] } ),
        "submitted river card not in river"
      )
    } )

    it( "cannot add token containing cards already dealt in river", async function () {
      expectRevert(
        // only one from river
        this.texasHoldem.playFinalHand( riverTest1CardsDealt, [0, 5, 7], 1, { from: accounts[0] } ),
        "cannot add cards already dealt"
      )
    } )

    it( `player can playFinalHand`, async function () {
      const tokenId = finalHands[0]
      const riverCards = finalHands[1]

      const receipt = await this.texasHoldem.playFinalHand(tokenId, riverCards, 1, {from: accounts[0]})

      const handId = await this.holdemHeroes.tokenIdToHandId(tokenId)
      const hand = await this.holdemHeroes.getHandAsCardIds(handId)
      expectEvent(receipt, "FinalHandPlayed", {
        player: accounts[0],
        gameId: new BN(1),
        tokenId: new BN(tokenId),
        handId: new BN(handId),
        card1: new BN(hand[0]),
        card2: new BN(hand[1]),
        card3: new BN(finalHands[1][0]),
        card4: new BN(finalHands[1][1]),
        card5: new BN(finalHands[1][2]),
        rank: new BN(3325)
      })

      const rank = await this.texasHoldem.calculateHandRankForPlayer(1, accounts[0])
      expect(rank).to.be.bignumber.eq(new BN(3325))

      const finalHand = await this.texasHoldem.getPlayerFinalHand(1, accounts[0])
      expect(finalHand.handId).to.be.bignumber.eq(handId)
      expect(finalHand.tokenId).to.be.bignumber.eq(new BN(tokenId))
      expect(finalHand.rank).to.be.bignumber.eq(new BN(3325))
      expect(finalHand.cards[0]).to.be.bignumber.eq(new BN(hand[0]))
      expect(finalHand.cards[1]).to.be.bignumber.eq(new BN(hand[1]))
      expect(finalHand.cards[2]).to.be.bignumber.eq(new BN(finalHands[1][0]))
      expect(finalHand.cards[3]).to.be.bignumber.eq(new BN(finalHands[1][1]))
      expect(finalHand.cards[4]).to.be.bignumber.eq(new BN(finalHands[1][2]))

      const playerLeaderboardPosition = await this.texasHoldem.getPlayerLeaderboardPosition(1, accounts[0])
      expect(playerLeaderboardPosition).to.be.bignumber.eq(new BN(0))
    } )


    it("...", async function () {
      expect(true).to.equal(true)
    })
  })
})

