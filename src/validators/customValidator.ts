import vm from 'vm';
import { readFile } from '../utils/fileUtils';
import path from 'path';

export async function loadCustomValidator(functionPath: string | undefined, baseDir: string): Promise<Function> {
  if (!functionPath) {
    throw new Error('Custom validator function path is not provided');
  }

  const resolvedPath = path.isAbsolute(functionPath) ? functionPath : path.join(baseDir, functionPath);
  const script = await readFile(resolvedPath);
  const context = {
    module: { exports: {} },
    require,
    console
  };

  vm.createContext(context);
  vm.runInContext(script, context);

  if (typeof context.module.exports !== 'function') {
    throw new Error('Custom validator must export a function');
  }

  return context.module.exports;
}
