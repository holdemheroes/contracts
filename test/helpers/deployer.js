const { getRanksForUpload, getHandsForUpload, devAddresses } = require("./test_data")
const HoldemHeroes = artifacts.require("HoldemHeroes") // Loads a compiled contract
const HoldemHeroesTestableDistribution = artifacts.require("HoldemHeroesTestableDistribution") // Loads a compiled contract

class Deployer {
  constructor() {}

  async freshDeploy(saleStart, revealSeconds, maxNfts, useTestable = false) {
    if(useTestable) {
      this.holdemHeroes = await HoldemHeroes.new(devAddresses.xfund, devAddresses.vor, saleStart, revealSeconds, maxNfts)
    } else {
      this.holdemHeroes = await HoldemHeroesTestableDistribution.new(devAddresses.xfund, devAddresses.vor, saleStart, revealSeconds, maxNfts)
    }

    return this.holdemHeroes
  }

  async freshDeployInitialised(saleStart, revealSeconds, maxNfts, useTestable = false) {
    if(useTestable) {
      this.holdemHeroes = await HoldemHeroes.new(devAddresses.xfund, devAddresses.vor, saleStart, revealSeconds, maxNfts)
    } else {
      this.holdemHeroes = await HoldemHeroesTestableDistribution.new(devAddresses.xfund, devAddresses.vor, saleStart, revealSeconds, maxNfts)
    }

    await this.initCards()
    await this.uploadRanks()

    return this.holdemHeroes
  }

  initCards() {
    return this.holdemHeroes.initCards()
  }

  uploadRanks() {
    const rankData = getRanksForUpload()
    return this.holdemHeroes.uploadHandRanks(rankData.rankHashes, rankData.ranks)
  }

  async revealAllHands() {
    const hands = getHandsForUpload()
    for( let i = 0; i < hands.length; i += 1) {
      await this.revealHandBatch(i)
    }
  }

  distribute(requestId, startIdx) {
    return this.holdemHeroes.beginDistributionTestable(requestId, startIdx)
  }

  revealHandBatch(i) {
    const hands = getHandsForUpload()
    const h = hands[i]
    return this.holdemHeroes.reveal(h, "")
  }

  mintPreReveal(numToMint, price, minter) {
    const cost = price.mul(new web3.utils.BN(numToMint))
    return this.holdemHeroes.mintNFTPreReveal( numToMint, { value: cost, from: minter } )
  }

  mintPostReveal(tokenId, price, minter) {
    return this.holdemHeroes.mintNFTPostReveal( tokenId, { value: price, from: minter } )
  }

}

const deployer = new Deployer()
module.exports = deployer
