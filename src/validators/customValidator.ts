import vm from "vm";
import { readFile } from "../utils/fileUtils";
import { HttpResponse, CustomValidatorContext } from "../types";

export async function loadCustomValidator(
  functionPath: string
): Promise<(response: HttpResponse, context: CustomValidatorContext) => void> {
  const script = await readFile(functionPath);
  
  const sandbox = {
    module: { exports: {} },
    require: (moduleName: string) => {
      if (['path', 'fs', 'http'].includes(moduleName)) {
        return require(moduleName);
      }
      throw new Error(`Module ${moduleName} is not allowed`);
    },
    console,
  };

  vm.createContext(sandbox);
  vm.runInContext(script, sandbox);

  if (typeof sandbox.module.exports !== "function") {
    throw new Error("Custom validator must export a function");
  }

  return sandbox.module.exports as (
    response: HttpResponse,
    context: CustomValidatorContext
  ) => void;
}
