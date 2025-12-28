import { version, repository } from '../package.json';
import { zodToTs } from 'zod-to-ts';
import ts from 'typescript';
import prettier from 'prettier';

// Helper to print TypeScript node as string
function printNode(node: ts.Node): string {
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const sourceFile = ts.createSourceFile('temp.ts', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  return printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);
}

// Import all schemas
import { ResourceSchema, TimestampsSchema } from '../src/types/schemas/base.schema';

import { LoginResponseSchema } from '../src/types/schemas/auth.schema';

import { SelfSchema, ResourceLimitsSchema } from '../src/types/schemas/user.schema';

import {
  EnvironmentSchema,
  EnvironmentCreateInputSchema,
  EnvironmentUpdateInputSchema,
  EnvironmentValueSchema,
  EnvironmentValueUpdateInputSchema
} from '../src/types/schemas/environment.schema';

import { CronSchema, CronCreateInputSchema, CronUpdateInputSchema } from '../src/types/schemas/cron.schema';

import { DomainSchema, DomainCreateInputSchema } from '../src/types/schemas/domain.schema';

import {
  WorkerSchema,
  WorkerCreateInputSchema,
  WorkerUpdateInputSchema,
  WorkerLanguageSchema
} from '../src/types/schemas/worker.schema';

import {
  DatabaseSchema,
  DatabaseCreateInputSchema,
  ColumnDefinitionSchema,
  ColumnInfoSchema,
  TableInfoSchema,
  TableDetailsSchema,
  CreateTableInputSchema
} from '../src/types/schemas/database.schema';

import {
  KvNamespaceSchema,
  KvNamespaceCreateInputSchema,
  KvNamespaceUpdateInputSchema
} from '../src/types/schemas/kv.schema';

import {
  StorageConfigSchema,
  StorageConfigCreateInputSchema,
  StorageConfigUpdateInputSchema
} from '../src/types/schemas/storage.schema';

// Schema definitions to generate
const schemas = [
  // Base schemas
  { schema: ResourceSchema, name: 'Resource' },
  { schema: TimestampsSchema, name: 'Timestamps' },

  // Auth
  { schema: LoginResponseSchema, name: 'LoginResponse' },

  // User
  { schema: SelfSchema, name: 'Self' },
  { schema: ResourceLimitsSchema, name: 'ResourceLimits' },

  // Environment
  { schema: EnvironmentSchema, name: 'Environment' },
  { schema: EnvironmentCreateInputSchema, name: 'EnvironmentCreateInput' },
  { schema: EnvironmentUpdateInputSchema, name: 'EnvironmentUpdateInput' },
  { schema: EnvironmentValueSchema, name: 'EnvironmentValue' },
  {
    schema: EnvironmentValueUpdateInputSchema,
    name: 'EnvironmentValueUpdateInput'
  },

  // Cron
  { schema: CronSchema, name: 'Cron' },
  { schema: CronCreateInputSchema, name: 'CronCreateInput' },
  { schema: CronUpdateInputSchema, name: 'CronUpdateInput' },

  // Domain
  { schema: DomainSchema, name: 'Domain' },
  { schema: DomainCreateInputSchema, name: 'DomainCreateInput' },

  // Worker
  { schema: WorkerSchema, name: 'Worker' },
  { schema: WorkerCreateInputSchema, name: 'WorkerCreateInput' },
  { schema: WorkerUpdateInputSchema, name: 'WorkerUpdateInput' },
  { schema: WorkerLanguageSchema, name: 'WorkerLanguage' },

  // Database
  { schema: DatabaseSchema, name: 'Database' },
  { schema: DatabaseCreateInputSchema, name: 'DatabaseCreateInput' },
  { schema: ColumnDefinitionSchema, name: 'ColumnDefinition' },
  { schema: ColumnInfoSchema, name: 'ColumnInfo' },
  { schema: TableInfoSchema, name: 'TableInfo' },
  { schema: TableDetailsSchema, name: 'TableDetails' },
  { schema: CreateTableInputSchema, name: 'CreateTableInput' },

  // KV
  { schema: KvNamespaceSchema, name: 'KvNamespace' },
  { schema: KvNamespaceCreateInputSchema, name: 'KvNamespaceCreateInput' },
  { schema: KvNamespaceUpdateInputSchema, name: 'KvNamespaceUpdateInput' },

  // Storage
  { schema: StorageConfigSchema, name: 'StorageConfig' },
  { schema: StorageConfigCreateInputSchema, name: 'StorageConfigCreateInput' },
  { schema: StorageConfigUpdateInputSchema, name: 'StorageConfigUpdateInput' }
];

