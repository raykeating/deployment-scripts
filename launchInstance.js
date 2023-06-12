const fs = require('fs')
require('dotenv').config()
const {
	LightsailClient, CreateInstancesCommand, GetBlueprintsCommand,
	GetBundlesCommand, GetInstanceCommand, GetInstanceStateCommand,
	AllocateStaticIpCommand, AttachStaticIpCommand, GetStaticIpCommand,
	DeleteInstanceCommand, DeleteStaticIpCommand
} = require("@aws-sdk/client-lightsail")
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

async function deleteInstance(instanceName) {
	const deleteInstanceCommand = new DeleteInstanceCommand({ instanceName: instanceName })
	const data = await client.send(deleteInstanceCommand)
	return data
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

async function deleteStaticIp(staticIpName) {
	const deleteStaticIpCommand = new DeleteStaticIpCommand({ staticIpName: staticIpName })
	const data = await client.send(deleteStaticIpCommand)
	return data
}

async function getStaticIp(staticIpName) {
	const getStaticIpCommand = new GetStaticIpCommand({ staticIpName: staticIpName })
	const data = await client.send(getStaticIpCommand)
	return data.staticIp.ipAddress
}

async function waitForRunningState(instanceName) {
	console.log("waiting for instance to be running")
	let state = await getInstanceState(instanceName)
	let startTime = Date.now()
	while ((!state || state.name != "running") && Date.now() - startTime < runningStateCheckTimeout * 1000) {
		await new Promise(resolve => setTimeout(resolve, runningStateCheckInterval * 1000))
		state = await getInstanceState(instanceName)
		console.log("instance state is " + (state.name || "undefined"))
	}
}

async function main() {
	//first check if an instance with the same name already exists
	console.log("checking if instance already exists")
	let instance
	try {
		instance = await getInstance(process.env.INSTANCE_NAME)
	} catch (err) { }

	//if instance exists and EXISTING_RESOURCE_BEHAVIOR is "fail", fail the action
	if (process.env.EXISTING_RESOURCE_BEHAVIOR == "fail" && instance) {
		throw new Error("instance with name " + process.env.INSTANCE_NAME + " already exists")
	}

	//if instance exists and EXISTING_RESOURCE_BEHAVIOR is "replace", delete the instance
	if (process.env.EXISTING_RESOURCE_BEHAVIOR == "replace" && instance) {
		console.log("deleting existing instance...")
		await deleteInstance(process.env.INSTANCE_NAME)

		//wait for instance to be deleted
		let instanceDeleted = false
		while (!instanceDeleted) {
			try {
				instance = await getInstance(process.env.INSTANCE_NAME)
			} catch (err) {
				instanceDeleted = true
			}
			await new Promise(resolve => setTimeout(resolve, 1000))
		}
		instance=undefined
		console.log("instance deleted")
	}

	//only create a new instance if one doesn't already exist
	if (!instance) {
		console.log("creating instance")
		await createInstance(process.env.INSTANCE_NAME)
	}

	//wait for instance to be running
	await waitForRunningState(process.env.INSTANCE_NAME)

	//get instance public ip
	instance = await getInstance(process.env.INSTANCE_NAME)
	let publicIp = instance.instance.publicIpAddress

	//create static ip
	if (process.env.CREATE_STATIC_IP == "true") {
		//first check if a static ip with the same name already exists
		console.log("checking if static ip already exists...")
		let staticIp
		try {
			staticIp = await getStaticIp(`${process.env.INSTANCE_NAME}-static-ip`)
		} catch (err) { }

		//if static ip exists and EXISTING_RESOURCE_BEHAVIOR is "fail", fail the action
		if (process.env.EXISTING_RESOURCE_BEHAVIOR == "fail" && staticIp) {
			throw new Error("static ip with name " + process.env.INSTANCE_NAME + "-static-ip already exists")
		}

		//if static ip exists and EXISTING_RESOURCE_BEHAVIOR is "replace", delete the static ip
		if (process.env.EXISTING_RESOURCE_BEHAVIOR == "replace" && staticIp) {
			console.log("deleting existing static ip...")
			await deleteStaticIp(`${process.env.INSTANCE_NAME}-static-ip`)

			//wait for static ip to be deleted
			let staticIpDeleted = false
			while (!staticIpDeleted) {
				try {
					staticIp = await getStaticIp(`${process.env.INSTANCE_NAME}-static-ip`)
				} catch (err) {
					staticIpDeleted = true
				}
				await new Promise(resolve => setTimeout(resolve, 1000))
			}
			staticIp=undefined
			console.log("static ip deleted")
		}

		console.log("creating static ip")
		await allocateStaticIp()
		await attachStaticIp(process.env.INSTANCE_NAME, `${process.env.INSTANCE_NAME}-static-ip`)
		staticIp = await getStaticIp(`${process.env.INSTANCE_NAME}-static-ip`)
		publicIp = staticIp
	}

	console.log("instance public ip is " + publicIp)

	//write public ip to file for actions to read
	fs.writeFileSync("./instance_public_ip.txt", publicIp)
	fs.writeFileSync("./host_name.txt", "bitnami")
}

main()


