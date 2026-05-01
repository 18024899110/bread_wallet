const BASE = 'http://localhost:5000'

async function main() {
    console.log('Testing /health...')

    const res = await fetch(BASE + '/health')
    const data = await res.json()

    if (res.status !== 200) throw new Error('Expected 200 but got ' + res.status)
    if (data.status !== 'ok') throw new Error('Expected body.status=ok but got ' + data.status)

    console.log('PASS  /health returns 200 with { status: "ok" }')
}

main().catch(err => {
    console.log('FAIL  ' + err.message)
    process.exit(1)
})
