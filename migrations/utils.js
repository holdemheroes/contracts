const fs = require('fs')

module.exports = {
  getContractAddresses: (network) => {
    let utSuffix = ""
    if(network === "soliditycoverage" || network === "test") {
      utSuffix = "UnitTests"
    }
    try {
      return JSON.parse(fs.readFileSync(`${process.cwd()}/data/contractAddresses${utSuffix}.json`).toString())
    } catch (e) {
      return {}
    }
  },
  writeContractAddresses: (contractAddresses, network) => {
    let utSuffix = ""
    if(network === "soliditycoverage" || network === "test") {
      utSuffix = "UnitTests"
    }
    fs.writeFileSync(
      `${process.cwd()}/data/contractAddresses${utSuffix}.json`,
      JSON.stringify(contractAddresses, null, 2) // Indent 2 spaces
    )
  }
}
