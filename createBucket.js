require('dotenv').config()
const { S3Client, CreateBucketCommand, PutPublicAccessBlockCommand, waitUntilBucketExists, HeadBucketCommand, DeleteBucketCommand } = require("@aws-sdk/client-s3")

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
	return createBucketData
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
	return putPublicAccessBlockData
}

async function doesBucketExist(bucketName) {
	const headBucketCommand = new HeadBucketCommand({ Bucket: bucketName })
	let bucketExists = false
	try {
		const headBucketData = await client.send(headBucketCommand)
		bucketExists = true
	} catch (err) {
		bucketExists = false
	}
	return bucketExists
}

async function deleteBucket(bucketName) {
	const deleteBucketCommand = new DeleteBucketCommand({ Bucket: bucketName })
	const deleteBucketData = await client.send(deleteBucketCommand)
	return deleteBucketData
}

async function main() {
	//check if bucket exists
	console.log("checking if bucket exists...")
	let bucketExists = await doesBucketExist(process.env.S3_BUCKET_NAME)

	if (process.env.EXISTING_RESOURCE_BEHAVIOR == "fail" && bucketExists) {
		throw new Error(`Bucket ${process.env.S3_BUCKET_NAME} already exists`)
	}

	if (process.env.EXISTING_RESOURCE_BEHAVIOR == "replace" && bucketExists) {
		await deleteBucket(process.env.S3_BUCKET_NAME)

		//wait until bucket is deleted
		console.log("deleting existing bucket...")
		let _bucketExists = true
		while (_bucketExists) {
			_bucketExists = await doesBucketExist(process.env.S3_BUCKET_NAME)
			await new Promise(resolve => setTimeout(resolve, 1000))
		}
		bucketExists = false
	}

	if (!bucketExists) {
		console.log("creating bucket...")
		await createBucket(process.env.S3_BUCKET_NAME)
		await waitUntilBucketExists({ client, maxWaitTime: 60, minDelay: 1 }, { Bucket: process.env.S3_BUCKET_NAME })
		await putPublicAccessBlock(process.env.S3_BUCKET_NAME)
		console.log("bucket created successfully")
	} else {
		console.log("using existing bucket")
	}
}

main()
