import * as path from 'path';
import { workspace as Workspace, window as Window, ExtensionContext, TextDocument, OutputChannel, WorkspaceFolder, Uri } from 'vscode';

import { LanguageClient, LanguageClientOptions, TransportKind } from 'vscode-languageclient';

let defaultClient: LanguageClient;
let clients: Map<string, LanguageClient> = new Map();

let _sortedWorkspaceFolders: string[];
function sortedWorkspaceFolders(): string[] {
  // 判空 _sortedWorkspaceFolders 为undefined的时候才读路径
  if (_sortedWorkspaceFolders === void 0) {
    _sortedWorkspaceFolders = Workspace.workspaceFolders
      .map(folder => {
        // 如果路径不是以/结尾，则给路径加上/
        let result = folder.uri.toString();
        if (result.charAt(result.length - 1) !== '/') {
          result = result + '/';
        }
        return result;
      })
      .sort((a, b) => {
        // 按照长短排列一下
        return a.length - b.length;
      });
  }
  return _sortedWorkspaceFolders;
}
// 在切换工作区的时候把 _sortedWorkspaceFolders 置空
Workspace.onDidChangeWorkspaceFolders(() => (_sortedWorkspaceFolders = undefined));

// 针对打开的text文件，获取最外层的workspacefolder
function getOuterMostWorkspaceFolder(folder: WorkspaceFolder): WorkspaceFolder {
  let sorted = sortedWorkspaceFolders();
  for (let element of sorted) {
    let uri = folder.uri.toString();
    if (uri.charAt(uri.length - 1) !== '/') {
      uri = uri + '/';
    }
    if (uri.startsWith(element)) {
      return Workspace.getWorkspaceFolder(Uri.parse(element));
    }
  }
  return folder;
}

// export function activate(context: ExtensionContext) {
//   // 获取配置参数
//   const config: WorkspaceConfiguration = Workspace.getConfiguration('css_peek');
//   // 激活的语言类型
//   const activeLanguages: Array<string> = config.get('activeLanguages') as Array<string>;
//   // 搜索的后缀
//   const fileSearchExtensions: Array<string> = config.get('searchFileExtensions') as Array<string>;
//   // 排除的路径
//   const exclude: Array<string> = config.get('exclude') as Array<string>;

//   let module = context.asAbsolutePath(path.join('server', 'server.js'));
//   let outputChannel: OutputChannel = Window.createOutputChannel('css-peek');

//   function didOpenTextDocument(document: TextDocument): void {
//     // scheme 就是uri的头  这里只处理是文件的scheme
//     if (document.uri.scheme !== 'file' && document.uri.scheme !== 'untitled') {
//       return;
//     }

//     let uri = document.uri;
//     // Untitled files go to a default client.
//     // 目前还不知道什么文件是 Untitled files 这里先不管
//     if (uri.scheme === 'untitled' && !defaultClient) {
//       let debugOptions = { execArgv: ['--nolazy', '--inspect=6010'] };
//       let serverOptions = {
//         run: { module, transport: TransportKind.ipc },
//         debug: { module, transport: TransportKind.ipc, options: debugOptions }
//       };
//       let clientOptions: LanguageClientOptions = {
//         documentSelector: fileSearchExtensions
//           .map(l => l.slice(1))
//           .concat(activeLanguages)
//           .map(language => ({
//             scheme: 'untitled',
//             language
//           })),
//         synchronize: {
//           configurationSection: 'css_peek'
//         },
//         initializationOptions: {
//           stylesheets: [],
//           activeLanguages,
//           fileSearchExtensions
//         },
//         diagnosticCollectionName: 'css-peek',
//         outputChannel
//       };
//       defaultClient = new LanguageClient('css-peek', 'CSS Peek', serverOptions, clientOptions);
//       defaultClient.registerProposedFeatures();
//       defaultClient.start();
//       return;
//     }
//     // 获取工作区域的路径
//     let folder = Workspace.getWorkspaceFolder(uri);
//     // Files outside a folder can't be handled. This might depend on the language.
//     // Single file languages like JSON might handle files outside the workspace folders.
//     // 只有在工作区域的文件支持转定义，不在工作区域内的文件不做处理
//     if (!folder) {
//       return;
//     }
//     // If we have nested workspace folders we only start a server on the outer most workspace folder.
//     // 针对嵌套的工作区域，只在最外层开一个client以减少资源消耗
//     folder = getOuterMostWorkspaceFolder(folder);

