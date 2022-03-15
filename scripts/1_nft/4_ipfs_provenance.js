require("dotenv").config()
const pinataSDK = require('@pinata/sdk')
const pinata = pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_KEY)

const args = require("args")
const utils = require( "../utils/utils" )
const netConfigs = require( "../../config.json" )
args
  .option("network", "The network to pin for")

const flags = args.parse(process.argv)

const validNetworks = [
  "vordev", "development", "develop", "rinkeby", "mainnet"
]

if (!flags.network) {
  console.log(`--network flag required. Must be one of: ${validNetworks.join(", ")}`)
  process.exit(1)
}

if(!validNetworks.includes(flags.network)) {
  console.log(`Invalid network. Must be one of: ${validNetworks.join(", ")}`)
  process.exit(1)
}

const body = utils.getProvenanceJson(flags.network)

const options = {
  pinataMetadata: {
    name: `${flags.network}-provenance.json`,
  }
}

pinata.pinJSONToIPFS(body, options).then((result) => {
  //handle results here
  console.log(result)
  const contractAddresses = utils.getContractAddresses()
  contractAddresses[flags.network].provenance_ipfs_hash = result.IpfsHash

  utils.writeContractAddresses(contractAddresses)
}).catch((err) => {
  //handle error here
  console.log(err)
})
