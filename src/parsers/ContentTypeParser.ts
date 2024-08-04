import { HttpRequest } from '../types';

export interface ContentTypeParser {
  parseBody(body: string, boundary?: string): string;
  isBodyStart(line: string, boundary?: string): boolean;
  isBodyEnd(line: string, boundary?: string): boolean;
}

export interface ParserContext {
  request: HttpRequest;
  variableManager: VariableManager;
}