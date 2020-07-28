// @ts-check

const { generate } = require('@graphql-codegen/cli')
const path = require('path')

const ROOT_FOLDER = path.resolve(__dirname, '../../')

const WEB_FOLDER = path.resolve(ROOT_FOLDER, './web')
const SHARED_FOLDER = path.resolve(ROOT_FOLDER, './shared')
const SCHEMA_PATH = path.join(ROOT_FOLDER, './cmd/frontend/graphqlbackend/schema.graphql')

const SHARED_DOCUMENTS_GLOB = [`${SHARED_FOLDER}/src/**/*.{ts,tsx}`, `!${SHARED_FOLDER}/src/testing/**/*.*`]

const WEB_DOCUMENTS_GLOB = [
  `${WEB_FOLDER}/src/**/*.{ts,tsx}`,
  `!${WEB_FOLDER}/src/regression/**/*.*`,
  `!${WEB_FOLDER}/src/end-to-end/**/*.*`,
]

const plugins = [`${SHARED_FOLDER}/dev/extractGraphQlOperationCodegenPlugin.js`, 'typescript', 'typescript-operations']

const codeToInsertIntoTypes = `
export type ID = string
export type GitObjectID = string
export type DateTime = string
export type JSONCString = string

export interface IGraphQLResponseRoot {
    data?: IQuery | IMutation
    errors?: IGraphQLResponseError[]
}

export interface IGraphQLResponseError {
    /** Required for all errors */
    message: string
    locations?: IGraphQLResponseErrorLocation[]
    /** 7.2.2 says 'GraphQL servers may provide additional entries to error' */
    [propName: string]: any
}

export interface IGraphQLResponseErrorLocation {
    line: number
    column: number
}
`

/**
 * Generates TypeScript files with types for all GraphQL operations.
 *
 * @param {{ watch?: boolean }} [options]
 */
async function generateGraphQlOperations({ watch }) {
  await generate(
    {
      watch,
      schema: SCHEMA_PATH,
      hooks: {
        afterOneFileWrite: 'prettier --write',
      },
      config: {
        preResolveTypes: true,
        operationResultSuffix: 'Result',
        omitOperationSuffix: true,
        skipTypename: true,
        namingConvention: 'keep',
        declarationKind: 'interface',
        avoidOptionals: true,
        scalars: {
          DateTime: 'string',
          JSON: 'object',
          JSONValue: 'unknown',
          GitObjectID: 'string',
          JSONCString: 'string',
        },
      },
      generates: {
        [path.join(ROOT_FOLDER, './web/src/graphql-operations.ts')]: {
          documents: WEB_DOCUMENTS_GLOB,
          config: {
            onlyOperationTypes: true,
            noExport: false,
            enumValues: '../../shared/src/graphql/schema',
            interfaceNameForOperations: 'WebGraphQlOperations',
          },
          plugins,
        },

        [path.join(ROOT_FOLDER, './shared/src/graphql-operations.ts')]: {
          documents: SHARED_DOCUMENTS_GLOB,
          config: {
            onlyOperationTypes: true,
            noExport: false,
            enumValues: './graphql/schema',
            interfaceNameForOperations: 'SharedGraphQlOperations',
          },
          plugins,
        },

        [path.join(ROOT_FOLDER, './shared/src/graphql/schema.ts')]: {
          config: {
            namingConvention: {
              typeNames: 'pascalCase',
              enumValues: 'keep',
            },
            skipTypename: false,
            nonOptionalTypename: true,
            avoidOptionals: {
              field: true,
              inputValue: false,
              object: true,
            },
            typesPrefix: 'I',
            enumPrefix: false,
            insertCodeSnippet: codeToInsertIntoTypes,
          },
          plugins: [`${SHARED_FOLDER}/dev/insertCodeQlCodegenPlugin.js`, 'typescript'],
        },
      },
    },
    true
  )
}

module.exports = { generateGraphQlOperations, SHARED_DOCUMENTS_GLOB, WEB_DOCUMENTS_GLOB }
