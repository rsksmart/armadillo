
# Armadillo pooling detector
The intention of this script is to check if there are forks in armadillo mainchain, given that a single fork (forking with just one block) is pretty common in RSK network because miners may be stuck and mining a wrong height.
For this reason, a fork must have more than 3 elements, so this basically means that a fork is growing, creating a chain instead of just a lost block.

## Set up
**``npm install``**

## Run
``npm run-script start``
