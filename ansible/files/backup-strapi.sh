#!/bin/bash
instance_id=$(curl -s http://169.254.169.254/latest/meta-data/instance-id | cut -d '-' -f 2)
file_name="$1-$instance_id"

cd ~/strapi
npm run strapi export -- --no-encrypt --file ../"$file_name"
aws s3 cp ../"$file_name".tar.gz s3://civiconnect-automated-strapi-backups/"$file_name".tar.gz
rm ../"$file_name".tar.gz