import { logVerbose } from '../utils/logger';
import { ContentTypeParser, ParserContext } from './ContentTypeParser';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { basename } from 'path';

export class MultipartFormDataParser implements ContentTypeParser {
  private bodyBuffer: string[] = [];
  private isParsingBody = false;

  constructor(private context: ParserContext) {}

  parseBody(body: string, boundary?: string): any {
    if (!boundary) return body;
  
    const formData = new FormData();
    const parts = body.split(`--${boundary}`);
    parts.forEach(part => {
      if (part.trim() && !part.includes('--')) {
        const [headerSection, ...contentSections] = part.split('\r\n\r\n');
        const content = contentSections.join('\r\n\r\n').trim();
        const nameMatch = headerSection.match(/name="([^"]+)"/);
        const filenameMatch = headerSection.match(/filename="([^"]+)"/);
        if (nameMatch && nameMatch[1]) {
          if (filenameMatch && filenameMatch[1]) {
            // 파일 업로드 처리
            const filename = filenameMatch[1];
            const buffer = Buffer.from(content, 'binary');
            formData.append(nameMatch[1], buffer, { filename });
          } else {
            formData.append(nameMatch[1], content);
          }
        }
      }
    });
    
    logVerbose(`Parsed multipart form-data: ${this.formDataToString(formData)}`);
    return formData;
  }
  
  isBodyStart(line: string, boundary?: string): boolean {
    const result = !!boundary && line.trim().startsWith(`--${boundary}`);
    if (result) {
      this.isParsingBody = true;
      this.bodyBuffer = [line];
    }
    logVerbose(`isBodyStart called with line: "${line}", boundary: "${boundary}", result: ${result}`);
    return result;
  }

  isBodyEnd(line: string, boundary?: string): boolean {
    if (this.isParsingBody) {
      this.bodyBuffer.push(line);
    }
    const result = !!boundary && line.trim() === `--${boundary}--`;
    logVerbose(`isBodyEnd called with line: "${line}", boundary: "${boundary}", result: ${result}`);
    return result;
  }

  private formDataToString(formData: FormData): string {
    let result = '';
    const buffer = formData.getBuffer().toString();
    const parts = buffer.split('\r\n');
    for (let i = 0; i < parts.length; i += 4) {
      const nameMatch = parts[i].match(/name="([^"]+)"/);
      if (nameMatch && nameMatch[1]) {
        const name = nameMatch[1];
        const value = parts[i + 2];
        result += `${name}: ${value}\n`;
      }
    }
    return result;
  }
}