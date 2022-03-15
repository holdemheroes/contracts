const fs = require('fs')
const path = require("path")

module.exports = {
  getContractAddresses: () => {
    try {
      return JSON.parse(fs.readFileSync(`${process.cwd()}/data/contractAddresses.json`).toString())
    } catch (e) {
      return {}
    }
  },
  writeContractAddresses: (contractAddresses) => {
    fs.writeFileSync(
      `${process.cwd()}/data/contractAddresses.json`,
      JSON.stringify(contractAddresses, null, 2) // Indent 2 spaces
    )
  }
}