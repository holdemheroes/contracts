const { expect } = require("chai")
const {
  BN, // Big Number support
  expectRevert,
  expectEvent, constants,
} = require("@openzeppelin/test-helpers")

const { devAddresses } = require("../helpers/test_data")

const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const HoldemHeroes = artifacts.require("HoldemHeroesL2") // Loads a compiled contract

contract("HoldemHeroesL2 - deploy", async function(accounts) {

  const tokenIds = [0, 1, 2]
  const owners = [accounts[1], accounts[1], accounts[2]]

  describe('should succeed', function() {
    it("can deploy with params", async function () {
      this.playingCards = await PlayingCards.new()
      // just pass any address
      this.holdemHeroes = await HoldemHeroes.new(24, accounts[9], 696969, this.playingCards.address)
      expect(this.holdemHeroes.address).to.not.be.eq("0x0000000000000000000000000000000000000000")
    })

    it("can airdrop", async function () {
      const receipt = await this.holdemHeroes.airdrop(tokenIds, owners, { from: accounts[0]})

      for(let i = 0; i < tokenIds.length; i += 1) {
        expectEvent( receipt, "Transfer", {
          from: constants.ZERO_ADDRESS,
          to: owners[i],
          tokenId: new BN( tokenIds[i] ),
        } )
      }
    })

    it("cannot airdrop tokens more than once", async function () {
      await expectRevert(
        this.holdemHeroes.airdrop(tokenIds, owners, { from: accounts[0] }),
        "ERC721: token already minted",
      )
    })

    it("cannot airdrop invalid token IDs", async function () {
      await expectRevert(
        this.holdemHeroes.airdrop([2000], [accounts[3]], { from: accounts[0] }),
        "invalid tokenId",
      )
    })

    it("cannot airdrop zero address", async function () {
      await expectRevert(
        this.holdemHeroes.airdrop([123], [constants.ZERO_ADDRESS], { from: accounts[0] }),
        "invalid owner",
      )
    })

    it("only owner can airdrop", async function () {
      await expectRevert(
        this.holdemHeroes.airdrop([3, 4], [accounts[3], accounts[4]], { from: accounts[3] }),
        "Ownable: caller is not the owner",
      )
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })
})

