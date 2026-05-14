import * as vscode from "vscode";
import * as path from "path";
import Parser from "web-tree-sitter";

// Maps tree-sitter highlight names to VS Code semantic token types
const TOKEN_TYPE_MAP: Record<string, string> = {
  keyword: "keyword",
  "keyword.control": "keyword",
  "keyword.operator": "operator",
  function: "function",
  "function.call": "function",
  "function.method.call": "method",
  type: "type",
  constructor: "enumMember",
  variable: "variable",
  "variable.parameter": "parameter",
  "variable.special": "variable",
  constant: "variable",
  "constant.builtin": "keyword",
  module: "namespace",
  operator: "operator",
  string: "string",
  number: "number",
  boolean: "keyword",
  comment: "comment",
  "comment.doc": "comment",
  "punctuation.bracket": "operator",
  "punctuation.delimiter": "operator",
};

const TOKEN_TYPES = [...new Set(Object.values(TOKEN_TYPE_MAP))];
const TOKEN_MODIFIERS: string[] = ["declaration", "documentation", "readonly"];

const LEGEND = new vscode.SemanticTokensLegend(TOKEN_TYPES, TOKEN_MODIFIERS);

type HighlightCapture = {
  name: string;
  node: Parser.SyntaxNode;
};

let parser: Parser | null = null;
let donnaLanguage: Parser.Language | null = null;
let highlightQuery: Parser.Query | null = null;

async function initParser(context: vscode.ExtensionContext): Promise<void> {
  await Parser.init({
    locateFile: () =>
      path.join(context.extensionPath, "node_modules", "web-tree-sitter", "tree-sitter.wasm"),
  });

  parser = new Parser();
  donnaLanguage = await Parser.Language.load(
    path.join(context.extensionPath, "tree-sitter-donna.wasm")
  );
  parser.setLanguage(donnaLanguage);

  // Load highlights query from the grammar highlights
  const highlightsSrc = HIGHLIGHTS_QUERY;
  try {
    highlightQuery = donnaLanguage.query(highlightsSrc);
  } catch (e) {
    console.error("Failed to compile highlights query:", e);
  }
}

class DonnaSemanticTokensProvider
  implements vscode.DocumentSemanticTokensProvider
{
  onDidChangeSemanticTokens = new vscode.EventEmitter<void>().event;

  provideDocumentSemanticTokens(
    document: vscode.TextDocument
  ): vscode.SemanticTokens | null {
    if (!parser || !highlightQuery) return null;

    const tree = parser.parse(document.getText());
    const builder = new vscode.SemanticTokensBuilder(LEGEND);

    const captures: HighlightCapture[] = highlightQuery
      .captures(tree.rootNode)
      .map((c) => ({ name: c.name, node: c.node }));

    for (const { name, node } of captures) {
      const tokenType = TOKEN_TYPE_MAP[name];
      if (!tokenType) continue;

      const typeIndex = TOKEN_TYPES.indexOf(tokenType);
      if (typeIndex === -1) continue;

      const modifiers: number =
        name === "constant" ? (1 << TOKEN_MODIFIERS.indexOf("readonly")) : 0;

      const startLine = node.startPosition.row;
      const startChar = node.startPosition.column;
      const endLine = node.endPosition.row;
      const endChar = node.endPosition.column;

      // Semantic tokens API requires single-line tokens — split multi-line nodes
      if (startLine === endLine) {
        builder.push(startLine, startChar, endChar - startChar, typeIndex, modifiers);
      } else {
        const lines = document.getText(
          new vscode.Range(startLine, startChar, endLine, endChar)
        ).split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = startLine + i;
          const col = i === 0 ? startChar : 0;
          const len = lines[i].length;
          if (len > 0) {
            builder.push(line, col, len, typeIndex, modifiers);
          }
        }
      }
    }

    return builder.build();
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  await initParser(context);

  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(
      { language: "donna" },
      new DonnaSemanticTokensProvider(),
      LEGEND
    )
  );
}

export function deactivate(): void {
  parser?.delete();
}

// Inlined highlights query from tree-sitter-donna
const HIGHLIGHTS_QUERY = `
(comment) @comment
(module_comment) @comment.doc
(doc_comment) @comment.doc

(string) @string
(integer) @number
(float) @number
(boolean) @boolean
(nil) @constant.builtin
(visibility) @keyword
(pub_keyword) @keyword

(import_keyword) @keyword
(as_keyword) @keyword
(const_keyword) @keyword
(type_keyword) @keyword
(opaque_keyword) @keyword
(external_keyword) @keyword
(fn_keyword) @keyword
(let_keyword) @keyword
(case_keyword) @keyword
(if_keyword) @keyword

(builtin_keyword) @keyword

[
  "->"
  "|>"
  "="
  "=="
  "!="
  "&&"
  "||"
  "<"
  "<="
  ">"
  ">="
  "<."
  "<=."
  ">."
  ">=."
  "<>"
  "+"
  "-"
  "*"
  "/"
  "%"
  "+."
  "-."
  "*."
  "/."
  "!"
] @operator

[
  "("
  ")"
  "["
  "]"
] @punctuation.bracket

[
  ","
  "."
  ":"
] @punctuation.delimiter

(type_identifier) @type
(type_variable) @type
(constructor) @constructor

(function_declaration
  name: (identifier) @function)

(external_function_declaration
  name: (identifier) @function)

(call_expression
  function: (identifier) @function.call)

(call_expression
  function: (field_expression
    field: (identifier) @function.method.call))

(parameter
  name: (_) @variable.parameter)

(let_statement
  pattern: (identifier) @variable)

(constant_declaration
  name: (identifier) @constant)

(import_statement
  module: (module_path) @module)

(module_path) @module

(qualified_identifier
  module: (identifier) @module
  name: (identifier) @function)

(qualified_constructor
  module: (identifier) @module
  name: (constructor) @constructor)

(qualified_type
  (identifier) @module
  (type_identifier) @type)

(qualified_generic_type
  (identifier) @module
  (type_identifier) @type)

(discard) @variable.special
`;
