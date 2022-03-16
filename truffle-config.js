/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * trufflesuite.com/docs/advanced/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like @truffle/hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */

require('dotenv').config()
// const TestRPC = require("ganache-cli")
const HDWalletProvider = require('@truffle/hdwallet-provider');

const { ETH_PKEY_RINKEBY, ETH_PKEY_MAINNET, INFURA_PROJECT_ID, ETHERSCAN_API_KEY } = process.env

module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchain for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */

  networks: {
    vordev: {
      provider: () =>
        new HDWalletProvider(
          "myth like bonus scare over problem client lizard pioneer submit female collect",
          "http://127.0.0.1:8545", 0, 20
        ),
      network_id: "696969", // Any network (default: none)
      skipDryRun: true,
      networkCheckTimeout: 999999,
    },
    rinkeby: {
      provider: () =>
        new HDWalletProvider({
          privateKeys: [ETH_PKEY_RINKEBY],
          providerOrUrl: `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`,
        }),
      network_id: "4",
      gas: 10000000,
      gasPrice: 10000000000,
      skipDryRun: true,
    },
    mainnet: {
      provider: () =>
        new HDWalletProvider({
          privateKeys: [ETH_PKEY_MAINNET],
          providerOrUrl: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
        }),
      network_id: "1",
      gasPrice: 40000000000,
    },
    polygon_mumbai: {
      provider: () =>
        new HDWalletProvider({
          privateKeys: [ETH_PKEY_RINKEBY],
          providerOrUrl: `https://polygon-mumbai.infura.io/v3/${INFURA_PROJECT_ID}`,
        }),
      network_id: "80001",
      gasPrice: 3000000000,
      skipDryRun: true,
    }
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    enableTimeouts: false,
    before_timeout: 5000000,
    timeout: 5000000,
    bail: false,
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      currency: 'USD',
      gasPrice: 100,
      outputFile: '/dev/null',
      showTimeSpent: true
    }
  },
  plugins: ['solidity-coverage', 'truffle-plugin-verify', 'truffle-contract-size', '@chainsafe/truffle-plugin-abigen'],

  api_keys: {
    etherscan: ETHERSCAN_API_KEY
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.12",    // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "constantinople"
      }
    }
  },
};
