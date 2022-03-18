require("dotenv").config()
const HoldemHeroes = artifacts.require("HoldemHeroes")

module.exports = async function(callback) {

  // ----------------------------------
  // Configurable simulation parameters
  // ----------------------------------

  // CRISP specific
  const targetBlocksPerSale = 47 // Ideal time between mints
  const saleHalflife = 500       // CRISP example sets to 700
  const priceSpeed = 1           // CRISP example sets to 1
  const priceHalflife = 500      // CRISP example sets to 100
  const startingPrice = 0.22     // Start price in ETH. Will be converted to wei in the script

  // Simulation variables
  const blocksToMine = 0     // number of additional blocks to mine between mint transactions
  const priceThreshold = 2.0 // simulates the highest price a user is willing pay in ETH. If the price rises above this,
                             // the simulation will mine blocks until the price falls below this

  // HEH reveal/mint (no real need to change these for the simulation)
  const saleStart = Math.floor(Date.now() / 1000) // Starts as soon as contract is deployed. Or set as unix epoch
  const revealTime = 84600                           // Pre-reveal/blind sale ends in 1 day
  const maxMintable = 1326                           // Max a single user can mint. Recommend leaving for simulation

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

  console.log("Simulation Parameters")
  console.log("---------------------")
  console.log(`targetBlocksPerSale: ${targetBlocksPerSale}`)
  console.log(`saleHalflife:        ${saleHalflife}`)
  console.log(`priceSpeed:          ${priceSpeed}`)
  console.log(`priceHalflife:       ${priceHalflife}`)
  console.log(`startingPrice:       ${startingPrice}`)
  console.log(`priceThreshold:      ${priceThreshold}`)
  console.log(`blocksToMine:        ${blocksToMine}`)
  console.log("")
  console.log("Start simulation")
  console.log("")

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
      priceHalflife,
      startPriceWei
    )

    console.log("HEH deployed to", holdemHeroes.address)

    const accounts = await web3.eth.getAccounts()
    const admin = accounts[0]

    const initialPrice = await holdemHeroes.getNftPrice()

    console.log("initialPrice", web3.utils.fromWei(initialPrice))

    console.log("begin minting sim")

    for(let i = 0; i < 1326; i += 1) {
      let blockNum = await web3.eth.getBlockNumber()
      let pricePerNft = await holdemHeroes.getNftPrice()
      console.log("token", i, "blockNum", blockNum.toString(), "price", web3.utils.fromWei(pricePerNft))

      if(Number(web3.utils.fromWei(pricePerNft)) > priceThreshold) {
        console.log(`price above threshold ${priceThreshold} ETH. mine blocks until it drops`)
        while(Number(web3.utils.fromWei(pricePerNft)) >= priceThreshold) {
          await mineOneBlock()
          blockNum = await web3.eth.getBlockNumber()
          pricePerNft = await holdemHeroes.getNftPrice()
          console.log("token", i, "blockNum", blockNum.toString(), "price",web3.utils.fromWei(pricePerNft))
        }
        console.log(`price below threshold ${priceThreshold} ETH. Continue minting`)
      }

      const m = i % accounts.length

      await holdemHeroes.mintNFTPreReveal( 1, { from: accounts[m], value: pricePerNft })

      // otherwise minters may run out of ETH during est
      await holdemHeroes.withdrawETH( { from: admin })
      await web3.eth.sendTransaction({to:accounts[m], from: admin, value: pricePerNft})

      if(blocksToMine > 0) {
        for(let j = 0; j < blocksToMine; j += 1) {
          process.stdout.write(".")
          await mineOneBlock()
        }
        console.log("")
      }

    }

    console.log("Simulation finished")
    callback()

  } catch(e) {
    console.log(e)
    callback()
  }
}
