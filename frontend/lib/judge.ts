import type { Language } from "@/lib/problems";

/**
 * The in-browser judge: per-problem test specs plus the answer checkers.
 *
 * Execution happens entirely client-side (a sandboxed Web Worker for JS/TS,
 * Pyodide/WebAssembly for Python — see run-code.ts), so nothing is sent to a
 * server and the free-tier promise holds. Checkers live here, in one place,
 * regardless of which runtime produced the answer.
 */

export interface JudgeCase {
  /** Short human-readable label shown in the results row. */
  label: string;
  /** Arguments for the entry function; for class problems: [methods, argsList]. */
  input: unknown[];
  expected: unknown;
}

export interface JudgeSpec {
  kind: "function" | "class";
  /** Entry function name (JS/TS global or Solution method in Python). */
  entry: string;
  /** For kind "class": the class under test (e.g. LRUCache). */
  className?: string;
  checker: "exact" | "twoSum" | "palindrome";
  cases: JudgeCase[];
}

export interface CaseOutcome {
  label: string;
  pass: boolean;
  /** JSON-ish render of what the code returned (truncated for display). */
  got: string;
  expected: string;
  error?: string;
  timeMs: number;
}

export interface TestRunSummary {
  problemId: string;
  language: Language;
  passed: number;
  total: number;
  /** Compile/setup error that prevented any case from running. */
  setupError?: string;
  cases: CaseOutcome[];
  at: number;
}

export const JUDGES: Record<string, JudgeSpec> = {
  "two-sum": {
    kind: "function",
    entry: "twoSum",
    checker: "twoSum",
    cases: [
      { label: "nums=[2,7,11,15], target=9", input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { label: "nums=[3,2,4], target=6", input: [[3, 2, 4], 6], expected: [1, 2] },
      { label: "duplicates: nums=[3,3], target=6", input: [[3, 3], 6], expected: [0, 1] },
      { label: "negatives: nums=[-3,4,3,90], target=0", input: [[-3, 4, 3, 90], 0], expected: [0, 2] },
    ],
  },
  "lru-cache": {
    kind: "class",
    entry: "lru",
    className: "LRUCache",
    checker: "exact",
    cases: [
      {
        label: "capacity 2, classic eviction sequence",
        input: [
          ["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"],
          [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]],
        ],
        expected: [null, null, null, 1, null, -1, null, -1, 3, 4],
      },
      {
        label: "capacity 1, immediate eviction",
        input: [
          ["LRUCache", "put", "get", "put", "get", "get"],
          [[1], [2, 1], [2], [3, 2], [2], [3]],
        ],
        expected: [null, null, 1, null, -1, 2],
      },
      {
        label: "put updates refresh recency",
        input: [
          ["LRUCache", "put", "put", "put", "get", "get"],
          [[2], [1, 1], [2, 2], [1, 10], [1], [2]],
        ],
        expected: [null, null, null, null, 10, 2],
      },
    ],
  },
  "number-of-islands": {
    kind: "function",
    entry: "numIslands",
    checker: "exact",
    cases: [
      {
        label: "one big island",
        input: [
          [
            ["1", "1", "1", "1", "0"],
            ["1", "1", "0", "1", "0"],
            ["1", "1", "0", "0", "0"],
            ["0", "0", "0", "0", "0"],
          ],
        ],
        expected: 1,
      },
      {
        label: "three islands",
        input: [
          [
            ["1", "1", "0", "0", "0"],
            ["1", "1", "0", "0", "0"],
            ["0", "0", "1", "0", "0"],
            ["0", "0", "0", "1", "1"],
          ],
        ],
        expected: 3,
      },
      { label: "single land cell", input: [[["1"]]], expected: 1 },
      { label: "all water", input: [[["0", "0"], ["0", "0"]]], expected: 0 },
    ],
  },
  "longest-palindromic-substring": {
    kind: "function",
    entry: "longestPalindrome",
    checker: "palindrome",
    cases: [
      { label: 's="babad"', input: ["babad"], expected: "bab" },
      { label: 's="cbbd"', input: ["cbbd"], expected: "bb" },
      { label: 'single char: s="a"', input: ["a"], expected: "a" },
      { label: 'no repeat: s="ac"', input: ["ac"], expected: "a" },
      { label: 'whole string: s="racecar"', input: ["racecar"], expected: "racecar" },
    ],
  },
};

/**
 * Checks one raw answer against its case. Checkers accept any valid answer,
 * not just the sample one — Two Sum indices in either order, any maximal
 * palindrome — exactly like a real judge.
 */
export function checkAnswer(
  spec: JudgeSpec,
  testCase: JudgeCase,
  actual: unknown
): boolean {
  switch (spec.checker) {
    case "twoSum": {
      const [nums, target] = testCase.input as [number[], number];
      if (!Array.isArray(actual) || actual.length !== 2) return false;
      const [i, j] = actual as number[];
      if (!Number.isInteger(i) || !Number.isInteger(j) || i === j) return false;
      if (i < 0 || j < 0 || i >= nums.length || j >= nums.length) return false;
      return nums[i] + nums[j] === target;
    }
    case "palindrome": {
      const [s] = testCase.input as [string];
      const want = testCase.expected as string;
      if (typeof actual !== "string" || actual.length !== want.length) return false;
      if (!s.includes(actual)) return false;
      return actual === actual.split("").reverse().join("");
    }
    case "exact":
    default:
      return deepEqual(normalize(actual), normalize(testCase.expected));
  }
}

/** undefined (a void JS method) and None both read as null in ops output. */
function normalize(value: unknown): unknown {
  return value === undefined ? null : value;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(normalize(v), normalize(b[i])));
  }
  return false;
}

/** Compact, truncated render for the results table. */
export function renderValue(value: unknown): string {
  let text: string;
  try {
    text = value === undefined ? "undefined" : JSON.stringify(value) ?? String(value);
  } catch {
    text = String(value);
  }
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}
