# How to execute the integration tests.

## Set of tools / projects
* **rskj** node executing in ``regtest`` with integration tests config setup.
* [btc-api-mocker](https://github.com/rootstock/btc-api-mocker) project
* **bitcoind** executing

## Set up steps
1. **``npm install``** of ``armadillo-monitor`` project as precondition
2. execute ``bitcoind``
3. execute ``rskj``
4. execute ``btc-api-mocker`` following the project's readme
5. change ``config.json`` in project root folder ``store.database = "armadillo-test"`` and remove ``auth`` object
6. execute ``armadillo-monitor`` api by ``npm run-script start-api`` 
7. execute ``armadillo-monitor`` monitor by ``npm run-script start-monitor``

## execute tests
Tests are executed by using ``npm run test-integration``

#### notes
*It's possible for testing purposes to reduce the default pooling time, to speed up tests*
* *At ``src/services/btc-watcher.ts`` in function ``start()`` at the line ``await sleep(NNN);`` at the end of the while loop it can be changed to e.g. 150.*
