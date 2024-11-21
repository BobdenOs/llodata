
export type CharList = (string | number)[]

export const ALPHA: CharList = []; // %x41-5A / %x61-7A
for (let i = 0x41; i <= 0x5A; i++) {
  ALPHA.push(String.fromCharCode(i))
  ALPHA.push(String.fromCharCode(i + 0x20))
}

export const DIGIT: CharList = []
for (let i = 0x30; i <= 0x39; i++) {
  DIGIT.push(String.fromCharCode(i))
}

export const ALPHANUM: CharList = ALPHA.concat(DIGIT)

export const ATOF: CharList = ['A', 'B', 'C', 'D', 'E', 'F']
export const HEX: CharList = DIGIT.concat(ATOF)

export const DQUOTE: CharList = ['"']
export const SP: CharList = [' ']
export const HTAB: CharList = ['\t']

export const VCHAR: CharList = []
for (let i = 0x21; i <= 0x7E; i++) {
  VCHAR.push(String.fromCharCode(i))
}

export const OPEN: CharList = ['(']
export const CLOSE: CharList = [')']
export const COMMA: CharList = [',']