const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const app = express();
const upload = multer({ dest: 'uploads/' });
const execPromise = util.promisify(exec);
const port = process.env.BACKEND_PORT || 3001;
const scriptsDir = path.join(__dirname, 'scripts');
const uploadsDir = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Cleanup old files every 5 minutes
const cleanupInterval = (parseInt(process.env.CLEANUP_INTERVAL_MINUTES) || 5) * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  fs.readdirSync(uploadsDir).forEach(file => {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > cleanupInterval) {
      fs.unlinkSync(filePath);
      console.log(`Deleted old file: ${file}`);
    }
  });
}, cleanupInterval);
console.log(`Cleanup interval set to ${cleanupInterval / 60000} minutes`);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/scripts', (req, res) => {
  fs.readdir(scriptsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read scripts directory' });
    }
    const scripts = files.filter(file => file.endsWith('.py'));
    console.log('Scripts found:', scripts);
    res.json({ scripts });
  });
});

app.post('/api/execute', upload.single('file'), async (req, res) => {
  if (!req.file || !req.body.script) {
    return res.status(400).json({ error: 'File and script are required' });
  }

  const scriptPath = path.join(scriptsDir, req.body.script);
  if (!fs.existsSync(scriptPath)) {
    return res.status(400).json({ error: 'Script not found' });
  }

  const timestamp = Date.now();
  const originalName = req.file.originalname;
  const tempFile = req.file.path;
  const renamedFile = path.join(uploadsDir, `${timestamp}_${originalName}`);

  // Copy file to handle cross-device renames
  try {
    fs.copyFileSync(tempFile, renamedFile);
    fs.unlinkSync(tempFile); // Remove temporary file
    console.log(`Received file: ${originalName}, MIME: ${req.file.mimetype}, Temp path: ${tempFile}, Copied to: ${renamedFile}`);
  } catch (error) {
    console.error('File copy error:', error);
    return res.status(500).json({ error: `Failed to process file: ${error.message}` });
  }

  const outputPath = path.join(uploadsDir, originalName.slice(0, -4) + '.xlsx');
  console.log(`Script path: ${scriptPath}`);

  try {
    // Quote filenames to handle spaces
    const command = `/app/venv/bin/python3 "${scriptPath}" "${renamedFile}" --output "${outputPath}"`;
    console.log(`Running Python script: ${command}`);
    const { stdout, stderr } = await execPromise(command, { maxBuffer: 1024 * 1024 }); // Increase buffer size
    console.log('Python stdout:', stdout);
    if (stderr) {
      console.log('Python stderr:', stderr);
    }
    // Check for success: output file exists
    if (fs.existsSync(outputPath)) {
      console.log(`Output file created: ${outputPath}`);
      return res.json({ output: outputPath });
    }
    return res.status(500).json({ error: `Script failed: ${stderr || 'Output file was not generated'}` });
  } catch (error) {
    console.log('Python process exited with code', error.code);
    console.log('Python stderr:', error.stderr);
    return res.status(500).json({ error: `Script failed: ${error.stderr || error.message}` });
  }
});

app.use('/uploads', express.static(uploadsDir));

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
