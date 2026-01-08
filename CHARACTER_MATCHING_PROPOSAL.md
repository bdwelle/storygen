# Character Matching Proposal

## Problem Statement

When a user requests scene/storyline generation mentioning character names like:
- "Develop a scene where Celeste oversees an extreme stretching session with Maya"
- "Create a storyline about Maya and the Ship"
- "Suggest scenes with Maya Chen and Celeste Voss"

The system currently does **not** automatically load character definition files from `PROJECT-DIR/characters/`, missing critical character context needed for authentic generation.

## Proposed Solution

**Extend the existing concept matching engine** to also scan and match character names from the `characters/` directory.

### Key Design Principles

1. **Reuse existing infrastructure** - Leverage the alias index system already built
2. **Unified matching** - Character names are just another type of concept
3. **Separate directory** - Characters live in `characters/`, concepts in `inc/`
4. **Same frontmatter format** - Characters use `aliases` and `related_concepts` just like concepts
5. **Include order preserved** - Characters inserted alongside concepts, before template includes

## Character File Format

### Current Format (maya-chen.md)
```yaml
---
type: character
name: Maya Chen
status: development
role: protagonist
related_concepts:
created: 2026-01-07
modified: 2026-01-07
---
```

### Enhanced Format (with aliases for matching)
```yaml
---
type: character
name: Maya Chen
status: development
role: protagonist
aliases:
  - maya
  - maya-chen
  - chen
related_concepts:
  - gymnast
  - perfectionism
related_characters:
  - celeste
  - ship
created: 2026-01-07
modified: 2026-01-07
---
```

**New fields:**
- `aliases` - Alternative names/nicknames for matching
- `related_characters` - Other characters to auto-load (relationships)
- `related_concepts` - Domain concepts to auto-load (existing field)

## Implementation Approach

### Option 1: Unified Concept Index (RECOMMENDED)

**Extend existing `buildConceptIndex()` to also scan `characters/` directory.**

```javascript
function buildConceptIndex(projectDir) {
  const index = {}; 
  
  // Scan inc/ for concepts
  scanDirectory(path.join(projectDir, 'inc'), index, 'inc');
  
  // Scan characters/ for character files
  scanDirectory(path.join(projectDir, 'characters'), index, 'characters');
  
  return index;
}

function scanDirectory(dir, index, prefix) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  
  for (const file of files) {
    const basename = file.replace(/\.md$/, '');
    const relPath = `${prefix}/${file}`;
    
    // Add filename
    index[basename] = relPath;
    
    // Parse frontmatter for aliases
    const frontmatter = parseFrontmatter(fs.readFileSync(path.join(dir, file), 'utf8'));
    
    if (frontmatter.aliases) {
      for (const alias of frontmatter.aliases) {
        index[alias] = relPath;
      }
    }
    
    // Also index by 'name' field if present (for characters)
    if (frontmatter.name) {
      const nameLower = frontmatter.name.toLowerCase().replace(/\s+/g, '-');
      index[nameLower] = relPath;
    }
  }
}
```

**Benefits:**
- Single unified index for all matchable entities
- Same matching logic for concepts and characters
- Natural deduplication (Set-based)
- Minimal code changes

**Example Matching:**
```
User: "scene with Celeste and Maya"
Tokens: ["scene", "with", "celeste", "and", "maya"]

Index lookup:
  "celeste" → "characters/celeste.md" ✓
  "maya" → "characters/maya-chen.md" ✓
  
Auto-loaded: characters/celeste.md, characters/maya-chen.md
```

### Option 2: Separate Character Index

**Create parallel `buildCharacterIndex()` function.**

**Benefits:**
- Clear separation of concerns
- Can have different matching rules for characters vs concepts
- Easier to disable character matching independently

**Drawbacks:**
- Code duplication
- More complex include ordering logic
- Two index-building passes

### Recommendation: **Option 1** (Unified Index)

Why?
- Characters ARE concepts (just a specific type)
- Same alias matching logic applies
- Same related-entity auto-loading applies
- Less code, simpler maintenance
- User experience is identical

## Enhanced Related Loading

### Current: `related_concepts`
```yaml
related_concepts:
  - surveillance-capitalism
  - data-extraction
```

### New: `related_characters`
```yaml
related_characters:
  - celeste
  - ship
```

**Implementation:**
```javascript
function loadRelatedConcepts(conceptFile, conceptIndex, projectDir) {
  const relatedFiles = [];
  const filePath = path.join(projectDir, conceptFile);
  
  if (!fs.existsSync(filePath)) return relatedFiles;
  
  const frontmatter = parseFrontmatter(fs.readFileSync(filePath, 'utf8'));
  
  // Load related_concepts (existing)
  if (frontmatter.related_concepts) {
    for (const concept of frontmatter.related_concepts) {
      if (conceptIndex[concept]) {
        relatedFiles.push(conceptIndex[concept]);
      }
    }
  }
  
  // Load related_characters (NEW)
  if (frontmatter.related_characters) {
    for (const character of frontmatter.related_characters) {
      if (conceptIndex[character]) {
        relatedFiles.push(conceptIndex[character]);
      }
    }
  }
  
  return relatedFiles;
}
```

