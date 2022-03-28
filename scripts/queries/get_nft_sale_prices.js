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

const url = `https://${alchemyPrefix}/${ALCHEMY_KEY}`

async function getPrices() {

  const contractAddr = contractAddresses[flags.network].holdem_heroes_nft
  const web3Http = await new Web3(url)
  const contractHttp = await new web3Http.eth.Contract(HEHAbi, contractAddr)

  const baseDataPath = path.resolve( __dirname, `../../data/tmp/${flags.network}_${contractAddr}` )
  await fs.promises.mkdir( baseDataPath, { recursive: true } )
  const dataDumpPath = path.resolve(baseDataPath, "price_per_sale.csv")
  let data = "block,num_bought,price_per_nft,total_price,tx_hash\n"

  let totalSales = new BN(0)
  let totalNumSold = new BN(0)

  contractHttp.getPastEvents("Transfer", {
    filter: {from: '0x0000000000000000000000000000000000000000'},
    fromBlock: 0,
    toBlock: 'latest'
  }, function(error, events){ console.log(events); })
    .then(function(events){
      const txs = {}
      for(let i = 0; i < events.length; i += 1) {
        const e = events[i]
        if(txs[e.transactionHash]) {
          txs[e.transactionHash] += 1
        } else {
          txs[e.transactionHash] = 1
        }
      }
      return txs
    })
    .then(async function(txs) {
      const hxHashes = Object.keys(txs);
      for(let i = 0; i < hxHashes.length; i += 1) {
        const txHash = hxHashes[i]
        const numBought = new BN(txs[txHash])
        totalNumSold = totalNumSold.add(numBought)
        const tx = await web3Http.eth.getTransaction(txHash)

        const value = new BN(tx.value)
        totalSales = totalSales.add(value)
        const blockNumber = tx.blockNumber

        const pricePerNFT = value.div(numBought)

        const line = `${blockNumber},${numBought.toString()},${Web3.utils.fromWei(pricePerNFT.toString())},${Web3.utils.fromWei(value.toString())},${txHash}`
        data += `${line}\n`
        console.log(line)
      }

      fs.writeFileSync(dataDumpPath, data)
      const meanSale = totalSales.div(totalNumSold)
      console.log("num sold", totalNumSold.toString())
      console.log("total sales", Web3.utils.fromWei(totalSales.toString()))
      console.log("mean price", Web3.utils.fromWei(meanSale.toString()))
    });
}

getPrices()
