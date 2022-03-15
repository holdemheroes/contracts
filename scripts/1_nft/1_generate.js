const fs = require("fs")
const path = require("path")
const Web3 = require('web3')
const { MerkleTree } = require("merkletreejs")
const keccak256 = require("keccak256")
const utils = require("../utils/utils")
const createCsvWriter = require("csv-writer").createObjectCsvWriter
const args = require("args")
const netConf = require("../../config.json")

args
  .option("network", "The network to generate for")
  .option("shuffle", "Pre shuffle hands?", 1)
  .option("num", "number of shuffles", 10)

const flags = args.parse(process.argv)

const validNetworks = [
  "vordev", "development", "develop", "rinkeby", "mainnet"
]

if (!flags.network) {
  console.log(`--network flag required. Must be one of: ${validNetworks.join(", ")}`)
  process.exit(1)
}

if(!validNetworks.includes(flags.network)) {
  console.log(`Invalid network. Must be one of: ${validNetworks.join(", ")}`)
  process.exit(1)
}

let web3 = new Web3("ws://localhost:8546")

const ranks = {
  "AA": 1,
  "KK": 2,
  "QQ": 3,
  "AKs": 4,
  "JJ": 5,
  "AQs": 6,
  "KQs": 7,
  "AJs": 8,
  "KJs": 9,
  "TT": 10,
  "AKo": 11,
  "ATs": 12,
  "QJs": 13,
  "KTs": 14,
  "QTs": 15,
  "JTs": 16,
  "99": 17,
  "AQo": 18,
  "A9s": 19,
  "KQo": 20,
  "88": 21,
  "K9s": 22,
  "T9s": 23,
  "A8s": 24,
  "Q9s": 25,
  "J9s": 26,
  "AJo": 27,
  "A5s": 28,
  "77": 29,
  "A7s": 30,
  "KJo": 31,
  "A4s": 32,
  "A3s": 33,
  "A6s": 34,
  "QJo": 35,
  "66": 36,
  "K8s": 37,
  "T8s": 38,
  "A2s": 39,
  "98s": 40,
  "J8s": 41,
  "ATo": 42,
  "Q8s": 43,
  "K7s": 44,
  "KTo": 45,
  "55": 46,
  "JTo": 47,
  "87s": 48,
  "QTo": 49,
  "44": 50,
  "33": 51,
  "22": 52,
  "K6s": 53,
  "97s": 54,
  "K5s": 55,
  "76s": 56,
  "T7s": 57,
  "K4s": 58,
  "K3s": 59,
  "K2s": 60,
  "Q7s": 61,
  "86s": 62,
  "65s": 63,
  "J7s": 64,
  "54s": 65,
  "Q6s": 66,
  "75s": 67,
  "96s": 68,
  "Q5s": 69,
  "64s": 70,
  "Q4s": 71,
  "Q3s": 72,
  "T9o": 73,
  "T6s": 74,
  "Q2s": 75,
  "A9o": 76,
  "53s": 77,
  "85s": 78,
  "J6s": 79,
  "J9o": 80,
  "K9o": 81,
  "J5s": 82,
  "Q9o": 83,
  "43s": 84,
  "74s": 85,
  "J4s": 86,
  "J3s": 87,
  "95s": 88,
  "J2s": 89,
  "63s": 90,
  "A8o": 91,
  "52s": 92,
  "T5s": 93,
  "84s": 94,
  "T4s": 95,
  "T3s": 96,
  "42s": 97,
  "T2s": 98,
  "98o": 99,
  "T8o": 100,
  "A5o": 101,
  "A7o": 102,
  "73s": 103,
  "A4o": 104,
  "32s": 105,
  "94s": 106,
  "93s": 107,
  "J8o": 108,
  "A3o": 109,
  "62s": 110,
  "92s": 111,
  "K8o": 112,
  "A6o": 113,
  "87o": 114,
  "Q8o": 115,
  "83s": 116,
  "A2o": 117,
  "82s": 118,
  "97o": 119,
  "72s": 120,
  "76o": 121,
  "K7o": 122,
  "65o": 123,
  "T7o": 124,
  "K6o": 125,
  "86o": 126,
  "54o": 127,
  "K5o": 128,
  "J7o": 129,
  "75o": 130,
  "Q7o": 131,
  "K4o": 132,
  "K3o": 133,
  "96o": 134,
  "K2o": 135,
  "64o": 136,
  "Q6o": 137,
  "53o": 138,
  "85o": 139,
  "T6o": 140,
  "Q5o": 141,
  "43o": 142,
  "Q4o": 143,
  "Q3o": 144,
  "74o": 145,
  "Q2o": 146,
  "J6o": 147,
  "63o": 148,
  "J5o": 149,
  "95o": 150,
  "52o": 151,
  "J4o": 152,
  "J3o": 153,
  "42o": 154,
  "J2o": 155,
  "84o": 156,
  "T5o": 157,
  "T4o": 158,
  "32o": 159,
  "T3o": 160,
  "73o": 161,
  "T2o": 162,
  "62o": 163,
  "94o": 164,
  "93o": 165,
  "92o": 166,
  "83o": 167,
  "82o": 168,
  "72o": 169
}

