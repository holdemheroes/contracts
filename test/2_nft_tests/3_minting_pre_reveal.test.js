const { expect } = require("chai")
const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
  constants,
} = require("@openzeppelin/test-helpers")

const { devAddresses, getRanksForUpload } = require( "../helpers/test_data" )
const { increaseBlockTime, mineOneBlock } = require("../helpers/chain")
const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const HoldemHeroes = artifacts.require("HoldemHeroes") // Loads a compiled contract

contract("HoldemHeroes - pre reveal sale", async function(accounts) {

  const targetBlocksPerSale = 5
  const saleHalflife = 700
  const priceSpeed = 1
  const priceHalflife = 100
  const startingPrice = web3.utils.toWei("0.22", "ether")

  describe('should succeed', function() {
    // deploy contract once before this set of tests
    before(async function () {
      const saleStart = Math.floor(Date.now() / 1000)
      this.playingCards = await PlayingCards.new()
      this.holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        this.playingCards.address,
        saleStart,
        1000,
        5,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceHalflife,
        startingPrice
      )
      await increaseBlockTime(10)
    })

    it("can mintNFTPreReveal 1 NFT", async function () {
      const minter = accounts[1]
      const numToMint = 1
      const pricePerNft = await this.holdemHeroes.getNftPrice()
      const cost = pricePerNft.mul(new web3.utils.BN(numToMint))

      const receipt = await this.holdemHeroes.mintNFTPreReveal(numToMint, {from: minter, value: cost})
      expectEvent(receipt, "Transfer", {
        from: constants.ZERO_ADDRESS,
        to: minter,
        tokenId: new BN(0),
      })
      const nftOwner = await this.holdemHeroes.ownerOf(0)
      expect(nftOwner).to.be.eq(minter)
    })


    it("if 0 sent to mintNFTPreReveal, 1 will be minted", async function () {
      const minter = accounts[1]
      const pricePerNft = await this.holdemHeroes.getNftPrice()
      const receipt = await this.holdemHeroes.mintNFTPreReveal(0, {from: minter, value: pricePerNft})
      expectEvent(receipt, "Transfer", {
        from: constants.ZERO_ADDRESS,
        to: minter,
        tokenId: new BN(1),
      })
      const nftOwner = await this.holdemHeroes.ownerOf(1)
      expect(nftOwner).to.be.eq(minter)
    })

    it("can mintNFTPreReveal max NFTs", async function () {
      const minter = accounts[2]
      const numToMint = 5
      const pricePerNft = await this.holdemHeroes.getNftPrice()
      const cost = pricePerNft.mul(new web3.utils.BN(numToMint))

      const receipt = await this.holdemHeroes.mintNFTPreReveal(numToMint, {from: minter, value: cost})

      for(let i = 2; i <= 6; i += 1) {
        expectEvent(receipt, "Transfer", {
          from: constants.ZERO_ADDRESS,
          to: minter,
          tokenId: new BN(i),
        })
        const nftOwner = await this.holdemHeroes.ownerOf(i)
        expect(nftOwner).to.be.eq(minter)
      }
    })

    it("getNftPrice returns correct price per NFT", async function () {

      await mineOneBlock()

      const saleStart = Math.floor(Date.now() / 1000)
      const hh = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        this.playingCards.address,
        saleStart,
        1000,
        1326,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceHalflife,
        startingPrice
      )
      await increaseBlockTime(10)

      const numToMint = 50

      console.log("this one will take a long time...")

      const initialPrice = await hh.getNftPrice()

      expect( initialPrice ).to.be.bignumber.eq( new BN(startingPrice) )

      for(let i = 0; i < 26; i += 1) {
        await increaseBlockTime(15)
        await mineOneBlock()
        const pricePerNft = await hh.getNftPrice()
        console.log(i, pricePerNft.toString())
        const totalSupply = await hh.totalSupply()
        const cost = pricePerNft.mul(new web3.utils.BN(numToMint))
        process.stdout.write(".")

        // NOTE - adjust schedule according to contract
        // if(totalSupply <= 250) {
        //   expect( pricePerNft ).to.be.bignumber.eq( new BN(web3.utils.toWei("0.001", "ether")) )
        // } else if(totalSupply <= 500) {
        //   expect( pricePerNft ).to.be.bignumber.eq( new BN(web3.utils.toWei("0.002", "ether")) )
        // } else if(totalSupply <= 750) {
        //   expect( pricePerNft ).to.be.bignumber.eq( new BN(web3.utils.toWei("0.005", "ether")) )
        // } else if(totalSupply <= 1000) {
        //   expect( pricePerNft ).to.be.bignumber.eq( new BN(web3.utils.toWei("0.008", "ether")) )
        // } else {
        //   expect( pricePerNft ).to.be.bignumber.eq( new BN(web3.utils.toWei("0.01", "ether")) )
        // }

        const m = i % accounts.length

        await hh.mintNFTPreReveal( numToMint, { from: accounts[m], value: cost })

        // otherwise minters may run out of ETH during est
        await hh.withdrawETH( { from: accounts[0] })
        await web3.eth.sendTransaction({to:accounts[m], from:accounts[0], value: cost})
      }
      console.log("")
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('should fail', function() {

    before(async function () {
      this.playingCards = await PlayingCards.new()
    })

    it("cannot mintNFTPreReveal before sale starts", async function () {
      const saleStart = Math.floor(Date.now() / 1000) + 86400
      const holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        this.playingCards.address,
        saleStart,
        1,
        5,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceHalflife,
        startingPrice
      )
      const pricePerNft = await holdemHeroes.getNftPrice()
      await expectRevert(
        holdemHeroes.mintNFTPreReveal( 1, { from: accounts[1], value: pricePerNft }),
        "not started",
      )
    })

    it("cannot mintNFTPreReveal after sale finishes", async function () {
      const saleStart = Math.floor(Date.now() / 1000)
      const holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        this.playingCards.address,
        saleStart,
        1,
        5,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceHalflife,
        startingPrice
      )
      await increaseBlockTime(10)
      const pricePerNft = await holdemHeroes.getNftPrice()
      await expectRevert(
        holdemHeroes.mintNFTPreReveal( 1, { from: accounts[1], value: pricePerNft }),
        "sale ended",
      )
    })

    it("mintNFTPreReveal cannot mint more than max in one tx", async function () {
      const saleStart = Math.floor(Date.now() / 1000)
      const holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        this.playingCards.address,
        saleStart,
        100,
        5,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceHalflife,
        startingPrice
      )
      await increaseBlockTime(10)
      const pricePerNft = await holdemHeroes.getNftPrice()
      await expectRevert(
        holdemHeroes.mintNFTPreReveal( 6, { from: accounts[1], value: pricePerNft }),
        "> max per tx",
      )
    })

    it("mintNFTPreReveal cannot own more than max", async function () {
      const saleStart = Math.floor(Date.now() / 1000)
      const holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        this.playingCards.address,
        saleStart,
        100,
        5,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceHalflife,
        startingPrice
      )
      await increaseBlockTime(10)
      const numToMint = 5
      const pricePerNft = await holdemHeroes.getNftPrice()
      const cost = pricePerNft.mul(new web3.utils.BN(numToMint))
      await holdemHeroes.mintNFTPreReveal( numToMint, { from: accounts[1], value: cost })
      await expectRevert(
        holdemHeroes.mintNFTPreReveal( 1, { from: accounts[1], value: pricePerNft }),
        "mint limit reached",
      )
    })

    it("mintNFTPreReveal must send correct value", async function () {
      await mineOneBlock()
      
      const saleStart = Math.floor(Date.now() / 1000)
      const holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        this.playingCards.address,
        saleStart,
        100,
        5,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceHalflife,
        startingPrice
      )

      const pricePerNft = await holdemHeroes.getNftPrice()
      console.log("pricePerNft", pricePerNft.toString())

      await expectRevert(
        holdemHeroes.mintNFTPreReveal( 1, { from: accounts[1], value: 1 }),
        "eth value incorrect",
      )
    })

    it("cannot mintNFTPreReveal more than max supply", async function () {
      const saleStart = Math.floor(Date.now() / 1000)
      const holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        this.playingCards.address,
        saleStart,
        86400,
        1326,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceHalflife,
        startingPrice
      )
      await increaseBlockTime(10)

      const numToMint = 50

      console.log("this one will take a long time...")

      for(let i = 0; i < 26; i += 1) {
        const pricePerNft = await holdemHeroes.getNftPrice()
        const cost = pricePerNft.mul(new web3.utils.BN(numToMint))
        process.stdout.write(".")
        const m = i % accounts.length
        await holdemHeroes.mintNFTPreReveal( numToMint, { from: accounts[m], value: cost })

        // otherwise minters may run out of ETH during est
        await holdemHeroes.withdrawETH( { from: accounts[0] })
        await web3.eth.sendTransaction({to:accounts[m], from:accounts[0], value: cost})
      }
      console.log("")

      // minting 25 takes current totalSupply to 1325
      const finalMint = 25
      const pricePerNft = await holdemHeroes.getNftPrice()
      const finalCost = pricePerNft.mul(new web3.utils.BN(finalMint))
      await holdemHeroes.mintNFTPreReveal( finalMint, { from: accounts[1], value: finalCost })

      await expectRevert(
        holdemHeroes.mintNFTPreReveal( finalMint, { from: accounts[1], value: finalCost }),
        "exceeds supply",
      )

      // mint last one
      await holdemHeroes.mintNFTPreReveal( 1, { from: accounts[1], value: pricePerNft })

      await expectRevert(
        holdemHeroes.mintNFTPreReveal( 1, { from: accounts[1], value: pricePerNft }),
        "sold out",
      )
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })
})

