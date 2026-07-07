"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import type { Language, Problem } from "@/lib/problems";

const LANGS: { id: Language; label: string }[] = [
  { id: "python", label: "Python 3" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
];

export default function EditorPanel({
  problem,
  onCodeChange,
  disabled,
}: {
  problem: Problem;
  onCodeChange: (code: string, language: Language) => void;
  disabled?: boolean;
}) {
  const [language, setLanguage] = useState<Language>("python");
  const [codeByLang, setCodeByLang] = useState<Record<Language, string>>(() => ({
    ...problem.starterCode,
  }));

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
        <div
          className="flex items-center gap-1.5 text-xs text-muted"
          title="Your editor streams live to the interviewer"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-good" />
          Live-synced to Alex
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
    </div>
  );
}
