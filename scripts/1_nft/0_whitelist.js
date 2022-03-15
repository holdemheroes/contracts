const fs = require("fs")
const path = require("path")
const { MerkleTree } = require("merkletreejs")
const keccak256 = require("keccak256")
const args = require("args")
const netConf = require("../../config.json")

args
  .option("network", "The network to generate for")

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

async function generate() {

  const baseDataPath = path.resolve( __dirname, "../../data/networks", flags.network )
  await fs.promises.mkdir( baseDataPath, { recursive: true } )

  const whitelistPath = path.resolve(baseDataPath, "whitelist.json")

  const whitelist = netConf.networks[flags.network].whitelist

  const leafNodes = whitelist.map(addr => keccak256(addr))
  const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true})
  const merkleRootHash = merkleTree.getHexRoot()

  const whiteListOut = {
    whitelist: whitelist,
    merkleRootHash: merkleRootHash
  }

  console.log("whitelist merkle root hash:", merkleRootHash)

  fs.writeFileSync(
    whitelistPath,
    JSON.stringify(whiteListOut, null, 2)
  )

}

generate()
