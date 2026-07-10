"use client";

import type { Language } from "@/lib/problems";
import {
  JUDGES,
  checkAnswer,
  renderValue,
  type CaseOutcome,
  type JudgeSpec,
  type TestRunSummary,
} from "@/lib/judge";

/**
 * Client-side code execution — no server, no containers, free-tier friendly:
 *
 *   JavaScript  → sandboxed Web Worker (terminated on timeout)
 *   TypeScript  → Sucrase type-stripping, then the same Worker path
 *   Python      → Pyodide (CPython compiled to WebAssembly, lazy-loaded
 *                 from the CDN on first run, ~10 MB cached afterwards)
 *
 * Raw answers come back to the main thread; verdicts are decided by the
 * checkers in judge.ts so all three runtimes share identical judging.
 */

const WORKER_TIMEOUT_MS = 5_000;
const PYODIDE_VERSION = "0.26.4";

export type RunStatus = "loading-runtime" | "running";

interface RawCaseResult {
  actual?: unknown;
  error?: string;
  timeMs: number;
}

interface RawRun {
  setupError?: string;
  results?: RawCaseResult[];
}

export async function runTests(
  problemId: string,
  code: string,
  language: Language,
  onStatus?: (status: RunStatus) => void
): Promise<TestRunSummary> {
  const spec = JUDGES[problemId];
  const base: TestRunSummary = {
    problemId,
    language,
    passed: 0,
    total: spec?.cases.length ?? 0,
    cases: [],
    at: Date.now(),
  };
  if (!spec) {
    return { ...base, setupError: "No test cases are defined for this problem." };
  }

  let raw: RawRun;
  try {
    if (language === "python") {
      raw = await runPython(code, spec, onStatus);
    } else {
      onStatus?.("running");
      const jsCode = language === "typescript" ? await stripTypes(code) : code;
      raw = await runInWorker(jsCode, spec);
    }
  } catch (err) {
    return { ...base, setupError: errorText(err) };
  }

  if (raw.setupError || !raw.results) {
    return { ...base, setupError: raw.setupError ?? "The run produced no results." };
  }

  const cases: CaseOutcome[] = spec.cases.map((testCase, index) => {
    const result = raw.results![index];
    if (!result || result.error) {
      return {
        label: testCase.label,
        pass: false,
        got: "—",
        expected: renderValue(testCase.expected),
        error: result?.error ?? "No result produced.",
        timeMs: Math.round(result?.timeMs ?? 0),
      };
    }
    const pass = checkAnswer(spec, testCase, result.actual);
    return {
      label: testCase.label,
      pass,
      got: renderValue(result.actual),
      expected: renderValue(testCase.expected),
      timeMs: Math.round(result.timeMs),
    };
  });

  return { ...base, cases, passed: cases.filter((c) => c.pass).length };
}

function errorText(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).slice(0, 400);
}

// ── JavaScript / TypeScript: sandboxed Web Worker ───────────────────────────

const WORKER_SOURCE = `
self.onmessage = (event) => {
  const { code, spec } = event.data;

  const sanitize = (value) => {
    const v = value === undefined ? null : value;
    try {
      return JSON.parse(JSON.stringify(v));
    } catch {
      return String(v);
    }
  };

  // One eval defines the user's code AND yields the entry binding: class/let
  // declarations live in the eval's own lexical environment, so they must be
  // resolved inside the same program, not by a second eval.
  const name = spec.kind === "class" ? spec.className : spec.entry;
  let entry;
  try {
    entry = (0, eval)(
      code + "\\n;(typeof " + name + " !== 'undefined' ? " + name + " : undefined);"
    );
  } catch (err) {
    self.postMessage({ setupError: String((err && err.message) || err).slice(0, 400) });
    return;
  }
  if (typeof entry !== "function") {
    self.postMessage({ setupError: "Could not find \`" + name + "\` in your code — keep the starter signature." });
    return;
  }

  const results = [];
  for (const testCase of spec.cases) {
    const t0 = performance.now();
    try {
      let actual;
      if (spec.kind === "class") {
        const [methods, argsList] = testCase.input;
        const instance = new entry(...argsList[0]);
        const outputs = [null];
        for (let k = 1; k < methods.length; k++) {
          const out = instance[methods[k]](...argsList[k]);
          outputs.push(out === undefined ? null : out);
        }
        actual = outputs;
      } else {
        // Fresh deep copy per case so in-place mutation can't leak across cases.
        actual = entry(...JSON.parse(JSON.stringify(testCase.input)));
      }
      results.push({ actual: sanitize(actual), timeMs: performance.now() - t0 });
    } catch (err) {
      results.push({
        error: String((err && err.message) || err).slice(0, 400),
        timeMs: performance.now() - t0,
      });
    }
  }
  self.postMessage({ results });
};
`;

