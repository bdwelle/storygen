#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Logging function - single-line entries to storygen.log
function log(operation, details = {}) {
  const timestamp = new Date().toISOString();
  const detailsStr = Object.entries(details)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ');
  const logLine = `${timestamp} ${operation} ${detailsStr}\n`;
  
  const logPath = path.join(process.cwd(), 'storygen.log');
  fs.appendFileSync(logPath, logLine);
}

// Error handling - warnings to stderr
function warn(message) {
  console.error(`Warning: ${message}`);
  log('warning', { message });
}

// Parse includes from YAML frontmatter
function parseIncludesFromFrontmatter(frontmatterText) {
  const includes = [];
  const lines = frontmatterText.split('\n');
  let inIncludesSection = false;

  for (const line of lines) {
    if (line.match(/^includes:/)) {
      inIncludesSection = true;
      continue;
    }
    if (inIncludesSection) {
      const includeMatch = line.match(/^\s*-\s+(.+)$/);
      if (includeMatch) {
        includes.push(includeMatch[1].trim());
      } else if (line.match(/^\S/)) {
        // New top-level key, stop parsing includes
        break;
      }
    }
  }
  
  return includes;
}

// Parse full frontmatter into object
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  
  const frontmatter = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  let currentArray = null;
  
  for (const line of lines) {
    // Array item
    const arrayMatch = line.match(/^\s*-\s+(.+)$/);
    if (arrayMatch && currentArray) {
      currentArray.push(arrayMatch[1].trim());
      continue;
    }
    
    // Key-value pair
    const kvMatch = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      currentKey = key;
      
      if (value === '') {
        // Array starts on next line
        currentArray = [];
        frontmatter[key] = currentArray;
      } else {
        // Simple value
        frontmatter[key] = value.trim();
        currentArray = null;
      }
    }
  }
  
  return frontmatter;
}

// Build concept index from inc/ directory
function buildConceptIndex(incDir) {
  const index = {}; // { "steg": "inc/steg.md", "execon": "inc/steg.md", ... }
  
  if (!fs.existsSync(incDir)) {
    log('concept_index', { status: 'no_inc_dir' });
    return index;
  }
  
  const files = fs.readdirSync(incDir).filter(f => f.endsWith('.md') && f !== 'main.md');
  
  for (const file of files) {
    const filePath = path.join(incDir, file);
    const basename = file.replace(/\.md$/, '');
    const relPath = `inc/${file}`;
    
    // Add filename as primary key
    index[basename] = relPath;
    
    // Parse frontmatter for aliases
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const frontmatter = parseFrontmatter(content);
      
      if (frontmatter.aliases && Array.isArray(frontmatter.aliases)) {
        for (const alias of frontmatter.aliases) {
          index[alias] = relPath;
        }
      }
    } catch (err) {
      warn(`Error parsing frontmatter in ${file}: ${err.message}`);
    }
  }
  
  log('concept_index', { 
    status: 'built', 
    files: files.length, 
    entries: Object.keys(index).length 
  });
  
  return index;
}

