import React, { useState, useRef } from 'react';

function FileUpload({ onFileChange }) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      onFileChange(event.dataTransfer.files[0]);
    }
  };

  const handleChange = (event) => {
    event.preventDefault();
    if (event.target.files && event.target.files[0]) {
      onFileChange(event.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div
      className={`drop-area ${dragActive ? 'active' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <p>Drag and drop a PDF file here, or click to select a file</p>
      <button className="file-input-button" onClick={handleButtonClick}>
        Select File
      </button>
      <input
        type="file"
        accept="application/pdf"
        onChange={handleChange}
        className="file-input"
        ref={fileInputRef}
      />
    </div>
  );
}

export default FileUpload;
