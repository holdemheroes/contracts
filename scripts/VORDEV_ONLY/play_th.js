const argv = require('minimist')(process.argv.slice(2))
require("dotenv").config()
const utils = require( "../utils/utils" )
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")
const HoldemHeroes = artifacts.require("HoldemHeroesTestableDistribution")
const xFUND = artifacts.require("MockERC20")

function parseError(e) {
  if(e.code === 4001) {
    return e.message
  } else {
    const paramsPattern = /[^{}]+(?=})/g
    let extractParams = e.message.match( paramsPattern )
    if ( extractParams ) {
      const err = JSON.parse( `{${extractParams[0]}}` )
      return err.stack
    }
  }
  // if all else fails, just return the whole thing
  return e
}

function statusToStr(status) {
  switch(status){
    case "0":
      return "initialised"
    case "1":
      return "flop wait"
    case "2":
      return "flop dealt"
    case "3":
      return "turn wait"
    case "4":
      return "turn dealt"
    case "5":
      return "river wait"
    case "6":
      return "river dealt"
    default:
      return "unknown"
  }
}

module.exports = async function(callback) {
  const newtworkType = await web3.eth.net.getNetworkType();
  if(newtworkType !== "private") {
    console.log("run with Ganache or vordev")
    process.exit(1)
  }

  const accounts = await web3.eth.getAccounts()

  const contractAddresses = utils.getContractAddresses()

  const hh = await new web3.eth.Contract(HoldemHeroes.abi, contractAddresses["vordev"].holdem_heroes_nft)
  const texasHoldem = await new web3.eth.Contract(TexasHoldemV1.abi, contractAddresses["vordev"].texas_holdem_v1)
  const xfund = await new web3.eth.Contract(xFUND.abi, contractAddresses["vordev"].xfund)

  const ROUND_1_PRICE = await texasHoldem.methods.ROUND_1_PRICE().call()
  const ROUND_2_PRICE = await texasHoldem.methods.ROUND_2_PRICE().call()

  //args
  const cmd = argv["cmd"]
  const gameId = argv["g"]
  const token = argv["t"]
  const playerIdx = parseInt(argv["p"], 10)
  const player = accounts[playerIdx]
  let tx
  let gameQueryData

  if(!cmd) {
    console.log("noting to run")
    callback()
  }

  const flopRandomness = Date.now()

  async function getGameStatus() {
    const dealtCards = await texasHoldem.methods.getCardsDealt(gameId).call()
    console.log("cards dealt")
    for(let i = 0; i < dealtCards.length; i += 1) {
      const cId = dealtCards[i]
      const c = await hh.methods.getCardAsString(cId).call()
      console.log(`${cId} - ${c}`)
    }
    const timeNow = Math.floor(Date.now() / 1000)
    gameQueryData = await texasHoldem.methods.games(gameId).call()
    const timeLeft = parseInt(gameQueryData.roundEndTime, 10) - timeNow
    console.log("status:", statusToStr(gameQueryData.status))
    console.log("round time left:", timeLeft)
  }

  try {

    switch(cmd) {
      case "top-up":
        await xfund.methods.transfer(contractAddresses["vordev"].texas_holdem_v1, "1000000000").send({from: accounts[0]})
        await texasHoldem.methods.increaseVorCoordinatorAllowance("1000000000").send({from: accounts[0]})
        break
      case "new-game":
        if(!playerIdx) {
          console.log("no player specified")
          callback()
        }
        tx = await texasHoldem.methods.startGame().send({from: player})
        console.log( "startGame", tx.transactionHash, tx.gasUsed )
        const newGameId = await texasHoldem.methods.currentGameId().call()
        console.log("game #", newGameId)
        break
      case "play-flop":
        if(!playerIdx || !token || !gameId) {
          console.log("no player, token or game specified")
          callback()
        }
        tx = await texasHoldem.methods.addNFTsFlop([token], gameId).send({from: player, value: ROUND_1_PRICE})
        if(tx.transactionHash) {
          console.log( "addNFTsFlop", tx.transactionHash, tx.gasUsed )
        } else {
          console.log(tx)
        }
        break
      case "play-turn":
        if(!playerIdx || !token || !gameId) {
          console.log("no player, token or game specified")
          callback()
        }
        tx = await texasHoldem.methods.addNFTsTurn([token], gameId).send({from: player, value: ROUND_2_PRICE})
        if(tx.transactionHash) {
          console.log( "addNFTsTurn", tx.transactionHash, tx.gasUsed )
        } else {
          console.log(tx)
        }
        break
      case "play-final":
        break
      case "deal":
        if(!gameId) {
          console.log("no game specified")
          callback()
        }
        tx = await texasHoldem.methods.requestDeal(gameId).send({from: accounts[0]})
        console.log( "requestDeal", tx.transactionHash, tx.gasUsed )
        await getGameStatus()
        break
      case "game-status":
        if(!gameId) {
          console.log("no game specified")
          callback()
        }
        await getGameStatus()
        break
      case "my-hands":
        if(!playerIdx) {
          console.log("no player specified")
          callback()
        }
        const balance = await hh.methods.balanceOf(player).call()

        for(let i = 0; i < balance;  i += 1) {
          const tokenId = await hh.methods.tokenOfOwnerByIndex(player, i).call()
          const handId = await hh.methods.tokenIdToHandId(tokenId).call()
          const cardsInHand = await hh.methods.getHandAsCardIds(handId).call()
          const card1 = await hh.methods.getCardAsString(cardsInHand.card1).call()
          const card2 = await hh.methods.getCardAsString(cardsInHand.card2).call()
          console.log(`NFT #${tokenId}`, `Hand #${handId}`, card1, card2, cardsInHand.card1, cardsInHand.card2)
        }
        break
    }

    callback()

  } catch(e) {
    console.log(e)
    console.log("PARSED")
    console.error(parseError(e))
    callback()
  }
}
