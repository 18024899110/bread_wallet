const { execSync } = require('child_process')
const path = require('path')

const tests = ['test_health.js', 'test_scenarios.js', 'test_session.js']
let allPassed = true

for (const t of tests) {
    console.log('\n=== ' + t + ' ===')
    try {
        execSync('node ' + path.join(__dirname, t), { stdio: 'inherit' })
    } catch {
        allPassed = false
    }
}

console.log('\n==============================')
if (allPassed) {
    console.log('All tests passed!')
} else {
    console.log('Some tests FAILED!')
    process.exit(1)
}
