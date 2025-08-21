import React, { useEffect } from 'react';

function ScriptSelector({ scripts, selectedScript, onScriptChange, onExecute, isDisabled }) {
  useEffect(() => {
    if (scripts.length > 0 && !selectedScript) {
      onScriptChange(scripts[0]); // Set default script
    }
  }, [scripts, selectedScript, onScriptChange]);

  const handleScriptChange = (event) => {
    onScriptChange(event.target.value);
  };

  return (
    <div className="script-selector">
      <select value={selectedScript} onChange={handleScriptChange} disabled={isDisabled}>
        {scripts.map((script) => (
          <option key={script} value={script}>
            {script}
          </option>
        ))}
      </select>
      <button onClick={onExecute} disabled={isDisabled}>
        Execute Script
      </button>
    </div>
  );
}

export default ScriptSelector;
