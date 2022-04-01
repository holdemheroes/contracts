require("dotenv").config()
const path = require( "path" )
const fs = require( "fs" )

const HoldemHeroes = artifacts.require("HoldemHeroes")

const {
  BN, // Big Number support
} = require("@openzeppelin/test-helpers")
const Web3 = require( "web3" )

module.exports = async function(callback) {

  // ----------------------------------
  // Configurable simulation parameters
  // ----------------------------------

  // CRISP specific
  const targetBlocksPerSale = 14 // Ideal time between mints
  const saleHalflife = 196     // CRISP example sets to 700
  const priceSpeed = 1           // CRISP example sets to 1
  const priceSpeedDenominator = 4 // amount to divide priceSpeed by
  const priceHalflife = 98    // CRISP example sets to 100
  const startingPrice = 0.1    // Start price in ETH. Will be converted to wei in the script

  // Simulation variables
  const numberToSell = 1326
  const blocksToMine = 30    // number of additional blocks to mine between mint transactions
  const priceThreshold = 0.8 // simulates the highest price a user is willing pay in ETH. If the price rises above this,
                             // the simulation will mine blocks until the price falls below a random value between waitForDropHigh and waitForDropLow
  const waitForDropHigh = 0.2    // a random number between waitForDropHigh and waitForDropLow will be
  const waitForDropLow = 0.05    // calculated once the priceThreshold is reached

  // HEH reveal/mint (no real need to change these for the simulation)
  const saleStart = 1 // Starts as soon as contract is deployed.
  const revealTime = Math.floor(Date.now() / 1000) + 259200 // Pre-reveal/blind sale ends in 3 days
  const maxMintable = 1326                           // Max a single user can mint. Recommend leaving for simulation

  const gnuPlotConf = `set datafile separator ','
set terminal png size 2000,600
set output 'price_per_block.png'
set key autotitle columnhead
set ylabel "Price ETH"
set xlabel "Block #"
set y2tics
set ytics nomirror
set y2label "EMS"
plot 'price_per_block.csv' using 1:2 with lines, '' using 1:3 with lines axis x1y2, '' using 1:4 with lines axis x1y2
`

  // ----------
  // Simulation
  // ----------
  const newtworkType = await web3.eth.net.getNetworkType();

  if(newtworkType !== "private") {
    console.log("run with Ganache or vordev")
    process.exit(1)
  }

  function mineOneBlock() {
    return web3.currentProvider.send(
      {
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: new Date().getTime()
      },
      () => {}
    )
  }

  const paramsOut = `
targetBlocksPerSale:   ${targetBlocksPerSale}
saleHalflife:          ${saleHalflife}
priceSpeed:            ${priceSpeed}
priceSpeedDenominator: ${priceSpeedDenominator}
priceHalflife:         ${priceHalflife}
startingPrice:         ${startingPrice}
priceThreshold:        ${priceThreshold}
waitForDropHigh:       ${waitForDropHigh}
waitForDropLow:        ${waitForDropLow}
blocksToMine:          ${blocksToMine}
`

  console.log("Simulation Parameters")
  console.log("---------------------")
  console.log(paramsOut)
  console.log("Start simulation")
  console.log("")

  const baseDataPath = path.resolve( __dirname, "data/sim" )
  if(fs.existsSync(baseDataPath)) {
    fs.rmSync(baseDataPath, {force: true, recursive: true})
  }

  await fs.promises.mkdir( baseDataPath, { recursive: true } )
  const pricePerBlockDumpPath = path.resolve(baseDataPath, "price_per_block.csv")
  const pricePerSaleDumpPath = path.resolve(baseDataPath, "price_per_sale.csv")
  const paramsDumpPath = path.resolve(baseDataPath, "params.txt")
  const saleStatsDumpPath = path.resolve(baseDataPath, "sales_stats.txt")
  const gnuPlotPath = path.resolve(baseDataPath, "sim.gnuplot")

  console.log(`price per block : ${pricePerBlockDumpPath}`)
  console.log(`price per sale  : ${pricePerSaleDumpPath}`)
  console.log(`params          : ${paramsDumpPath}`)
  console.log(`sales stats     : ${saleStatsDumpPath}`)

  fs.writeFileSync( pricePerBlockDumpPath, "block,price,ems,target ems\n" )
  fs.writeFileSync( pricePerSaleDumpPath, "block,num bought,price per nft,total price\n" )
  fs.writeFileSync( paramsDumpPath, paramsOut )
  fs.writeFileSync( gnuPlotPath, gnuPlotConf)

  try {
    const startPriceWei = web3.utils.toWei(String(startingPrice), "ether")

    console.log("deploy HoldemHeroes")
    const holdemHeroes = await HoldemHeroes.new(
      "0xCfEB869F69431e42cdB54A4F4f105C19C080A601", // use VorDev's default - not required for simulation
      "0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab", // use VorDev's default - not required for simulation
      "0xD86C8F0327494034F60e25074420BcCF560D5610", // use VorDev's default - not required for simulation
      saleStart,
      revealTime,
      maxMintable,
      targetBlocksPerSale,
      saleHalflife,
      priceSpeed,
      priceSpeedDenominator,
      priceHalflife,
      startPriceWei
    )

    console.log("HEH deployed to", holdemHeroes.address)

    const accounts = await web3.eth.getAccounts()

    const initialPrice = await holdemHeroes.getNftPrice()

    const targetEms = await holdemHeroes.targetEMS()

    console.log("initialPrice", web3.utils.fromWei(initialPrice))

    const priceSpeedFromContract = await holdemHeroes.priceSpeed()
    console.log("calculated priceSpeed", web3.utils.fromWei(priceSpeedFromContract))

    console.log("begin minting sim")

    let totalSupply = (await holdemHeroes.totalSupply()).toNumber()
    let totalSales = new BN(0)

    // mint & mine until supply runs out
    while(totalSupply < numberToSell) {
      let blockNum = await web3.eth.getBlockNumber()
      let pricePerNft = await holdemHeroes.getNftPrice()
      let ems = (blockNum >= saleStart) ? await holdemHeroes.getCurrentEMS() : 0
      let dataDump = `${blockNum.toString()},${web3.utils.fromWei(pricePerNft)},${ems},${targetEms.toString()}`
      fs.appendFileSync( pricePerBlockDumpPath, dataDump + "\n" )
      console.log(`${dataDump},${totalSupply}`)

      if(Number(web3.utils.fromWei(pricePerNft)) > priceThreshold) {
        const waitForDrop = (Math.random() * (waitForDropHigh - waitForDropLow) + waitForDropLow).toFixed(4)
        console.log(`price above threshold ${priceThreshold}. Mine blocks until < ${waitForDrop}`)
        while(Number(web3.utils.fromWei(pricePerNft)) >= waitForDrop) {
          await mineOneBlock()
          blockNum = await web3.eth.getBlockNumber()
          pricePerNft = await holdemHeroes.getNftPrice()
          let ems = (blockNum >= saleStart) ? await holdemHeroes.getCurrentEMS() : 0
          let dataDump = `${blockNum.toString()},${web3.utils.fromWei(pricePerNft)},${ems},${targetEms.toString()}`
          fs.appendFileSync( pricePerBlockDumpPath, dataDump + "\n" )
          console.log(`${dataDump},${totalSupply}`)
        }
      }

      const m = blockNum % accounts.length
      let numToMint = Math.floor(Math.random() * 6)
      numToMint = numToMint > 0 ? numToMint : 1
      if(numToMint + totalSupply > 1326) {
        numToMint = 1326 - totalSupply
      }

      const cost = pricePerNft.mul(new BN(numToMint))
      totalSales = totalSales.add(cost)

      console.log(`Mint ${numToMint}`)
      fs.appendFileSync( pricePerSaleDumpPath, `${blockNum},${numToMint},${web3.utils.fromWei(pricePerNft.toString())},${web3.utils.fromWei(cost.toString())}` + "\n" )

      await holdemHeroes.mintNFTPreReveal( numToMint, { from: accounts[m], value: cost })

      const randBlockToMin = Math.floor(Math.random() * blocksToMine)
      if(randBlockToMin > 0) {
        console.log(`Mine ${randBlockToMin} blocks`)
        for(let j = 0; j < randBlockToMin; j += 1) {
          await mineOneBlock()
          blockNum = await web3.eth.getBlockNumber()
          pricePerNft = await holdemHeroes.getNftPrice()
          let ems = (blockNum >= saleStart) ? await holdemHeroes.getCurrentEMS() : 0
          let dataDump = `${blockNum.toString()},${web3.utils.fromWei(pricePerNft)},${ems},${targetEms.toString()}`
          fs.appendFileSync( pricePerBlockDumpPath, dataDump + "\n" )
          console.log(`${dataDump},${totalSupply}`)
        }
      }

      totalSupply = (await holdemHeroes.totalSupply()).toNumber()
    }

    console.log("Simulation finished")
    const lastBlock = await web3.eth.getBlockNumber()
    const numBlocks = lastBlock - saleStart
    const finalTotalSupply = await holdemHeroes.totalSupply()
    const meanSale = totalSales.div(finalTotalSupply)
    const blockerPerSale = numBlocks / finalTotalSupply.toNumber()
    const salesPerBlock = finalTotalSupply.toNumber() / numBlocks

    const saleStats = `
Target EMS         : ${targetEms.toString()}
Num sold           : ${finalTotalSupply.toString()}
Total sales in ETH : ${Web3.utils.fromWei(totalSales.toString())}
Mean Price Per NFT : ${Web3.utils.fromWei(meanSale.toString())}
Num Blocks         : ${numBlocks}
Blocks per sale    : ${blockerPerSale}
Sales per block    : ${salesPerBlock}
`

    fs.writeFileSync(saleStatsDumpPath, saleStats)
    console.log(saleStats)

    callback()

  } catch(e) {
    console.log(e)
    callback()
  }
}
