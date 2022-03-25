module.exports={
  networks: {
    development: {
      network_id: "*",
      host: "127.0.0.1",
      port: 7545,
    }
  },
  compilers: {
    solc: {
      version: "0.8.13",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "constantinople"
      }
    }
  },
};
