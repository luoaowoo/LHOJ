import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Clipboard, Download, FileCode2, FileUp, RotateCcw, Send } from 'lucide-react';
import CodeEditor from '../components/CodeEditor';
import { EmptyBox, ErrorBox, FullPageLoader } from '../components/StateBox';
import { fetchSubmitConfig, submitCode, submitFile, submitPretest } from '../lib/api';
import type { HydroProblem } from '../types';

const languages = [
  { value: 'bash', label: 'Bash' },
  { value: 'c', label: 'C' },
  { value: 'cc', label: 'C++' },
  { value: 'cc.cc98', label: 'C++98' },
  { value: 'cc.cc98o2', label: 'C++98 (O2)' },
  { value: 'cc.cc11', label: 'C++11' },
  { value: 'cc.cc11o2', label: 'C++11 (O2)' },
  { value: 'cc.cc14', label: 'C++14' },
  { value: 'cc.cc14o2', label: 'C++14 (O2)' },
  { value: 'cc.cc17', label: 'C++17' },
  { value: 'cc.cc17o2', label: 'C++17 (O2)' },
  { value: 'cc.cc20', label: 'C++20' },
  { value: 'cc.cc20o2', label: 'C++20 (O2)' },
  { value: 'pas', label: 'Pascal' },
  { value: 'java', label: 'Java' },
  { value: 'kt', label: 'Kotlin' },
  { value: 'kt.jvm', label: 'Kotlin/JVM' },
  { value: 'py', label: 'Python' },
  { value: 'py.py2', label: 'Python 2' },
  { value: 'py.py3', label: 'Python 3' },
  { value: 'py.pypy3', label: 'PyPy 3' },
  { value: 'php', label: 'PHP' },
  { value: 'rs', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'hs', label: 'Haskell' },
  { value: 'js', label: 'NodeJS' },
  { value: 'rb', label: 'Ruby' },
  { value: 'cs', label: 'C#' },
  { value: 'r', label: 'R' },
] as const;

const languageStorageKey = 'lh-oj.submit-language';
const maxImportBytes = 2 * 1024 * 1024;
const maxSubmissionBytes = 128 * 1024 * 1024;
type LanguageOption = { value: string; label: string };
type SubmitMode = 'editor' | 'file' | 'pretest';

function templateFor(language: string): string {
  if (language.startsWith('cc') || language === 'c') {
    return language === 'c'
      ? '#include <stdio.h>\n\nint main(void) {\n  return 0;\n}\n'
      : '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  return 0;\n}\n';
  }
  if (language.startsWith('py')) return 'import sys\n\n\ndef main():\n    pass\n\n\nif __name__ == "__main__":\n    main()\n';
  if (language === 'java') return 'import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n    }\n}\n';
  if (language === 'go') return 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println()\n}\n';
  if (language === 'rs') return 'fn main() {\n}\n';
  if (language === 'js') return '"use strict";\n\nfunction main() {\n}\n\nmain();\n';
  if (language === 'bash') return '#!/usr/bin/env bash\nset -euo pipefail\n';
  return '';
}

function fileExtension(language: string): string {
  if (language === 'java') return 'java';
  if (language.startsWith('py')) return 'py';
  if (language === 'js') return 'js';
  if (language === 'go') return 'go';
  if (language === 'rs') return 'rs';
  if (language === 'bash') return 'sh';
  if (language === 'c') return 'c';
  return 'cpp';
}

function editorLanguage(language: string): string {
  if (language.startsWith('cc')) return 'cpp';
  if (language.startsWith('py')) return 'python';
  const aliases: Record<string, string> = { c: 'c', pas: 'pascal', java: 'java', kt: 'kotlin', php: 'php', rs: 'rust', go: 'go', js: 'javascript', rb: 'ruby', cs: 'csharp', r: 'r', bash: 'shell' };
  return aliases[language.split('.')[0]] ?? 'plaintext';
}

