import vm from 'vm';
import { readFile } from '../utils/fileUtils';

export async function loadCustomValidator(functionPath: string | undefined): Promise<Function> {
  if (!functionPath) {
    throw new Error('Custom validator function path is not provided');
  }

  const script = await readFile(functionPath);
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