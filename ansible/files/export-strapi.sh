#!/bin/bash
instance_id=$(curl -s http://169.254.169.254/latest/meta-data/instance-id | cut -d '-' -f 2)
file_name="$1-$instance_id"

cd /home/bitnami/strapi
npm run strapi export -- --no-encrypt --file ../"$file_name"