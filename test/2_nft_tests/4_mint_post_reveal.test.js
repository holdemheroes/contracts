const { expect } = require("chai")
const {
  BN, // Big Number support
  expectRevert,
  expectEvent,
  constants,
} = require("@openzeppelin/test-helpers")

const { devAddresses, getRanksForUpload, getHandsForUpload } = require( "../helpers/test_data" )
const { increaseBlockTime } = require("../helpers/chain")
const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract
const HoldemHeroes = artifacts.require("HoldemHeroesTestableDistribution") // Loads a compiled contract

contract("HoldemHeroes - post reveal mint", async function(accounts) {

  const targetBlocksPerSale = 5
  const saleHalflife = 700
  const priceSpeed = 1
  const priceSpeedDenominator = 1
  const priceHalflife = 100
  const startingPrice = web3.utils.toWei("0.00001", "ether")

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
    "1": "1",
    "2": "0.99",
    "3": "0.99",
    "4": "0.98",
    "5": "0.98",
    "6": "0.97",
    "7": "0.96",
    "8": "0.96",
    "9": "0.95",
    "10": "0.95",
    "11": "0.94",
    "12": "0.93",
    "13": "0.93",
    "14": "0.92",
    "15": "0.92",
    "16": "0.91",
    "17": "0.9",
    "18": "0.9",
    "19": "0.89",
    "20": "0.89",
    "21": "0.88",
    "22": "0.87",
    "23": "0.87",
    "24": "0.86",
    "25": "0.86",
    "26": "0.85",
    "27": "0.85",
    "28": "0.84",
    "29": "0.83",
    "30": "0.83",
    "31": "0.82",
    "32": "0.82",
    "33": "0.81",
    "34": "0.8",
    "35": "0.8",
    "36": "0.79",
    "37": "0.79",
    "38": "0.78",
    "39": "0.77",
    "40": "0.77",
    "41": "0.76",
    "42": "0.76",
    "43": "0.75",
    "44": "0.74",
    "45": "0.74",
    "46": "0.73",
    "47": "0.73",
    "48": "0.72",
    "49": "0.72",
    "50": "0.71",
    "51": "0.7",
    "52": "0.7",
    "53": "0.69",
    "54": "0.69",
    "55": "0.68",
    "56": "0.67",
    "57": "0.67",
    "58": "0.66",
    "59": "0.66",
    "60": "0.65",
    "61": "0.64",
    "62": "0.64",
    "63": "0.63",
    "64": "0.63",
    "65": "0.62",
    "66": "0.61",
    "67": "0.61",
    "68": "0.6",
    "69": "0.6",
    "70": "0.59",
    "71": "0.58",
    "72": "0.58",
    "73": "0.57",
    "74": "0.57",
    "75": "0.56",
    "76": "0.56",
    "77": "0.55",
    "78": "0.54",
    "79": "0.54",
    "80": "0.53",
    "81": "0.53",
    "82": "0.52",
    "83": "0.51",
    "84": "0.51",
    "85": "0.5",
    "86": "0.5",
    "87": "0.49",
    "88": "0.48",
    "89": "0.48",
    "90": "0.47",
    "91": "0.47",
    "92": "0.46",
    "93": "0.45",
    "94": "0.45",
    "95": "0.44",
    "96": "0.44",
    "97": "0.43",
    "98": "0.43",
    "99": "0.42",
    "100": "0.41",
    "101": "0.41",
    "102": "0.4",
    "103": "0.4",
    "104": "0.39",
    "105": "0.38",
    "106": "0.38",
    "107": "0.37",
    "108": "0.37",
    "109": "0.36",
    "110": "0.35",
    "111": "0.35",
    "112": "0.34",
    "113": "0.34",
    "114": "0.33",
    "115": "0.32",
    "116": "0.32",
    "117": "0.31",
    "118": "0.31",
    "119": "0.3",
    "120": "0.29",
    "121": "0.29",
    "122": "0.28",
    "123": "0.28",
    "124": "0.27",
    "125": "0.27",
    "126": "0.26",
    "127": "0.25",
    "128": "0.25",
    "129": "0.24",
    "130": "0.24",
    "131": "0.23",
    "132": "0.22",
    "133": "0.22",
    "134": "0.21",
    "135": "0.21",
    "136": "0.2",
    "137": "0.19",
    "138": "0.19",
    "139": "0.18",
    "140": "0.18",
    "141": "0.17",
    "142": "0.16",
    "143": "0.16",
    "144": "0.15",
    "145": "0.15",
    "146": "0.14",
    "147": "0.14",
    "148": "0.13",
    "149": "0.12",
    "150": "0.12",
    "151": "0.11",
    "152": "0.11",
    "153": "0.1",
    "154": "0.1",
    "155": "0.1",
    "156": "0.1",
    "157": "0.1",
    "158": "0.1",
    "159": "0.1",
    "160": "0.1",
    "161": "0.1",
    "162": "0.1",
    "163": "0.1",
    "164": "0.1",
    "165": "0.1",
    "166": "0.1",
    "167": "0.1",
    "168": "0.1",
    "169": "0.1"
  }

  // deploy contract once before this set of tests
  before(async function () {
    const saleStartBlockNum = 0
    this.playingCards = await PlayingCards.new()
    this.holdemHeroes = await HoldemHeroes.new(
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

  describe("post reveal minting", function() {

    it( "cannot getPostRevealNftPrice if not revealed yet", async function () {
      const saleStartBlockNum = 0
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
      await expectRevert(
        holdemHeroes.getPostRevealNftPrice( 1 ),
        "not distributed",
      )

    } )

    it( "cannot mintNFTPostReveal if not revealed yet", async function () {
      const saleStartBlockNum = 0
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

      await expectRevert(
        holdemHeroes.mintNFTPostReveal( 1, { from: accounts[1], value: 1000 } ),
        "not distributed",
      )
    } )

    it( "cannot getPostRevealNftPrice if not distributed yet", async function () {
      await expectRevert(
        this.holdemHeroes.getPostRevealNftPrice( 1 ),
        "not distributed",
      )
    } )

    it( "cannot mintNFTPostReveal if not distributed yet", async function () {
      await expectRevert(
        this.holdemHeroes.mintNFTPostReveal( 1, { from: accounts[1], value: 1000 } ),
        "not distributed",
      )
    } )

    it( "can mintNFTPostReveal when revealed and distributed", async function () {
      const minter = accounts[1]
      const tokenIdToMint = 0

      await this.holdemHeroes.beginDistributionTestable( 24 )

      const pricePerNft = await this.holdemHeroes.getPostRevealNftPrice(tokenIdToMint)

      const receipt = await this.holdemHeroes.mintNFTPostReveal( tokenIdToMint, { from: minter, value: pricePerNft } )
      expectEvent( receipt, "Transfer", {
        from: constants.ZERO_ADDRESS,
        to: minter,
        tokenId: new BN( tokenIdToMint ),
      } )
      const nftOwner = await this.holdemHeroes.ownerOf( tokenIdToMint )
      expect( nftOwner ).to.be.eq( minter )
    } )

    it( "must getPostRevealNftPrice with a valid tokenId", async function () {
      await expectRevert(
        this.holdemHeroes.getPostRevealNftPrice( 1326 ),
        "invalid id",
      )
    } )

    it( "must mintNFTPostReveal with a valid tokenId", async function () {
      await expectRevert(
        this.holdemHeroes.mintNFTPostReveal( 1326, { from: accounts[1], value: 1000000 } ),
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

      const tokenIdToMint = 5
      const pricePerNft = await this.holdemHeroes.getPostRevealNftPrice(tokenIdToMint)

      await this.holdemHeroes.mintNFTPostReveal( tokenIdToMint, { from: accounts[1], value: pricePerNft } )

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
    }

    it( "...", async function () {
      expect( true ).to.equal( true )
    } )
  })
})

