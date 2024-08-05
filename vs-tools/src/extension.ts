import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';

let outputChannel: vscode.OutputChannel;

function runHttpTest(uri: vscode.Uri | undefined, verbose: boolean) {
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

    const verboseFlag = verbose ? '--verbose' : '';
    exec(`npx -y @iyulab/http-test "${filePath}" ${verboseFlag}`, { cwd: workspaceRoot }, (err, stdout, stderr) => {
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
}

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('HTTP Test');

    let disposableRun = vscode.commands.registerCommand('extension.http_test.run', (uri: vscode.Uri) => {
        runHttpTest(uri, false);
    });

    let disposableRunVerbose = vscode.commands.registerCommand('extension.http_test.runVerbose', (uri: vscode.Uri) => {
        runHttpTest(uri, true);
    });

    context.subscriptions.push(disposableRun, disposableRunVerbose);
}

export function deactivate() {
    if (outputChannel) {
        outputChannel.dispose();
    }
}