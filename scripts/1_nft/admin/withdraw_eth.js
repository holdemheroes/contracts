require("dotenv").config()
const args = require("args")
const HDWalletProvider = require("@truffle/hdwallet-provider")
const Web3 = require("web3")

const HEHAbi = require('../../../data/abis/HoldemHeroes.json')
const contractAddresses = require("../../../data/contractAddresses.json")

const {
  ETH_PKEY_TN,
  ETH_PKEY_MN,
  ALCHEMY_KEY_ETH_MN,
  ALCHEMY_KEY_POLY_MN,
  ALCHEMY_KEY_ETH_TN,
  ALCHEMY_KEY_POLY_TN
} = process.env

args
  .option("network", "The network to deal on")

const flags = args.parse(process.argv)

const validNetworks = [
  "vordev", "development", "develop", "rinkeby", "mainnet", "polygon", "polygon_mumbai"
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
let alchemyKey = ""
let pKey = ""

switch(flags.network) {
  case "rinkeby":
    alchemyPrefix = "eth-rinkeby.alchemyapi.io/v2"
    pKey = ETH_PKEY_TN
    alchemyKey = ALCHEMY_KEY_ETH_TN
    break
  case "polygon_mumbai":
    alchemyPrefix = "polygon-mumbai.g.alchemy.com/v2"
    pKey = ETH_PKEY_TN
    alchemyKey = ALCHEMY_KEY_POLY_TN
    break
  case "mainnet":
    alchemyPrefix = "eth-mainnet.alchemyapi.io/v2"
    pKey = ETH_PKEY_MN
    alchemyKey = ALCHEMY_KEY_ETH_MN
    break
  case "polygon":
    alchemyPrefix = "polygon-mainnet.g.alchemy.com/v2"
    pKey = ETH_PKEY_MN
    alchemyKey = ALCHEMY_KEY_POLY_MN
    break
  default:
    console.log("not supported yet")
    process.exit(1)
}

const url = `https://${alchemyPrefix}/${alchemyKey}`

async function withdraw() {

  const contractAddr = contractAddresses[flags.network].holdem_heroes_nft
  const providerHttp = new HDWalletProvider(pKey, url)
  const web3Http = await new Web3(providerHttp)
  const contractHttp = await new web3Http.eth.Contract(HEHAbi, contractAddr)

  const accounts = await web3Http.eth.getAccounts()
  const admin = accounts[0]

  contractHttp.methods
    .withdrawETH()
    .send({ from: admin })
    .on("transactionHash", function onTransactionHash(txHash) {
      console.log("Tx sent:", txHash)
      process.exit(0)
    })
    .on("error", function onError(err) {
      console.log(err)
      process.exit(0)
    })
    .catch(function onCatch(err) {
      console.log(err)
      process.exit(0)
    })
}

withdraw()
