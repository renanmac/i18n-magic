const vscode = require('vscode');

let contentCache;
const tFunctionRegex = /t\(['"`](.*?)['"`][^\)]*\)/;
const transCompRegex = /i18nKey=\s*['"`](.*?)['"`]/;
const supportedLanguages = ['javascript', 'javascriptreact', 'typescript', 'typescriptreact'];

function activate(context) {
  let disposable = vscode.languages.registerHoverProvider(supportedLanguages, {
    async provideHover(document, position, _token) {
      const tFunctionRange = document.getWordRangeAtPosition(position, tFunctionRegex);
      const transCompRange = document.getWordRangeAtPosition(position, transCompRegex);

      if (!(tFunctionRange || transCompRange)) { return null; }

      const rangeWithRegex = tFunctionRange ? [tFunctionRange, tFunctionRegex] : [transCompRange, transCompRegex];
      const text = document.getText(rangeWithRegex[0]);
      const match = text.replace(/\$\{.+\}[^'"`]*/, '').match(rangeWithRegex[1]);
      if (match && match[1]) {
        const markDownContent = await buildContent(match[1]);
        return new vscode.Hover(markDownContent);
      }
    }
  });

  context.subscriptions.push(disposable);
}

async function buildContent(dotNotationKey) {
  const content = contentCache || await getContent();
  const value = JSON.stringify(dotNotationKey.split('.').reduce((acc, curr) => acc[curr] ? acc[curr] : acc, content));
  return new vscode.MarkdownString("```typescript\n" + value + "\n```");
}

async function readFiles() {
  if (!vscode.workspace.workspaceFolders) { return; }
  try {
    const folderPath = vscode.workspace.workspaceFolders[0].uri
    const filePath = vscode.Uri.joinPath(folderPath, 'public', 'static', 'locales', 'pt-BR');
    const entries = await vscode.workspace.fs.readDirectory(filePath);

    const bytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(filePath, entries[0][0]));
    return JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch (err) {
    console.log(err);
  }

}

async function getContent() {
  const content = await readFiles();
  contentCache = content;
  return content;
}

module.exports = {
  activate
}