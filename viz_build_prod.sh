#!/bin/bash

docker exec viz /bin/bash -c "NPM_CONFIG_PREFIX=~/.npm-global /usr/local/bin/npm install && /usr/local/bin/npm run-script build"