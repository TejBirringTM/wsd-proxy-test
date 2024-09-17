import {Command} from "commander";
import { debug } from "./helpers/logging.js";
import pkg from "../package.json" with {type:"json"}
import { mkdir, open, rm } from "node:fs/promises";
import { createProxyManagerFromFile } from "./proxy-manager/index.js";
import { fatalError, readableError } from "./helpers/error-handling.js";
import { execSync } from "node:child_process";
import { error } from "node:console";

const program = new Command()
    .name(pkg.name)
    .version(pkg.version)
    .description("");

program
    .argument("<input:strings>", "The path of the file with newline-separated alphanumeric strings to fetch data for.")
    .argument("<input:proxies>", "The path of the file with newline-separated HTTP proxy endpoint addresses to make requests to.")
    .argument("<output>", "The path of the file to write retrieved data to; this file must NOT exist.")
    .action((inputFileStrings, inputFileProxies, outputFile)=>main(inputFileStrings, inputFileProxies, outputFile));
    
debug(`${pkg.name} v${pkg.version}, running in ${process.env.NODE_ENV} mode.`);

program.parse();

function produceOutputFile(outputFilePath: string) {
    try {
        execSync(`cat ./tmp/** > ${outputFilePath}`);
    } catch (err) {
        throw fatalError("Failed to produce output file.", {
            error: readableError(error)
        });
    }
}

async function main(inputFileStrings: string, inputFileProxies: string, outputFile: string) {
    // create/clean tmp folder:
    try {
        await rm("tmp", {recursive: true, force: true});
        await mkdir("tmp");
    } catch (error) {
        throw fatalError("Failed to clean or create temporary folder: ./tmp", {
            error: readableError(error)
        });
    }
    // create proxy balancer from proxies file:
    const proxyManager = await createProxyManagerFromFile(inputFileProxies);
    // create stream to read from strings file:
    const inputFile = await open(inputFileStrings);

    // set up graceful exit:
    let cleanedUp = false;
    function gracefulExit(exitCode: number = 0) {
        if (!cleanedUp) {
            // clean up proxies
            proxyManager.forAllProxies((proxy)=>proxy.cleanUp());
            // clean up this
            inputFile.close();
            // attempt to produce the final output file
            produceOutputFile(outputFile);
            // set clean up flag (because this function will call itself via "exit" event handler to exit the process)
            cleanedUp = true;
            debug("Cleaned up.");
        }
        // exit the process
        process.exit(exitCode);
    }
    // make sure gracefulExit() is called when the event loop is empty OR gracefulExit() exit's the process
    process.on("exit", gracefulExit);

    // set up graceful user-triggered termination:
    {
        function gracefulTerminate(signal: string) {
            debug(`Received user instruction to terminate! (${signal})`);
            gracefulExit(1);
        }
        process.on("SIGINT", ()=>gracefulTerminate("SIGINT"));
    }

    // iterate over the strings file line by line, tell suitable proxy to handle input:
    let lineCount = 0;
    for await (const line of inputFile.readLines()) {
        lineCount++;
        // get suitable proxy from proxy manager (which balances load to proxies)
        const proxy = proxyManager.getProxy();
        // tell the proxy wrapper to handle the input string – it will create a new macrotask
        proxy.handleInput(line);
    }
}


