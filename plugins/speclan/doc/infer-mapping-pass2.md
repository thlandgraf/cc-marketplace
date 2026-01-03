# How to: Bring Back Pass 2 (Gap Detection)

## Background

Pass 2 was a gap detection phase in `spec-map-from-code.md` that ran after initial mapping to find missed features. It was removed in v0.3.6 because:

**Current Limitation (January 2026):** LLM context windows are not large enough to reliably handle the two-pass approach. The agent often fails to produce structured output when asked to do both initial mapping AND gap detection in a single response.

The 7-agent parallel exploration (ui, api, datamodel, domain x4) provides sufficient coverage without gap detection.

## When Pass 2 Helps

Pass 2 gap detection is valuable when:
- Running a single `focus: all` exploration instead of parallel focused runs
- Codebase has unconventional directory structures
- Features are scattered across multiple locations
- Cross-cutting concerns span multiple architectural layers

## How to Re-enable Pass 2

### 1. Update `spec-map-from-code.md`

Add after the "Build Flat List" section (### 5):

```markdown
---

## Pass 2: Gap Detection

After building the initial spec-map, perform a second pass to find missed features.

### 6. Identify Unmapped Code

Compare the initial spec-map against the codebase to find gaps:

**6.1 Directory Coverage Check**

For each source directory in the codebase:
1. Check if any spec-map entry's `code_hints` covers this directory
2. If NOT covered, assess if it contains significant code:
   - **Significant:** >100 LOC OR >2 source files OR contains exported functions/classes
   - **Not significant:** Utility helpers, config files, type definitions only

**6.2 Entry Point Check**

Look for unmapped entry points:
- **API endpoints** not associated with any feature
- **UI routes/pages** not associated with any feature
- **CLI commands** not associated with any feature
- **Event handlers/webhooks** not associated with any feature

**6.3 Module/Service Check**

Look for standalone modules:
- Services or repositories not covered by existing features
- Middleware or interceptors with distinct functionality
- Plugins or extensions not mapped

### 7. Add Missed Features

For each significant gap found:

1. **Assess complexity** using the same indicators from Pass 1
2. **Generate ID** for the missed feature
3. **Determine parent:** Is this a subfeature of an existing feature, or a new root feature?
4. **Create entry** in the same format as Pass 1

### 8. Build MISSED_FEATURES Section

```markdown
## MISSED_FEATURES

| ID | parent_id | filepath | title | description | code_hints | reason_missed |
|----|-----------|----------|-------|-------------|------------|---------------|
| F-XXX | | path | Title | Description | hints | Why it was missed |
```

**reason_missed** values:
- `nested-utility` - Appeared to be helper code, actually has distinct functionality
- `unconventional-location` - Not in expected directory structure
- `indirect-reference` - Only referenced, not directly exposed
- `cross-cutting` - Spans multiple areas, no single entry point
```

### 2. Update Output Format

Change from 2 sections to 3:

```markdown
**OUTPUT FORMAT:** Your response must contain ONLY three markdown sections:
`## SPEC_MAP`, `## MISSED_FEATURES`, and `## EXPLORATION_SUMMARY`.
```

Add to EXPLORATION_SUMMARY template:

```markdown
### Pass 2: Gap Detection
- Directories checked: X
- Gaps found: Y
- Missed features added: Z
- Most common reason: [reason_missed value]
```

### 3. Update `infer-from-codebase-v2.md`

Update agent returns documentation:

```markdown
Each agent returns:
- `## SPEC_MAP` - Features found from its focused perspective
- `## MISSED_FEATURES` - Additional features from gap detection
- `## EXPLORATION_SUMMARY` - Statistics including focus area
```

Update merging algorithm to include MISSED_FEATURES:

```
for each feature in agent_output.MISSED_FEATURES:
    if not overlaps_existing(feature, all_features):
        feature.add_columns(specified='[ ]', linked='[ ]')
        all_features.append(feature)
```

## Future Considerations

When context windows grow larger (likely 2026-2027), re-evaluate:
- Test with single `focus: all` + Pass 2 vs parallel focused runs
- Measure feature coverage and accuracy
- Consider making Pass 2 optional via command flag: `--with-gap-detection`