**Why this works:**
- Both concepts and characters are in the same index
- Same lookup mechanism
- No need to distinguish between them

## Include Order

**Final include order:**
1. Project main includes (from `inc/main.md` frontmatter)
2. Project main.md itself
3. **Matched concepts** (from `inc/`)
4. **Matched characters** (from `characters/`)
5. **Related concepts** (auto-loaded)
6. **Related characters** (auto-loaded)
7. Template-specific includes (from template frontmatter)

**Note:** With unified index, concepts and characters are interleaved naturally, which is fine. Order within matched entities doesn't matter as long as they're all loaded before template includes.

## Example Scenarios

### Scenario 1: Character Names in Prompt

**User Request:**
```
"Create a scene where Celeste oversees Maya's stretching session"
```

**Processing:**
```
Tokens: ["create", "scene", "where", "celeste", "oversees", "maya", "stretching", "session"]

Index Matches:
  "celeste" → "characters/celeste.md"
  "maya" → "characters/maya-chen.md"

Related from celeste.md: none
Related from maya-chen.md: 
  related_characters: ["celeste"] (already matched, deduplicated)

Final Includes:
  - inc/main.md
  - characters/celeste.md
  - characters/maya-chen.md
  - /storygen/inc/storygrid.md
  - /storygen/inc/method-writing.md
```

### Scenario 2: Mix of Characters and Concepts

**User Request:**
```
"Scene about Maya signing an execon"
```

**Processing:**
```
Tokens: ["scene", "about", "maya", "signing", "execon"]

Index Matches:
  "maya" → "characters/maya-chen.md"
  "execon" → "inc/steg.md" (alias)

Related from maya-chen.md: none
Related from steg.md:
  related_concepts: ["surveillance-capitalism", ...]

Final Includes:
  - inc/main.md
  - characters/maya-chen.md
  - inc/steg.md
  - inc/surveillance-capitalism.md
  - /storygen/inc/storygrid.md
  - /storygen/inc/method-writing.md
```

### Scenario 3: Character with Related Characters

**celeste.md:**
```yaml
related_characters:
  - ship
```

**User Request:**
```
"Develop a scene with Celeste"
```

**Processing:**
```
Tokens: ["develop", "scene", "with", "celeste"]

Index Matches:
  "celeste" → "characters/celeste.md"

Related from celeste.md:
  related_characters: ["ship"]
  → "characters/ship.md"

Final Includes:
  - inc/main.md
  - characters/celeste.md
  - characters/ship.md  ← auto-loaded
  - /storygen/inc/storygrid.md
  - /storygen/inc/method-writing.md
```

## Name Matching Enhancements

### Handle Full Names

Character file: `maya-chen.md`

Frontmatter:
```yaml
name: Maya Chen
aliases:
  - maya
  - chen
  - maya-chen
```

**Auto-generate index entries:**
- Filename: `maya-chen` → `characters/maya-chen.md`
- Name field: `Maya Chen` → normalize to `maya-chen` → `characters/maya-chen.md`
- Aliases: `maya`, `chen`, `maya-chen` → `characters/maya-chen.md`

**User can say:**
- "maya" ✓
- "Maya Chen" → tokenizes to ["maya", "chen"] → both match → deduplicated to single file ✓
- "maya-chen" ✓
- "chen" ✓

### Handle Case Variations

All matching is **case-insensitive**:
- "Celeste" → `celeste` → matches `characters/celeste.md`
- "MAYA" → `maya` → matches `characters/maya-chen.md`

Already implemented in current code.

## Code Changes Required

### File: `run.js`

#### Change 1: Update `buildConceptIndex()` to scan both directories

```javascript
function buildConceptIndex(projectDir) {
  const index = {};
  
  // Scan inc/ for concepts
  scanDirectory(path.join(projectDir, 'inc'), index, 'inc', { excludeMain: true });
  
  // Scan characters/ for character files
  scanDirectory(path.join(projectDir, 'characters'), index, 'characters');
  
  log('concept_index', { 
    status: 'built',
    concepts: Object.keys(index).filter(k => index[k].startsWith('inc/')).length,
    characters: Object.keys(index).filter(k => index[k].startsWith('characters/')).length,
    total_entries: Object.keys(index).length
  });
  
  return index;
}
```

#### Change 2: Extract `scanDirectory()` helper

```javascript
function scanDirectory(dir, index, prefix, options = {}) {
  if (!fs.existsSync(dir)) {
    log('scan_directory', { dir, status: 'not_found' });
    return;
  }
  
  let files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  
  // Exclude main.md from inc/ directory
  if (options.excludeMain) {
    files = files.filter(f => f !== 'main.md');
  }
  
  for (const file of files) {
    const basename = file.replace(/\.md$/, '');
    const relPath = `${prefix}/${file}`;
    
    // Add filename as key
    index[basename] = relPath;
    
    try {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      const frontmatter = parseFrontmatter(content);
      
      // Add aliases
      if (frontmatter.aliases && Array.isArray(frontmatter.aliases)) {
        for (const alias of frontmatter.aliases) {
          index[alias.toLowerCase()] = relPath;
        }
      }
      
      // Add 'name' field for characters (normalized)
      if (frontmatter.name) {
        const nameLower = frontmatter.name.toLowerCase().replace(/\s+/g, '-');
        index[nameLower] = relPath;
      }
    } catch (err) {
      warn(`Error parsing ${file}: ${err.message}`);
    }
  }
}
```

