const { expect } = require("chai")
const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers")

const { devAddresses, vorDevConfig } = require("../helpers/test_data")

const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const HoldemHeroes = artifacts.require("HoldemHeroes") // Loads a compiled contract
const TexasHoldemV1 = artifacts.require("TexasHoldemV1")
const PokerHandEvaluator = artifacts.require("PokerHandEvaluator") // Loads a compiled contract
const xFUND = artifacts.require("MockERC20")

contract("TexasHoldemV1 - admin", async function(accounts) {
  const pheSubFee = 1

  const targetBlocksPerSale = 5
  const saleHalflife = 700
  const priceSpeed = 1
  const priceHalflife = 100
  const startingPrice = web3.utils.toWei("0.22", "ether")

  before(async function () {
    const saleStart = Math.floor(Date.now() / 1000)
    this.xFUND = await xFUND.new() // for testing increaseVorCoordinatorAllowance
    this.playingCards = await PlayingCards.new()
    this.holdemHeroes = await HoldemHeroes.new(
      devAddresses.vor,
      this.xFUND.address,
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
    this.pokerHandEvaluator = await PokerHandEvaluator.new(pheSubFee)
    this.texasHoldem = await TexasHoldemV1.new(
      this.xFUND.address,
      devAddresses.vor,
      this.holdemHeroes.address,
      this.pokerHandEvaluator.address,
      5,
      3600,
      vorDevConfig.vor_key_hash,
      vorDevConfig.vor_fee)

  })

  describe('should succeed', function() {
    it("owner can setMaxConcurrentGames", async function () {
      const receipt = await this.texasHoldem.setMaxConcurrentGames(3, {from: accounts[0]})

      expectEvent(receipt, "MaxConcurrentGamesSet", {
        setBy: accounts[0],
        oldValue: new BN(5),
        newValue: new BN(3),
      })

      const val = await this.texasHoldem.maxConcurrentGames()

      expect(val).to.be.bignumber.eq(new BN(3))
    })

    it("owner can setVorKeyHash", async function () {
      const receipt = await this.texasHoldem.setVorKeyHash("0x1234000000000000000000000000000000000000000000000000000000000000", {from: accounts[0]})

      expectEvent(receipt, "VorKeyHashSet", {
        setBy: accounts[0],
        oldValue: vorDevConfig.vor_key_hash,
        newValue: "0x1234000000000000000000000000000000000000000000000000000000000000",
      })
    })

    it("owner can setVorFee", async function () {
      const receipt = await this.texasHoldem.setVorFee(300000, {from: accounts[0]})

      expectEvent(receipt, "VorFeeSet", {
        setBy: accounts[0],
        oldValue: new BN(vorDevConfig.vor_fee),
        newValue: new BN(300000),
      })
    })

    it("owner can setVorCoordinator", async function () {
      const receipt = await this.texasHoldem.setVorCoordinator(accounts[1], {from: accounts[0]})

      expectEvent(receipt, "VorCoordinatorSet", {
        setBy: accounts[0],
        oldValue: devAddresses.vor,
        newValue: accounts[1],
      })
    })

    it("owner can setHandEvaluator", async function () {
      const receipt = await this.texasHoldem.setHandEvaluator(accounts[1], {from: accounts[0]})

      expectEvent(receipt, "HandEvaluatorSet", {
        setBy: accounts[0],
        oldValue: this.pokerHandEvaluator.address,
        newValue: accounts[1],
      })
    })

    it("owner can increaseVorCoordinatorAllowance", async function () {
      const receipt = await this.texasHoldem.increaseVorCoordinatorAllowance(300000, {from: accounts[0]})
      expect(receipt.receipt.status).to.be.eq(true)
    })

    it("owner can withdraw xFUND", async function() {
      const amount = "10000000000"
      await this.xFUND.transfer(this.texasHoldem.address, amount)

      const thBalanceBefore = await this.xFUND.balanceOf(this.texasHoldem.address)
      expect(thBalanceBefore).to.be.bignumber.eq(new BN(amount))
      const adminBalanceBefore = await this.xFUND.balanceOf(accounts[0])
      await this.texasHoldem.withdrawXfund({from: accounts[0]})

      const thBalanceAfter = await this.xFUND.balanceOf(this.texasHoldem.address)
      expect(thBalanceAfter).to.be.bignumber.eq(new BN(0))
      const adminBalanceAfter = await this.xFUND.balanceOf(accounts[0])
      expect(adminBalanceAfter).to.be.bignumber.eq(adminBalanceBefore.add(new BN(amount)))
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })

  describe('should fail', function() {

    it("only owner can setMaxConcurrentGames", async function () {
      await expectRevert(
        this.texasHoldem.setMaxConcurrentGames(3, { from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
    })

    it("cannot setMaxConcurrentGames with zero", async function () {
      await expectRevert(
        this.texasHoldem.setMaxConcurrentGames(0, { from: accounts[0] }),
        "cannot have 0 maxConcurrentGames",
      )
    })

    it("only owner can setVorKeyHash", async function () {
      await expectRevert(
        this.texasHoldem.setVorKeyHash("0x1234", { from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
    })

    it("only owner can setVorFee", async function () {
      await expectRevert(
        this.texasHoldem.setVorFee(1, { from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
    })

    it("only owner can setVorCoordinator", async function () {
      await expectRevert(
        this.texasHoldem.setVorCoordinator(accounts[2], { from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
    })

    it("only owner can setHandEvaluator", async function () {
      await expectRevert(
        this.texasHoldem.setHandEvaluator(accounts[2], { from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
    })

    it("only owner can increaseVorCoordinatorAllowance", async function () {
      await expectRevert(
        this.texasHoldem.increaseVorCoordinatorAllowance(3, { from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
    })

    it("only owner can withdrawXfund", async function () {
      await expectRevert(
        this.texasHoldem.withdrawXfund({ from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })
})

