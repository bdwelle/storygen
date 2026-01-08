# Storygen

Simple story generation/fiction writing assistant CLI built as a [Pi coding agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) skill.

## Overview

Storygen uses markdown templates with embedded instructions to generate characters, scenes, storylines, and prose for fiction writing. It integrates Story Grid methodology and provides a simple, flexible workflow.

## Quick Start

1. **Install the skill**:
   ```bash
   ln -s /Users/bdwelle/lib/storygen/pi-skills/storygen ~/.pi/agent/skills/storygen
   ```

2. **Set up a project**:
   ```bash
   mkdir myproject
   cd myproject
   mkdir -p inc characters scenes storylines prose
   cp /path/to/storygen/proj/inc/main.md inc/
   ```

3. **Use with Pi**:
   ```bash
   pi
   # In Pi chat:
   # "Create a character who is a skateboarder punk"
   # "Suggest some scenes about an artist and a businessman"
   ```

## Documentation

- [PROPOSAL.md](PROPOSAL.md) - Complete design and implementation plan
- [PROMPT.md](PROMPT.md) - Original requirements

## Structure

```
storygen/
├── inc/              # Shared context files (Story Grid, writing methods)
├── tpl/              # Reference templates
├── pi-skills/
│   └── storygen/     # Pi skill implementation
├── proj/             # Example project
└── PROPOSAL.md       # Full documentation
```

## Status

Currently in Phase 1A development (see PROPOSAL.md for roadmap).

## License

MIT