//     // 同一个uri只开一个client
//     if (!clients.has(folder.uri.toString())) {
//       // 获取所有配置可以搜索的文件列表
//       Promise.all(fileSearchExtensions.map(type => Workspace.findFiles(`**/*${type}`, ''))).then(file_searches => {
//         // 找到了所有的文件
//         // 有多少个后缀就会生成多少个数组
//         // 下面要把这些数组组成一个数组
//         let potentialFiles: Uri[] = Array.prototype.concat(...file_searches).filter((uri: Uri) => uri.scheme === 'file');
//         // 得到了所有要搜索文件的uri列表
//         // 过滤忽略文件的列表
//         exclude.map(expression => new RegExp(expression, 'gi')).forEach(regex => {
//           potentialFiles = potentialFiles.filter(file => !regex.test(file.fsPath));
//         });
//         // 得到了所有潜在查找的文件列表
//         let debugOptions = { execArgv: ['--nolazy', `--inspect=${6011 + clients.size}`] };
//         let serverOptions = {
//           run: { module, transport: TransportKind.ipc },
//           debug: { module, transport: TransportKind.ipc, options: debugOptions }
//         };
//         console.log('searches...', potentialFiles);
//         console.log(
//           'option',
//           fileSearchExtensions
//             .map(l => l.slice(1))
//             .concat(activeLanguages)
//             .map(language => ({
//               scheme: 'file',
//               language: language,
//               pattern: `${folder.uri.fsPath}/**/*`
//             }))
//         );
//         // 这里设置的language会使用所有激活的语言，以及搜索的后缀语言
//         // 潜在文件只有搜索的后缀文件，我实在没看出来这里加上激活的语言的解析有什么用
//         let clientOptions: LanguageClientOptions = {
//           documentSelector: fileSearchExtensions
//             .map(l => l.slice(1))
//             .concat(activeLanguages)
//             .map(language => ({
//               scheme: 'file',
//               language: language,
//               pattern: `${folder.uri.fsPath}/**/*`
//             })),
//           diagnosticCollectionName: 'css-peek',
//           synchronize: {
//             configurationSection: 'css_peek'
//           },
//           // 这里的stylesheets是一个map，key是uri，value是文件路径
//           initializationOptions: {
//             stylesheets: potentialFiles.map(u => ({ uri: u.toString(), fsPath: u.fsPath })),
//             activeLanguages, // 激活的语言信息
//             fileSearchExtensions // 搜索的后缀信息
//           },
//           workspaceFolder: folder,
//           outputChannel
//         };
//         let client = new LanguageClient('css-peek', 'CSS Peek', serverOptions, clientOptions);
//         client.registerProposedFeatures();
//         client.start();
//         clients.set(folder.uri.toString(), client);
//       });
//     }
//   }
//   // 打开一个文件
//   Workspace.onDidOpenTextDocument(didOpenTextDocument);
//   // 已经打开的文件
//   // 因为IDE打开比插件加载要快，所以这里要把所有已经打开的文件补上
//   Workspace.textDocuments.forEach(didOpenTextDocument);
//   // 改变工作目录的时候，停止客户端
//   Workspace.onDidChangeWorkspaceFolders(event => {
//     // 一个工作区路径，一个client
//     for (let folder of event.removed) {
//       let client = clients.get(folder.uri.toString());
//       if (client) {
//         clients.delete(folder.uri.toString());
//         client.stop();
//       }
//     }
//   });
// }

