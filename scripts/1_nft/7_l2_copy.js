const fs = require("fs")
const path = require("path")
const utils = require("../utils/utils")
const args = require("args")

args
  .option("src", "The source network to copy from")
  .option("dest", "The destination network to copy to")

const flags = args.parse(process.argv)

const validSrcNetworks = [
  "rinkeby", "mainnet"
]

const validDestNetworks = [
  "polygon_mumbai"
]

if (!flags.src) {
  console.log(`--src flag required. Must be one of: ${validSrcNetworks.join(", ")}`)
  process.exit(1)
}

if (!flags.dest) {
  console.log(`--dest flag required. Must be one of: ${validDestNetworks.join(", ")}`)
  process.exit(1)
}

if(!validSrcNetworks.includes(flags.src)) {
  console.log(`Invalid network for src. Must be one of: ${validSrcNetworks.join(", ")}`)
  process.exit(1)
}

if(!validDestNetworks.includes(flags.dest)) {
  console.log(`Invalid network for dest. Must be one of: ${validDestNetworks.join(", ")}`)
  process.exit(1)
}

async function copyToL2() {
  const baseSrcDataPath = path.resolve(__dirname, "../../data/networks", flags.src)
  const baseDestDataPath = path.resolve(__dirname, "../../data/networks", flags.dest)
  await fs.promises.mkdir(baseDestDataPath, { recursive: true })

  const dataUploadPathSrc = path.resolve(baseSrcDataPath, "upload.json")
  const provenancePathSrc = path.resolve(baseSrcDataPath, "provenance.json")

  const dataUploadPathDest = path.resolve(baseDestDataPath, "upload.json")
  const provenancePathDest = path.resolve(baseDestDataPath, "provenance.json")

  await fs.promises.copyFile(dataUploadPathSrc, dataUploadPathDest)
  await fs.promises.copyFile(provenancePathSrc, provenancePathDest)

  const destProvinenceJson = JSON.parse(fs.readFileSync(provenancePathDest).toString())

  destProvinenceJson.network = flags.dest

  fs.writeFileSync(
    provenancePathDest,
    JSON.stringify(destProvinenceJson, null, 2) // Indent 2 spaces
  )

  const contractAddresses = utils.getContractAddresses()

  if(contractAddresses[flags.dest]) {
    contractAddresses[flags.dest].provenance_ipfs_hash = contractAddresses[flags.src].provenance_ipfs_hash
  } else {
    contractAddresses[flags.dest] = {
      provenance_ipfs_hash: contractAddresses[flags.src].provenance_ipfs_hash,
    }
  }

  utils.writeContractAddresses(contractAddresses)

}

copyToL2()
