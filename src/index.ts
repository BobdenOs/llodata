import { LLParse } from 'llparse'
import { errors, Errors } from './error'
import { odataIdentifier } from './common'

const p = new LLParse('odata_parser')

Errors(p)

// src: https://github.com/oasis-tcs/odata-abnf/blob/main/abnf/odata-abnf-construction-rules.txt

p.property('i64', 'parent')
p.property('i8', 'method')
p.property('i8', 'path_key_type')
p.property('i8', 'path_state')

// Types
const uri = p.node('uri')

const complete = p.node('complete')
complete
  .match('\n', p.invoke(p.code.match('on_complete'), {
    0: uri// Restart
  }, errors.ERR_COMPLETE))
  .otherwise(errors.ERR_NO_EOF)

const odataRelativeUri = p.node('odataRelativeUri')

const batchOptionsOptional = p.node('batchOptionsOptional')

const metadataOptionsOrContext = p.node('metadataOptionsOrContext')

// TODO: $entity
// const entityOptions = p.node('entityOptions');
// const optionallyQualifiedEntityTypeName = p.node('optionallyQualifiedEntityTypeName');
// const entityCastOptions = p.node('entityCastOptions');

const resourcePath = p.node('resourcePath')
const resourcePathSegEnd = p.node('resourcePathSegEnd')
const resourcePathSegSpawn = p.span(p.code.span('on_path_seg'))

const collectionNavPath = p.node('collectionNavPath')

const keyPredicate = p.node('keyPredicate')
const keyPredicateClose = p.node('keyPredicateClose')
const simpleKey = p.node('simpleKey')
const simpleKeySpan = p.span(p.code.span('on_path_key_simple'))
// const compoundKey = p.node('compoundKey')
const compoundKeySplit = p.node('compoundKeySplit')

const keyValuePair = p.node('keyValuePair')
const keyProperty = p.node('keyProperty')
const keyValue = p.node('keyValue')
const keyPropertySpan = p.span(p.code.span('on_path_key_property'))
const keyValueSpan = p.span(p.code.span('on_path_key_value'))

const context = p.node('context')
const contextFragment = p.node('contextFragment')

const customQueryOption = p.node('customQueryOption')
const customQueryOptionName = p.node('customQueryOptionName')
const customQueryOptionNameStart = p.node('customQueryOptionNameStart')
const customQueryOptionNameSpan = p.span(p.code.span('on_query_name'))
const customQueryOptionValue = p.node('customQueryOptionValue')
const customQueryOptionValueStart = p.node('customQueryOptionValueStart')
const customQueryOptionValueSpan = p.span(p.code.span('on_query_value'))

uri.otherwise(p.invoke(p.code.match('on_start'), {
  0: odataRelativeUri// continue
}, errors.ERR_COMPLETE))

// Type logic + flow
odataRelativeUri
  .match('$batch', batchOptionsOptional)
  .match('$metadata', metadataOptionsOrContext)
  // .match('$entity?', entityOptions)
  // .match('$entity/', optionallyQualifiedEntityTypeName )
  .peek('/', resourcePath)
  .otherwise(errors.ERR_URI_START)

batchOptionsOptional
  .peek('?', customQueryOption)
  .peek('\n', complete)
  .otherwise(errors.ERR_BATCH_START)

metadataOptionsOrContext
  .peek('?', customQueryOption)
  .peek('#', context)
  .peek('\n', complete)
  .otherwise(errors.ERR_METADATA_START)

const resourcePathOdataIdentifier = odataIdentifier(p, 'resourcePath')

const startResourcePath = resourcePathSegSpawn.start(resourcePathOdataIdentifier.start)

resourcePath
  .match('/', startResourcePath)
  .otherwise(errors.ERR_RESOURCE_PATH_START)

resourcePathOdataIdentifier.end
  .otherwise(resourcePathSegEnd)

resourcePathSegEnd
  .peek(['(', '/'], resourcePathSegSpawn.end(collectionNavPath))
  .peek('\n', resourcePathSegSpawn.end(complete))
  .otherwise(errors.ERR_INVALID_IDENTIFIER)

collectionNavPath
  .peek('/', resourcePath)
  .peek('(', keyPredicate)
  .otherwise(errors.UNREACHABLE)

keyPredicate
  .match('(', simpleKeySpan.start(keyPropertySpan.start(simpleKey)))
  .otherwise(errors.ERR_KEY_PREDICATE_START)

keyPredicateClose
  .match(')', resourcePath)
  .otherwise(errors.UNREACHABLE)

simpleKey
  .peek(')',
    p.invoke(p.code.update('path_key_type', 0))
      .otherwise(
        keyPropertySpan.end(// First close property span
          simpleKeySpan.end(// Overwrite property span with single key value
            keyPredicateClose
          )
        ))
  )
  .peek('=',
    p.invoke(p.code.update('path_key_type', 1))
      .otherwise(
        simpleKeySpan.end(// First close single key value span
          keyPropertySpan.end(// Overwrite with property span
            p.node('simpleKeySkipEq')
              .match('=', keyValueSpan.start(keyValue))
              .otherwise(errors.UNREACHABLE)
          )
        ))
  )
  .skipTo(simpleKey)

keyValuePair
  .otherwise(keyPropertySpan.start(keyProperty))

keyProperty
  .peek('=', keyPropertySpan.end(
    p.node('keyPropertySkipEq')
      .match('=', keyValueSpan.start(keyValue))
      .otherwise(errors.UNREACHABLE)
  ))
  .skipTo(keyProperty)

keyValue
  // TODO: check whether it makes sense to do strict type content checking
  .peek(',', keyValueSpan.end(compoundKeySplit))
  .peek(')', keyValueSpan.end(keyPredicateClose))
  .skipTo(keyValue)

compoundKeySplit
  .match(',', keyValuePair)
  .otherwise(errors.ERR_KEY_PREDICATE_SEP)

customQueryOption
  .skipTo(customQueryOptionNameStart)

customQueryOptionNameStart
  .match(['?', '&'], customQueryOptionNameSpan.start(customQueryOptionName))
  .otherwise(errors.ERR_CUSTOM_QUERY_NAME);

customQueryOptionName
  .peek('=', customQueryOptionNameSpan.end(customQueryOptionValueStart))
  .peek(['\n', '#'], errors.ERR_CUSTOM_QUERY_VALUE)
  .skipTo(customQueryOptionName)

customQueryOptionValueStart
  .match('=', customQueryOptionValueSpan.start(customQueryOptionValue))
  .otherwise(errors.ERR_CUSTOM_QUERY_VALUE)

customQueryOptionValue
  .peek('&', customQueryOptionValueSpan.end(customQueryOptionNameStart))
  .peek('\n', customQueryOptionValueSpan.end(complete))
  .skipTo(customQueryOptionValue)

context
  .match('#', contextFragment)
  .otherwise(errors.ERR_CONTEXT_START)

contextFragment
  .peek('\n', complete)
  .skipTo(contextFragment)

// Build

const fs = require('fs')
const path = require('path')

const artifacts = p.build(uri)
fs.mkdirSync(path.join(__dirname, '../build/'), { recursive: true })
fs.writeFileSync(path.join(__dirname, '../build/odata_parser.h'), artifacts.header)
fs.writeFileSync(path.join(__dirname, '../build/odata_parser.c'), artifacts.c)
