const fs = require('fs')
require('dotenv').config()
const { LightsailClient, CreateInstancesCommand, GetBlueprintsCommand, GetBundlesCommand, GetInstanceCommand, GetInstanceStateCommand } = require("@aws-sdk/client-lightsail")
const { S3Client } = require("@aws-sdk/client-s3")

const runningStateCheckTimeout = 600
const runningStateCheckInterval = 5

//adds PUBLIC_SSH_KEY to authorized_keys and changes permissions
const userDataScript = `#!/bin/sh
sudo mkdir home/bitnami/.ssh
sudo echo "${process.env.PUBLIC_SSH_KEY}" >> home/bitnami/.ssh/authorized_keys
sudo chmod 700 home/bitnami/
sudo chmod 600 home/bitnami/authorized_keys
`

const client = new LightsailClient({
	region: process.env.AWS_REGION,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
	}
})

async function printBlueprints() {
	const blueprintsCommand = new GetBlueprintsCommand({ includeInactive: false })
	const data = await client.send(blueprintsCommand)
	console.log(data)
}

async function printBundles() {
	const bundlesCommand = new GetBundlesCommand({ includeInactive: false })
	const data = await client.send(bundlesCommand)
	console.log(data)
}

async function createInstance(instanceName) {
	const createInstanceCommand = new CreateInstancesCommand({
		availabilityZone: process.env.AVAILABILITY_ZONE,
		blueprintId: process.env.BLUEPRINT_ID,
		bundleId: process.env.BUNDLE_ID,
		userData: userDataScript,
		//keyPairName: "string",
		instanceNames: [instanceName]
	})

	const data = await client.send(createInstanceCommand)
}

async function getInstance(instanceName) {
	const getInstanceCommand = new GetInstanceCommand({ instanceName: instanceName })
	const data = await client.send(getInstanceCommand)
	return data
}

async function getInstanceState(instanceName) {
	const getInstanceStateCommand = new GetInstanceStateCommand({ instanceName: instanceName })
	const data = await client.send(getInstanceStateCommand)
	return data.state
}

async function main() {
	//create instance
	console.log("creating instance")
	await createInstance(process.env.INSTANCE_NAME)

	//get instance public ip
	const instance = await getInstance(process.env.INSTANCE_NAME)
	const publicIp = instance.instance.publicIpAddress
	console.log("instance public ip is " + publicIp)

	//write public ip to GITHUB_ENV file
	fs.appendFileSync(process.env.GITHUB_ENV, `OUT_HOST_NAME=bitnami\n`)
	fs.appendFileSync(process.env.GITHUB_ENV, `OUT_INSTANCE_IP=${publicIp}\n`)
}

main()


