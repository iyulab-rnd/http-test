import { Variables } from '../types';
export declare function readFile(filePath: string): Promise<string>;
export declare function loadVariables(filePath: string): Promise<Variables>;
export declare function fileExists(filePath: string): Promise<boolean>;
