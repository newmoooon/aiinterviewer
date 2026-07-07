"""Interviewer-side problem bank.

This mirrors the frontend problem bank (frontend/lib/problems.ts) but only
carries what the AI interviewer needs: a short statement plus a *private*
grading rubric (optimal approach + common pitfalls) that must never be
revealed to the candidate.
"""

DEFAULT_PROBLEM_ID = "two-sum"

PROBLEMS: dict[str, dict[str, str]] = {
    "two-sum": {
        "title": "Two Sum",
        "difficulty": "Easy",
        "summary": (
            "Given an array of integers `nums` and an integer `target`, return the "
            "indices of the two numbers that add up to `target`. Exactly one solution "
            "exists and the same element may not be used twice."
        ),
        "optimal": (
            "One-pass hash map: for each value, check whether (target - value) was "
            "already seen; O(n) time, O(n) space. Brute force is O(n^2)."
        ),
        "pitfalls": (
            "Using the same element twice; returning values instead of indices; "
            "breaking on duplicate values (e.g. [3,3] target 6); claiming sorting + "
            "two pointers works without noticing it destroys the original indices."
        ),
    },
    "lru-cache": {
        "title": "LRU Cache",
        "difficulty": "Medium",
        "summary": (
            "Design a data structure implementing a Least Recently Used cache with a "
            "fixed capacity. get(key) returns the value or -1; put(key, value) inserts "
            "or updates and evicts the least recently used entry when over capacity. "
            "Both operations should run in O(1) average time."
        ),
        "optimal": (
            "Hash map pointing into a doubly linked list (or an ordered dict): map for "
            "O(1) lookup, list for O(1) recency reordering and eviction from the tail. "
            "Both get and put must refresh recency."
        ),
        "pitfalls": (
            "Forgetting that get() also refreshes recency; forgetting that put() on an "
            "existing key updates the value AND recency without evicting; evicting "
            "before checking whether the key already exists; O(n) recency updates via "
            "a plain list; off-by-one on the capacity check."
        ),
    },
    "number-of-islands": {
        "title": "Number of Islands",
        "difficulty": "Medium",
        "summary": (
            "Given an m x n grid of '1' (land) and '0' (water), count the number of "
            "islands. An island is a group of adjacent land cells connected "
            "horizontally or vertically (not diagonally)."
        ),
        "optimal": (
            "Scan every cell; when you hit unvisited land, increment the count and "
            "flood-fill (DFS/BFS) to sink the whole island. O(m*n) time. Marking "
            "visited by mutating the grid in place is fine if the candidate calls it out."
        ),
        "pitfalls": (
            "Missing bounds checks in the flood fill; counting diagonal neighbors; "
            "forgetting to mark cells visited (infinite recursion); recursion depth on "
            "huge grids (worth probing: could you do it iteratively/BFS?); comparing "
            "against integer 1 when the grid holds the character '1'."
        ),
    },
    "longest-palindromic-substring": {
        "title": "Longest Palindromic Substring",
        "difficulty": "Medium",
        "summary": (
            "Given a string s, return the longest substring of s that is a palindrome."
        ),
        "optimal": (
            "Expand around center over all 2n-1 centers (odd and even), tracking the "
            "best window; O(n^2) time, O(1) space. DP table is also acceptable at "
            "O(n^2)/O(n^2). Manacher's O(n) is a bonus, not expected."
        ),
        "pitfalls": (
            "Handling only odd-length centers (fails 'abba'); off-by-one when "
            "converting the expanded pointers back to a substring slice; pointer "
            "overshooting the string bounds during expansion; confusing substring "
            "with subsequence."
        ),
    },
}


def get_problem(problem_id: str | None) -> dict[str, str]:
    if problem_id and problem_id in PROBLEMS:
        return {"id": problem_id, **PROBLEMS[problem_id]}
    return {"id": DEFAULT_PROBLEM_ID, **PROBLEMS[DEFAULT_PROBLEM_ID]}
