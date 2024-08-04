import { ContentTypeParser, ParserContext } from './ContentTypeParser';

export class JsonParser implements ContentTypeParser {
  constructor(private context: ParserContext) {}

  parseBody(body: string): string {
    return this.context.variableManager.replaceVariables(body);
  }

  isBodyStart(line: string): boolean {
    return line === '{' || line === '[';
  }

  isBodyEnd(line: string): boolean {
    return line === '}' || line === ']';
  }
}