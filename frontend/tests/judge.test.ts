import { describe, expect, it } from "vitest";
import { JUDGES, checkAnswer, renderValue } from "@/lib/judge";
import { PROBLEMS } from "@/lib/problems";

/**
 * Unit suite for the judge's pure core: the per-problem specs and the
 * checkers that decide verdicts. Runtime execution (Web Worker, Pyodide,
 * Sucrase) is exercised end-to-end in the browser; these tests pin down the
 * judging logic all three runtimes share.
 */

describe("judge specs", () => {
  it("every problem in the bank has a judge spec with cases", () => {
    for (const problem of PROBLEMS) {
      const spec = JUDGES[problem.id];
      expect(spec, `missing judge for ${problem.id}`).toBeDefined();
      expect(spec.cases.length, `no cases for ${problem.id}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("class specs name the class under test", () => {
    for (const spec of Object.values(JUDGES)) {
      if (spec.kind === "class") {
        expect(spec.className).toBeTruthy();
      }
    }
  });
});

describe("two-sum checker (order-insensitive, validity-based)", () => {
  const spec = JUDGES["two-sum"];
  const first = spec.cases[0]; // nums=[2,7,11,15], target=9 → [0,1]

  it("accepts the canonical answer and its reverse", () => {
    expect(checkAnswer(spec, first, [0, 1])).toBe(true);
    expect(checkAnswer(spec, first, [1, 0])).toBe(true);
  });

  it("rejects using the same element twice", () => {
    expect(checkAnswer(spec, first, [0, 0])).toBe(false);
  });

  it("rejects indices out of bounds, wrong sums, and non-arrays", () => {
    expect(checkAnswer(spec, first, [0, 9])).toBe(false);
    expect(checkAnswer(spec, first, [2, 3])).toBe(false); // 11+15 ≠ 9
    expect(checkAnswer(spec, first, "0,1")).toBe(false);
    expect(checkAnswer(spec, first, [0])).toBe(false);
    expect(checkAnswer(spec, first, [0.5, 1.5])).toBe(false);
    expect(checkAnswer(spec, first, [-1, 1])).toBe(false);
  });

  it("validates against values, not the sample answer, for duplicates", () => {
    const dup = spec.cases.find((c) => c.label.includes("duplicates"))!;
    expect(checkAnswer(spec, dup, [0, 1])).toBe(true);
    expect(checkAnswer(spec, dup, [1, 0])).toBe(true);
    expect(checkAnswer(spec, dup, [1, 1])).toBe(false);
  });
});

describe("palindrome checker (any valid maximal palindrome)", () => {
  const spec = JUDGES["longest-palindromic-substring"];
  const babad = spec.cases[0]; // s="babad" → len-3 palindrome

  it("accepts both maximal answers", () => {
    expect(checkAnswer(spec, babad, "bab")).toBe(true);
    expect(checkAnswer(spec, babad, "aba")).toBe(true);
  });

  it("rejects non-palindromes, wrong lengths, and non-substrings", () => {
    expect(checkAnswer(spec, babad, "bad")).toBe(false); // not a palindrome
    expect(checkAnswer(spec, babad, "b")).toBe(false); // too short
    expect(checkAnswer(spec, babad, "babad")).toBe(false); // not a palindrome
    expect(checkAnswer(spec, babad, "xyx")).toBe(false); // not in s
    expect(checkAnswer(spec, babad, 42)).toBe(false);
  });
});

describe("exact checker (deep equality with null/undefined unification)", () => {
  const lru = JUDGES["lru-cache"];
  const seq = lru.cases[0];

  it("accepts the exact ops output", () => {
    expect(checkAnswer(lru, seq, seq.expected)).toBe(true);
  });

  it("treats undefined (void JS method) as null in ops output", () => {
    const withUndefined = (seq.expected as unknown[]).map((v) =>
      v === null ? undefined : v
    );
    expect(checkAnswer(lru, seq, withUndefined)).toBe(true);
  });

  it("rejects wrong values and wrong lengths", () => {
    const wrong = [...(seq.expected as unknown[])];
    wrong[3] = 999;
    expect(checkAnswer(lru, seq, wrong)).toBe(false);
    expect(checkAnswer(lru, seq, (seq.expected as unknown[]).slice(1))).toBe(false);
  });

  it("compares nested arrays for merge-intervals", () => {
    const merge = JUDGES["merge-intervals"];
    const unsorted = merge.cases.find((c) => c.label.includes("unsorted"))!;
    expect(checkAnswer(merge, unsorted, [[1, 4], [5, 6]])).toBe(true);
    expect(checkAnswer(merge, unsorted, [[5, 6], [1, 4]])).toBe(false); // must be sorted
    expect(checkAnswer(merge, unsorted, [[1, 6]])).toBe(false); // over-merged
  });

  it("scores valid-parentheses booleans strictly", () => {
    const vp = JUDGES["valid-parentheses"];
    const interleaved = vp.cases.find((c) => c.label.includes("interleaved"))!;
    expect(checkAnswer(vp, interleaved, false)).toBe(true);
    expect(checkAnswer(vp, interleaved, true)).toBe(false);
    expect(checkAnswer(vp, interleaved, "false")).toBe(false); // type matters
  });
});

describe("renderValue", () => {
  it("stringifies JSON-able values compactly", () => {
    expect(renderValue([0, 1])).toBe("[0,1]");
    expect(renderValue(true)).toBe("true");
    expect(renderValue(null)).toBe("null");
    expect(renderValue(undefined)).toBe("undefined");
  });

  it("truncates long output for the results table", () => {
    const long = renderValue(Array.from({ length: 200 }, (_, i) => i));
    expect(long.length).toBeLessThanOrEqual(120);
    expect(long.endsWith("…")).toBe(true);
  });

  it("survives circular structures", () => {
    const cyc: Record<string, unknown> = {};
    cyc.self = cyc;
    expect(typeof renderValue(cyc)).toBe("string");
  });
});
