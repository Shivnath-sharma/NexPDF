import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { PDFDocument } from 'pdf-lib';
import pdf2pic from 'pdf2pic';
import { Queue, Worker } from 'bullmq';

// Ensure directories exist
import { mkdir } from 'fs/promises';
async function ensureDirectories() {
  try {
    await mkdir('uploads', { recursive: true });
    await mkdir('temp', { recursive: true });
  } catch (error) {
    console.log('Directories already exist or error creating:', error);
  }
}

// Queue setup (optional, comment out if Redis not available)
// const pdfQueue = new Queue('pdf-processing', {
//   connection: {
//     host: process.env.REDIS_HOST || 'localhost',
//     port: parseInt(process.env.REDIS_PORT || '6379'),
//   },
// });

// Worker to process jobs
// const worker = new Worker('pdf-processing', async (job) => {
//   const { type, data } = job.data;

//   switch (type) {
//     case 'merge':
//       // Implement merge logic here for queue
//       break;
//     // Add other types
//   }
// }, {
//   connection: {
//     host: process.env.REDIS_HOST || 'localhost',
//     port: parseInt(process.env.REDIS_PORT || '6379'),
//   },
// });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    cb(null, `${uniqueId}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' ||
        file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'NexPDF API' });
});

app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Upload endpoint
app.post('/upload', upload.array('files', 10), (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    console.log('Upload request received, files:', files.length);
    const fileIds = files.map(file => ({
      id: path.parse(file.filename).name.split('-')[0],
      originalName: file.originalname,
      size: file.size
    }));
    console.log('File IDs generated:', fileIds);
    res.json({ files: fileIds });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Merge PDF endpoint
app.post('/merge', express.json(), async (req, res) => {
  try {
    const { fileIds } = req.body;
    if (!fileIds || fileIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 file IDs required' });
    }

    const mergedPdf = await PDFDocument.create();

    for (const fileId of fileIds) {
      const files = await fs.readdir('uploads/');
      const fileName = files.find(f => f.startsWith(fileId + '-'));
      if (!fileName) {
        return res.status(404).json({ error: `File ${fileId} not found` });
      }

      const filePath = path.join('uploads/', fileName);
      const fileBuffer = await fs.readFile(filePath);
      const pdf = await PDFDocument.load(fileBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    const outputId = uuidv4();
    const outputFileName = `${outputId}-merged.pdf`;
    const outputPath = path.join('temp/', outputFileName);
    await fs.writeFile(outputPath, mergedPdfBytes);

    res.json({ downloadId: outputId });
  } catch (error) {
    console.error('Merge error:', error);
    res.status(500).json({ error: 'Merge failed' });
  }
});

// Split PDF endpoint
app.post('/split', express.json(), async (req, res) => {
  try {
    const { fileId, pages } = req.body;
    if (!fileId || !pages) {
      return res.status(400).json({ error: 'File ID and pages required' });
    }

    // Parse pages string (e.g., "1,3-5,7" -> [1,3,4,5,7])
    const pageNumbers: number[] = [];
    const parts = pages.split(',');
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
        for (let i = start; i <= end; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(parseInt(part.trim(), 10));
      }
    }

    // Load the PDF
    const files = await fs.readdir('uploads/');
    const fileName = files.find(f => f.startsWith(fileId + '-'));
    if (!fileName) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join('uploads/', fileName);
    const fileBuffer = await fs.readFile(filePath);
    const pdf = await PDFDocument.load(fileBuffer);
    const totalPages = pdf.getPageCount();

    const downloadIds: string[] = [];

    // Create separate PDF for each page
    for (const pageNum of pageNumbers) {
      if (pageNum < 1 || pageNum > totalPages) {
        continue; // Skip invalid pages
      }

      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdf, [pageNum - 1]); // 0-based
      newPdf.addPage(copiedPage);

      const pdfBytes = await newPdf.save();
      const outputId = uuidv4();
      const outputFileName = `${outputId}-page${pageNum}.pdf`;
      const outputPath = path.join('temp/', outputFileName);
      await fs.writeFile(outputPath, pdfBytes);
      downloadIds.push(outputId);
    }

    res.json({ downloadIds });
  } catch (error) {
    console.error('Split error:', error);
    res.status(500).json({ error: 'Split failed' });
  }
});

// JPG to PDF endpoint
app.post('/jpg-to-pdf', express.json(), async (req, res) => {
  try {
    const { fileIds } = req.body;
    if (!fileIds || fileIds.length === 0) {
      return res.status(400).json({ error: 'At least 1 file ID required' });
    }

    const pdfDoc = await PDFDocument.create();

    for (const fileId of fileIds) {
      const files = await fs.readdir('uploads/');
      const fileName = files.find(f => f.startsWith(fileId + '-'));
      if (!fileName) {
        return res.status(404).json({ error: `File ${fileId} not found` });
      }

      const filePath = path.join('uploads/', fileName);
      const imageBytes = await fs.readFile(filePath);

      let image;
      if (fileName.toLowerCase().includes('.png')) {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        image = await pdfDoc.embedJpg(imageBytes);
      }

      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const outputId = uuidv4();
    const outputFileName = `${outputId}-converted.pdf`;
    const outputPath = path.join('temp/', outputFileName);
    await fs.writeFile(outputPath, pdfBytes);

    res.json({ downloadId: outputId });
  } catch (error) {
    console.error('JPG to PDF error:', error);
    res.status(500).json({ error: 'Conversion failed' });
  }
});

// Compress PDF endpoint
app.post('/compress', express.json(), async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!fileId) {
      return res.status(400).json({ error: 'File ID required' });
    }

    const files = await fs.readdir('uploads/');
    const fileName = files.find(f => f.startsWith(fileId + '-'));
    if (!fileName) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join('uploads/', fileName);
    const fileBuffer = await fs.readFile(filePath);
    const pdf = await PDFDocument.load(fileBuffer);

    // Save with compression options
    const compressedPdfBytes = await pdf.save({
      useObjectStreams: false,
      addDefaultPage: false,
    });

    const outputId = uuidv4();
    const outputFileName = `${outputId}-compressed.pdf`;
    const outputPath = path.join('temp/', outputFileName);
    await fs.writeFile(outputPath, compressedPdfBytes);

    res.json({ downloadId: outputId });
  } catch (error) {
    console.error('Compress error:', error);
    res.status(500).json({ error: 'Compression failed' });
  }
});

