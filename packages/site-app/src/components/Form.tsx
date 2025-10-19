import React, { useState } from 'react';

interface FormProps {
  onRun: (opts: { url: string; out: string; base: string; pages: number; noLLM: boolean }) => void;
  disabled: boolean;
}

export function Form({ onRun, disabled }: FormProps) {
  const [url, setUrl] = useState('https://example.com');
  const [pages, setPages] = useState(10);
  const [out, setOut] = useState('./out');
  const [base, setBase] = useState('.');
  const [noLLM, setNoLLM] = useState(false);

  const handleBrowse = async () => {
    const dir = await window.SG.chooseDir();
    if (dir) setOut(dir);
  };

  const handleSubmit = () => {
    onRun({ url, out, base, pages, noLLM });
  };

  return (
    <div className="card">
      <h2>Site Generator</h2>
      <div className="row">
        <label>Website URL</label>
        <input 
          className="input" 
          value={url} 
          onChange={e => setUrl(e.target.value)} 
          placeholder="https://..." 
          disabled={disabled}
        />
      </div>
      <div className="row">
        <label>Pages to crawl</label>
        <select 
          value={pages} 
          onChange={e => setPages(Number(e.target.value))}
          disabled={disabled}
        >
          {[1, 5, 10, 25, 50, 100].map(n => 
            <option key={n} value={n}>{n}</option>
          )}
        </select>
      </div>
      <div className="row">
        <label>Output folder</label>
        <input 
          className="input" 
          value={out} 
          onChange={e => setOut(e.target.value)} 
          style={{ flex: 1 }}
          disabled={disabled}
        />
        <button 
          className="secondary" 
          onClick={handleBrowse}
          disabled={disabled}
        >
          Browse
        </button>
      </div>
      <div className="row">
        <label>Base path</label>
        <input 
          className="input" 
          value={base} 
          onChange={e => setBase(e.target.value)} 
          placeholder="."
          disabled={disabled}
        />
      </div>
      <div className="row">
        <label>Deterministic</label>
        <input 
          type="checkbox" 
          checked={noLLM} 
          onChange={e => setNoLLM(e.target.checked)}
          disabled={disabled}
        />
        <span style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>
          (No LLM - uses rule-based extraction only)
        </span>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button 
          onClick={handleSubmit}
          disabled={disabled || !url.trim()}
        >
          Generate Site
        </button>
      </div>
    </div>
  );
}
