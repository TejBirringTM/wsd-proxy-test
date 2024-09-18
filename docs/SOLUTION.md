# Solution

The solution leverages the single-threaded event loop architecture of the Node.js runtime environment to manage concurrent requests to proxies.

**Node.js 22 (or above)** must be installed on the machine in order to run the project successfully. **We recommend installing a stable version of Node.js.**

The solution is implemented entirely in TypeScript. In order to run the solution it needs to be transpiled from the TypeScript source code to JavaScript code.

**Steps to build and run the project:**

1. Checkout the repository.

2. `npm install`: to install project dependencies.

3. `npm run clean`: to remove any and all previously-transpiled source code.

4. `npm run build`: to transpile the source code to executable JavaScript. This will be located in the `<project root>/out` directory.

5. `npm run start:dev` to run in *development mode.* or `npm run start:prod` to run in *production mode.* See **Arguments** below.

## Modes

The transpiled project may be run in two modes explained below.
At the moment there isn't much difference between the two, other than the development mode outputing logs to `STDOUT` and `STDERR`.

## Arguments

The program must be run with the following arguments, e.g.
`npm run start:dev <input:strings> <input:proxies> <output>`

* `<input:strings>`: the full path to the file with newline-separated input strings.
* `<input:proxies>`: the full path to the file with newline-separated proxy addresses.
* `<output>`: the full path to the output file to be produced.

## Architecture / How it Works

At the moment, this project does not utilise true parallelism via worker threads, it leverages
the default single-threaded event loop of the Node.js runtime using macrotasks and microtasks.

### Modular Architecture

The diagram below (same as `modular-architecture.monodraw.monopic`) depicts the major modules constituting the implementation:

```text
                                                                                 [1..P] where P is the # of proxies
                                                                                 ┌──────────────────────────────┐
┌──────────────────────────────┐                                                 │██████████████████████████████│
│                              │             ┌─────────────────────┐             │█┌────────────────────────────┴─┐             ┌──────────────────────────────┐
│                              │             │                     │             │█│                              │             │                              │
│        Proxy Balancer        │             │                     │             │█│                              │             │                              │
│   (Default Proxy Balancer)   │────────────◇│    Proxy Manager    │◈───────────◁│█│         Proxy Worker         │             │       Request Handler        │
│                              │             │                     │             │█│  (Concurrent Proxy Worker)   │◇────────────│  (Default Request Handler)   │
│                              │             │                     │             │█│                              │             │                              │
│                              │             └─────────────────────┘             │█│                              │             │                              │
└──────────────────────────────┘                        ▲                        └─┤                              │             │                              │
                                                        │                          └──────────────────────────────┘             └──────────────────────────────┘
                                                        │                                          ▲
                                                        │                                          │
                                                        │                                          │
                                                        │                                          │
                                                    getProxy()                            handleInput(string)
                                                        │                                          │
                                                        │                                          │
                                                        │                                          │
                                                        │                          ┌───────────────────────────────┐
                                                        │                          │                               │
                                                        │                          │                               │
                                                        │                          │           Main Loop           │
                                                        └──────────────────────────│  (Line-by-Line Input Stream)  │
                                                                                   │                               │
                                               macrotask                                    │                               │
                                                                                   └───────────────────────────────┘
```

* The Main Loop (`main(...)` function) initialises the environment (including Proxy Manager) and attaches the exit logic on the Node.js process (more about that later). Thereafter, it creates a read stream to the strings input file, reading from the file one line at a time until it reaches the end (or concludes with a fatal error).

* The line-by-line reading loop does two things with each input string:

  * Gets the most appropriate proxy to handle the request (logic determined by the **Proxy Balancer** implementation, `defaultProxyBalancer`). Currently, the `defaultProxyBalancer` chooses the proxy with the least number of pending requests.

  * Tells the proxy to handle the input string read from the file. The logic is determined by the **Proxy Worker** implementation, `concurrentProxyWorker`. `concurrentProxyWorker`itself relies on the **Request Handler** implementation, `defaultRequestHandler`, to fetch a response from the proxy endpoint, parse it, and produce an output – handling any retry logic.

    * The Proxy Worker creates an output stream to a temporary output file for the respective proxy - this is to allow the output to be captured as soon as it is received from the proxy endpoint (via the `defaultRequestHandler`'s implementation)

    * The Proxy Worker implementation (`concurrentProxyWorker`) enqueues a macrotask that:
      * If proxy has not reached the maximum number of concurrent requests: initiates and waits for the request to complete (via `defaultRequestHandler`).
      * If proxy has reached the maximum number of concurrent requests: sleeps for one millisecond to check again.

* The exit logic is responsible for clean up. It concatenates the temporary output files for each proxy into one final output file whose location is determined by the `<output>` argument.
