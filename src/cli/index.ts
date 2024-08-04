import path from 'path';
import { RunOptions, HttpRequest } from '../types';
import { TestManager } from '../core/TestManager';
import { VariableManager } from '../core/VariableManager';
import { 
  logInfo, logError, setVerbose 
} from '../utils/logger';
import { fileExists, loadVariables } from '../utils/fileUtils';
import { HttpFileParser } from '../core/HttpFileParser';

export async function run(filePath: string, options: RunOptions): Promise<void> {
  setVerbose(!!options.verbose);

  try {
    logInfo('Starting test run...');

    const variableManager = new VariableManager();
    await loadVariablesFile(variableManager, filePath, options.var);

    // HttpFileParser를 사용하여 HTTP 요청을 파싱
    const httpFileParser = new HttpFileParser(variableManager);
    const requests: HttpRequest[] = await httpFileParser.parse(filePath);

    const baseDir = path.dirname(filePath); // baseDir을 설정합니다.
    const testManager = new TestManager(baseDir); // baseDir을 TestManager에 전달합니다.
    const results = await testManager.run(requests, options);

    // 결과 처리 로직
    const failedTests = results.filter(result => !result.passed);
    if (failedTests.length > 0) {
      logError(`${failedTests.length} test(s) failed.`);
      process.exit(1);
    } else {
      logInfo('All tests passed successfully.');
    }
  } catch (error) {
    handleError(error);
  }
}

async function loadVariablesFile(variableManager: VariableManager, filePath: string, varFile: string | undefined): Promise<void> {
  const variableFile = varFile || path.join(path.dirname(filePath), 'variables.json');
  if (await fileExists(variableFile)) {
    logInfo(`Loading variables from ${variableFile}`);
    const variables = await loadVariables(variableFile);
    variableManager.setVariables(variables);
  } else {
    logInfo('No variable file specified or found. Proceeding without external variables.');
  }
}

function handleError(error: unknown): void {
  logError('Error running tests:');
  if (error instanceof AggregateError) {
    error.errors.forEach((e, index) => {
      logError(`Error ${index + 1}:`);
      logError(e instanceof Error ? e.stack || e.message : String(e));
    });
  } else if (error instanceof Error) {
    logError(error.stack || error.message);
  } else {
    logError(String(error));
  }
  process.exit(1);
}

// CLI 진입점
if (require.main === module) {
  const args = process.argv.slice(2);
  const filePath = args[0];
  const options: RunOptions = {
    verbose: args.includes('--verbose'),
    var: args.find((arg) => arg.startsWith('--var='))?.split('=')[1]
  };

  if (!filePath) {
    console.error('Please provide a file path');
    process.exit(1);
  }

  run(filePath, options).catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
