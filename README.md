
# armadillo-monitor

# Armadillo
It consists of two services: 
1. Armadillo Monitor is a tool which intend to bring protection to RSK network, and is base on the RSKIP110
This tool consume data from:
    - [ BTC API ](https://github.com/rootstock/btc-api) to get the current BTC block and detect if has an rsk tag, base on that decides if is a fork or not.
    - Rsk Node 
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
