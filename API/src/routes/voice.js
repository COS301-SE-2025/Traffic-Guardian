const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const uploadDir = path.join(__dirname, '../voiceUploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
    } else {
        cb(new Error('Only audio files are allowed'), false);
    }
};

const upload = multer({ storage, fileFilter });

//recieve audio
router.post('/voice', async (req, res) => {
    try {
        upload.single('voice')(req, res, function (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ error: err.message });
            } else if (err) {
                return res.status(400).json({ error: err.message });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            res.json({ message: 'File uploaded successfully', filePath: req.file.path });
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//send audio
router.get('/audio', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error reading uploads folder');
    }

    const audioExtensions = ['.m4a', '.mp3', '.wav', '.ogg', '.flac', '.aac'];

    const audioFiles = files.filter(file =>
      audioExtensions.includes(path.extname(file).toLowerCase())
    );

    res.json(audioFiles);
  });
});

//send specific audio
router.get('/audio/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);

  fs.stat(filePath, (err, stats) => {
    if (err) {
      console.error(err);
      return res.status(404).send('File not found');
    }

    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'audio/mpeg';

    if (ext === '.m4a') contentType = 'audio/mp4';
    else if (ext === '.wav') contentType = 'audio/wav';
    else if (ext === '.ogg') contentType = 'audio/ogg';
    else if (ext === '.flac') contentType = 'audio/flac';
    else if (ext === '.aac') contentType = 'audio/aac';

    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    const range = req.headers.range;
    if (!range) {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stats.size,
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;

    const chunkSize = (end - start) + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stats.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });

    fileStream.pipe(res);
  });
});


module.exports = router;
