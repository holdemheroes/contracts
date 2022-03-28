require("dotenv").config()
const args = require("args")
const Web3 = require("web3")

const { BN } = require("@openzeppelin/test-helpers")

const HEHAbi = require('../../data/abis/HoldemHeroes.json')
const contractAddresses = require("../../data/contractAddresses.json")
const { Web3Provider } = require( "truffle/build/631.bundled" )
const path = require( "path" )
const fs = require( "fs" )

const { ALCHEMY_KEY } = process.env

args
  .option("network", "The network")

const flags = args.parse(process.argv)

const validNetworks = [
  "vordev", "development", "develop", "rinkeby", "mainnet",
]

if (!flags.network) {
  console.log(`--network flag required. Must be one of: ${validNetworks.join(", ")}`)
  process.exit(1)
}

if(!validNetworks.includes(flags.network)) {
  console.log(`Invalid network. Must be one of: ${validNetworks.join(", ")}`)
  process.exit(1)
}

let alchemyPrefix = ""

switch(flags.network) {
  case "rinkeby":
    alchemyPrefix = "eth-rinkeby.alchemyapi.io/v2"
    break
  default:
    console.log("not supported yet")
    process.exit(1)
}

const url = `wss://${alchemyPrefix}/${ALCHEMY_KEY}`

async function getPrices() {
  const contractAddr = contractAddresses[flags.network].holdem_heroes_nft
  const web3Ws = await new Web3(url)
  const contract = await new web3Ws.eth.Contract(HEHAbi, contractAddr)

  const baseDataPath = path.resolve( __dirname, `../../data/tmp/${flags.network}_${contractAddr}` )
  await fs.promises.mkdir( baseDataPath, { recursive: true } )
  const dataDumpPath = path.resolve(baseDataPath, "price_per_block.csv")
  if(!fs.existsSync(dataDumpPath)) {
    fs.writeFileSync( dataDumpPath, "block,price,ems\n" )
  }

  let lastBlock = 0
  const startBlock = await contract.methods.SALE_START_BLOCK_NUM().call()

  web3Ws.eth
    .subscribe("newBlockHeaders")
    .on("connected", function newBlockHeadersConnected(subscriptionId) {
      console.log(new Date(), "watchBlocks newBlockHeaders connected", subscriptionId)
    })
    .on("data", async function newBlockHeadersRecieved(blockHeader) {

      const thisBlock = parseInt(blockHeader.number, 10)
      if(thisBlock > lastBlock) {
        lastBlock = thisBlock
        try {
          const nftPrice = await contract.methods.getNftPrice().call()
          let currentEms = 0
          if(thisBlock >= startBlock) {
            currentEms = await contract.methods.getCurrentEMS().call()
          }
          const price = Web3.utils.fromWei( nftPrice )

          const data = `${thisBlock},${price},${currentEms}`

          fs.appendFileSync( dataDumpPath, data + "\n" )

          console.log( `${data}` )
        } catch(e) {
          console.log(e)
        }
      }
    })
    .on("error", function newBlockHeadersError(error) {
      console.log(error)
    })

}

getPrices()
