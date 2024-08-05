import { ContentTypeParser, ParserContext } from './ContentTypeParser';

export class XmlParser implements ContentTypeParser {
  constructor(private context: ParserContext) {}

  parseBody(body: string): string {
    return this.context.variableManager.replaceVariables(body);
  }

  isBodyStart(line: string): boolean {
    return line.trim().startsWith('<?xml') || line.trim().startsWith('<');
  }

  isBodyEnd(line: string): boolean {
    return line.trim().endsWith('>');
  }
}