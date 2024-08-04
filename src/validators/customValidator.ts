import vm from 'vm';
import { readFile } from '../utils/fileUtils';
import path from 'path';
import { HttpResponse, CustomValidatorContext } from '../types';

export async function loadCustomValidator(functionPath: string, baseDir: string): Promise<(response: HttpResponse, context: CustomValidatorContext) => void> {
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

  return context.module.exports as (response: HttpResponse, context: CustomValidatorContext) => void;
}