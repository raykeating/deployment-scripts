url=$1
versionId=$(echo "$url" | grep -oP '(?<=versionId=)[^&]+')
filename=$(basename "$url" | cut -d'?' -f1)
bucket=$(echo "$url" | awk -F/ '{split($3, a, "."); print a[1]}')

cd /home/bitnami
aws s3api get-object --bucket $bucket --key $filename --version-id $versionId $filename

cd /home/bitnami/strapi
npm run strapi import -- --force -f /home/bitnami/"$filename"

rm /home/bitnami/"$filename"