#!/usr/bin/env bash

node -p "try { require('./node_modules/$1/package.json').version } catch(e) { '' }"