// PDF to JPG endpoint (temporarily disabled - requires ImageMagick)
app.post('/pdf-to-jpg', express.json(), async (req, res) => {
  res.status(501).json({ error: 'PDF to JPG conversion is temporarily unavailable. Requires additional setup.' });
});

// Download endpoint
app.get('/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    let filePath = null;

    // Check uploads directory
    let files = await fs.readdir('uploads/');
    let file = files.find(f => f.startsWith(fileId + '-'));
    if (file) {
      filePath = path.join('uploads/', file);
    } else {
      // Check temp directory
      files = await fs.readdir('temp/');
      file = files.find(f => f.startsWith(fileId + '-'));
      if (file) {
        filePath = path.join('temp/', file);
      }
    }

    if (!filePath) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath);
  } catch (error) {
    res.status(500).json({ error: 'Download failed' });
  }
});

// File cleanup function
async function cleanupFiles() {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  try {
    // Cleanup uploads
    const uploadFiles = await fs.readdir('uploads/');
    for (const file of uploadFiles) {
      const filePath = path.join('uploads/', file);
      const stats = await fs.stat(filePath);
      if (now - stats.mtime.getTime() > maxAge) {
        await fs.unlink(filePath);
        console.log(`Deleted old file: ${file}`);
      }
    }

    // Cleanup temp
    const tempFiles = await fs.readdir('temp/');
    for (const file of tempFiles) {
      const filePath = path.join('temp/', file);
      const stats = await fs.stat(filePath);
      if (now - stats.mtime.getTime() > maxAge) {
        await fs.unlink(filePath);
        console.log(`Deleted old temp file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupFiles, 5 * 60 * 1000);

// Initial cleanup on startup
cleanupFiles();

// Ensure directories exist on startup
ensureDirectories();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (accessible from all interfaces)`);
});