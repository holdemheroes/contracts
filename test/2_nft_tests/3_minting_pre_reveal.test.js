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
  const priceSpeedDenominator = 1
  const priceHalflife = 100
  const startingPrice = web3.utils.toWei("0.000000000000000001", "ether")

  describe('should succeed', function() {
    // deploy contract once before this set of tests
    before(async function () {
      const saleStartBlockNum = 0
      this.playingCards = await PlayingCards.new()
      this.holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        this.playingCards.address,
        saleStartBlockNum,
        Math.floor(Date.now() / 1000) + 1000,
        5,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceSpeedDenominator,
        priceHalflife,
        startingPrice
      )
      // await increaseBlockTime(10)
    })

    it("can mintNFTPreReveal 1 NFT", async function () {
      const minter = accounts[1]
      const numToMint = 1
      const pricePerNft = await this.holdemHeroes.getNftPrice()

      console.log("pricePerNft", pricePerNft.toString())

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

    // it("getNftPrice returns correct price per NFT", async function () {
    //
    //   await mineOneBlock()
    //
    //   const saleStartBlockNum = 0
    //   const hh = await HoldemHeroes.new(
    //     devAddresses.vor,
    //     devAddresses.xfund,
    //     this.playingCards.address,
    //     saleStartBlockNum,
    //     1000,
    //     1326,
    //     targetBlocksPerSale,
    //     saleHalflife,
    //     priceSpeed,
    //     priceSpeedDenominator,
    //     priceHalflife,
    //     startingPrice
    //   )
    //   await increaseBlockTime(10)
    //
    //   const numToMint = 1
    //   const blocksToMine = 50
    //
    //   console.log("this one will take a long time...")
    //
    //   const initialPrice = await hh.getNftPrice()
    //
    //   console.log("initialPrice", web3.utils.fromWei(initialPrice))
    //
    //   expect( initialPrice ).to.be.bignumber.eq( new BN(startingPrice) )
    //
    //   for(let i = 0; i < 1326; i += 1) {
    //     let blockNum = await web3.eth.getBlockNumber()
    //
    //     let pricePerNft = await hh.getNftPrice()
    //     console.log("token", i, "blockNum", blockNum.toString(), "price", web3.utils.fromWei(pricePerNft))
    //
    //     if(Number(web3.utils.fromWei(pricePerNft)) > 2.0) {
    //       console.log("token", i, `price > 2.0 ETH. Simulate waiting (mine ${blocksToMine} blocks)`)
    //       for(let j = 0; j < blocksToMine; j += 1) {
    //         await mineOneBlock()
    //       }
    //       blockNum = await web3.eth.getBlockNumber()
    //       pricePerNft = await hh.getNftPrice()
    //       console.log("token", i, "blockNum", blockNum.toString(), "price",web3.utils.fromWei(pricePerNft))
    //     }
    //
    //     const totalSupply = await hh.totalSupply()
    //     const cost = pricePerNft.mul(new web3.utils.BN(numToMint))
    //     // process.stdout.write(".")
    //
    //     // ToDo - implement test strategy for CRISP pricing
    //
    //     const m = i % accounts.length
    //
    //     await hh.mintNFTPreReveal( numToMint, { from: accounts[m], value: cost })
    //
    //     // otherwise minters may run out of ETH during est
    //     await hh.withdrawETH( { from: accounts[0] })
    //     await web3.eth.sendTransaction({to:accounts[m], from:accounts[0], value: cost})
    //   }
    //   console.log("")
    // })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('should fail', function() {

    before(async function () {
      this.playingCards = await PlayingCards.new()
    })

    it("cannot mintNFTPreReveal before sale starts", async function () {
      const saleStartBlockNum = 24
      const holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        this.playingCards.address,
        saleStartBlockNum,
        Math.floor(Date.now() / 1000) + 1,
        5,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceSpeedDenominator,
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
      const saleStartBlockNum = 0
      const holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        this.playingCards.address,
        saleStartBlockNum,
        Math.floor(Date.now() / 1000),
        5,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceSpeedDenominator,
        priceHalflife,
        startingPrice
      )
      await increaseBlockTime(10)
      await mineOneBlock()
      const pricePerNft = await holdemHeroes.getNftPrice()
      await expectRevert(
        holdemHeroes.mintNFTPreReveal( 1, { from: accounts[1], value: pricePerNft }),
        "ended",
      )
    })

    it("mintNFTPreReveal cannot mint more than max in one tx", async function () {
      const saleStartBlockNum = 0
      const holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        this.playingCards.address,
        saleStartBlockNum,
        Math.floor(Date.now() / 1000) + 100,
        5,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceSpeedDenominator,
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
      const saleStartBlockNum = 0
      const holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        this.playingCards.address,
        saleStartBlockNum,
        Math.floor(Date.now() / 1000) + 100,
        5,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceSpeedDenominator,
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
        "> mint limit",
      )
    })

    it("mintNFTPreReveal must send correct value", async function () {
      await mineOneBlock()

      const saleStartBlockNum = 0
      const holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        this.playingCards.address,
        saleStartBlockNum,
        Math.floor(Date.now() / 1000) + 100,
        5,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceSpeedDenominator,
        priceHalflife,
        1000
      )

      const pricePerNft = await holdemHeroes.getNftPrice()
      console.log("pricePerNft", pricePerNft.toString())

      await expectRevert(
        holdemHeroes.mintNFTPreReveal( 1, { from: accounts[1], value: 1 }),
        "eth too low",
      )
    })

    it("cannot mintNFTPreReveal more than max supply", async function () {
      const saleStartBlockNum = 0
      const holdemHeroes = await HoldemHeroes.new(
        devAddresses.vor,
        devAddresses.xfund,
        this.playingCards.address,
        saleStartBlockNum,
        Math.floor(Date.now() / 1000) + 86400,
        1326,
        targetBlocksPerSale,
        saleHalflife,
        priceSpeed,
        priceSpeedDenominator,
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
      let pricePerNft = await holdemHeroes.getNftPrice()
      let finalCost = pricePerNft.mul(new web3.utils.BN(finalMint))
      await holdemHeroes.mintNFTPreReveal( finalMint, { from: accounts[1], value: finalCost })

      pricePerNft = await holdemHeroes.getNftPrice()
      finalCost = pricePerNft.mul(new web3.utils.BN(finalMint))
      await expectRevert(
        holdemHeroes.mintNFTPreReveal( finalMint, { from: accounts[1], value: finalCost }),
        "exceeds supply",
      )

      // mint last one
      pricePerNft = await holdemHeroes.getNftPrice()
      await holdemHeroes.mintNFTPreReveal( 1, { from: accounts[1], value: pricePerNft })

      pricePerNft = await holdemHeroes.getNftPrice()
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

