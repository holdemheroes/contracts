# HoldemHeroes

HoldemHeroes is a suite of Poker related contracts, including the HEH NFT, Playing Cards, and Poker Hand Evaluator
contracts, along with the first game to implement HEH, Texas Holdem V1.

## init, build, test

```bash
yarn install
yarn run build
yarn test
```

## CRISP Simulation

1. Edit "Configurable simulation parameters" in `scripts/1_nft/sim/mint_crisp_sim.js` as required
2. Build the docker container:

```bash
docker build -t heh-crisp-sim -f ./docker/sim.Dockerfile .
```

3. Run the container:

```bash
docker run -it heh-crisp-sim
```

Use `Ctrl-C` to halt the simulation.

If parameters are modified in the script, re-run the `docker build` in #2 before running again.

## Deployment

See [deployment docs](./docs/deployment/README.md)
