import React, { useEffect, useState } from 'react';

function App() {
  const [health, setHealth] = useState<string>('checking...');

  useEffect(() => {
    fetch('/api/v1/health')
      .then(res => res.json())
      .then(data => setHealth(data.status))
      .catch((err) => setHealth('offline'));
  }, []);

  return (
    <div className="app-container">
      <header className="header">
        <h1>AI Resume Copilot</h1>
        <div className="status-badge">
          API Status: <span className={`status-${health}`}>{health}</span>
        </div>
      </header>
      <main className="main-content">
        <div className="hero">
          <h2>Land your next job with AI</h2>
          <p>Generate, tailor, and optimize your resume for any job description in seconds.</p>
          <button className="primary-btn">Get Started</button>
        </div>
      </main>
    </div>
  );
}

export default App;
