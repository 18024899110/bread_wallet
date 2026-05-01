const BASE = 'http://localhost:5000'

async function main() {
    console.log('Testing /api/verify/scenarios...')

    const res = await fetch(BASE + '/api/verify/scenarios')
    const data = await res.json()

    if (res.status !== 200) throw new Error('Expected 200 but got ' + res.status)

    const mustHave = ['bank', 'border', 'driving', 'address', 'healthcare']
    for (const key of mustHave) {
        if (!data[key]) throw new Error('Missing scenario key: ' + key)
        if (!data[key].label) throw new Error('Scenario ' + key + ' has no label')
        console.log('PASS  scenario "' + key + '" exists with label: ' + data[key].label)
    }

    const total = Object.keys(data).length
    if (total < 5) throw new Error('Expected at least 5 scenarios but got ' + total)
    console.log('PASS  /api/verify/scenarios returned ' + total + ' scenarios total')
}

main().catch(err => {
    console.log('FAIL  ' + err.message)
    process.exit(1)
})
