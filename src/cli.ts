#!/usr/bin/env node

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return undefined;
}

const args = process.argv.slice(2);
const command = args[0];

if (command === 'serve') {
  // Start web server (will implement later)
  const port = getArgValue(args, '--port') || '3000';
  const isDev = args.includes('--dev');
  console.log(`Starting web UI on http://localhost:${port}${isDev ? ' (dev mode)' : ''}`);
  import('./web/server.js').then(m => m.startWebServer(parseInt(port), isDev)).catch(err => {
    console.error('Failed to start web server:', err.message);
    console.error('The web server module may not be built yet.');
    process.exit(1);
  });
} else {
  // Default: Start MCP Server (stdio)
  import('./mcp/server.js').then(m => m.startServer()).catch(err => {
    console.error('Failed to start MCP server:', err);
    process.exit(1);
  });
}
