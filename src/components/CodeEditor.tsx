import { useRef } from 'react';
import Editor, { loader, type OnMount } from '@monaco-editor/react';
import { Box, CircularProgress, useTheme } from '@mui/material';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution';
import 'monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution';
import 'monaco-editor/esm/vs/basic-languages/go/go.contribution';
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution';
import 'monaco-editor/esm/vs/basic-languages/kotlin/kotlin.contribution';
import 'monaco-editor/esm/vs/basic-languages/pascal/pascal.contribution';
import 'monaco-editor/esm/vs/basic-languages/php/php.contribution';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution';
import 'monaco-editor/esm/vs/basic-languages/r/r.contribution';
import 'monaco-editor/esm/vs/basic-languages/ruby/ruby.contribution';
import 'monaco-editor/esm/vs/basic-languages/rust/rust.contribution';
import 'monaco-editor/esm/vs/basic-languages/shell/shell.contribution';
import { usePreferences } from '../prefs';
import type { CodeTheme } from '../prefs';

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

function snippet(label: string, insertText: string, detail: string): monaco.languages.CompletionItem {
  return {
    label,
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail,
    range: undefined as unknown as monaco.IRange,
  };
}

const competitiveSnippets: Record<string, monaco.languages.CompletionItem[]> = {
  cpp: [
    snippet('fastio', '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    $0\n    return 0;\n}\n', '竞赛快读快写模板'),
    snippet('forloop', 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    $0\n}', 'for 循环'),
    snippet('main', 'int main() {\n    $0\n    return 0;\n}', 'main 函数骨架'),
  ],
  python: [
    snippet('main', 'def main():\n    $0\n\n\nif __name__ == "__main__":\n    main()\n', 'Python 入口骨架'),
    snippet('fastio', 'import sys\ninput = sys.stdin.readline\n$0', '快速输入'),
  ],
  java: [
    snippet('main', 'import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        $0\n    }\n}\n', 'Java 入口骨架'),
  ],
  go: [
    snippet('main', 'package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n)\n\nfunc main() {\n\treader := bufio.NewReader(os.Stdin)\n\t$0\n\t_ = reader\n\tfmt.Println()\n}\n', 'Go 入口骨架'),
  ],
  rust: [
    snippet('main', 'use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    $0\n}\n', 'Rust 入口骨架'),
  ],
  javascript: [
    snippet('main', 'const readline = require("readline").createInterface({ input: process.stdin });\nconst lines = [];\nreadline.on("line", (line) => lines.push(line));\nreadline.on("close", () => {\n    $0\n});\n', 'Node 逐行读入骨架'),
  ],
};

let snippetsRegistered = false;
function registerSnippetProviders() {
  if (snippetsRegistered) return;
  snippetsRegistered = true;
  Object.entries(competitiveSnippets).forEach(([language, items]) => {
    monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range: monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        return { suggestions: items.map((item) => ({ ...item, range })) };
      },
    });
  });
}
registerSnippetProviders();

function resolveMonacoTheme(codeTheme: CodeTheme, resolvedMode: 'light' | 'dark'): string {
  if (codeTheme === 'auto') return resolvedMode === 'dark' ? 'vs-dark' : 'vs';
  return codeTheme;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmitShortcut?: () => void;
  placeholder?: string;
  minHeight?: number;
  language?: string;
  readOnly?: boolean;
}

export default function CodeEditor({
  value,
  onChange,
  onSubmitShortcut,
  placeholder = '在这里输入代码',
  minHeight = 460,
  language = 'plaintext',
  readOnly = false,
}: CodeEditorProps) {
  const theme = useTheme();
  const { codeTheme, resolvedMode } = usePreferences();
  const onSubmitShortcutRef = useRef(onSubmitShortcut);
  onSubmitShortcutRef.current = onSubmitShortcut;
  const handleMount: OnMount = (editor) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onSubmitShortcutRef.current?.());
  };

  return (
    <Box aria-label="代码编辑器" sx={{ height: { xs: 420, md: minHeight }, minHeight, overflow: 'hidden', border: '1px solid', borderColor: 'divider', borderRadius: 1, '&:focus-within': { borderColor: 'primary.main', boxShadow: `0 0 0 2px ${theme.palette.primary.main}29` } }}>
      <Editor
        value={value}
        language={language}
        theme={resolveMonacoTheme(codeTheme, resolvedMode)}
        onChange={(next) => onChange(next ?? '')}
        onMount={handleMount}
        loading={<Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}><CircularProgress size={24} /></Box>}
        options={{
          automaticLayout: true,
          accessibilitySupport: 'auto',
          ariaLabel: '代码编辑器',
          bracketPairColorization: { enabled: true },
          fontFamily: '"Cascadia Code", "JetBrains Mono", Consolas, monospace',
          fontSize: 13,
          formatOnPaste: true,
          lineHeight: 20,
          minimap: { enabled: false },
          padding: { top: 12, bottom: 12 },
          placeholder,
          renderWhitespace: 'selection',
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          tabSize: 2,
          wordWrap: 'off',
          quickSuggestions: { other: true, comments: false, strings: true },
          suggestOnTriggerCharacters: true,
          wordBasedSuggestions: 'currentDocument',
          parameterHints: { enabled: true },
          tabCompletion: 'on',
          snippetSuggestions: 'inline',
          acceptSuggestionOnEnter: 'smart',
          readOnly,
          domReadOnly: readOnly,
        }}
      />
    </Box>
  );
}
