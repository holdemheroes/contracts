FROM ubuntu:bionic

# Node versions/paths
ENV NVM_DIR /root/.nvm
ENV NODE_VERSION 12.18.3
ENV PATH=$PATH:/usr/local/go/bin:/root/.nvm/versions/node/v$NODE_VERSION/bin

# Install deps, nvm, node, npm, yarn & Go
RUN \
  apt-get update && \
  apt-get upgrade -y && \
  apt-get install -y curl build-essential nano netcat git jq python gnuplot && \
  curl -sL https://raw.githubusercontent.com/creationix/nvm/v0.35.3/install.sh | bash && \
  . $NVM_DIR/nvm.sh && \
  nvm install $NODE_VERSION && \
  npm install --global yarn

RUN mkdir -p /root/sim/data
WORKDIR /root/sim
# first, copy only essential files required for compiling contracts
COPY ./package.json ./yarn.lock ./docker/truffle-config.js ./

# install node dependencies, compile contracts & build VOR Oracle
RUN yarn install --frozen-lockfile

COPY ./contracts ./contracts/
COPY ./migrations ./migrations/
RUN npx truffle compile

# Copy simulation script
COPY ./scripts/1_nft/sim/mint_crisp_sim.js ./

# default cmd to set up Ganache, deploy contracts and run VOR Oracle node
CMD npx ganache-cli -q \
       --deterministic \
       --networkId 696969 \
       --chainId 696969 \
       --accounts 20 \
       -e 100000 \
       -h 0.0.0.0 \
       --allowUnlimitedContractSize true \
       --port 7545 & \
    until nc -z 127.0.0.1 7545; do sleep 0.5; echo "wait for ganache"; done && \
    npx truffle exec /root/sim/mint_crisp_sim.js --network=development && \
    cd /root/sim/data/sim && gnuplot sim.gnuplot
