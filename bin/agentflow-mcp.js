#!/usr/bin/env node
import('../dist/cli.js').catch(err => {
  console.error('Failed to start agentflow-mcp:', err.message);
  console.error('Run "npm run build" first if you are developing locally.');
  process.exit(1);
});
