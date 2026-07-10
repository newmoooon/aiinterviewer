"use client";

import { useCallback, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import type { Language, Problem } from "@/lib/problems";
import type { TestRunSummary } from "@/lib/judge";
import { runTests, type RunStatus } from "@/lib/run-code";
import TestPanel from "./TestPanel";

const LANGS: { id: Language; label: string }[] = [
  { id: "python", label: "Python 3" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
];

export default function EditorPanel({
  problem,
  onCodeChange,
  onTestRun,
  disabled,
}: {
  problem: Problem;
  onCodeChange: (code: string, language: Language) => void;
  onTestRun?: (summary: TestRunSummary) => void;
  disabled?: boolean;
}) {
  const [language, setLanguage] = useState<Language>("python");
  const [codeByLang, setCodeByLang] = useState<Record<Language, string>>(() => ({
    ...problem.starterCode,
  }));
  const [running, setRunning] = useState(false);
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const [summary, setSummary] = useState<TestRunSummary | null>(null);
  const [resultsOpen, setResultsOpen] = useState(true);
  const runningRef = useRef(false);

  const handleRun = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setResultsOpen(true);
    try {
      const result = await runTests(
        problem.id,
        codeByLang[language],
        language,
        setRunStatus
      );
      setSummary(result);
      onTestRun?.(result);
    } finally {
      runningRef.current = false;
      setRunning(false);
      setRunStatus(null);
    }
  }, [problem.id, codeByLang, language, onTestRun]);

  const switchLanguage = (lang: Language) => {
    if (lang === language) return;
    setLanguage(lang);
    onCodeChange(codeByLang[lang], lang);
  };

  return (
    <div className="flex h-full flex-col bg-[#1e1e1e]">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-hairline bg-surface px-3">
        <div className="flex gap-1">
          {LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => switchLanguage(l.id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                language === l.id
                  ? "bg-raised text-ink"
                  : "text-muted hover:text-sub"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div
            className="hidden items-center gap-1.5 text-xs text-muted sm:flex"
            title="Your editor streams live to the interviewer"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-good" />
            Live-synced to Alex
          </div>
          <button
            onClick={() => void handleRun()}
            disabled={disabled || running}
            className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            title="Execute your code against the test cases, right in the browser"
          >
            {running ? "Running…" : "▸ Run tests"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={codeByLang[language]}
          onChange={(value) => {
            const code = value ?? "";
            setCodeByLang((prev) => ({ ...prev, [language]: code }));
            onCodeChange(code, language);
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 4,
            automaticLayout: true,
            padding: { top: 16 },
            readOnly: disabled,
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            fontLigatures: true,
          }}
          loading={
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Loading editor…
            </div>
          }
        />
      </div>

      {/* ── Judge results drawer ─────────────────────────────────────── */}
      <div className="shrink-0 border-t border-hairline bg-surface">
        <button
          onClick={() => setResultsOpen((open) => !open)}
          className="flex h-8 w-full items-center justify-between px-4 text-xs font-medium text-sub hover:text-ink"
        >
          <span>
            Test results
            {summary && !summary.setupError ? (
              <span className={summary.passed === summary.total ? "text-good" : "text-critical"}>
                {" "}
                · {summary.passed}/{summary.total}
              </span>
            ) : null}
          </span>
          <span className="text-muted">{resultsOpen ? "▾" : "▴"}</span>
        </button>
        {resultsOpen && (
          <div className="max-h-56 overflow-y-auto border-t border-hairline">
            <TestPanel summary={summary} running={running} status={runStatus} />
          </div>
        )}
      </div>
    </div>
  );
}
