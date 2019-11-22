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
5. execute ``armadillo-monitor`` api by ``npm run-script start-api`` 
6. execute ``armadillo-monitor`` monitor by ``npm run-script start-monitor``

## execute tests
Tests are executed by using ``mocha test/integration-tests/*``

#### notes
*It's possible for testing purposes to reduce the default pooling time of 5s*
* *At ``src/services/btc-watcher.ts`` in function ``start()`` at the line ``await sleep(5000);`` at the end of the while loop it can be changed to e.g. 1000.*
* *If the pooling time changes in ``btc-watcher::start()`` function it must change in the test files in the root folder of ``test/integration-tests`` in the line ``const apiPoolingTime = 5000;`` to match with the pooling time value e.g. 1000.*