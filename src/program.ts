#!/usr/bin/env node

import { run } from './cli';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0];
  const options = {
    verbose: args.includes('--verbose'),
    var: args.find((arg) => arg.startsWith('--var='))?.split('=')[1]
  };

  if (args.includes('--version')) {
    printVersion();
    process.exit(0);
  }

  if (!filePath) {
    console.error('Please provide a file path');
    process.exit(1);
  }

  try {
    await run(filePath, options);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

function printVersion() {
  const packageJsonPath = path.resolve(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log(`Version: ${packageJson.version}`);
}

main();
