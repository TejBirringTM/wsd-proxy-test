# Solution Testing

Unit tests help determine the correctness of the source code at a modular level.

Scripts are provided to make certain tasks beyond the scope of the source code easier.

## Scripts

The `<project root>/scripts` directory holds Bash scripts to emulate proxies on the local machine using Docker.

* `install-proxy-image.sh` installs the Proxy container image from the tarball (`wsd-proxy-test.tar`) in this directory. The tarball is not included by default and would need to be downloaded and placed in the directory before this script can be used. This is because the Git repository currently does not archive the file; Git LFS could be used in the near future to achieve this.

* `start-proxies.sh <#>` instantiates the said # of proxy containers on the local machine, producing a `proxies.txt` file (of proxy addresses) in the working directory from which the script is called.

* `kill-proxies.sh` purges all proxy containers from Docker, removing the `proxies.txt` file in the working directory from which the script is called.

## Unit Tests

This codebase relies on the `jest` package to run unit tests. Unit test implementations end in `.test.ts`.

To run the unit tests, simply execute the command: `npm test`