#### Change 3: Update `loadRelatedConcepts()` to handle `related_characters`

```javascript
function loadRelatedConcepts(conceptFile, conceptIndex, projectDir) {
  const relatedFiles = [];
  const filePath = path.join(projectDir, conceptFile);
  
  if (!fs.existsSync(filePath)) return relatedFiles;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatter = parseFrontmatter(content);
    
    // Load related_concepts
    if (frontmatter.related_concepts && Array.isArray(frontmatter.related_concepts)) {
      for (const concept of frontmatter.related_concepts) {
        if (conceptIndex[concept]) {
          relatedFiles.push(conceptIndex[concept]);
        }
      }
    }
    
    // Load related_characters (NEW)
    if (frontmatter.related_characters && Array.isArray(frontmatter.related_characters)) {
      for (const character of frontmatter.related_characters) {
        if (conceptIndex[character]) {
          relatedFiles.push(conceptIndex[character]);
        }
      }
    }
    
    if (relatedFiles.length > 0) {
      log('related_entities', {
        from: conceptFile,
        loaded: JSON.stringify(relatedFiles)
      });
    }
  } catch (err) {
    warn(`Error loading related from ${conceptFile}: ${err.message}`);
  }
  
  return relatedFiles;
}
```

**Rename function?** Consider renaming to `loadRelatedEntities()` since it now handles both concepts and characters.

## Logging Updates

```
{timestamp} concept_index status=built concepts=3 characters=2 total_entries=9
{timestamp} scan_directory dir=/project/characters status=ok files=2
{timestamp} concept_extraction tokens=["scene","celeste","maya"] source=user_prompt
{timestamp} concept_matching matches=["characters/celeste.md","characters/maya-chen.md"] status=ok
{timestamp} related_entities from=characters/celeste.md loaded=["characters/ship.md"]
{timestamp} includes_final total=6 files=["inc/main.md","characters/celeste.md","characters/maya-chen.md","characters/ship.md",...]
```

## Documentation Updates

### SKILL.md

Add section under "Automatic Concept Matching":

```markdown
### Character Auto-Loading

The system also automatically loads character definitions when names are mentioned:

**How it works:**
- User mentions "Celeste" → system loads `characters/celeste.md`
- User mentions "Maya Chen" → system loads `characters/maya-chen.md` (via name field)
- Characters can have `related_characters` that are auto-loaded

**Character File Format:**
```yaml
---
type: character
name: Maya Chen
aliases:
  - maya
  - chen
related_characters:
  - celeste
  - ship
related_concepts:
  - gymnast
---
```

**Example:**
```bash
{baseDir}/run.js scene "Celeste oversees Maya's stretching session"
```
Automatically includes `characters/celeste.md` and `characters/maya-chen.md`.
```

## Migration Path

### For Existing Character Files

1. **Add aliases array** to frontmatter:
```yaml
---
name: Maya Chen
aliases:
  - maya
  - chen
  - maya-chen
---
```

2. **Add related_characters** if applicable:
```yaml
related_characters:
  - celeste
  - ship
```

3. **Add related_concepts** for domain knowledge:
```yaml
related_concepts:
  - gymnast
  - perfectionism
```

### Backward Compatibility

- Files without `aliases` still match on filename (e.g., `maya-chen.md`)
- Files without `related_characters` still work (no auto-loading)
- Existing concept files unchanged

## Testing Plan

1. **Single character match**
   - `"scene with Celeste"` → loads `characters/celeste.md`

2. **Multiple characters**
   - `"Celeste and Maya"` → loads both character files

3. **Full name matching**
   - `"Maya Chen"` → loads `characters/maya-chen.md` via name field

4. **Alias matching**
   - `"scene with maya"` → loads `characters/maya-chen.md` via alias

5. **Related characters**
   - `"scene with Celeste"` → auto-loads `characters/ship.md` (related)

6. **Mix of concepts and characters**
   - `"Maya signing an execon"` → loads character + concept

7. **Deduplication**
   - `"Celeste and Celeste and Celeste"` → loads once
   - `"Maya and maya-chen"` → loads once (same file, different aliases)

## Summary

**Approach:** Extend existing concept matching to unified entity matching (concepts + characters)

**Key Changes:**
- Scan `characters/` in addition to `inc/`
- Support `related_characters` in frontmatter
- Extract `scanDirectory()` helper
- Update logging
- Update documentation

**Benefits:**
✅ Automatic character context loading  
✅ Minimal code changes (reuse existing infrastructure)  
✅ Consistent matching behavior  
✅ Full alias support for characters  
✅ Relationship auto-loading (related chars + concepts)  
✅ Backward compatible  

**Total Code Change Estimate:** ~50 lines (vs. 200+ for separate system)
