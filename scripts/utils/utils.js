const fs = require("fs")

module.exports = {
  stripHexPrefix: (str) => {
    if (typeof str !== 'string') {
      return str;
    }
    return (str.slice(0, 2) === '0x') ? str.slice(2) : str;
  },
  getUploadJson: (network) => {
    const jsonPath = `${process.cwd()}/data/networks/${network}/upload.json`
    console.log(`Loading ${jsonPath}`)
    return JSON.parse(fs.readFileSync(jsonPath).toString())
  },
  getWhitelistJson: (network) => {
    const jsonPath = `${process.cwd()}/data/networks/${network}/whitelist.json`
    console.log(`Loading ${jsonPath}`)
    return JSON.parse(fs.readFileSync(jsonPath).toString())
  },
  getAirdropJson: (network) => {
    const jsonPath = `${process.cwd()}/data/networks/${network}/airdrop.json`
    console.log(`Loading ${jsonPath}`)
    return JSON.parse(fs.readFileSync(jsonPath).toString())
  },
  writeAirdropJson: (airdrop, network) => {
    fs.writeFileSync(
      `${process.cwd()}/data/networks/${network}/airdrop.json`,
      JSON.stringify(airdrop, null, 2) // Indent 2 spaces
    )
  },
  getHandEvaluatorUploadJson: () => {
    const jsonPath = `${process.cwd()}/data/hand-evaluator-upload.json`
    console.log(`Loading ${jsonPath}`)
    return JSON.parse(fs.readFileSync(jsonPath).toString())
  },
  getProvenanceJson: (network) => {
    const jsonPath = `${process.cwd()}/data/networks/${network}/provenance.json`
    console.log(`Loading ${jsonPath}`)
    return JSON.parse(fs.readFileSync(jsonPath).toString())
  },
  getRevealedBatches: (network) => {
    const batchHashPath = `${process.cwd()}/data/networks/${network}/revealed.json`
    try {
      return JSON.parse(fs.readFileSync(batchHashPath).toString())
    } catch (e) {
      return {
        last_batch_revealed: -1
      }
    }
  },
  saveRevealedBatches: (network, batches) => {
    const batchHashPath = `${process.cwd()}/data/networks/${network}/revealed.json`
    fs.writeFileSync(
      batchHashPath,
      JSON.stringify(batches, null, 2) // Indent 2 spaces
    )
  },
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
