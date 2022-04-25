const { expect } = require("chai")
const {
  BN, // Big Number support
  expectRevert,
  expectEvent, constants,
} = require("@openzeppelin/test-helpers")

const { devAddresses, getRanksForUpload, getHandsForUpload } = require("../helpers/test_data")
const { increaseBlockTime } = require( "../helpers/chain" )

const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const HoldemHeroes = artifacts.require("HoldemHeroesL2") // Loads a compiled contract

contract("HoldemHeroesL2 - deploy", async function(accounts) {

  const testTokenRankMap = {
    "0": "159",
    "1": "159",
    "3": "105",
    "4": "97",
    "5": "154",
    "8": "84",
    "9": "142",
    "12": "50",
    "42": "92",
    "43": "151",
    "46": "77",
    "47": "138",
    "50": "65",
    "51": "127",
    "54": "46",
    "96": "110",
    "97": "163",
    "100": "90",
    "101": "148",
    "104": "70",
    "105": "136",
    "108": "63",
    "109": "123",
    "112": "36",
    "166": "120",
    "167": "169",
    "170": "103",
    "171": "161",
    "174": "85",
    "175": "145",
    "178": "67",
    "179": "130",
    "182": "56",
    "183": "121",
    "186": "29",
    "252": "118",
    "253": "168",
    "256": "116",
    "257": "167",
    "260": "94",
    "261": "156",
    "264": "78",
    "265": "139",
    "268": "62",
    "269": "126",
    "272": "48",
    "273": "114",
    "276": "21",
    "354": "111",
    "355": "166",
    "358": "107",
    "359": "165",
    "362": "106",
    "363": "164",
    "366": "88",
    "367": "150",
    "370": "68",
    "371": "134",
    "374": "54",
    "375": "119",
    "378": "40",
    "379": "99",
    "382": "17",
    "472": "98",
    "473": "162",
    "476": "96",
    "477": "160",
    "480": "95",
    "481": "158",
    "484": "93",
    "485": "157",
    "488": "74",
    "489": "140",
    "492": "57",
    "493": "124",
    "496": "38",
    "497": "100",
    "500": "23",
    "501": "73",
    "504": "10",
    "606": "89",
    "607": "155",
    "610": "87",
    "611": "153",
    "614": "86",
    "615": "152",
    "618": "82",
    "619": "149",
    "622": "79",
    "623": "147",
    "626": "64",
    "627": "129",
    "630": "41",
    "631": "108",
    "634": "26",
    "635": "80",
    "638": "16",
    "639": "47",
    "642": "5",
    "756": "75",
    "757": "146",
    "760": "72",
    "761": "144",
    "764": "71",
    "765": "143",
    "768": "69",
    "769": "141",
    "772": "66",
    "773": "137",
    "776": "61",
    "777": "131",
    "780": "43",
    "781": "115",
    "784": "25",
    "785": "83",
    "788": "15",
    "789": "49",
    "792": "13",
    "793": "35",
    "796": "3",
    "922": "60",
    "923": "135",
    "926": "59",
    "927": "133",
    "930": "58",
    "931": "132",
    "934": "55",
    "935": "128",
    "938": "53",
    "939": "125",
    "942": "44",
    "943": "122",
    "946": "37",
    "947": "112",
    "950": "22",
    "951": "81",
    "954": "14",
    "955": "45",
    "958": "9",
    "959": "31",
    "962": "7",
    "963": "20",
    "966": "2",
    "1104": "39",
    "1105": "117",
    "1108": "33",
    "1109": "109",
    "1112": "32",
    "1113": "104",
    "1116": "28",
    "1117": "101",
    "1120": "34",
    "1121": "113",
    "1124": "30",
    "1125": "102",
    "1128": "24",
    "1129": "91",
    "1132": "19",
    "1133": "76",
    "1136": "12",
    "1137": "42",
    "1140": "8",
    "1141": "27",
    "1144": "6",
    "1145": "18",
    "1148": "4",
    "1149": "11",
    "1152": "1",
    "1302": "52",
    "1312": "51"
  }

  const postRevealRankPrices = {
    "1": "150",
    "2": "148.5",
    "3": "148.5",
    "4": "147",
    "5": "147",
    "6": "145.5",
    "7": "144",
    "8": "144",
    "9": "142.5",
    "10": "142.5",
    "11": "141",
    "12": "139.5",
    "13": "139.5",
    "14": "138",
    "15": "138",
    "16": "136.5",
    "17": "135",
    "18": "135",
    "19": "133.5",
    "20": "133.5",
    "21": "132",
    "22": "130.5",
    "23": "130.5",
    "24": "129",
    "25": "129",
    "26": "127.5",
    "27": "127.5",
    "28": "126",
    "29": "124.5",
    "30": "124.5",
    "31": "123",
    "32": "123",
    "33": "121.5",
    "34": "120",
    "35": "120",
    "36": "118.5",
    "37": "118.5",
    "38": "117",
    "39": "115.5",
    "40": "115.5",
    "41": "114",
    "42": "114",
    "43": "112.5",
    "44": "111",
    "45": "111",
    "46": "109.5",
    "47": "109.5",
    "48": "108",
    "49": "108",
    "50": "106.5",
    "51": "105",
    "52": "105",
    "53": "103.5",
    "54": "103.5",
    "55": "102",
    "56": "100.5",
    "57": "100.5",
    "58": "99",
    "59": "99",
    "60": "97.5",
    "61": "96",
    "62": "96",
    "63": "94.5",
    "64": "94.5",
    "65": "93",
    "66": "91.5",
    "67": "91.5",
    "68": "90",
    "69": "90",
    "70": "88.5",
    "71": "87",
    "72": "87",
    "73": "85.5",
    "74": "85.5",
    "75": "84",
    "76": "84",
    "77": "82.5",
    "78": "81",
    "79": "81",
    "80": "79.5",
    "81": "79.5",
    "82": "78",
    "83": "76.5",
    "84": "76.5",
    "85": "75",
    "86": "75",
    "87": "73.5",
    "88": "72",
    "89": "72",
    "90": "70.5",
    "91": "70.5",
    "92": "69",
    "93": "67.5",
    "94": "67.5",
    "95": "66",
    "96": "66",
    "97": "64.5",
    "98": "64.5",
    "99": "63",
    "100": "61.5",
    "101": "61.5",
    "102": "60",
    "103": "60",
    "104": "58.5",
    "105": "57",
    "106": "57",
    "107": "55.5",
    "108": "55.5",
    "109": "54",
    "110": "52.5",
    "111": "52.5",
    "112": "51",
    "113": "51",
    "114": "49.5",
    "115": "48",
    "116": "48",
    "117": "46.5",
    "118": "46.5",
    "119": "45",
    "120": "43.5",
    "121": "43.5",
    "122": "42",
    "123": "42",
    "124": "40.5",
    "125": "40.5",
    "126": "39",
    "127": "37.5",
    "128": "37.5",
    "129": "36",
    "130": "36",
    "131": "34.5",
    "132": "33",
    "133": "33",
    "134": "31.5",
    "135": "31.5",
    "136": "30",
    "137": "28.5",
    "138": "28.5",
    "139": "27",
    "140": "27",
    "141": "25.5",
    "142": "24",
    "143": "24",
    "144": "22.5",
    "145": "22.5",
    "146": "21",
    "147": "21",
    "148": "19.5",
    "149": "18",
    "150": "18",
    "151": "16.5",
    "152": "16.5",
    "153": "15",
    "154": "15",
    "155": "15",
    "156": "15",
    "157": "15",
    "158": "15",
    "159": "15",
    "160": "15",
    "161": "15",
    "162": "15",
    "163": "15",
    "164": "15",
    "165": "15",
    "166": "15",
    "167": "15",
    "168": "15",
    "169": "15"

  }

  // deploy contract once before this set of tests
  before(async function () {

    // make sure account[0] has enough to mint
    await web3.eth.sendTransaction({to:accounts[0], from:accounts[1], value: web3.utils.toWei('99')})
    await web3.eth.sendTransaction({to:accounts[0], from:accounts[2], value: web3.utils.toWei('99')})

    this.playingCards = await PlayingCards.new()
    this.holdemHeroes = await HoldemHeroes.new(24, accounts[9], 696969, this.playingCards.address)
    await increaseBlockTime(10)

    const rankData = getRanksForUpload()
    await this.holdemHeroes.uploadHandRanks(rankData.rankHashes, rankData.ranks)
    const hands = getHandsForUpload()
    await increaseBlockTime(10)
    console.log(`reveal ${hands.length} hand batches`)
    for( let i = 0; i < hands.length; i += 1) {
      await this.holdemHeroes.reveal(hands[i], i, "")
      process.stdout.write(`.${i+1}`)
    }
    console.log(".")
  })

  describe('minting & admin', function() {

    const minter = accounts[0]

    it( "can mint and pay for a token", async function () {
      const tokenId = 24
      const price = await this.holdemHeroes.getPostRevealNftPrice(tokenId)
      const receipt = await this.holdemHeroes.mintNFTPostReveal( tokenId, { from: minter, value: price } )
      expectEvent( receipt, "Transfer", {
        from: constants.ZERO_ADDRESS,
        to: minter,
        tokenId: new BN( tokenId ),
      } )
      const nftOwner = await this.holdemHeroes.ownerOf( tokenId )
      expect( nftOwner ).to.be.eq( minter )
    })

    it( "contract has balance", async function () {
      const tokenId = 24
      const price = await this.holdemHeroes.getPostRevealNftPrice(tokenId)

      const balance = await web3.eth.getBalance(this.holdemHeroes.address)
      expect(balance).to.be.bignumber.eq(price)
    })

    it( "only owner can withdraw", async function () {
      await expectRevert(
        this.holdemHeroes.withdrawETH({ from: accounts[1]}),
        "Ownable: caller is not the owner",
      )
    })

    it( "owner can withdraw", async function () {
      const tokenId = 24
      const price = await this.holdemHeroes.getPostRevealNftPrice(tokenId)

      const hehBalBefore = await web3.eth.getBalance(this.holdemHeroes.address)
      expect(hehBalBefore).to.be.bignumber.eq(price)

      const before = await web3.eth.getBalance(accounts[0])

      const receipt = await this.holdemHeroes.withdrawETH()

      expect(receipt.receipt.status).to.be.eq(true)

      const after = await web3.eth.getBalance(accounts[0])

      expect( after ).to.be.bignumber.gt( before )

      const hehBalAfter = await web3.eth.getBalance(this.holdemHeroes.address)

      expect( hehBalAfter ).to.be.bignumber.eq( new BN(0) )
    })

    it( "must getPostRevealNftPrice with a valid tokenId", async function () {
      await expectRevert(
        this.holdemHeroes.getPostRevealNftPrice( 1326 ),
        "invalid id",
      )
    } )

    it( "must mintNFTPostReveal with a valid tokenId", async function () {
      await expectRevert(
        this.holdemHeroes.mintNFTPostReveal( 1326, { from: accounts[1], value: new BN("150000000000000000000") } ),
        "invalid id",
      )
    } )

    it( "must mintNFTPostReveal with a valid price", async function () {
      await expectRevert(
        this.holdemHeroes.mintNFTPostReveal( 1, { from: accounts[1], value: 100 } ),
        "eth too low",
      )
    } )

    it( "must mintNFTPostReveal available tokenId", async function () {

      const tokenIdToMint = 24
      const pricePerNft = await this.holdemHeroes.getPostRevealNftPrice(tokenIdToMint)
      await expectRevert(
        this.holdemHeroes.mintNFTPostReveal( tokenIdToMint, { from: accounts[2], value: pricePerNft } ),
        "ERC721: token already minted",
      )
    } )

    for (const [tokenId, rank] of Object.entries(testTokenRankMap)) {
      const priceEth = postRevealRankPrices[rank]
      const expectedPrice = web3.utils.toWei(priceEth)
      it( `token #${tokenId} rank ${rank} getPostRevealNftPrice returns ${priceEth}`, async function () {
        const price = await this.holdemHeroes.getPostRevealNftPrice(tokenId)
        expect(price).to.be.bignumber.eq(new BN(expectedPrice))
      })

      it( `can mint #${tokenId} with price ${priceEth}`, async function () {
        const price = await this.holdemHeroes.getPostRevealNftPrice(tokenId)
        const receipt = await this.holdemHeroes.mintNFTPostReveal( tokenId, { from: minter, value: price } )
        expectEvent( receipt, "Transfer", {
          from: constants.ZERO_ADDRESS,
          to: minter,
          tokenId: new BN( tokenId ),
        } )
        const nftOwner = await this.holdemHeroes.ownerOf( tokenId )
        expect( nftOwner ).to.be.eq( minter )

        // withdraw
        await this.holdemHeroes.withdrawETH()
      })
    }

    it("can setBasePostRevealPrice", async function () {
      const basePriceBefore = await this.holdemHeroes.basePostRevealPrice()
      expect(basePriceBefore).to.be.bignumber.eq(new BN("150000000000000000000"))
      await this.holdemHeroes.setBasePostRevealPrice("24000000000000000000")
      const basePrice = await this.holdemHeroes.basePostRevealPrice()
      expect(basePrice).to.be.bignumber.eq(new BN("24000000000000000000"))

      const price = await this.holdemHeroes.getPostRevealNftPrice(24)
      expect(price).to.be.bignumber.eq(new BN("17040000000000000000"))
    })

    it("only owner can setBasePostRevealPrice", async function () {
      await expectRevert(
        this.holdemHeroes.setBasePostRevealPrice("1000000000000000000", { from: accounts[1] }),
        "Ownable: caller is not the owner",
      )
    })

    it("...", async function () {
      expect(true).to.equal(true)
    })
  })
})

