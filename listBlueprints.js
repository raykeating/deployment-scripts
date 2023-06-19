const { LightsailClient, GetBlueprintsCommand } = require("@aws-sdk/client-lightsail")
require('dotenv').config()

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
	const proccessedData = data.blueprints.map(blueprint =>
		`Blueprint ID: ${blueprint.blueprintId}   Name: ${blueprint.name}   Version: ${blueprint.version}`
	)
	console.log(proccessedData)
}

printBlueprints()