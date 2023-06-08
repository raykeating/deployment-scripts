const { LightsailClient, GetBlueprintsCommand, GetBundlesCommand } = require("@aws-sdk/client-lightsail")
require('dotenv').config()

const client = new LightsailClient({
	region: process.env.AWS_REGION,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
	}
})


async function printBundles() {
	const bundlesCommand = new GetBundlesCommand({ includeInactive: false })
	const data = await client.send(bundlesCommand)
	const proccessedData = data.bundles.map(bundle => 
		`Bundle ID: ${bundle.bundleId}   Name: ${bundle.name}   CPU Count: ${bundle.cpuCount}   Ram Size: ${bundle.ramSizeInGb}` 
	)
	console.log(proccessedData)
}

printBundles()