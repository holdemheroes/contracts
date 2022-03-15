require("dotenv").config()
const utils = require( "../utils/utils" )
const pinataSDK = require('@pinata/sdk')
const netConfigs = require("../../config.json")
const pinata = pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_KEY)
const PlayingCards = artifacts.require("PlayingCards")
const HoldemHeroes = artifacts.require("HoldemHeroesTestableDistribution")

module.exports = async function(callback) {
  const newtworkType = await web3.eth.net.getNetworkType();
  if(newtworkType !== "private") {
    console.log("run with Ganache or vordev")
    process.exit(1)
  }

  const networkName = "vordev"

  try {
    const contractAddresses = utils.getContractAddresses()

    const saleStart = Math.floor(Date.now() / 1000)
    const whitelistTime = 0
    const revealTime = 5
    const maxMintable = 1326

    console.log("deploy PlayingCards")
    const playingCards = await new PlayingCards()

    console.log("PlayingCards deployed to", playingCards.address)

    console.log("deploy HoldemHeroes")
    const holdemHeroes = await HoldemHeroes.new(
      netConfigs.networks[networkName].addresses.vor,
      netConfigs.networks[networkName].addresses.xfund,
      playingCards.address,
      saleStart,
      revealTime,
      whitelistTime,
      maxMintable)

    console.log("HEH deployed to", holdemHeroes.address)

    contractAddresses[networkName] = {
      holdem_heroes_nft: holdemHeroes.address,
      xfund: netConfigs.networks[networkName].addresses.xfund,
      vor: netConfigs.networks[networkName].addresses.vor,
    }

    utils.writeContractAddresses(contractAddresses)

    const accounts = await web3.eth.getAccounts()
    const admin = accounts[0]
    const network = config.network
    const uploadJson = utils.getUploadJson(network)

    const rankHashes = []
    const ranks = []

    console.log("upload hand ranks")
    for(let i = 0; i < uploadJson.ranks.length; i += 1) {
      rankHashes.push(uploadJson.ranks[i].hash)
      ranks.push(uploadJson.ranks[i].rank)
    }

    tx = await holdemHeroes.uploadHandRanks( rankHashes, ranks, {
      from: admin,
    } )
    console.log( `uploadHandRanks tx sent`, tx.tx, tx.receipt.gasUsed )

    const body = utils.getProvenanceJson(network)

    const options = {
      pinataMetadata: {
        name: `vordev-provenance.json`,
      }
    }

    pinata.pinJSONToIPFS(body, options).then(async (result) => {
      //handle results here
      console.log(result)
      const contractAddresses = utils.getContractAddresses()
      contractAddresses[network].provenance_ipfs_hash = result.IpfsHash
      utils.writeContractAddresses(contractAddresses)


      console.log("revealing in...")
      for(let i = revealTime; i > 0; i -= 1) {
        process.stdout.write(`...${i}`)
        await new Promise(r => setTimeout(r, 1000))
      }
      console.log("reveal...")
      const hands = uploadJson.hands

      for( let i = 0; i < hands.length; i += 1) {
        let ipfsProvHash = ""
        if(i === 13) {
          ipfsProvHash = contractAddresses[network].provenance_ipfs_hash
        }
        console.log(hands[i])
        try {
          const tx = await holdemHeroes.reveal( hands[i], i, ipfsProvHash, {
            from: admin,
          } )
          const numInThis = hands[i].length
          console.log( `tx ${i + 1}/${hands.length} sent`, tx.tx, tx.receipt.gasUsed, numInThis )
          console.log( "BatchRevealed", tx.receipt.logs[0].args.batchId.toString(), tx.receipt.logs[0].args.startHandId.toString(), "-", tx.receipt.logs[0].args.endHandId.toString(), tx.receipt.logs[0].args.batchHash )
        } catch(e) {
          console.log(e)
          process.exit(1)
        }
      }

      tx = await holdemHeroes.beginDistributionTestable( 24, {from: admin})
      console.log( "beginDistributionTestable tx sent", tx.tx )

      callback()
    }).catch((err) => {
      //handle error here
      console.log(err)
      callback()
    })

  } catch(e) {
    console.log(e)
    callback()
  }
}
