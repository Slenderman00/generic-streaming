// src/server.js
import express from 'express';
import multer from 'multer';
import amqp from 'amqplib';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import cors from 'cors'

dotenv.config();

const DATABASE_URL = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
process.env.DATABASE_URL = DATABASE_URL;

console.log('Environment variables:');
console.log(`POSTGRES_HOST: ${process.env.POSTGRES_HOST}`);
console.log(`POSTGRES_DB: ${process.env.POSTGRES_DB}`);
console.log(`POSTGRES_PORT: ${process.env.POSTGRES_PORT}`);
console.log(`Constructed URL (without credentials): postgresql://[user]:[pass]@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`);

const app = express();
const port = process.env.PORT || 80;

const prisma = new PrismaClient(); 

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

const STORAGE_PATH = process.env.STORAGE_PATH;

async function ensureStorageExists() {
  try {
    await fs.access(STORAGE_PATH);
  } catch {
    await fs.mkdir(STORAGE_PATH, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureStorageExists();
    cb(null, STORAGE_PATH);
  },
  filename: (req, file, cb) => {
    const videoId = uuidv4();
    const fileExtension = path.extname(file.originalname);
    const filename = `${videoId}${fileExtension}`;
    req.videoId = videoId;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  },
});

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

let channel;
async function setupMessageQueue() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue('video_processing', { durable: true });
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
    process.exit(1);
  }
}

app.post('/upload', verifyToken, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const videoId = req.videoId;
    const storagePath = path.join(STORAGE_PATH, req.file.filename);

    const video = await prisma.video.create({
      data: {
        id: videoId,
        userId: req.user.userId,
        filename: req.file.originalname,
        status: 'PENDING',
        storagePath: storagePath,
      },
    });

    await channel.sendToQueue('video_processing', Buffer.from(JSON.stringify({
      videoId: video.id,
      storagePath: storagePath,
      userId: req.user.userId,
    })));

    res.status(200).json({
      videoId: video.id,
      message: 'Video uploaded successfully and queued for processing',
    });
  } catch (error) {
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Error processing video upload' });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.use((error, req, res, next) => {
  console.error('Error:', error);
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File is too large' });
    }
    return res.status(400).json({ error: error.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  try {
    console.log('Starting server with configuration:');
    console.log(`Port: ${port}`);
    console.log(`Storage Path: ${STORAGE_PATH}`);
    console.log(`Database Host: ${process.env.POSTGRES_HOST}`);
    console.log(`Database Name: ${process.env.POSTGRES_DB}`);
    
    await setupMessageQueue();
    await ensureStorageExists();
    
    app.listen(port, () => {
      console.log(`Video receiver service listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();