async function generateTypes() {
  console.log('🔄 Generating TypeScript types from Zod schemas...');

  // Clean dist directory
  const distDir = `${import.meta.dir}/../dist`;
  console.log('  🧹 Cleaning dist directory...');
  try {
    await Bun.$`rm -rf ${distDir}`;
  } catch (error) {
    // Ignore error if dist doesn't exist
  }

  // FIRST PASS: Generate all types and build a map
  const typesMap = new Map<string, string>();
  let idCounter = 0;
  const auxiliaryTypeStore = {
    nextId: () => `T${idCounter++}`,
    definitions: new Map()
  };

  console.log('  📋 First pass: building types map...');
  // Map from name to type string (not type string to name, to avoid collision issues)
  const nameToTypeStr = new Map<string, string>();
  for (const { schema, name } of schemas) {
    try {
      const { node } = zodToTs(schema, { auxiliaryTypeStore });
      let typeStr = printNode(node);
      // Normalize whitespace for better matching
      typeStr = typeStr.replace(/\s+/g, ' ').trim();
      nameToTypeStr.set(name, typeStr);
      // Only add to typesMap if not already present (first wins for deduplication)
      if (!typesMap.has(typeStr)) {
        typesMap.set(typeStr, name);
      }
    } catch (error) {
      console.error(`❌ Failed to generate type for ${name}:`, error);
    }
  }

  // SECOND PASS: Replace nested types with references
  console.log('  🔄 Second pass: replacing nested types...');
  const finalTypesMap = new Map<string, string>();

  // Sort types by length (longest first) for better matching
  const sortedTypes = Array.from(typesMap.entries()).sort(([a], [b]) => b.length - a.length);

  for (const [name, typeStr] of nameToTypeStr) {
    let updatedTypeStr = typeStr;

    // Replace all occurrences of other types with their names (with I prefix)
    for (const [otherTypeStr, otherName] of sortedTypes) {
      if (otherName !== name && updatedTypeStr.includes(otherTypeStr)) {
        // Use a more precise replacement to avoid partial matches
        updatedTypeStr = updatedTypeStr.replaceAll(otherTypeStr, `I${otherName}`);
      }
    }

    finalTypesMap.set(name, updatedTypeStr);
  }

  // THIRD PASS: Recursive replacement until no more changes
  console.log('  🔁 Third pass: recursive replacement...');
  let changed = true;
  let iterations = 0;
  const maxIterations = 10;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const [name, typeStr] of finalTypesMap) {
      let updatedTypeStr = typeStr;

      for (const [otherTypeStr, otherName] of sortedTypes) {
        if (otherName !== name && updatedTypeStr.includes(otherTypeStr)) {
          const newStr = updatedTypeStr.replaceAll(otherTypeStr, `I${otherName}`);
          if (newStr !== updatedTypeStr) {
            updatedTypeStr = newStr;
            changed = true;
          }
        }
      }

      if (updatedTypeStr !== typeStr) {
        finalTypesMap.set(name, updatedTypeStr);
      }
    }
  }

  console.log(`  ✓ Completed in ${iterations} iteration(s)`);

  // Get git commit hash from env
  const gitCommit = process.env.GIT_COMMIT || process.env.GITHUB_SHA || '';
  const commitLine = gitCommit ? `\n * Build: ${gitCommit}` : '';

  // Generate output
  let output = `/**
 * Auto-generated TypeScript types from Zod schemas
 * DO NOT EDIT THIS FILE MANUALLY
 * Generated on: ${new Date().toISOString()}
 * Repository: ${repository.url}
 * Version: ${version}${commitLine}
 */

`;

  // Add global types
  output += `// Global types
export type hex = string;
export type uuid = string;
export type timestamp = number;
export type Dictionary<T> = Record<string, T>;

`;

  // Add all final types with "I" prefix
  for (const { name } of schemas) {
    const typeStr = finalTypesMap.get(name);
    if (typeStr) {
      output += `export type I${name} = ${typeStr};\n\n`;
    }
  }

  // Format with prettier
  console.log('  🎨 Formatting with prettier...');
  const formatted = await prettier.format(output, {
    parser: 'typescript',
    semi: true,
    singleQuote: true,
    trailingComma: 'all'
  });

  // Write types file
  await Bun.write(`${distDir}/types.d.ts`, formatted);

  // Generate package.json for npm publish
  const packageJson = {
    name: '@openworkers/api-types',
    version,
    license: 'MIT',
    type: 'module',
    private: false,
    main: './types.d.ts',
    types: './types.d.ts',
    exports: {
      '.': './types.d.ts'
    },
    description: 'TypeScript types for OpenWorkers API',
    keywords: ['openworkers', 'types', 'typescript'],
    repository: {
      type: 'git',
      url: 'git+https://github.com/openworkers/openworkers-api.git'
    },
    publishConfig: {
      access: 'public',
      registry: 'https://registry.npmjs.org/',
      provenance: true
    }
  };

  await Bun.write(`${distDir}/package.json`, JSON.stringify(packageJson, null, 2));

  // Copy LICENSE
  const license = await Bun.file(`${import.meta.dir}/../LICENSE`).text();
  await Bun.write(`${distDir}/LICENSE`, license);

  console.log(`✅ Types package generated successfully`);
  console.log(`   📦 Run "cd dist && npm publish" to publish`);
}

generateTypes().catch(console.error);