export default function SubmitPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tid = searchParams.get('tid') ?? '';
  const [problem, setProblem] = useState<HydroProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [availableLanguages, setAvailableLanguages] = useState<LanguageOption[]>([]);
  const [language, setLanguage] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(languageStorageKey);
      return languages.some((item) => item.value === saved) ? saved ?? 'cc.cc17' : 'cc.cc17';
    } catch {
      return 'cc.cc17';
    }
  });
  const [code, setCode] = useState('');
  const [submitMode, setSubmitMode] = useState<SubmitMode>('editor');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [pretestInput, setPretestInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [editorNotice, setEditorNotice] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submissionInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const draftKey = `lh-oj.draft.${id}.${language}`;
  const loadedDraftKey = useRef('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const config = await fetchSubmitConfig(id, tid || undefined);
      setProblem(config.problem);
      setAvailableLanguages(config.languages);
      if (!config.languages.length) throw new Error('当前题目没有可用的提交语言。');
      setLanguage((current) => config.languages.some((item) => item.value === current)
        ? current
        : config.languages.find((item) => item.value === 'cc.cc17')?.value ?? config.languages[0].value);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : '加载题目失败。');
    } finally {
      setLoading(false);
    }
  }, [id, tid]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setLoadError('缺少题目编号。');
      return;
    }
    void load();
  }, [id, load]);

  useEffect(() => {
    let saved = '';
    try {
      saved = localStorage.getItem(draftKey) ?? '';
    } catch {
      saved = '';
    }
    setCode(saved || templateFor(language));
    loadedDraftKey.current = draftKey;
  }, [draftKey]);

  useEffect(() => {
    if (loadedDraftKey.current !== draftKey) return;
    try {
      if (code) localStorage.setItem(draftKey, code);
      else localStorage.removeItem(draftKey);
    } catch {
      // Draft persistence is best effort and never blocks submission.
    }
  }, [code, draftKey]);

  useEffect(() => {
    try {
      localStorage.setItem(languageStorageKey, language);
    } catch {
      // Language preference is best effort.
    }
  }, [language]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if ((submitMode === 'file' ? !submissionFile : !code.trim()) || submittingRef.current) return;
    if (submitMode === 'pretest' && !pretestInput.trim()) {
      setSubmitError('请输入自测数据。');
      return;
    }
    if (!availableLanguages.some((item) => item.value === language)) {
      setSubmitError('当前题目不允许使用所选语言提交。');
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');

    const request = submitMode === 'file' && submissionFile
      ? submitFile(id, language, submissionFile, tid || undefined)
      : submitMode === 'pretest'
        ? submitPretest(id, language, code, pretestInput, tid || undefined)
        : submitCode(id, language, code, tid || undefined);
    request
      .then((result) => {
        if (result.rid) {
          void navigate(`/records/${encodeURIComponent(result.rid)}`);
          return;
        }
        const problemHref = `/problem/${encodeURIComponent(id)}${
          tid ? `?tid=${encodeURIComponent(tid)}` : ''
        }`;
        void navigate(problemHref, { state: { submitted: true } });
      })
      .catch((caught: unknown) => {
        setSubmitError(caught instanceof Error ? caught.message : '提交失败，请稍后重试。');
      })
      .finally(() => {
        submittingRef.current = false;
        setSubmitting(false);
      });
  };

  if (loading) return <FullPageLoader />;
  if (loadError) return <ErrorBox message={loadError} onRetry={() => void load()} />;
  if (!problem) return <EmptyBox message="题目不存在" />;

  const resetCode = () => {
    setCode(templateFor(language));
    setResetDialogOpen(false);
    setEditorNotice('已载入代码模板。');
  };

  const requestReset = () => {
    if (code.trim()) setResetDialogOpen(true);
    else resetCode();
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setEditorNotice('代码已复制。');
    } catch {
      setEditorNotice('复制失败，请使用编辑器菜单复制。');
    }
  };

  const downloadCode = () => {
    const url = URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${problem.pid ?? id}.${fileExtension(language)}`;
    anchor.click();
    URL.revokeObjectURL(url);
    setEditorNotice('代码文件已下载。');
  };

  const importCode = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > maxImportBytes) {
      setEditorNotice('代码文件不能超过 2 MiB。');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCode(typeof reader.result === 'string' ? reader.result : '');
      setEditorNotice(`已载入 ${file.name}。`);
    };
    reader.onerror = () => setEditorNotice('文件读取失败。');
    reader.readAsText(file);
  };

  const selectSubmissionFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (file && file.size > maxSubmissionBytes) {
      setSubmissionFile(null);
      setSubmitError('提交文件不能超过 128 MiB。');
      return;
    }
    setSubmissionFile(file);
    setSubmitError('');
  };

  return (
    <Paper
      component="form"
      variant="outlined"
      onSubmit={handleSubmit}
      data-submit-form="true"
      sx={{ p: { xs: 2, sm: 3 } }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {problem.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            #{problem.pid ?? problem.docId}
            {tid ? ` · 比赛提交 #${tid}` : ''}
          </Typography>
        </Box>

        <Divider />

        <FormControl fullWidth>
          <InputLabel id="language-label">语言</InputLabel>
          <Select
            labelId="language-label"
            label="语言"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            {availableLanguages.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={submitMode}
          onChange={(_event, value: SubmitMode | null) => { if (value) setSubmitMode(value); }}
          aria-label="提交方式"
          sx={{ alignSelf: 'flex-start', '& .MuiToggleButton-root': { gap: 0.75 } }}
        >
          <ToggleButton value="editor"><FileCode2 size={16} /> 编辑器</ToggleButton>
          <ToggleButton value="file"><FileUp size={16} /> 文件</ToggleButton>
          <ToggleButton value="pretest"><Send size={16} /> 自测</ToggleButton>
        </ToggleButtonGroup>

        {submitMode !== 'file' ? <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.8, flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" sx={{ mr: 0.5, display: 'flex', alignItems: 'center', gap: 0.7 }}>
              <FileCode2 size={17} /> 在线代码编辑器
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Tooltip title="载入模板"><IconButton size="small" onClick={requestReset} aria-label="载入代码模板"><RotateCcw size={17} /></IconButton></Tooltip>
            <Tooltip title="复制代码"><IconButton size="small" onClick={() => void copyCode()} aria-label="复制代码"><Clipboard size={17} /></IconButton></Tooltip>
            <Tooltip title="导入文件"><IconButton size="small" onClick={() => fileInputRef.current?.click()} aria-label="导入代码文件"><FileUp size={17} /></IconButton></Tooltip>
            <Tooltip title="下载代码"><IconButton size="small" onClick={downloadCode} aria-label="下载代码文件"><Download size={17} /></IconButton></Tooltip>
            <input ref={fileInputRef} hidden type="file" accept=".c,.cc,.cpp,.h,.hpp,.py,.java,.js,.ts,.go,.rs,.txt" onChange={importCode} />
          </Box>
          <CodeEditor
            value={code}
            onChange={setCode}
            language={editorLanguage(language)}
            onSubmitShortcut={() => { if (code.trim() && !submitting) void document.querySelector<HTMLFormElement>('form[data-submit-form]')?.requestSubmit(); }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.7 }}>
            {code.split('\n').length} 行 · 草稿自动保存在当前浏览器 · Ctrl/⌘ + Enter 提交
          </Typography>
          {submitMode === 'pretest' ? (
            <TextField
              fullWidth
              multiline
              minRows={4}
              maxRows={12}
              label="自测输入"
              value={pretestInput}
              onChange={(event) => setPretestInput(event.target.value)}
              sx={{ mt: 2 }}
              inputProps={{ spellCheck: false }}
            />
          ) : null}
        </Box> : (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
              <Button variant="outlined" startIcon={<FileUp size={16} />} onClick={() => submissionInputRef.current?.click()}>
                选择文件
              </Button>
              <Typography variant="body2" color={submissionFile ? 'text.primary' : 'text.secondary'} sx={{ overflowWrap: 'anywhere' }}>
                {submissionFile ? `${submissionFile.name} · ${(submissionFile.size / 1024).toFixed(1)} KiB` : '尚未选择文件'}
              </Typography>
              <input ref={submissionInputRef} hidden type="file" onChange={selectSubmissionFile} />
            </Stack>
          </Paper>
        )}

        {submitError && <Alert severity="error">{submitError}</Alert>}
        {editorNotice && <Alert severity="info" onClose={() => setEditorNotice('')}>{editorNotice}</Alert>}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            startIcon={<Send size={16} />}
            disabled={(submitMode === 'file' ? !submissionFile : !code.trim()) || submitting}
          >
            {submitting ? '提交中' : submitMode === 'pretest' ? '运行自测' : '提交'}
          </Button>
        </Box>
      </Stack>
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)} aria-labelledby="reset-code-title">
        <DialogTitle id="reset-code-title">载入代码模板？</DialogTitle>
        <DialogContent>
          <DialogContentText>当前编辑器内容将被所选语言的默认模板替换。</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setResetDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={resetCode}>替换</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
