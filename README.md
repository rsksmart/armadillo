
# armadillo-monitor

# Armadillo
It consists of two services: 
1. Armadillo Monitor is a tool that intends to bring protection to the RSK network base on the RSKIP110. This tool consumes data from:
    - [ BTC API ](https://github.com/rootstock/btc-api) to get BTC block information. if the current BTC block has an RSK tag present,  Armadillo decides it is a fork or not.
    - Rsk Node: to validate if the rsk tag found in BTC block is in rsk mainnet or not.
2. Armadillo API: Offers an endpoint set to get the current armadillo mainchain and posibles found forks

## Documentation
[ RSK IP 110 ](https://creativecommons.org/publicdomain/zero/1.0/).

## Set up
**``npm install``**
**``Run BTC Api``** To do this go to:  [ BTC API ](https://github.com/rootstock/btc-api)
**``Run a RSKd``**
**``Configure endpoints in confin.json``**

## Run Armadillo API
``npm run-script start-api``

## Run Armadillo Monitor
``npm run-script start-monitor``

## Run Armadillo Tests
``npm run-script test``


### [Integration tests](/test/integration-tests/integration-tests.md)
