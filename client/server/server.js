'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
// import fs = require('fs');
const vscode_languageserver_1 = require("vscode-languageserver");
const findSelector_1 = require("./core/findSelector");
const findDefinition_1 = require("./core/findDefinition");
const logger_1 = require("./logger");
const vscode_html_languageservice_1 = require("vscode-html-languageservice");
// import { getCSSLanguageService } from 'vscode-css-languageservice';
// Creates the LSP connection
let connection = vscode_languageserver_1.createConnection(vscode_languageserver_1.ProposedFeatures.all);
// Create a manager for open text documents
let documents = new vscode_languageserver_1.TextDocuments();
// Create a map of styleSheet URIs to the stylesheet text content
let styleSheets = {};
// // The workspace folder this server is operating on
// let workspaceFolder: string;
// // A list of languages that suport the lookup definition (by default, only html)
// let activeLanguages: string[];
// // A list of file extensions to lookup for style definitions (defaults to .css, .scss and .less)
// let fileSearchExtensions: string[];
// // 打开的时候也不需要添加文件
// documents.onDidOpen(event => {
//   // 打开文件的时候把它加入到要查找的文件中去
//   if (event.document.languageId === 'html') {
//     const uri = event.document.uri;
//     const languageId = event.document.languageId;
//     const text = event.document.getText();
//     // 先分析出来style的位置
//     const document = TextDocument.create(uri, languageId, 1, text);
//     const languageService = getHTMLLanguageService();
//     let hdoc = languageService.parseHTMLDocument(document);
//     // 获取到style的root节点
//     let styleRoot = searchStyleTag(hdoc.roots);
//     let styleText = text.slice(styleRoot.start, styleRoot.endTagStart);
//     //获取语言类型
//     let styleLanguageId = 'css';
//     let endIndex = styleText.indexOf('>') + 1;
//     let firstLine = styleText.slice(0, endIndex);
//     if (firstLine.indexOf('less') != -1) {
//       styleLanguageId = 'less';
//     }
//     if (firstLine.indexOf('scss') != -1) {
//       styleLanguageId = 'scss';
//     }
//     styleText = styleText.slice(endIndex);
//     // 获取节点确切位置
//     let beforeStyleText = text.slice(0, styleRoot.start);
//     let row = beforeStyleText.split('\r\n').length - 1;
//     let styledoc = TextDocument.create(uri, styleLanguageId, 1, styleText);
//     const stylesheet = getLanguageService(styledoc).parseStylesheet(styledoc);
//     styleSheets[event.document.uri] = {
//       document: styledoc,
//       stylesheet,
//       startLocation: 0,
//       startRow: row
//     };
//   }
// });
// 查找style
// 原本这里使用递归查找全部标签，但是由于vue文件的格式是固定的style永远在最外层，所以这里只查找第一层就可以了
function searchStyleTag(roots) {
    for (let index = 0; index < roots.length; index++) {
        if (roots[index].tag === 'style') {
            return roots[index];
        }
    }
    return undefined;
}
documents.listen(connection);
// // 改变路径的时候这里不加载文件
// documents.onDidChangeContent(event => {
//   connection.console.log(`[Server(${process.pid}) ${workspaceFolder}] Document changed: ${event.document.uri}`);
//   if (fileSearchExtensions.indexOf('.' + event.document.languageId) > -1) {
//     const uri = event.document.uri;
//     const languageId = event.document.languageId;
//     const text = event.document.getText();
//     const document = TextDocument.create(uri, languageId, 1, text);
//     const languageService = getLanguageService(document);
//     const stylesheet = languageService.parseStylesheet(document);
//     styleSheets[event.document.uri] = {
//       document,
//       stylesheet,
//       startLocation: 0,
//       startRow: 0
//     };
//   }
// });
connection.onInitialize(() => {
    logger_1.create(connection.console);
    // workspaceFolder = params.rootUri;
    // activeLanguages = params.initializationOptions.activeLanguages;
    // fileSearchExtensions = params.initializationOptions.fileSearchExtensions;
    // connection.console.log(`[Server(${process.pid}) ${workspaceFolder}] Started and initialize received`);
    // // 在这里将所有要查找的文件load进来
    // setupStyleMap(params);
    // connection.console.log(`[Server(${process.pid}) ${workspaceFolder}] Setup a stylesheet lookup map`);
    return {
        capabilities: {
            textDocumentSync: {
                openClose: true,
                change: vscode_languageserver_1.TextDocumentSyncKind.Full
            },
            definitionProvider: true,
            workspaceSymbolProvider: true
        }
    };
});
// function setupStyleMap(params: InitializeParams) {
//   const styleFiles = params.initializationOptions.stylesheets;
//   styleFiles.forEach((fileUri: Uri) => {
//     const languageId = fileUri.fsPath.split('.').slice(-1)[0];
//     const text = fs.readFileSync(fileUri.fsPath, 'utf8');
//     const document = TextDocument.create(fileUri.uri, languageId, 1, text);
//     const languageService = getLanguageService(document);
//     const stylesheet = languageService.parseStylesheet(document);
//     styleSheets[fileUri.uri] = {
//       document,
//       stylesheet,
//       startLocation: 0,
//       startRow: 0
//     };
//   });
// }
connection.onDefinition((textDocumentPositon) => {
    const documentIdentifier = textDocumentPositon.textDocument;
    const position = textDocumentPositon.position;
    const document = documents.get(documentIdentifier.uri);
    // 在转定义的时候要拿到最新的文档信息进行解析
    // 如果放到文档更新的时候解析，消耗比较大
    // 打开文件的时候把它加入到要查找的文件中去
    if (document.languageId === 'vue') {
        const uri = document.uri;
        const text = document.getText();
        // 先分析出来style的位置
        const HDocument = vscode_languageserver_1.TextDocument.create(uri, 'html', 1, text);
        const languageService = vscode_html_languageservice_1.getLanguageService();
        let hdoc = languageService.parseHTMLDocument(HDocument);
        // 获取到style的root节点
        let styleRoot = searchStyleTag(hdoc.roots);
        let styleText = text.slice(styleRoot.start, styleRoot.endTagStart);
        //获取语言类型
        let styleLanguageId = 'css';
        let endIndex = styleText.indexOf('>') + 1;
        let firstLine = styleText.slice(0, endIndex);
        if (firstLine.indexOf('less') != -1) {
            styleLanguageId = 'less';
        }
        if (firstLine.indexOf('scss') != -1) {
            styleLanguageId = 'scss';
        }
        styleText = styleText.slice(endIndex);
        // 获取节点确切位置
        let beforeStyleText = text.slice(0, styleRoot.start);
        let row = beforeStyleText.split('\r\n').length - 1;
        let styledoc = vscode_languageserver_1.TextDocument.create(uri, styleLanguageId, 1, styleText);
        const stylesheet = findDefinition_1.getLanguageService(styledoc).parseStylesheet(styledoc);
        styleSheets[document.uri] = {
            document: styledoc,
            stylesheet,
            startLocation: 0,
            startRow: row
        };
    }
    // // Ignore defintiion requests from unsupported languages
    // if (activeLanguages.indexOf(document.languageId) === -1) {
    //   return null;
    // }
    const selector = findSelector_1.default(document, position);
    if (!selector) {
        return null;
    }
    return findDefinition_1.findDefinition(selector, styleSheets);
});
connection.onWorkspaceSymbol(({ query }) => {
    const selectors = [
        {
            attribute: 'class',
            value: query
        },
        {
            attribute: 'id',
            value: query
        }
    ];
    return selectors.reduce((p, selector) => [...p, ...findDefinition_1.findSymbols(selector, styleSheets)], []);
});
connection.listen();
//# sourceMappingURL=server.js.map