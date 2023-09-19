#!/bin/bash

pushd /app
    NPM_CONFIG_PREFIX=~/.npm-global
    npm install
    npm run-script build
popd