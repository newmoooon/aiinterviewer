export type Language = "python" | "javascript" | "typescript";

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
  statement: string[];
  examples: Example[];
  constraints: string[];
  starterCode: Record<Language, string>;
}

export const PROBLEMS: Problem[] = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    topics: ["Array", "Hash Table"],
    statement: [
      "Given an array of integers nums and an integer target, return the indices of the two numbers such that they add up to target.",
      "You may assume that each input has exactly one solution, and you may not use the same element twice.",
      "You can return the answer in any order.",
    ],
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "nums[0] + nums[1] == 9, so we return [0, 1].",
      },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
      { input: "nums = [3,3], target = 6", output: "[0,1]" },
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Exactly one valid answer exists.",
    ],
    starterCode: {
      python:
        "class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Think out loud as you go!\n        pass\n",
      javascript:
        "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n  // Think out loud as you go!\n}\n",
      typescript:
        "function twoSum(nums: number[], target: number): number[] {\n  // Think out loud as you go!\n  return [];\n}\n",
    },
  },
  {
    id: "lru-cache",
    title: "LRU Cache",
    difficulty: "Medium",
    topics: ["Hash Table", "Linked List", "Design"],
    statement: [
      "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.",
      "Implement the LRUCache class: LRUCache(capacity) initializes the cache with a positive capacity. get(key) returns the value of the key if it exists, otherwise -1. put(key, value) updates the value if the key exists; otherwise adds the pair. If the number of keys exceeds capacity, evict the least recently used key.",
      "The functions get and put must each run in O(1) average time complexity.",
    ],
    examples: [
      {
        input:
          '["LRUCache","put","put","get","put","get","put","get","get","get"]\n[[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]',
        output: "[null,null,null,1,null,-1,null,-1,3,4]",
        explanation:
          "Capacity 2. get(1)=1; put(3,3) evicts key 2; get(2)=-1; put(4,4) evicts key 1; get(1)=-1; get(3)=3; get(4)=4.",
      },
    ],
    constraints: [
      "1 <= capacity <= 3000",
      "0 <= key <= 10^4",
      "0 <= value <= 10^5",
      "At most 2 * 10^5 calls will be made to get and put.",
    ],
    starterCode: {
      python:
        "class LRUCache:\n    def __init__(self, capacity: int):\n        pass\n\n    def get(self, key: int) -> int:\n        pass\n\n    def put(self, key: int, value: int) -> None:\n        pass\n",
      javascript:
        "class LRUCache {\n  /** @param {number} capacity */\n  constructor(capacity) {\n  }\n\n  /** @param {number} key @return {number} */\n  get(key) {\n  }\n\n  /** @param {number} key @param {number} value @return {void} */\n  put(key, value) {\n  }\n}\n",
      typescript:
        "class LRUCache {\n  constructor(capacity: number) {\n  }\n\n  get(key: number): number {\n    return -1;\n  }\n\n  put(key: number, value: number): void {\n  }\n}\n",
    },
  },
  {
    id: "number-of-islands",
    title: "Number of Islands",
    difficulty: "Medium",
    topics: ["Matrix", "DFS", "BFS", "Union Find"],
    statement: [
      "Given an m x n 2D binary grid which represents a map of '1's (land) and '0's (water), return the number of islands.",
      "An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are surrounded by water.",
    ],
    examples: [
      {
        input:
          'grid = [\n  ["1","1","1","1","0"],\n  ["1","1","0","1","0"],\n  ["1","1","0","0","0"],\n  ["0","0","0","0","0"]\n]',
        output: "1",
      },
      {
        input:
          'grid = [\n  ["1","1","0","0","0"],\n  ["1","1","0","0","0"],\n  ["0","0","1","0","0"],\n  ["0","0","0","1","1"]\n]',
        output: "3",
      },
    ],
    constraints: [
      "m == grid.length, n == grid[i].length",
      "1 <= m, n <= 300",
      "grid[i][j] is '0' or '1'.",
    ],
    starterCode: {
      python:
        "class Solution:\n    def numIslands(self, grid: list[list[str]]) -> int:\n        pass\n",
      javascript:
        "/**\n * @param {character[][]} grid\n * @return {number}\n */\nfunction numIslands(grid) {\n}\n",
      typescript:
        "function numIslands(grid: string[][]): number {\n  return 0;\n}\n",
    },
  },
  {
    id: "longest-palindromic-substring",
    title: "Longest Palindromic Substring",
    difficulty: "Medium",
    topics: ["String", "Dynamic Programming", "Two Pointers"],
    statement: [
      "Given a string s, return the longest substring of s that is a palindrome.",
      "A palindrome reads the same forward and backward. If there are multiple answers of the same length, return any of them.",
    ],
    examples: [
      {
        input: 's = "babad"',
        output: '"bab"',
        explanation: '"aba" is also a valid answer.',
      },
      { input: 's = "cbbd"', output: '"bb"' },
    ],
    constraints: [
      "1 <= s.length <= 1000",
      "s consists of digits and English letters.",
    ],
    starterCode: {
      python:
        "class Solution:\n    def longestPalindrome(self, s: str) -> str:\n        pass\n",
      javascript:
        "/**\n * @param {string} s\n * @return {string}\n */\nfunction longestPalindrome(s) {\n}\n",
      typescript:
        "function longestPalindrome(s: string): string {\n  return \"\";\n}\n",
    },
  },
];

export function getProblem(id: string | null): Problem {
  return PROBLEMS.find((p) => p.id === id) ?? PROBLEMS[0];
}
