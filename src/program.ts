import { run } from './cli';

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0];
  const options = {
    verbose: args.includes('--verbose'),
    var: args.find((arg) => arg.startsWith('--var='))?.split('=')[1]
  };

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

main();