const { expect } = require("chai")
const {
  BN, // Big Number support
  expectRevert,
  expectEvent, constants,
} = require("@openzeppelin/test-helpers")

const { MerkleTree } = require("merkletreejs")
const keccak256 = require("keccak256")

const { devAddresses } = require("../helpers/test_data")
const { root } = require( "truffle/build/484.bundled" )
const { increaseBlockTime } = require( "../helpers/chain" )

const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const HoldemHeroes = artifacts.require("HoldemHeroes") // Loads a compiled contract

contract("HoldemHeroes - whitelist", async function(accounts) {

  const whitelist = [
    accounts[0],
    accounts[1],
    accounts[2],
    accounts[3],
    accounts[4],
  ]

  const leafNodes = whitelist.map(addr => keccak256(addr))

  const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true})
  const rootHash = merkleTree.getRoot()

  const whitelistTime = 10

  // deploy contract once before this set of tests
  before(async function () {
    const saleStart = Math.floor(Date.now() / 1000)
    const playingCards = await PlayingCards.new()
    this.holdemHeroes = await HoldemHeroes.new(devAddresses.vor, devAddresses.xfund, playingCards.address, saleStart, 100, whitelistTime, 5)
    await this.holdemHeroes.setWhitelistMerkleRoot(rootHash, true)
    await increaseBlockTime(1)
  })

  it("whitelisted address can mint", async function () {

    const minter = accounts[2]
    const numToMint = 5
    const pricePerNft = await this.holdemHeroes.getNftPrice()
    const cost = pricePerNft.mul(new web3.utils.BN(numToMint))

    const leaf = keccak256(minter)
    const proof = merkleTree.getHexProof(leaf.toString("hex"))

    const receipt = await this.holdemHeroes.mintNFTPreReveal(numToMint, proof, {from: minter, value: cost})

    for(let i = 0; i < 5; i += 1) {
      expectEvent(receipt, "Transfer", {
        from: constants.ZERO_ADDRESS,
        to: minter,
        tokenId: new BN(i),
      })
      const nftOwner = await this.holdemHeroes.ownerOf(i)
      expect(nftOwner).to.be.eq(minter)
    }
  })

  it("non-whitelisted address cannot mint", async function () {

    // account #5 not in whitelist
    const minter = accounts[5]
    const numToMint = 5
    const pricePerNft = await this.holdemHeroes.getNftPrice()
    const cost = pricePerNft.mul( new web3.utils.BN( numToMint ) )

    const leaf = keccak256( minter )
    const proof = merkleTree.getHexProof( leaf.toString( "hex" ) )

    await expectRevert(
      this.holdemHeroes.mintNFTPreReveal( numToMint, proof, { from: minter, value: cost } ),
      "not whitelisted",
    )
  })

  it("anyone can mint when whitelist disabled", async function () {

    // disable whitelist
    await this.holdemHeroes.setWhitelistMerkleRoot(rootHash, false)

    // account #5 not in whitelist
    const minter = accounts[5]
    const numToMint = 1
    const pricePerNft = await this.holdemHeroes.getNftPrice()
    const cost = pricePerNft.mul(new web3.utils.BN(numToMint))

    const leaf = keccak256(minter)
    const proof = merkleTree.getHexProof(leaf.toString("hex"))

    const receipt = await this.holdemHeroes.mintNFTPreReveal(numToMint, proof, {from: minter, value: cost})

    expectEvent(receipt, "Transfer", {
      from: constants.ZERO_ADDRESS,
      to: minter,
      tokenId: new BN(5),
    })
  })

  it("anyone can mint when whitelist time is over", async function () {

    // re-enable whitelist
    await this.holdemHeroes.setWhitelistMerkleRoot(rootHash, true)

    // account #5 not in whitelist
    const minter = accounts[5]
    const numToMint = 1
    const pricePerNft = await this.holdemHeroes.getNftPrice()
    const cost = pricePerNft.mul(new web3.utils.BN(numToMint))

    const leaf = keccak256(minter)
    const proof = merkleTree.getHexProof(leaf.toString("hex"))

    await expectRevert(
      this.holdemHeroes.mintNFTPreReveal( numToMint, proof, { from: minter, value: cost } ),
      "not whitelisted",
    )

    // time travel
    await increaseBlockTime(whitelistTime + 1)

    const receipt = await this.holdemHeroes.mintNFTPreReveal(numToMint, proof, {from: minter, value: cost})

    expectEvent(receipt, "Transfer", {
      from: constants.ZERO_ADDRESS,
      to: minter,
      tokenId: new BN(6),
    })
  })


  it("...", async function () {
    expect(true).to.equal(true)
  })
})

