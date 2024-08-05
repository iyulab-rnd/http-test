import { ContentTypeParser } from './ContentTypeParser';
import FormData from 'form-data';

export class FileUploadParser implements ContentTypeParser {
  
  parseBody(body: string): FormData {
    const formData = new FormData();
    const lines = body.split('\n');
    let currentName = '';
    let currentFilename = '';
    let currentContentType = '';
    let isReadingContent = false;
    let content = '';

    for (const line of lines) {
      if (line.startsWith('Content-Disposition:')) {
        const nameMatch = line.match(/name="([^"]+)"/);
        const filenameMatch = line.match(/filename="([^"]+)"/);
        if (nameMatch) currentName = nameMatch[1];
        if (filenameMatch) currentFilename = filenameMatch[1];
      } else if (line.startsWith('Content-Type:')) {
        currentContentType = line.split(':')[1].trim();
      } else if (line.trim() === '') {
        isReadingContent = true;
      } else if (isReadingContent) {
        content += line + '\n';
      }
    }

    if (currentName) {
      if (currentFilename) {
        formData.append(currentName, Buffer.from(content), {
          filename: currentFilename,
          contentType: currentContentType,
        });
      } else {
        formData.append(currentName, content.trim());
      }
    }

    return formData;
  }

  isBodyStart(line: string): boolean {
    return line.startsWith('Content-Disposition:');
  }

  isBodyEnd(): boolean {
    return false;
  }
}