// Extract concept tokens from user prompt
function extractConceptTokens(prompt) {
  if (!prompt) return [];
  
  // Split on whitespace, punctuation, but keep hyphens/underscores
  const tokens = prompt
    .toLowerCase()
    .split(/[\s,.()?!;:"]+/)
    .filter(t => t.length > 0);
  
  return tokens;
}

// Find concept files matching user prompt
function findConceptFiles(prompt, conceptIndex) {
  const tokens = extractConceptTokens(prompt);
  const matchedFiles = new Set();
  
  log('concept_extraction', { 
    tokens: JSON.stringify(tokens),
    source: 'user_prompt'
  });
  
  for (const token of tokens) {
    if (conceptIndex[token]) {
      matchedFiles.add(conceptIndex[token]);
    }
  }
  
  if (matchedFiles.size > 0) {
    log('concept_matching', { 
      matches: JSON.stringify(Array.from(matchedFiles)),
      status: 'ok'
    });
  }
  
  return Array.from(matchedFiles);
}

// Load related concepts from a concept file's frontmatter
function loadRelatedConcepts(conceptFile, conceptIndex, projectDir) {
  const relatedFiles = [];
  const filePath = path.join(projectDir, conceptFile);
  
  if (!fs.existsSync(filePath)) return relatedFiles;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatter = parseFrontmatter(content);
    
    if (frontmatter.related_concepts && Array.isArray(frontmatter.related_concepts)) {
      for (const concept of frontmatter.related_concepts) {
        // Look up concept in index
        if (conceptIndex[concept]) {
          relatedFiles.push(conceptIndex[concept]);
        }
      }
      
      if (relatedFiles.length > 0) {
        log('related_concepts', {
          from: conceptFile,
          loaded: JSON.stringify(relatedFiles)
        });
      }
    }
  } catch (err) {
    warn(`Error loading related concepts from ${conceptFile}: ${err.message}`);
  }
  
  return relatedFiles;
}

////////////////////////////////
// MAIN 

// Log start of execution
log('START storygen skill');

// Parse command line arguments
const args = process.argv.slice(2);

// Log the original command line arguments
log('argv', { 
  args: JSON.stringify(process.argv.slice(2))
});

if (args.length < 1) {
  console.error('Usage: run.js <template-name> [user-prompt]');
  process.exit(1);
}

const templateName = args[0];
const userPrompt = args.slice(1).join(' ');
const baseDir = __dirname;
const storeygenRoot = path.join(baseDir, '../..');  // Go up to storygen root

log('run', { 
  template: templateName, 
  user_prompt: userPrompt ? `"${userPrompt}"` : 'none'
});

////////////////
// TEMPLATES

// Read template file from root tpl/ directory
const templatePath = path.join(storeygenRoot, 'tpl', `${templateName}.md`);
if (!fs.existsSync(templatePath)) {
  warn(`Template not found: ${templatePath}`);
  log('error', { type: 'template_not_found', path: templatePath });
  process.exit(1);
}

const templateContent = fs.readFileSync(templatePath, 'utf8');
log('template', { file: templatePath, status: 'ok' });

// Parse YAML frontmatter
const match = templateContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
if (!match) {
  // No frontmatter - just output template
  console.log(templateContent);
  if (userPrompt) {
    console.log(`\n\nUser request: ${userPrompt}\n`);
  }
  log('output', { bytes: templateContent.length });
  process.exit(0);
}

const [, frontmatterText, templateBody] = match;

////////////////
// INCLUDES (context)

// Auto-include project context first (from current working directory)
const projectMainPath = path.join(process.cwd(), 'inc/main.md');
const includes = [];

// Check if project main.md exists - REQUIRED
if (!fs.existsSync(projectMainPath)) {
  console.error(`Error: Project context not found: ${projectMainPath}`);
  console.error('');
  console.error('You must have inc/main.md in your project directory.');
  console.error('Run from your project directory with an inc/main.md file.');
  log('error', { type: 'project_context_required', path: projectMainPath });
  process.exit(1);
}

// Read and parse project main.md
const projectMainContent = fs.readFileSync(projectMainPath, 'utf8');
const projectMainMatch = projectMainContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

if (projectMainMatch) {
  // Project main.md has frontmatter - parse its includes first
  const projectMainIncludes = parseIncludesFromFrontmatter(projectMainMatch[1]);
  includes.push(...projectMainIncludes);
  log('project_main_includes', { count: projectMainIncludes.length, files: JSON.stringify(projectMainIncludes) });
}

// Then add project main.md itself
includes.push('inc/main.md');

// Build concept index and find matching concept files from user prompt
const incDir = path.join(process.cwd(), 'inc');
const conceptIndex = buildConceptIndex(incDir);
const conceptFiles = findConceptFiles(userPrompt, conceptIndex);

// Load related concepts from matched concept files
const relatedConceptFiles = [];
for (const conceptFile of conceptFiles) {
  const related = loadRelatedConcepts(conceptFile, conceptIndex, process.cwd());
  relatedConceptFiles.push(...related);
}

// Combine concept files + related, deduplicate
const allConceptFiles = [...new Set([...conceptFiles, ...relatedConceptFiles])];

// Insert concept files after project main, before template includes
includes.push(...allConceptFiles);

// Parse additional includes from template frontmatter
const templateIncludes = parseIncludesFromFrontmatter(frontmatterText);
includes.push(...templateIncludes);

// Final deduplication - preserve order, remove duplicates
const uniqueIncludes = [];
const seen = new Set();
for (const inc of includes) {
  if (!seen.has(inc)) {
    uniqueIncludes.push(inc);
    seen.add(inc);
  }
}

log('includes_final', {
  total: uniqueIncludes.length,
  files: JSON.stringify(uniqueIncludes)
});

// Process includes with multi-path resolution
let output = '';

if (uniqueIncludes.length > 0) {
  for (const inc of uniqueIncludes) {
    let resolved = false;
    const searchPaths = [
      path.join(process.cwd(), inc),              // 1. Relative to current directory (PROJECT)
      path.isAbsolute(inc) ? inc : null           // 2. Absolute path
    ].filter(p => p !== null);

    for (const incPath of searchPaths) {
      if (fs.existsSync(incPath)) {
        try {
          let content = fs.readFileSync(incPath, 'utf8');
          
          // Strip frontmatter if present (only include the body)
          const frontmatterMatch = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
          if (frontmatterMatch) {
            content = frontmatterMatch[1];
          }
          
          output += content + '\n\n';
          log('include', { file: inc, resolved: incPath, status: 'ok' });
          resolved = true;
          break;
        } catch (err) {
          warn(`Error reading include ${incPath}: ${err.message}`);
          log('include', { file: inc, resolved: incPath, status: 'error', error: err.message });
        }
      }
    }

    if (!resolved) {
      warn(`Include file not found: ${inc}`);
      log('include', { file: inc, status: 'missing' });
    }
  }
}

// Add template body
output += templateBody;

// Add user prompt if provided
if (userPrompt) {
  output += `\n\n## User Request\n\n${userPrompt}\n`;
}

// Output to stdout
console.log(output);
log('output', { bytes: output.length });

// Log END of execution
log("END storygen skill\n");
