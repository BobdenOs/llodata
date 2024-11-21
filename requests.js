const fs = require('fs')
const child_process = require('child_process')

const requests = fs.readFileSync(__dirname + '/requests', 'utf-8')

const odata = child_process.spawn('./odata', { stdio: ['pipe', 'pipe', 'pipe'] })

process.on('beforeExit', () => {
  odata.kill()
})

odata.on('exit', (code) => {
  process.exit(code)
})

process.stdout.write('started\n')

let counter = 0
let start = performance.now()
let last = start
if (odata.stdout) odata.stdout.on('data', chunk => {
  counter += chunk.toString().split('\n').length
  const now = performance.now()
  if (now - last > 1000) {
    process.stdout.write(`${(counter / ((now - start) / 1000))>>>0} req/s\n`)
    last = now
  }
})
if (odata.stderr) odata.stderr.on('data', chunk => process.stderr.write(chunk))

  ; (async () => {
    const chunk = Buffer.from(new Array(1000).fill(requests).join(''))
    for (let i = 0; ; i++) {
      odata.stdin.write(chunk)
      await new Promise(res => setTimeout(res))
    }
  })()

