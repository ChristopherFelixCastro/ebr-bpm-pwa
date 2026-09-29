import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import openapiTS, { astToString } from 'openapi-typescript'
import { openApiDocument } from '../../api/src/openapi.ts'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const outputDirectory = path.resolve(scriptDirectory, '../src/api/generated')
const outputFile = path.join(outputDirectory, 'schema.d.ts')
const ast = await openapiTS(openApiDocument as never)

await mkdir(outputDirectory, { recursive: true })
await writeFile(outputFile, astToString(ast), 'utf8')
