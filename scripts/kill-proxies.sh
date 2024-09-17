#!/bin/bash

# Stop execution if any command fails
set -e

# Arguments
proxiesTxtFile=proxies.txt

# Kill all proxies
docker ps -aq --filter "name=wsd-proxy-n-*" | xargs -r docker rm --force

# Delete the proxies file
rm "$proxiesTxtFile"
