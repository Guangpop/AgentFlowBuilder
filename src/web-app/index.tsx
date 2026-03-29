import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';

// App will be created later - for now just a placeholder
const App = () => (
  <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
    <h1 className="text-2xl">AgentFlow Builder - Local Mode</h1>
    <p className="text-slate-400 mt-2">Web UI coming soon...</p>
  </div>
);

const root = createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
