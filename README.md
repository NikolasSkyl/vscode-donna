# Donna Language — VS Code Extension

Syntax highlighting and language support for [Donna](https://donna-lang.org), a self-hosted statically typed functional programming language.

## Features

- Syntax highlighting powered by [tree-sitter-donna](https://github.com/donna-lang/tree-sitter-donna)
- Semantic tokens for accurate, AST-aware coloring (functions, types, constructors, modules, parameters)
- Bracket matching and auto-closing pairs
- Comment toggling (`//`)
- Indentation rules (`:` triggers indent, matches Donna's block syntax)

## Requirements

VS Code 1.87 or later.

## Installation

```bash
git clone https://github.com/donna-lang/vscode-donna ~/.vscode/extensions/donna-lang
cd ~/.vscode/extensions/donna-lang
npm install
npm run compile
```

Restart VS Code. Files with the `.donna` extension will be automatically detected.

## Usage

Files with the `.donna` extension are automatically detected. Semantic highlighting is enabled by default in VS Code — if colors look flat, check that **Editor: Semantic Highlighting** is on in your settings.

## How it works

The extension ships a pre-compiled WebAssembly build of the Donna tree-sitter grammar. On activation it parses your document using [web-tree-sitter](https://github.com/tree-sitter/tree-sitter/tree/master/lib/binding_web) and registers a semantic tokens provider, giving VS Code rich, parse-tree-accurate highlighting rather than regex-based approximations.

A lightweight TextMate grammar is also bundled as a fallback for instant coloring before the parser loads.

## Links

- [Donna](https://donna-lang.org)
- [GitHub](https://github.com/donna-lang)
- [tree-sitter-donna](https://github.com/donna-lang/tree-sitter-donna)

## License

MIT
