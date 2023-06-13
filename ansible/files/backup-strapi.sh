#!/bin/sh
cd ~/strapi
npm run strapi export -- --no-encrypt --file ../$1
aws s3 cp ../$1.tar.gz s3://civiconnect-automated-strapi-backups/$1.tar.gz
rm ../$1.tar.gz