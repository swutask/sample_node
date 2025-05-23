#!/bin/bash
source_path="/data/helloivy/production"
echo "Start init!"
pm2 stop all || pm2 delete all || \
git -C $source_path fetch --all && \
git -C $source_path reset --hard HEAD && \
git -C $source_path pull && \

cd $source_path && sudo npm ci && pm2 start pm2.config.json --only "api.helloivy.co:3001"

echo "Start completed!"