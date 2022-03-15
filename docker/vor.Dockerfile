FROM ubuntu:bionic

# Node versions/paths
ENV NVM_DIR /root/.nvm
ENV NODE_VERSION 12.18.3
ENV PATH=$PATH:/usr/local/go/bin:/root/.nvm/versions/node/v$NODE_VERSION/bin

# Install deps, nvm, node, npm, yarn & Go
RUN \
  apt-get update && \
  apt-get upgrade -y && \
  apt-get install -y curl build-essential nano netcat git jq && \
  curl -sL https://raw.githubusercontent.com/creationix/nvm/v0.35.3/install.sh | bash && \
  . $NVM_DIR/nvm.sh && \
  nvm install $NODE_VERSION && \
  npm install --global yarn && \
  curl -sL https://golang.org/dl/go1.16.3.linux-amd64.tar.gz -o /root/go1.16.3.linux-amd64.tar.gz && \
  tar -C /usr/local -xzf /root/go1.16.3.linux-amd64.tar.gz

# clone and install latest VOR Oracle repo
RUN cd /root && \
    git clone --depth 1 \
    --branch $(curl -s https://api.github.com/repos/unification-com/xfund-vor/releases/latest | grep -oP '"tag_name": "\K(.*)(?=")') \
    https://github.com/unification-com/xfund-vor

WORKDIR /root/xfund-vor

# install node dependencies, compile contracts & build VOR Oracle
RUN yarn install --frozen-lockfile && \
    npx truffle compile && \
    make build-oracle && \
    cp docker/assets/* oracle/build && \
    mkdir /root/logs

EXPOSE 8545

# default cmd to set up Ganache, deploy contracts and run VOR Oracle node
CMD rm -f /root/logs/ganache.log && rm -f /root/logs/oracle.log && \
    npx ganache-cli --deterministic --networkId 696969 --chainId 696969 --accounts 20 -e 1000 -h 0.0.0.0 2>&1 | tee /root/logs/ganache.log & \
    until nc -z 127.0.0.1 8545; do sleep 0.5; echo "wait for ganache"; done && \
    echo "deploying VOR contracts, please wait..." && \
    npx truffle deploy --network=develop >> /root/logs/ganache.log && \
    echo "initialising VOR dev environment, please wait..." && \
    npx truffle exec oracle/build/init-dev-env.js --network=develop 2>&1 | tee /root/logs/ganache.log && \
    echo "init complete. Start VOR oracle" && \
    cd /root/xfund-vor/oracle/build && \
    ./oracle start -k ./pass 2>&1 | tee /root/logs/oracle.log