export function activate(context: ExtensionContext) {
  // 获取配置参数
  // const config: WorkspaceConfiguration = Workspace.getConfiguration('css_peek');
  // // 激活的语言类型
  // const activeLanguages: Array<string> = config.get('activeLanguages') as Array<string>;
  // // 搜索的后缀
  // const fileSearchExtensions: Array<string> = config.get('searchFileExtensions') as Array<string>;
  // // 排除的路径
  // const exclude: Array<string> = config.get('exclude') as Array<string>;

  let module = context.asAbsolutePath(path.join('server', 'server.js'));
  let outputChannel: OutputChannel = Window.createOutputChannel('css-peek');

  function didOpenTextDocument(document: TextDocument): void {
    // scheme 就是uri的头  这里只处理是文件的scheme
    if (document.uri.scheme !== 'file' && document.uri.scheme !== 'untitled') {
      return;
    }

    let uri = document.uri;

    // 获取工作区域的路径
    let folder = Workspace.getWorkspaceFolder(uri);
    // Files outside a folder can't be handled. This might depend on the language.
    // Single file languages like JSON might handle files outside the workspace folders.
    // 只有在工作区域的文件支持转定义，不在工作区域内的文件不做处理
    if (!folder) {
      return;
    }
    // If we have nested workspace folders we only start a server on the outer most workspace folder.
    // 针对嵌套的工作区域，只在最外层开一个client以减少资源消耗
    folder = getOuterMostWorkspaceFolder(folder);

    // 同一个uri只开一个client
    if (!clients.has(folder.uri.toString())) {
      // 获取所有配置可以搜索的文件列表

      // 找到了所有的文件
      // 有多少个后缀就会生成多少个数组
      // 下面要把这些数组组成一个数组
      // let potentialFiles: Uri[] = [uri];
      let debugOptions = { execArgv: ['--nolazy', `--inspect=${6011 + clients.size}`] };
      let serverOptions = {
        run: { module, transport: TransportKind.ipc },
        debug: { module, transport: TransportKind.ipc, options: debugOptions }
      };

      // 这里设置的language会使用所有激活的语言，以及搜索的后缀语言
      // 潜在文件只有搜索的后缀文件，我实在没看出来这里加上激活的语言的解析有什么用
      let clientOptions: LanguageClientOptions = {
        documentSelector: [
          {
            scheme: 'file',
            language: 'vue',
            pattern: `${folder.uri.fsPath}/**/*`
          }
        ],
        diagnosticCollectionName: 'css-peek',
        synchronize: {
          configurationSection: 'css_peek'
        },
        // 这里的stylesheets是一个map，key是uri，value是文件路径
        initializationOptions: {
          // stylesheets: potentialFiles.map(u => ({ uri: u.toString(), fsPath: u.fsPath }))
          // activeLanguages, // 激活的语言信息
          // fileSearchExtensions // 搜索的后缀信息
        },
        // workspaceFolder: folder,
        outputChannel
      };
      let client = new LanguageClient('css-peek', 'CSS Peek', serverOptions, clientOptions);
      client.registerProposedFeatures();
      client.start();
      clients.set(folder.uri.toString(), client);
    }
  }
  // 打开一个文件
  Workspace.onDidOpenTextDocument(didOpenTextDocument);
  // 已经打开的文件
  // 因为IDE打开比插件加载要快，所以这里要把所有已经打开的文件补上
  Workspace.textDocuments.forEach(didOpenTextDocument);
  // 改变工作目录的时候，停止客户端
  Workspace.onDidChangeWorkspaceFolders(event => {
    // 一个工作区路径，一个client
    for (let folder of event.removed) {
      let client = clients.get(folder.uri.toString());
      if (client) {
        clients.delete(folder.uri.toString());
        client.stop();
      }
    }
  });
}

export function deactivate(): Thenable<void> {
  let promises: Thenable<void>[] = [];
  if (defaultClient) {
    promises.push(defaultClient.stop());
  }
  for (let client of clients.values()) {
    promises.push(client.stop());
  }
  return Promise.all(promises).then(() => undefined);
}
