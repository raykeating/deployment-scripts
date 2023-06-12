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

async function getRecords() {
	const url = `https://api.godaddy.com/v1/domains/${domain}/records/A/@`
	const headers = {
		'Authorization': `sso-key ${publicKey}:${privateKey}`,
		'Content-Type': 'application/json'
	}
	const response = await axios.get(url, { headers })
	return response
}

const hostIP = process.env.HOST_IP
const domainPaths = getDomainPaths()
const rootDomain = domainPaths.rootDomain
const subDomain = domainPaths.subDomain
const strapiDomainPrefix = domainPaths.strapiDomainPrefix
addARecord(subDomain, hostIP, rootDomain)
addARecord(`${strapiDomainPrefix}.${subDomain}`, hostIP, rootDomain)
addARecord(`www.${subDomain}`, hostIP, rootDomain)
//getRecords()
//console.log(rootDomain, subDomain, `${strapiDomainPrefix}.${subDomain}`, `www.${subDomain}`)



