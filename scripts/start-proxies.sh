#!/bin/bash

# Stop execution if any command fails
set -e

# Check if '# of Proxies' is provided as an argument
if [ $# -eq 0 ]; then
    echo "Error: Please provide # of proxies to initialise as a number."
    exit 1
fi

# Validate if '# of Proxies' is correct
if ! [[ "$1" =~ ^[0-9]+$ ]] || [ "$1" -eq 0 ]; then
    echo "Error: # of proxies to initialise must be greater than 0."
    exit 1
fi

# Arguments
startPort=8521
serverPort=3000
nOfProxies=$1
proxiesTxtFile=proxies.txt

# Delete proxies file if it already exists
if [[ -f "$proxiesTxtFile" ]]; then
    rm "$proxiesTxtFile"
    echo "$proxiesTxtFile has been deleted."
fi

# Create a new file
touch "$proxiesTxtFile"

# 
for ((p=1; p<=$nOfProxies; p++)); do
    port=$((startPort + (p - 1)))
    echo "Proxy #${p} starting on port: ${port}"

    docker rm --force "wsd-proxy-n-${p}-at-${port}"

    docker run \
    -p "${port}:${serverPort}" \
    --name "wsd-proxy-n-${p}-at-${port}" \
    --restart unless-stopped \
    --detach \
    wsd-proxy-test:latest

    echo "http://localhost:${port}" >> "${proxiesTxtFile}"
done

# Exit successfully
exit 0
