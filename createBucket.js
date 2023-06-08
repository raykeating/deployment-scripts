require('dotenv').config()
const { S3Client, CreateBucketCommand, PutPublicAccessBlockCommand, waitUntilBucketExists } = require("@aws-sdk/client-s3")

const client = new S3Client({
	region: process.env.AWS_REGION,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
	}
})

async function createBucket(bucketName) {
	const createBucketCommand = new CreateBucketCommand({
		Bucket: bucketName,
		ACL: "bucket-owner-full-control",
		ObjectOwnership: "BucketOwnerPreferred"
	})

	const createBucketData = await client.send(createBucketCommand)
	console.log(createBucketData)
}

async function putPublicAccessBlock(bucketName) {
	const putPublicAccessBlockCommand = new PutPublicAccessBlockCommand({
		Bucket: bucketName,
		PublicAccessBlockConfiguration: {
			BlockPublicAcls: false,
			BlockPublicPolicy: true,
			IgnorePublicAcls: false,
			RestrictPublicBuckets: true
		}
	})

	const putPublicAccessBlockData = await client.send(putPublicAccessBlockCommand)
	console.log(putPublicAccessBlockData)
}

async function main() {
	await createBucket(process.env.S3_BUCKET_NAME)
	await waitUntilBucketExists({ client, maxWaitTime: 60, Bucket: process.env.S3_BUCKET_NAME })
	await putPublicAccessBlock(process.env.S3_BUCKET_NAME)
}

main()
