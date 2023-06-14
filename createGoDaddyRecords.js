require('dotenv').config()
const axios = require('axios')

function getDomainPaths() {
	const subDomainArray = process.env.DOMAIN.split('.')
	const rootDomain = [subDomainArray.pop(), subDomainArray.pop()].reverse().join('.')
	const subDomain = subDomainArray.join('.')
	const strapiDomainPrefix = process.env.STRAPI_DOMAIN_PREFIX
	return { rootDomain, subDomain, strapiDomainPrefix }
}

async function addARecord(name, value, domain) {
	const url = `https://api.godaddy.com/v1/domains/${domain}/records`
	const headers = {
		'Authorization': `sso-key ${process.env.GO_DADDY_PUBLIC_KEY}:${process.env.GO_DADDY_PRIVATE_KEY}`,
		'Content-Type': 'application/json'
	}
	const data =
		[{
			type: 'A',
			name: name,
			data: value,
			ttl: 600
		}]

	const response = await axios.patch(url, data, { headers })
	return response
}

async function doesARecordExist(name, domain) {
	const url = `https://api.godaddy.com/v1/domains/${domain}/records/A/${name}`
	const headers = {
		'Authorization': `sso-key ${process.env.GO_DADDY_PUBLIC_KEY}:${process.env.GO_DADDY_PRIVATE_KEY}`,
	}
	const response = await axios.get(url, {
		headers: headers
	})

	console.log(response)
	console.log(response.status)
	console.log(response.data)
	
	return response.status === 200 && response?.data?.length !== 0
}

async function getRecords() {
	const url = `https://api.godaddy.com/v1/domains/${domain}/records/A/@`
	const headers = {
		'Authorization': `sso-key ${process.env.GO_DADDY_PUBLIC_KEY}:${process.env.GO_DADDY_PRIVATE_KEY}`,
		'Content-Type': 'application/json'
	}
	const response = await axios.get(url, { headers })
	return response
}

async function main() {
	const hostIP = process.env.HOST_IP
	const domainPaths = getDomainPaths()
	const rootDomain = domainPaths.rootDomain
	const subDomain = domainPaths.subDomain
	const strapiDomainPrefix = domainPaths.strapiDomainPrefix

	//make sure none of the records already exist
	if (await doesARecordExist(subDomain, rootDomain)) throw new Error(`A record already exists for ${subDomain}`)
	if (await doesARecordExist(`${strapiDomainPrefix}.${subDomain}`, rootDomain)) throw new Error(`A record already exists for ${strapiDomainPrefix}.${subDomain}`)
	if (await doesARecordExist(`www.${subDomain}`, rootDomain)) throw new Error(`A record already exists for www.${subDomain}`)

	addARecord(subDomain, hostIP, rootDomain)
	addARecord(`${strapiDomainPrefix}.${subDomain}`, hostIP, rootDomain)
	addARecord(`www.${subDomain}`, hostIP, rootDomain)
	//getRecords()
	//console.log(rootDomain, subDomain, `${strapiDomainPrefix}.${subDomain}`, `www.${subDomain}`)
}

main() 





