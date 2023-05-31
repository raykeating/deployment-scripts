require('dotenv').config()
const { LightsailClient, CreateInstancesCommand, GetBlueprintsCommand, GetBundlesCommand } = require("@aws-sdk/client-lightsail")

//adds PUBLIC_SSH_KEY to authorized_keys and changes permissions
const userDataScript = `#!/bin/sh
sudo mkdir ~/.ssh
sudo echo "${process.env.PUBLIC_SSH_KEY}" >> ~/.ssh/authorized_keys
sudo chmod 700 ~/.ssh
sudo chmod 600 ~/.ssh/authorized_keys
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
	console.log(data)
}

//createInstance("austin-auto-deploy-test-instance")
createInstance(process.env.INSTANCE_NAME)

