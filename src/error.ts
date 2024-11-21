import { LLParse } from 'llparse'

export let errors: ReturnType<typeof Errors>

export function Errors(p: LLParse) {
  let id = 0
  const ret = {
    UNREACHABLE: p.error(id++, 'UNREACHABLE'),
    ERR_NO_EOF: p.error(id++, 'Expected EOF as final character'),
    ERR_COMPLETE: p.error(id++, 'Failed to finish parsing url'),

    ERR_URI_START: p.error(id++, 'Expected $batch, $metadata or / at start of url'),
    ERR_BATCH_START: p.error(id++, 'Expected ? or EOF after $batch'),
    ERR_METADATA_START: p.error(id++, 'Expected Metadata options, context or EOF'),
    ERR_RESOURCE_PATH_START: p.error(id++, 'Expected / at start of path'),
    ERR_CUSTOM_QUERY_NAME: p.error(id++, 'Expected query name'),
    ERR_CUSTOM_QUERY_VALUE: p.error(id++, 'Expected query value'),
    ERR_CONTEXT_START: p.error(id++, 'Expected context'),
    ERR_KEY_PREDICATE_START: p.error(id++, 'Expected ( at start of key predicate'),
    ERR_KEY_PREDICATE_SEP: p.error(id++, 'Expected , between of key predicate compares'),

    ERR_INVALID_IDENTIFIER: p.error(id++, 'Invalid character in identifier'),
  }
  errors = ret
  return ret
}
