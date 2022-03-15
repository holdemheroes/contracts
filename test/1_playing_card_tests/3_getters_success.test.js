const { expect } = require("chai")

const {
  BN, // Big Number support
} = require("@openzeppelin/test-helpers")

const { provenance, getCardSvg } = require( "../helpers/test_data" )

const PlayingCards = artifacts.require("PlayingCards") // Loads a compiled contract

contract("PlayingCards - getters should succeed", async function(accounts) {

  // deploy contract once before this set of tests
  before(async function () {
    this.playingCards = await PlayingCards.new()
  })

  describe("card getters - should succeed", function() {

    //getCardNumberAsUint
    it( "can getCardNumberAsUint", async function () {
      for(let i = 0; i < 52; i += 1) {
        const chainC = await this.playingCards.getCardNumberAsUint(i)
        expect(chainC).to.be.bignumber.eq(new BN(provenance.cards.cards_as_idxs[i].n))
      }
    })

    //getCardSuitAsUint
    it( "can getCardSuitAsUint", async function () {
      for(let i = 0; i < 52; i += 1) {
        const chainC = await this.playingCards.getCardSuitAsUint(i)
        expect(chainC).to.be.bignumber.eq(new BN(provenance.cards.cards_as_idxs[i].s))
      }
    })

    //getCardNumberAsStr
    it( "can getCardNumberAsStr", async function () {
      for(let i = 0; i < 52; i += 1) {
        const chainC = await this.playingCards.getCardNumberAsStr(i)
        expect(chainC).to.be.equal(provenance.cards.numbers[provenance.cards.cards_as_idxs[i].n])
      }
    })

    //getCardSuitAsStr
    it( "can getCardSuitAsStr", async function () {
      for(let i = 0; i < 52; i += 1) {
        const chainC = await this.playingCards.getCardSuitAsStr(i)
        expect(chainC).to.be.equal(provenance.cards.suits[provenance.cards.cards_as_idxs[i].s])
      }
    })


    //getSuitPath
    it( "can getSuitPath", async function () {
      const club = '<path d="M30 150c5 235 55 250 100 350h-260c45-100 95-115 100-350a10 10 0 0 0-20 0 210 210 0 1 1-74-201 10 10 0 0 0 14-14 230 230 0 1 1 220 0 10 10 0 0 0 14 14 210 210 0 1 1-74 201 10 10 0 0 0-20 0Z" fill="#000"/>';
      const chainClub = await this.playingCards.getSuitPath(0)
      expect(chainClub).to.be.equal(club)

      const diamond = '<path d="M-400 0C-350 0 0-450 0-500 0-450 350 0 400 0 350 0 0 450 0 500 0 450-350 0-400 0Z" fill="red"/>';
      const chainDiamond = await this.playingCards.getSuitPath(1)
      expect(chainDiamond).to.be.equal(diamond)

      const heart = '<path d="M0-300c0-100 100-200 200-200s200 100 200 250C400 0 0 400 0 500 0 400-400 0-400-250c0-150 100-250 200-250S0-400 0-300Z" fill="red"/>';
      const chainHeart = await this.playingCards.getSuitPath(2)
      expect(chainHeart).to.be.equal(heart)

      const spade = '<path d="M0-500c100 250 355 400 355 685a150 150 0 0 1-300 0 10 10 0 0 0-20 0c0 200 50 215 95 315h-260c45-100 95-115 95-315a10 10 0 0 0-20 0 150 150 0 0 1-300 0c0-285 255-435 355-685Z" fill="#000"/>';
      const chainSpade = await this.playingCards.getSuitPath(3)
      expect(chainSpade).to.be.equal(spade)
    })

    //getNumberPath
    it( "can getNumberPath", async function () {

      const n2 = '<path d="M-225-225c-20-40 25-235 225-235s225 135 225 235c0 200-450 385-450 685h450V300" stroke-width="80" stroke-linecap="square" stroke-miterlimit="1.5" fill="none"/>'
      const chainn2 = await this.playingCards.getNumberPath(0)
      expect(chainn2).to.be.equal(n2)

      const n3 = '<path d="M-250-320v-140h450L-110-80c10-10 60-40 110-40 200 0 250 120 250 270 0 200-80 310-280 310s-230-160-230-160" stroke-width="80" stroke-linecap="square" stroke-miterlimit="1.5" fill="none"/>'
      const chainn3 = await this.playingCards.getNumberPath(1)
      expect(chainn3).to.be.equal(n3)

      const n4 = '<path d="M50 460h200m-100 0v-920l-450 635v25h570" stroke-width="80" stroke-linecap="square" stroke-miterlimit="1.5" fill="none"/>'
      const chainn4 = await this.playingCards.getNumberPath(2)
      expect(chainn4).to.be.equal(n4)

      const n5 = '<path d="M170-460h-345l-35 345s10-85 210-85c100 0 255 120 255 320S180 460-20 460s-235-175-235-175" stroke-width="80" stroke-linecap="square" stroke-miterlimit="1.5" fill="none"/>'
      const chainn5 = await this.playingCards.getNumberPath(3)
      expect(chainn5).to.be.equal(n5)

      const n6 = '<path d="M-250 100a250 250 0 0 1 500 0v110a250 250 0 0 1-500 0v-420A250 250 0 0 1 0-460c150 0 180 60 200 85" stroke-width="80" stroke-linecap="square" stroke-miterlimit="1.5" fill="none"/>'
      const chainn6 = await this.playingCards.getNumberPath(4)
      expect(chainn6).to.be.equal(n6)

      const n7 = '<path d="M-265-320v-140h530C135-200-90 100-90 460" stroke-width="80" stroke-linecap="square" stroke-miterlimit="1.5" fill="none"/>'
      const chainn7 = await this.playingCards.getNumberPath(5)
      expect(chainn7).to.be.equal(n7)

      const n8 = '<path d="M-1-50a205 205 0 1 1 2 0h-2a255 255 0 1 0 2 0Z" stroke-width="80" stroke-linecap="square" stroke-miterlimit="1.5" fill="none"/>'
      const chainn8 = await this.playingCards.getNumberPath(6)
      expect(chainn8).to.be.equal(n8)

      const n9 = '<path d="M250-100a250 250 0 0 1-500 0v-110a250 250 0 0 1 500 0v420A250 250 0 0 1 0 460c-150 0-180-60-200-85" stroke-width="80" stroke-linecap="square" stroke-miterlimit="1.5" fill="none"/>'
      const chainn9 = await this.playingCards.getNumberPath(7)
      expect(chainn9).to.be.equal(n9)

      const n10 = '<path d="M-260 430v-860M-50 0v-310a150 150 0 0 1 300 0v620a150 150 0 0 1-300 0Z" stroke-width="80" stroke-linecap="square" stroke-miterlimit="1.5" fill="none"/>'
      const chainn10 = await this.playingCards.getNumberPath(8)
      expect(chainn10).to.be.equal(n10)

      const nj = '<path d="M50-460h200m-100 0v710a100 100 0 0 1-400 0v-30" stroke-width="80" stroke-linecap="square" stroke-miterlimit="1.5" fill="none"/>'
      const chainnj = await this.playingCards.getNumberPath(9)
      expect(chainnj).to.be.equal(nj)

      const nq = '<path d="M-260 100c300 0 220 360 520 360M-175 0v-285a175 175 0 0 1 350 0v570a175 175 0 0 1-350 0Z" stroke-width="80" stroke-linecap="square" stroke-miterlimit="1.5" fill="none"/>'
      const chainnq = await this.playingCards.getNumberPath(10)
      expect(chainnq).to.be.equal(nq)

      const nk = '<path d="M-285-460h200m-100 0v920m-100 0h200M85-460h200m-100 20-355 595M85 460h200m-100-20L-10-70" stroke-width="80" stroke-linecap="square" stroke-miterlimit="1.5" fill="none"/>'
      const chainnk = await this.playingCards.getNumberPath(11)
      expect(chainnk).to.be.equal(nk)

      const na = '<path d="M-270 460h160m-90-10L0-460l200 910m-90 10h160m-390-330h240" stroke-width="80" stroke-linecap="square" stroke-miterlimit="1.5" fill="none"/>'
      const chainna = await this.playingCards.getNumberPath(12)
      expect(chainna).to.be.equal(na)

    })

    it( "can getCardAsString", async function () {
      for(let i = 0; i < 52; i += 1) {
        const provC = `${provenance.cards.numbers[provenance.cards.cards_as_idxs[i].n]}${provenance.cards.suits[provenance.cards.cards_as_idxs[i].s]}`
        const chainC = await this.playingCards.getCardAsString(i)
        expect(chainC).to.be.equal(provC)
      }
    })

    // getCardBody is also covered in getCardAsSvg
    it( "can getCardAsSvg", async function () {
      for(let i = 0; i < 52; i += 1) {
        const svg = getCardSvg(i)
        const c = await this.playingCards.getCardAsSvg(i)
        expect(c).to.be.equal(svg)
      }
    })

    it( "can getCardAsComponents", async function () {
      for(let i = 0; i < 52; i += 1) {
        const res = await this.playingCards.getCardAsComponents(i)
        expect(res.number.toNumber()).to.be.equal(provenance.cards.cards_as_idxs[i].n)
        expect(res.suit.toNumber()).to.be.equal(provenance.cards.cards_as_idxs[i].s)
      }
    })

    it( "...", async function () {
      expect( true ).to.equal( true )
    } )
  })
})

