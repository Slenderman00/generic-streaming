import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

// Configure CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// JWT verification middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    // Generate UUID for the file
    const fileId = crypto.randomUUID();
    // Get file extension
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${fileId}${ext}`);
  }
});

// Configure upload limits and file filtering
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error('Invalid file type');
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }
    cb(null, true);
  }
});

// Ensure uploads directory exists
const initializeStorage = async () => {
  try {
    await fs.access('./uploads');
  } catch {
    await fs.mkdir('./uploads');
  }
};

// Upload endpoint (requires authentication)
app.post('/upload', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'ERROR',
        error: 'No file uploaded'
      });
    }

    const imageId = path.parse(req.file.filename).name; // Get UUID without extension

    res.json({
      status: 'SUCCESS',
      imageId: imageId,
      fileName: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      status: 'ERROR',
      error: 'Failed to upload file'
    });
  }
});

// Serve images (requires authentication)
app.get('/images/:imageId', verifyToken, async (req, res) => {
  try {
    const files = await fs.readdir('./uploads');
    const imageFile = files.find(file => file.startsWith(req.params.imageId));

    if (!imageFile) {
      return res.status(404).json({
        status: 'ERROR',
        error: 'Image not found'
      });
    }

    // Set cache headers for better performance
    res.set({
      'Cache-Control': 'private, max-age=3600',
      'Pragma': 'no-cache'
    });

    res.sendFile(path.join(process.cwd(), 'uploads', imageFile));
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({
      status: 'ERROR',
      error: 'Failed to serve image'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handling for multer errors
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'ERROR',
        error: 'File too large. Maximum size is 5MB'
      });
    }
  }
  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      status: 'ERROR',
      error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed'
    });
  }
  next(error);
});

// Initialize storage and start server
initializeStorage().then(() => {
  app.listen(port, () => {
    console.log(`Image upload service listening on port ${port}`);
  });
}).catch(error => {
  console.error('Failed to initialize storage:', error);
  process.exit(1);
});