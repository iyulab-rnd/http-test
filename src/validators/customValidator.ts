import vm from "vm";
import { readFile } from "../utils/fileUtils";
import { HttpResponse, CustomValidatorContext } from "../types";

export async function loadCustomValidator(
  functionPath: string
): Promise<(response: HttpResponse, context: CustomValidatorContext) => void> {
  const script = await readFile(functionPath);

  // We use 'any' here because we're dealing with a dynamically created context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const context: any = {
    module: { exports: {} },
    require,
    console,
  };

  vm.createContext(context);
  vm.runInContext(script, context);

  if (typeof context.module.exports !== "function") {
    throw new Error("Custom validator must export a function");
  }

  return context.module.exports as (
    response: HttpResponse,
    context: CustomValidatorContext
  ) => void;
}
