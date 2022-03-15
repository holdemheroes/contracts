module.exports = {
  stripHexPrefix: (str) => {
    if (typeof str !== 'string') {
      return str;
    }
    return (str.slice(0, 2) === '0x') ? str.slice(2) : str;
  },
  getRequestId: (receipt) => {
    if(receipt.logs.length > 0) {
      for(let i = 0; i < receipt.logs.length; i += 1) {
        const l = receipt.logs[i]
        if(l.event === "GameStarted" || l.event === "CardDealRequested" || l.event === "DistributionBegun") {
          return l.args.requestId
        }
      }
    }
    return null;
  }
}
