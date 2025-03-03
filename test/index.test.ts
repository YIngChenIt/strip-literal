/* eslint-disable no-template-curly-in-string */
import { parse } from 'acorn'
import { expect, test } from 'vitest'
import { stripLiteral } from '../src'

function executeWithVerify(code: string, verifyAst = true) {
  code = code.trim()
  const result = stripLiteral(code)

  for (let i = 0; i < result.length; i++) {
    if (!result[i].match(/\s/))
      expect(result[i]).toBe(code[i])
  }

  expect(result.length).toBe(code.length)

  // make sure no syntax errors
  if (verifyAst)
    parse(result, { ecmaVersion: 'latest', sourceType: 'module' })

  return result
}

test('works', () => {
  expect(executeWithVerify(`
// comment1
const a = 'aaaa'
/* comment2 */
const b = "bbbb"
/*
  // comment3
*/
/* // comment3 */
// comment 4 /* comment 5 */
const c = \`ccc\${a}\`

let d = /re\\\\ge/g
    `)).toMatchSnapshot()
})

test('escape character', () => {
  expect(executeWithVerify(`
'1\\'1'
"1\\"1"
"1\\"1\\"1"
"1\\'1'\\"1"
"1'1'"
"1'\\'1\\''\\"1\\"\\""
'1"\\"1\\""\\"1\\"\\"'
'""1""'
'"""1"""'
'""""1""""'
"''1''"
"'''1'''"
"''''1''''"
  `)).toMatchSnapshot()
})

test('regexp affect', () => {
  expect(executeWithVerify(`
[
  /'/,
  '1',
  /"/,
  "1"
]
  `)).toMatchSnapshot()
})

test('strings comment nested', () => {
  expect(executeWithVerify(`
// comment 1 /* " */
const a = "a //"
// comment 2 /* " */
  `)).toMatchSnapshot()

  expect(executeWithVerify(`
// comment 1 /* ' */
const a = "a //"
// comment 2 /* ' */
  `)).toMatchSnapshot()

  expect(executeWithVerify(`
// comment 1 /* \` */
const a = "a //"
// comment 2 /* \` */
  `)).toMatchSnapshot()

  expect(executeWithVerify(`
const a = "a //"
console.log("console")
  `)).toMatchSnapshot()

  expect(executeWithVerify(`
const a = "a /*"
console.log("console")
const b = "b */"
  `)).toMatchSnapshot()

  expect(executeWithVerify(`
const a = "a ' "
console.log("console")
const b = "b ' "
  `)).toMatchSnapshot()

  expect(executeWithVerify(`
const a = "a \` "
console.log("console")
const b = "b \` "
  `)).toMatchSnapshot()
})

test('acorn syntax error', () => {
  expect(executeWithVerify(`
foo(\`fooo \${foo({ class: "foo" })} bar\`)
  `, false))
    .toMatchInlineSnapshot('"foo(`     \${foo({ class: \\"   \\" }      `)"')
})

test('template string nested', () => {
  let str = '`aaaa`'
  expect(executeWithVerify(str)).toMatchInlineSnapshot('"`    `"')

  str = '`aaaa` `aaaa`'
  expect(executeWithVerify(str)).toMatchInlineSnapshot('"`    ` `    `"')

  str = '`aa${a}aa`'
  expect(executeWithVerify(str)).toMatchInlineSnapshot('"`  \${a}  `"')

  str = '`aa${a + `a` + a}aa`'
  expect(executeWithVerify(str)).toMatchInlineSnapshot('"`  \${a + ` ` + a}  `"')

  str = '`aa${a + `a` + a}aa` `aa${a + `a` + a}aa`'
  expect(executeWithVerify(str)).toMatchInlineSnapshot('"`  \${a + ` ` + a}  ` `  \${a + ` ` + a}  `"')

  str = '`aa${a + `aaaa${c + (a = {b: 1}) + d}` + a}aa`'
  expect(executeWithVerify(str)).toMatchInlineSnapshot('"`  \${a + `    \${c + (a = {b: 1}) + d}` + a}  `"')

  str = '`aa${a + `aaaa${c + (a = {b: 1}) + d}` + a}aa` `aa${a + `aaaa${c + (a = {b: 1}) + d}` + a}aa`'
  expect(executeWithVerify(str)).toMatchInlineSnapshot('"`  \${a + `    \${c + (a = {b: 1}) + d}` + a}  ` `  \${a + `    \${c + (a = {b: 1}) + d}` + a}  `"')
})

test('backtick escape', () => {
  const str = [
    'this.error(`\\`new URL(url, import.meta.url)\\` is not supported in SSR.`)',
    'this.error(`\\\\`)',
    'this.error(`\\``)',
  ].join('\n')
  expect(executeWithVerify(str)).toMatchInlineSnapshot(`
    "this.error(\`                                                          \`)
    this.error(\`  \`)
    this.error(\`  \`)"
  `)
})

test('forgiving', () => {
  expect(stripLiteral(`
<script type="module">
  const rawModules = import.meta.globEager('/dir/*.json', {
    as: 'raw'
  })
  const globraw = {}
  Object.keys(rawModules).forEach((key) => {
    globraw[key] = JSON.parse(rawModules[key])
  })
  document.querySelector('.globraw').textContent = JSON.stringify(
    globraw,
    null,
    2
  )
</script>
`)).toMatchInlineSnapshot(`
  "
  <script type=\\"      \\">
    const rawModules = import.meta.globEager('           ', {
      as: '   '
    })
    const globraw = {}
    Object.keys(rawModules).forEach((key) => {
      globraw[key] = JSON.parse(rawModules[key])
    })
    document.querySelector('        ').textContent = JSON.stringify(
      globraw,
      null,
      2
    )
  </script>
  "
`)
})

test('// in string', () => {
  const str = [
    'const url= `http://www.xx.com`;',
    'const url1= \'http://www.xx.com\';',
    'onMounted(() => console.log(123))',
    'const str = `hello world`',
    '// Notes',
  ].join('\n')

  expect(executeWithVerify(str)).toMatchInlineSnapshot(`
    "const url= \`                 \`;
    const url1= \'                 \';
    onMounted(() => console.log(123))
    const str = \`           \`
            "
  `)
})
