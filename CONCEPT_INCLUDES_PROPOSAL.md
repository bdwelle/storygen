# Concept-Based Include Loading Proposal for Storygen

## Problem Statement

Currently, when a user requests scene or storyline generation with a command like:
- "Suggest some scenes about executable-contracts"
- "Create a scene about smart contracts and governance"
- "Develop a storyline involving executable-contracts"

The system includes all static includes from `inc/main.md` and the template's frontmatter, but does **not automatically load concept-specific context files** like `inc/executable-contracts.md`.

This means important domain-specific knowledge is missing from the LLM's context.

## Proposed Solution

### 1. **Concept Extraction from User Prompt**

Enhance `run.js` to:
- Parse the user's prompt/description for concept keywords
- Match those keywords against available files in `inc/` directory
- Automatically include matching concept files in the output

### 2. **Implementation Approach**

#### Step 1: Extract Concepts from User Prompt
- Split user prompt into words
- Convert to lowercase for case-insensitive matching
- Create concept candidates from:
  - Individual words: "contracts", "governance", "executable"
  - Hyphenated phrases: "executable-contracts" (exact filename match)
  - Multi-word phrases: "smart contracts" → search for "smart-contracts.md"

#### Step 2: Match Against Available Includes
- Scan `inc/` directory for `.md` files (excluding `main.md`)
- Build a mapping of concept names to file paths
- Match extracted concepts against available files
- Return list of matched concept files

#### Step 3: Auto-Include Matched Concepts
- Insert matched concept files into the includes array
- Position them **after project main includes but before template includes**
  - Why? Project context first, then specific domain knowledge, then task-specific guidance
- Log all matched concepts to `storygen.log`

#### Step 4: De-Duplication
- Prevent the same file from being included twice
- If a concept file is already in the template's includes list, don't add it again

### 3. **Algorithm Details**

**Concept Extraction Logic:**

```
userPrompt = "Suggest scenes about executable-contracts and governance"

Step 1: Tokenize & normalize
  tokens = ["suggest", "scenes", "about", "executable-contracts", "and", "governance"]

Step 2: Generate concept candidates
  - Exact tokens: "suggest", "scenes", "about", "executable-contracts", "and", "governance"
  - Convert hyphens to underscores for searching: "executable_contracts"
  - Keep hyphens for filenames: "executable-contracts.md"

Step 3: Check against inc/ files
  Available: [main.md, executable-contracts.md, method-writing.md, ...]
  Matches: [executable-contracts.md]  ✓ found as is
            [governance.md]            ✗ not found

Step 4: Insert into includes array
  Before:  [project main includes, template includes]
  After:   [project main includes, concept files, template includes]
```

### 4. **File Structure**

**Minimal changes to `run.js`:**

Add these new functions:

```javascript
// Extract potential concept keywords from user prompt
function extractConcepts(prompt) {
  // Returns: Array of concept strings to search for
}

// Find matching concept files in inc/ directory
function findConceptFiles(concepts, incDir) {
  // Returns: Array of matching file paths
}

// Insert concept files into includes array (with dedup)
function insertConceptIncludes(includes, conceptFiles) {
  // Returns: Updated includes array
}
```

### 5. **Matching Strategy**

**Filename-based matching (simple and reliable):**

For each token/concept:
1. Try exact match: `concept.md` (e.g., "executable-contracts.md")
2. Try with hyphens: tokens with spaces → "token-token.md"
3. Try case variations: "Concept.md", "CONCEPT.md"
4. Check if file exists in `inc/` directory

**Benefits:**
- Fast (simple file existence check)
- Deterministic (no fuzzy matching confusion)
- User-controlled (they choose concept names via filenames)
- Safe (only loads explicitly defined includes)

### 6. **Logging**

Add to `storygen.log`:

```
{timestamp} concept_extraction concepts=["executable-contracts","governance"] source="user_prompt"
{timestamp} concept_matching matches=["inc/executable-contracts.md"] status="ok"
{timestamp} include file=inc/executable-contracts.md resolved=/Users/.../inc/executable-contracts.md status=ok source="auto_concept_match"
```

### 7. **Edge Cases Handled**

| Scenario | Behavior |
|----------|----------|
| Concept file doesn't exist | Warn, skip (existing pattern) |
| Concept already in template includes | De-duplicate, include once |
| Multiple matching concepts | Include all matched files |
| No matching concepts | Continue normally (no error) |
| User prompt is empty/short | Still extract what's there |
| Concept in filename but not directory | Skip (file check fails) |

### 8. **User Experience**

**Before (current):**
```
User: "Create a scene about executable-contracts and voting"

System: Includes project context + template context only
LLM: Generates scene without contract/voting knowledge
```

**After (proposed):**
```
User: "Create a scene about executable-contracts and voting"

System: 
  1. Detects concepts: ["executable-contracts", "voting"]
  2. Finds files: [inc/executable-contracts.md, inc/voting.md]
  3. Includes: project context → concept files → template context
  
LLM: Generates scene WITH detailed contract/voting domain knowledge
```

### 9. **Implementation Checklist**

- [ ] Add `extractConcepts(userPrompt)` function to `run.js`
- [ ] Add `findConceptFiles(concepts, incDir)` function to `run.js`
- [ ] Add `insertConceptIncludes(includes, conceptFiles)` function to `run.js`
- [ ] Call concept extraction AFTER parsing template but BEFORE processing includes
- [ ] Update logging to track concept matching
- [ ] Test with various prompts and concept names
- [ ] Update SKILL.md documentation with concept include behavior
- [ ] Create example concept files for testing

### 10. **Configuration Options (Future)**

If needed, could add frontmatter config to templates:

```yaml
---
includes:
  - inc/method-writing.md
concept_matching: enabled  # or 'disabled' to skip auto-matching
concept_priority: "high"   # 'high' to insert before template includes
---
```

But starting simple (always enabled) is better.

## Benefits

✅ **Knowledge Complete:** LLM has domain context it needs  
✅ **Automatic:** User doesn't have to manually specify includes  
✅ **Safe:** Only includes files that actually exist  
✅ **Backwards Compatible:** Existing templates work unchanged  
✅ **Simple:** Minimal code, easy to understand and maintain  
✅ **Observable:** Logged behavior for debugging  

## Questions for Verification

1. **Concept File Format:** Should concept files follow any specific structure (frontmatter, sections)? Or just `.md` files with domain knowledge?

2. **Matching Strategy:** Is exact filename match (hyphens) the right approach? Or should we add fuzzy matching, stemming, or synonym lists?

3. **Concept Position:** Should concepts be inserted:
   - After project main (before template includes)? ← **Recommended**
   - Before project main?
   - At a specific location in includes array?

4. **Scope:** Should this apply to **all** templates (scene, storyline, character, prose) or just some?

5. **Deduplication:** Should we prevent duplicate includes, or allow explicit re-inclusion if user mentions it multiple times?

6. **Error Handling:** If a concept is mentioned but no file exists, should we:
   - Just warn and skip (current error handling pattern)?
   - Ask user if they meant a different concept?
   - List available concepts?

## Next Steps

Once you answer these questions, I can:
1. Update `run.js` with the new functions
2. Create example concept files to test with
3. Update SKILL.md documentation
4. Run test cases to verify behavior
