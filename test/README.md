# Adapter tests for Renovasjon Homey app

## Files

The test suite consists of three files:
- `adapters-config.js`: Creates a list of all adapters with their configuration. Adapters that support a large set of municipalities can be set to only test one randomly chosen one.
- `valid-addresses.json`: Holds a JSON array of municipalities and a working address within it that can be used for testing. Does not exist initially, must be built. It is NOT included in the repo as it contains private addresses, even if randomly picked.
- `test-adapters.js`: The main file that defines and executes the tests.

## How to run

`npm test` runs all tests. This requires a fully populated `valid-addresses.json`, but for adapters configured to only test one random municipality it picks one in the intersection of its supported municipalities and the ones in `valid-addresses.json`.

The output of `npm test` shows the PASSED or FAILURE state of each municipality tested, and ends with a summary. If it says `Failed: 0` the test has fully succeeded.

To build `valid-addresses.json` from random addresses, run `npm test -- --update-addresses`. This process is accumulative, and if it fails to find a working address for some municipalities, it can be rerun until it has found one for all. If an address has gone out of service or stopped working for other legitimate reasons, it can be manually removed from the file before rerunning the command. Addresses can of course also be manually added to the file if care is taken to get it exactly right. If it consistently fails for some municipalities or adapters, this can be an indication that something is wrong with the adapter.

To limit testing or address updating to specific adapters, include the argument `--adapters [...]` where `[...]` is a comma separated list of adapters given by their filename (without extension). Example: `npm test -- --adapters remidt,trv`.
