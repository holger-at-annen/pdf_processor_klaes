import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import ScriptSelector from './components/ScriptSelector';
import './index.css';

function App() {
  const [file, setFile] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [selectedScript, setSelectedScript] = useState('');
  const [outputFile, setOutputFile] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Use environment variable or fallback to relative path
  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    fetch(`${backendUrl}/api/health`)
      .then(response => response.json())
      .then(data => console.log('Backend health:', data))
      .catch(err => console.error('Health check failed:', err));

    fetch(`${backendUrl}/api/scripts`)
      .then(response => response.json())
      .then(data => {
        setScripts(data.scripts);
        if (data.scripts.length > 0) {
          setSelectedScript(data.scripts[0]);
        }
      })
      .catch(err => setError('Failed to load scripts: ' + err.message));
  }, [backendUrl]);

  const handleFileChange = (selectedFile) => {
    setFile(selectedFile);
    setOutputFile(null); // Clear previous output when a new file is selected
    setError(null); // Clear previous errors
    setIsProcessing(false); // Reset processing state
  };

  const handleExecute = () => {
    if (!file || !selectedScript) {
      setError('Please select a file and a script.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // Check if file exceeds 10MB
      setError('File is too large. Maximum size is 10MB.');
      return;
    }

    setIsProcessing(true); // Start processing
    setOutputFile(null); // Clear previous output
    setError(null); // Clear previous errors

    const formData = new FormData();
    formData.append('file', file);
    formData.append('script', selectedScript);

    fetch(`${backendUrl}/api/execute`, {
      method: 'POST',
      body: formData,
    })
      .then(response => {
        if (!response.ok) {
          if (response.status === 413) {
            throw new Error('File is too large. Maximum size is 10MB.');
          }
          return response.json().then(err => { throw new Error(err.error); });
        }
        return response.json();
      })
      .then(data => {
        // Use the backend-provided filename
        const outputFilename = data.output.split('/').pop();
        setOutputFile({ path: data.output, name: outputFilename });
        setIsProcessing(false); // Processing complete
      })
      .catch(err => {
        setError('Backend error: ' + err.message);
        setIsProcessing(false); // Stop processing on error
      });
  };

  const handleDownload = async () => {
    if (!outputFile) return;
    try {
      const response = await fetch(`/uploads/${outputFile.name}`);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = outputFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Download failed: ' + err.message);
    }
  };

  return (
    <div className="container">
      <h1>PDF Processor</h1>
      <FileUpload onFileChange={handleFileChange} />
      {file && <div className="selected-file">Selected file: {file.name}</div>}
      <ScriptSelector
        scripts={scripts}
        selectedScript={selectedScript}
        onScriptChange={setSelectedScript}
        onExecute={handleExecute}
        isDisabled={!file}
      />
      {isProcessing && <div className="processing">Processing...</div>}
      {error && <div className="error">{error}</div>}
      {outputFile && !isProcessing && (
        <div>
          Processing complete!{' '}
          <button className="download-button" onClick={handleDownload}>
            Download Output
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
