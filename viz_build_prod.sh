#!/bin/bash

docker exec viz /bin/bash -c "/usr/local/bin/npm install && /usr/local/bin/npm run-script build"