#!/bin/bash

# Stop execution if any command fails
set -e

# Install the image from tarball
SCRIPT_DIR="$(dirname "$(realpath "$BASH_SOURCE")")"
docker load --input "$SCRIPT_DIR/wsd-proxy-test.tar"
