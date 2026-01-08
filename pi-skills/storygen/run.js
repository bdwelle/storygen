#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: run.js <template-name> [user-prompt]');
  process.exit(1);
}

const templateName = args[0];
const userPrompt = args.slice(1).join(' ');
const baseDir = __dirname;
const templatePath = path.join(baseDir, 'tpl', `${templateName}.md`);

const templateContent = fs.readFileSync(templatePath, 'utf8');

// Parse YAML frontmatter
const match = templateContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
if (!match) {
  console.log(templateContent);
  process.exit(0);
}

const [, frontmatterText, templateBody] = match;
const frontmatter = {};

// Simple YAML parser for includes only
frontmatterText.split('\n').forEach(line => {
  const includeMatch = line.match(/^\s*-\s+(.+)$/);
  if (includeMatch) {
    frontmatter.includes = frontmatter.includes || [];
    frontmatter.includes.push(includeMatch[1]);
  }
});

// Process includes
let output = '';
if (frontmatter.includes) {
  for (const inc of frontmatter.includes) {
    const incPath = path.join(baseDir, inc);
    if (fs.existsSync(incPath)) {
      output += fs.readFileSync(incPath, 'utf8') + '\n\n';
    }
  }
}

// Add template body and user prompt
output += templateBody;
if (userPrompt) {
  output += `\n\nUser request: ${userPrompt}\n`;
}

console.log(output);
