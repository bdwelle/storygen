---
name: storygen-poc
description: Simple story generation assistant for fiction writing. Use for creating characters, scenes, storylines, and prose. Trigger words: character, scene, storyline, story, prose, fiction, writing.
---

# Storygen (Proof of Concept)

Minimal story generation system using templates with embedded instructions.

## Usage

```bash
{baseDir}/run.js <template-name> [prompt]
```

**Examples:**
```bash
{baseDir}/run.js character "skateboarder punk"
{baseDir}/run.js scene "artist meets businessman"
```

Templates are in `tpl/` and can include context files via YAML frontmatter.
