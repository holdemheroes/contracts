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

3. If the simulation has been run before, remove the container

```bash
docker rm /heh-crisp-sim
```

4. Run the container:

```bash
docker run -it --name heh-crisp-sim heh-crisp-sim
```

Use `Ctrl-C` to halt the simulation, or let it run until the end.

If parameters are modified in the script, re-run the `docker build` in #2, and delete the container as per #3
before running again.

Finally, copy the data, including the generated `gnuplot` graph from the container for a completed simulation:

```bash
mkdir -p ./data/tmp/sim && docker cp heh-crisp-sim:root/sim/data/ ./data/tmp/sim
```

## Deployment

See [deployment docs](./docs/deployment/README.md)
