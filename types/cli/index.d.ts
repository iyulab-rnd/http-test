import { RunOptions } from "../types";
/**
 * Runs the test suite based on the provided file path and options.
 * @param filePath - The path to the HTTP file.
 * @param options - Run options including verbose mode and variable file.
 */
export declare function run(filePath: string, options: RunOptions): Promise<void>;
