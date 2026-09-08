import Editor, { loader, type OnMount } from '@monaco-editor/react';
import { Box, CircularProgress, useTheme } from '@mui/material';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution';
import 'monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution';
import 'monaco-editor/esm/vs/basic-languages/go/go.contribution';
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/basic-languages/kotlin/kotlin.contribution';
import 'monaco-editor/esm/vs/basic-languages/pascal/pascal.contribution';
import 'monaco-editor/esm/vs/basic-languages/php/php.contribution';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution';
import 'monaco-editor/esm/vs/basic-languages/r/r.contribution';
import 'monaco-editor/esm/vs/basic-languages/ruby/ruby.contribution';
import 'monaco-editor/esm/vs/basic-languages/rust/rust.contribution';
import 'monaco-editor/esm/vs/basic-languages/shell/shell.contribution';

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmitShortcut?: () => void;
  placeholder?: string;
  minHeight?: number;
  language?: string;
}

export default function CodeEditor({
  value,
  onChange,
  onSubmitShortcut,
  placeholder = '在这里输入代码',
  minHeight = 460,
  language = 'plaintext',
}: CodeEditorProps) {
  const theme = useTheme();
  const handleMount: OnMount = (editor) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onSubmitShortcut?.());
  };

  return (
    <Box aria-label="代码编辑器" sx={{ height: { xs: 420, md: minHeight }, minHeight, overflow: 'hidden', border: '1px solid', borderColor: 'divider', borderRadius: 1, '&:focus-within': { borderColor: 'primary.main', boxShadow: `0 0 0 2px ${theme.palette.primary.main}29` } }}>
      <Editor
        value={value}
        language={language}
        theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'light'}
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
        }}
      />
    </Box>
  );
}