async function generate() {

  const baseDataPath = path.resolve(__dirname, "../../data/networks", flags.network)
  await fs.promises.mkdir(baseDataPath, { recursive: true })

  const dataUploadPath = path.resolve(baseDataPath, "upload.json")
  const isGeneratedPath = path.resolve(baseDataPath, ".generated")
  const provenancePath = path.resolve(baseDataPath, "provenance.json")
  const csvPath = path.resolve(baseDataPath, "hands.csv")

  if (fs.existsSync(isGeneratedPath)) {
    console.log("found", isGeneratedPath)
    console.log("remove the file to regenerate. Exiting")
    process.exit(1)
  }

  const handsStr = []
  const cards = []
  const cardsAsIdxs = []
  const handsIdxs = []
  const numbers = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
  const suits = ['c', 'd', 'h', 's']

  // use Fisher-Yates
  function shuffle(array) {
    let currentIndex = array.length,  randomIndex;

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {

      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }

    return array;
  }

// generate the 52 card deck
  for (const n of numbers) {
    for (const s of suits) {
      cards.push(n+s)
      const card = {
        n: numbers.indexOf(n), s: suits.indexOf(s)
      }
      cardsAsIdxs.push(card)
    }
  }

// generate initial 1326 starting hands
  for (const c1 of cards) {
    for (const c2 of cards) {
      if (c2 !== c1
        && numbers.indexOf(c2[0]) <= numbers.indexOf(c1[0])
        && !handsStr.includes(`${c2}_${c1}`)
        && !handsStr.includes(`${c1}_${c2}`)) {
        handsStr.push(`${c2}_${c1}`)
      }
    }
  }

  const handsStrOrdered = []
  for(let i = 0; i < handsStr.length; i += 1) {
    const hand = handsStr[i]
    const handArray = hand.split("_")
    const c1 = handArray[0]
    const c2 = handArray[1]
    let orderedHand = ""
    if(numbers.indexOf(c1[0]) > numbers.indexOf(c2[0])) {
      orderedHand  = `${c1}_${c2}`
    } else {
      orderedHand  = `${c2}_${c1}`
    }
    handsStrOrdered.push(orderedHand)
  }

  let shuffledCards = [...handsStrOrdered]
  if(parseInt(flags.shuffle, 10) === 1) {
    console.log(`pre-shuffle hands ${flags.num} times`)
    for ( let i = 0; i < flags.num; i += 1 ) {
      shuffledCards = shuffle( shuffledCards )
    }
  } else {
    console.log("no shuffling")
  }

  for(let i = 0; i < shuffledCards.length; i += 1) {
    const hand = shuffledCards[i]
    const handArray = hand.split("_")
    const c1 = handArray[0]
    const c2 = handArray[1]

    const cmb = []
    cmb.push(cards.indexOf(c1))
    cmb.push(cards.indexOf(c2))
    handsIdxs.push(cmb)
  }

// for(let i = 0; i < handsIdxs.length; i += 1) {
//   const idx = handsIdxs[i]
//   const str = shuffledCards[i]
//   // console.log(str, idx, cards[idx[0]]+"_"+cards[idx[1]], (cards[idx[0]]+"_"+cards[idx[1]]) === str )
// }

  const h1 = handsIdxs.slice(0, 100)
  const h2 = handsIdxs.slice(100, 200)
  const h3 = handsIdxs.slice(200, 300)
  const h4 = handsIdxs.slice(300, 400)
  const h5 = handsIdxs.slice(400, 500)
  const h6 = handsIdxs.slice(500, 600)
  const h7 = handsIdxs.slice(600, 700)
  const h8 = handsIdxs.slice(700, 800)
  const h9 = handsIdxs.slice(800, 900)
  const h10 = handsIdxs.slice(900, 1000)
  const h11 = handsIdxs.slice(1000, 1100)
  const h12 = handsIdxs.slice(1100, 1200)
  const h13 = handsIdxs.slice(1200, 1300)
  const h14 = handsIdxs.slice(1300, 1326)

  const hands = [h1, h2, h3, h4, h5, h6, h7, h8, h9, h10, h11, h12, h13, h14]

  let intC = 0
  let cmbLength = 0
  for (let l1 = 0; l1 < hands.length; l1 += 1) {
    cmbLength += hands[l1].length
    for(let l2 = 0; l2 < hands[l1].length; l2 += 1) {
      const idx = handsIdxs[intC]
      const str = shuffledCards[intC]
      const cIdx = hands[l1][l2]
      const match = (cards[idx[0]]+"_"+cards[idx[1]]) === str && (cards[cIdx[0]]+"_"+cards[cIdx[1]]) === str

      console.log(
        str,
        idx,
        cards[idx[0]]+"_"+cards[idx[1]],
        cIdx,
        cards[cIdx[0]]+"_"+cards[cIdx[1]],
        match
      )
      if(idx[0] === -1 || cIdx[1] === -1 || idx[0] === -1 || idx[1] === -1 || !match) {
        throw Error("something went wrong")
      }
      intC += 1
    }
  }

  const uploadObj = {
    hands,
    ranks: []
  }

  for (const r in ranks) {
    const rank_for_hash = `rank${r}`
    const rank = {
      name: r,
      hash: web3.utils.soliditySha3(rank_for_hash),
      rank: ranks[r],
      rank_for_hash: rank_for_hash,
    }
    uploadObj.ranks.push(rank)
  }

  const provenanceObj = {
    network: flags.network,
    cards: {
      numbers, suits, cards_as_idxs: cardsAsIdxs,
    },
    hands: [],
    hand_hashes_concat: "",
    provenance: ""
  }

  const csvWriter = createCsvWriter({
    path: csvPath,
    header: [
      {id: 'id', title: 'Array IDX'},
      {id: 'name', title: 'Name'},
      {id: 'card1', title: 'Card 1'},
      {id: 'card2', title: 'Card 2'},
      {id: 'shape', title: 'Shape'},
      {id: 'hand', title: 'Hand'},
      {id: 'rank', title: 'Rank'},
    ]
  });

  const csvRecords = []

  function getShape(c1idx, c2idx, abbrv) {
    const c1 = cardsAsIdxs[c1idx]
    const c2 = cardsAsIdxs[c2idx]

    if(c1.n === c2.n) {
      return abbrv ? "" : "Pair"
    } else if(c1.s === c2.s) {
      return abbrv ? "s" : "Suited"
    } else {
      return abbrv ? "o" : "Offsuit"
    }
  }

  function getHandName(c1idx, c2idx) {
    const c1 = cardsAsIdxs[c1idx]
    const c2 = cardsAsIdxs[c2idx]
    const shape = getShape(c1idx, c2idx, true)
    return c1.n > c2.n ? `${numbers[c1.n]}${numbers[c2.n]}${shape}` : `${numbers[c2.n]}${numbers[c1.n]}${shape}`
  }

  let hashesConcat = ""
  for(const c of handsIdxs) {
    const id = handsIdxs.indexOf(c)
    const c1 = c[0]
    const c2 = c[1]
    const name = c1 > c2 ? cards[c1]+cards[c2] : cards[c2]+cards[c1]
    const shape = getShape(c1, c2, false)
    const hand = getHandName(c1, c2)
    const rank = ranks[hand]


    let hashSource = ""
    if(c1 > c2) {
      hashSource = String(`${id}${name}${c1}${cardsAsIdxs[c1].n}${cardsAsIdxs[c1].s}${c2}${cardsAsIdxs[c2].n}${cardsAsIdxs[c2].s}`)
    } else {
      hashSource = String(`${id}${name}${c2}${cardsAsIdxs[c2].n}${cardsAsIdxs[c2].s}${c1}${cardsAsIdxs[c1].n}${cardsAsIdxs[c1].s}`)
    }

    const hash = web3.utils.soliditySha3(hashSource)

    const card1Obj = {
      name: cards[c1],
      cards_array_idx: c1,
      number_idx: cardsAsIdxs[c1].n,
      suit_idx: cardsAsIdxs[c1].s,
      number: numbers[cardsAsIdxs[c1].n],
      suit: suits[cardsAsIdxs[c1].s],
    }
    const card2Obj = {
      name: cards[c2],
      cards_array_idx: c2,
      number_idx: cardsAsIdxs[c2].n,
      suit_idx: cardsAsIdxs[c2].s,
      number: numbers[cardsAsIdxs[c2].n],
      suit: suits[cardsAsIdxs[c2].s],
    }

    const h = {
      hash,
      hash_source: hashSource,
      hand_id: id,
      card1: (c1 > c2) ? card1Obj : card2Obj,
      card2: (c1 > c2) ? card2Obj : card1Obj,
      name,
      cards: c,
      shape,
      hand,
      rank
    }
    provenanceObj.hands.push(h)
    hashesConcat += utils.stripHexPrefix(hash)

    const csvRec = {
      id,
      name,
      card1: cards[c1],
      card2: cards[c2],
      shape,
      hand,
      rank,
    }
    csvRecords.push(csvRec)
  }

  provenanceObj.hand_hashes_concat = hashesConcat

  const provenance = web3.utils.soliditySha3(hashesConcat)

  console.log("contract provenance:", provenance)

  provenanceObj.provenance = provenance

  csvWriter.writeRecords(csvRecords)       // returns a promise
    .then(() => {
      console.log('CSV Done');
    });

  fs.writeFileSync(
    provenancePath,
    JSON.stringify(provenanceObj, null, 2)
  )

// write the file that will be used to initialise the hands in the contract
  fs.writeFileSync(
    dataUploadPath,
    JSON.stringify(uploadObj, null, 2)
  )

// ensure this script isn't run again without explicitly deleting the .generated file
  fs.writeFileSync(
    isGeneratedPath,
    "true"
  )
}

generate()
