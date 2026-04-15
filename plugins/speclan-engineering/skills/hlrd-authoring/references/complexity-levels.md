# Complexity Levels

The HLRD pipeline supports five complexity levels that shape how aggressively the planning phase decomposes the HLRD into Features. Lower levels produce broad, high-level groupings; higher levels produce fine-grained breakdowns.

## The five levels

| Index | Label    | Feature range | When to use                                                    |
|-------|----------|---------------|----------------------------------------------------------------|
| 0     | Minimal  | 1–2           | Very short HLRDs, bullet-point briefs, proof-of-concept scope  |
| 1     | Compact  | 2–4           | Short HLRDs covering a single functional area                  |
| 2     | Balanced | 3–7           | **Default.** Most HLRDs — moderate decomposition               |
| 3     | Detailed | 4–12          | Long HLRDs with multiple functional areas                      |
| 4     | Granular | 5–18          | Very long HLRDs — maximum decomposition depth                  |

## Word-count recommendation

Recommend a level based on the HLRD's word count:

| Word count    | Recommended level         |
|---------------|---------------------------|
| ≤ 100         | 0 (Minimal)               |
| 101 – 300     | 1 (Compact)               |
| 301 – 700     | 2 (Balanced)              |
| 701 – 1500    | 3 (Detailed)              |
| > 1500        | 4 (Granular)              |

These thresholds come from the reference implementation's `recommendComplexityLevel(wordCount)` function and reflect observed practice: projects where the HLRD itself is short rarely benefit from more than a handful of features.

## Presenting the choice

Use `AskUserQuestion` to confirm the recommendation. Present all five levels with labels and feature ranges, and indicate which one is recommended. Example:

```
Question: How finely should I decompose this HLRD into features?

Options:
1. Minimal (1–2 features) — broad grouping
2. Compact (2–4 features) — major functional areas only
3. Balanced (3–7 features) — recommended for this HLRD (balanced)
4. Detailed (4–12 features) — finer-grained breakdown
5. Granular (5–18 features) — maximum decomposition
```

Note: `AskUserQuestion` supports up to 4 options per question. Since there are 5 levels, present options 1–4 first with a 5th "Show more options" path that offers Granular. Alternatively, narrow the choice: show the recommended level plus the two neighbors (recommended−1, recommended, recommended+1) plus "Other — show all 5", which fits in 4 options and covers the common case.

The "neighbors" approach is usually cleaner — users rarely want to jump three levels from the recommendation, and the escape hatch preserves the full range for edge cases.

## How the level shapes the plan

Use the level's **feature range** as a hard cap during planning:

- If the draft plan has **more** features than the top of the range, **collapse** related features (merge siblings that share a parent concept, or fold a child into its parent if the child is a single capability).
- If the draft plan has **fewer** features than the bottom of the range, **split** compound features (separate distinct capabilities that were lumped together).

The range is aspirational, not absolute — prefer a coherent plan at the edge of the range over a padded plan inside it. But a plan that sits significantly outside the range usually means either the HLRD was denser/sparser than the word count suggested, or the planner misjudged decomposition. In that case, re-examine the HLRD rather than fighting the range.

## ID pool sizing (for batch generation)

When generating IDs in bulk (preferred — avoids chatty `speclan-id-generator` calls), size the pools generously to cover the plan:

- **Feature pool size**: `round(1.5 × top-of-range)` — gives headroom for splits discovered mid-creation.
- **Requirement pool size**: `round(3 × feature pool size)` — assuming an average of 3 requirements per feature.

Example: Balanced level (feature range 3–7).
- Feature pool: `round(1.5 × 7) = 11`
- Requirement pool: `round(3 × 11) = 33`

Request both pools upfront from `speclan-id-generator` in a single call per type — collision-free end-biased generation is much cheaper in batches than one-at-a-time.
