import { HttpResponse, CustomValidatorContext } from "../types";
export declare function loadCustomValidator(functionPath: string): Promise<(response: HttpResponse, context: CustomValidatorContext) => void>;
