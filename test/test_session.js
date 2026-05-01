const BASE = 'http://localhost:5000'

async function main() {
    console.log('Testing session-related endpoints...')

    const r1 = await fetch(BASE + '/api/verify/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: 'not_a_real_scenario' })
    })
    if (r1.status !== 400) throw new Error('Expected 400 for bad scenario but got ' + r1.status)
    const d1 = await r1.json()
    if (!d1.error) throw new Error('Expected error field in response')
    console.log('PASS  /start returns 400 for unknown scenario')

    const r2 = await fetch(BASE + '/api/verify/status/totally-fake-session-id-abc123')
    if (r2.status !== 404) throw new Error('Expected 404 for missing session but got ' + r2.status)
    const d2 = await r2.json()
    if (!d2.error) throw new Error('Expected error field in 404 response')
    console.log('PASS  /status returns 404 for unknown sessionId')

    const r3 = await fetch(BASE + '/api/verify/face-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    })
    if (r3.status !== 400) throw new Error('Expected 400 when params missing but got ' + r3.status)
    const d3 = await r3.json()
    if (d3.match !== false) throw new Error('Expected match=false in error response')
    console.log('PASS  /face-check returns 400 when sessionId and livePhoto are missing')

    const r4 = await fetch(BASE + '/api/verify/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'some-state', session_id: 'some-id' })
    })
    if (r4.status !== 200) throw new Error('Expected 200 from callback but got ' + r4.status)
    const t4 = await r4.text()
    if (t4.trim() !== 'ok') throw new Error('Expected body "ok" but got ' + t4)
    console.log('PASS  /callback returns 200 with body "ok"')
}

main().catch(err => {
    console.log('FAIL  ' + err.message)
    process.exit(1)
})
