const cds = require('@sap/cds')
const cqn2odata = require('@sap/cds/libx/odata/parse/parser').parse

const native = require('bindings')('llodata');

let llparseCqn
let peggyCqn

const parser = new native.LLOData({
  cb: cqn => {
    llparseCqn = cqn
    // console.log(JSON.stringify(cqn))
  }
})

const count = 1 << 16

const uuid = cds.utils.uuid()
const url = `/entity(ID=${uuid})/column`
const bufferCount = 1
const urlBuffer = Buffer.from(new Array(bufferCount).fill(url).join('\n') + '\n')
const lliterations = count / bufferCount
let s = performance.now()
for (let i = 0; i < lliterations; i++) {
  parser.parse(urlBuffer)
}
const llparsedur = performance.now() - s

s = performance.now()
for (let i = 0; i < count; i++) {
  peggyCqn = cqn2odata(url)
}
const peggydur = performance.now() - s

console.log('llparse', count, llparsedur)
console.log(count / (llparsedur / 1000) >>> 0, 'req/s')
console.log(JSON.stringify(llparseCqn))

console.log('peggy', count, peggydur)
console.log(count / (peggydur / 1000) >>> 0, 'req/s')
console.log(JSON.stringify(peggyCqn))
