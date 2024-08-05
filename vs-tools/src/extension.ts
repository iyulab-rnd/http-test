import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('HTTP Test');

  let disposable = vscode.commands.registerCommand('extension.http_test.run', (uri: vscode.Uri) => {
    const filePath = uri ? uri.fsPath : vscode.window.activeTextEditor?.document.fileName;
    if (!filePath || path.extname(filePath) !== '.http') {
      vscode.window.showErrorMessage('This command can only be run on .http files.');
      return;
    }

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder is open.');
      return;
    }

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine('Running HTTP Test...');

    exec(`npx http-test "${filePath}"`, { cwd: workspaceRoot }, (err, stdout, stderr) => {
      if (stdout) {
        outputChannel.appendLine(stdout);
      }
      if (stderr) {
        outputChannel.appendLine(`Stderr: ${stderr}`);
      }
      if (err) {
        outputChannel.appendLine(`Error: ${err.message}`);
      }
      outputChannel.appendLine('HTTP Test completed.');
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {
  if (outputChannel) {
    outputChannel.dispose();
  }
}