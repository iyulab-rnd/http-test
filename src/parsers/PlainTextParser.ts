import { ContentTypeParser, ParserContext } from './ContentTypeParser';

export class PlainTextParser implements ContentTypeParser {
  constructor(private context: ParserContext) {}

  parseBody(body: string): string {
    return this.context.variableManager.replaceVariables(body);
  }

  isBodyStart(): boolean {
    return true;
  }

  isBodyEnd(): boolean {
    return false;
  }
}