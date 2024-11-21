import { LLParse } from "llparse"
import { errors } from "./error"
import { ALPHA, ALPHANUM } from './constants'

export const odataIdentifier = function (p: LLParse, kind: string) {
  const odataIdentifier = p.node(kind + '_odataIdentifier')
  const odataIdentifierEnd = p.node(kind + '_odataIdentifierEnd')
  const identifierLeadingCharacter = p.node(kind + '_identifierLeadingCharacter')
  const identifierCharacter = p.node(kind + '_identifierCharacter')

  odataIdentifier
    .skipTo(identifierLeadingCharacter)

  identifierLeadingCharacter
    .match(ALPHA.concat(['_']), identifierCharacter)
    .otherwise(odataIdentifierEnd)

  identifierCharacter
    .match(ALPHANUM.concat(['_']), identifierCharacter)
    .otherwise(odataIdentifierEnd)

  return { start: odataIdentifier, end: odataIdentifierEnd }
}