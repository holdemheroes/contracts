function increaseBlockTime(seconds) {
  return web3.currentProvider.send(
    {
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [seconds],
      id: new Date().getTime()
    },
    () => {}
  )
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

module.exports = {
  increaseBlockTime, mineOneBlock
}
