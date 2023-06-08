const fs = require('fs')
require('dotenv').config()
const { LightsailClient, CreateInstancesCommand, GetBlueprintsCommand, GetBundlesCommand, GetInstanceCommand, GetInstanceStateCommand, AllocateStaticIpCommand, AttachStaticIpCommand, GetStaticIpCommand } = require("@aws-sdk/client-lightsail")
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

async function allocateStaticIp() {
	const allocateStaticIpCommand = new AllocateStaticIpCommand({ staticIpName: `${process.env.INSTANCE_NAME}-static-ip` })
	const data = await client.send(allocateStaticIpCommand)
	return data
}

async function attachStaticIp(instanceName, staticIpName) {
	const attachStaticIpCommand = new AttachStaticIpCommand({ instanceName: instanceName, staticIpName: staticIpName })
	const data = await client.send(attachStaticIpCommand)
	return data
}

async function getStaticIp(staticIpName) {
	const getStaticIpCommand = new GetStaticIpCommand({ staticIpName: staticIpName })
	const data = await client.send(getStaticIpCommand)
	return data.staticIp.ipAddress
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
	fs.writeFileSync("./instance_public_ip.txt", publicIp)
	fs.writeFileSync("./host_name.txt", "bitnami")

	//create static ip
	const createStaticIP = process.env.CREATE_STATIC_IP
	if (createStaticIP == "true") {
		console.log("creating static ip")
		await allocateStaticIp()
		await attachStaticIp(process.env.INSTANCE_NAME, `${process.env.INSTANCE_NAME}-static-ip`)
		const staticIp = await getStaticIp(`${process.env.INSTANCE_NAME}-static-ip`)
		console.log("static ip is " + staticIp)
	}
}

main()