function runInWorker(code: string, spec: JudgeSpec): Promise<RawRun> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    const timer = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(url);
      reject(
        new Error(
          `Execution timed out after ${WORKER_TIMEOUT_MS / 1000}s — check for an infinite loop.`
        )
      );
    }, WORKER_TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<RawRun>) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(event.data);
    };
    worker.onerror = (event) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      reject(new Error(event.message || "Worker crashed while running your code."));
    };

    worker.postMessage({ code, spec });
  });
}

async function stripTypes(code: string): Promise<string> {
  const { transform } = await import("sucrase");
  try {
    return transform(code, { transforms: ["typescript"] }).code;
  } catch (err) {
    throw new Error(`TypeScript syntax error: ${errorText(err)}`);
  }
}

// ── Python: Pyodide (CPython → WebAssembly) ─────────────────────────────────

interface PyodideLike {
  globals: { set(name: string, value: string): void };
  runPython(code: string): string;
}

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideLike>;
  }
}

let pyodidePromise: Promise<PyodideLike> | null = null;

function loadPyodideOnce(onStatus?: (status: RunStatus) => void): Promise<PyodideLike> {
  if (!pyodidePromise) {
    onStatus?.("loading-runtime");
    pyodidePromise = (async () => {
      const indexURL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
      if (!window.loadPyodide) {
        await injectScript(`${indexURL}pyodide.js`);
      }
      if (!window.loadPyodide) {
        throw new Error("Pyodide failed to load — check your network connection.");
      }
      return window.loadPyodide({ indexURL });
    })();
    // A failed load must not poison every future run.
    pyodidePromise.catch(() => {
      pyodidePromise = null;
    });
  }
  return pyodidePromise;
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not download the Python runtime."));
    document.head.appendChild(script);
  });
}

const PYTHON_DRIVER = `
import json, time

def _interviewlab_run(user_code, spec_json):
    spec = json.loads(spec_json)
    ns = {}
    try:
        exec(user_code, ns)
    except Exception as exc:
        return json.dumps({"setupError": f"{type(exc).__name__}: {exc}"})

    try:
        if spec["kind"] == "class":
            target = ns[spec["className"]]
        else:
            entry = spec["entry"]
            if "Solution" in ns and hasattr(ns["Solution"], entry):
                target = getattr(ns["Solution"](), entry)
            elif entry in ns and callable(ns[entry]):
                target = ns[entry]
            else:
                raise KeyError(entry)
    except Exception:
        name = spec.get("className") or spec["entry"]
        return json.dumps({"setupError": f"Could not find {name} in your code — keep the starter signature."})

    results = []
    for case in spec["cases"]:
        t0 = time.perf_counter()
        try:
            if spec["kind"] == "class":
                methods, args_list = case["input"]
                instance = target(*args_list[0])
                outputs = [None]
                for m, a in zip(methods[1:], args_list[1:]):
                    out = getattr(instance, m)(*a)
                    outputs.append(out)
                actual = outputs
            else:
                args = json.loads(json.dumps(case["input"]))
                actual = target(*args)
            if isinstance(actual, tuple):
                actual = list(actual)
            try:
                json.dumps(actual)
            except (TypeError, ValueError):
                actual = repr(actual)
            results.append({"actual": actual, "timeMs": (time.perf_counter() - t0) * 1000})
        except Exception as exc:
            results.append({"error": f"{type(exc).__name__}: {exc}"[:400], "timeMs": (time.perf_counter() - t0) * 1000})
    return json.dumps({"results": results})

_interviewlab_run(_INTERVIEWLAB_CODE, _INTERVIEWLAB_SPEC)
`;

async function runPython(
  code: string,
  spec: JudgeSpec,
  onStatus?: (status: RunStatus) => void
): Promise<RawRun> {
  const pyodide = await loadPyodideOnce(onStatus);
  onStatus?.("running");
  pyodide.globals.set("_INTERVIEWLAB_CODE", code);
  pyodide.globals.set("_INTERVIEWLAB_SPEC", JSON.stringify(spec));
  const resultJson = pyodide.runPython(PYTHON_DRIVER);
  return JSON.parse(resultJson) as RawRun;
}
