import amqp from 'amqplib';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import { ProcessingLogger } from './utils/logger.js';
import { VideoEncoder } from './services/encoder.js';
import { getVideoMetadata, calculateOptimalResolutions } from './utils/video.js';
import { generateThumbnail } from './utils/thumbnail.js';

dotenv.config();
const prisma = new PrismaClient();

async function processVideo(videoId, inputPath, userId) {
  let logger;
  let encoder;

  const cleanup = async () => {
    try {
      const outputDir = path.join(process.env.STORAGE_PATH, videoId);
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };

  try {
    // Check if input file exists and is readable
    try {
      await fs.access(inputPath, fs.constants.R_OK);
      const stats = await fs.stat(inputPath);
      console.log('Processing video file:', {
        path: inputPath,
        size: stats.size,
        permissions: stats.mode
      });
    } catch (error) {
      throw new Error(`Input file is not accessible: ${error.message}`);
    }

    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'PROCESSING' }
    });

    const metadata = await getVideoMetadata(inputPath);
    console.log('Video metadata:', metadata);

    const resolutions = calculateOptimalResolutions(metadata);
    console.log('Calculated resolutions:', resolutions);

    logger = new ProcessingLogger(videoId, resolutions.length);
    encoder = new VideoEncoder(videoId, logger);

    await logger.logStart();

    const outputDir = path.join(process.env.STORAGE_PATH, videoId);
    await fs.mkdir(outputDir, { recursive: true });

    // Store original video metadata
    await prisma.video.update({
      where: { id: videoId },
      data: {
        originalWidth: metadata.width,
        originalHeight: metadata.height,
        originalBitrate: metadata.bitrate,
        duration: metadata.duration,
        fps: metadata.fps,
        userId
      }
    });

    // Generate thumbnail
    const thumbnailPath = path.join(outputDir, 'thumbnail.jpg');
    await generateThumbnail(inputPath, thumbnailPath);

    // Process all resolutions in parallel
    const encodingPromises = resolutions.map(resolution => {
      const outputPath = path.join(outputDir, `${resolution.name}.mp4`);
      return encoder.transcodeToResolution(inputPath, outputPath, resolution, metadata)
        .then(async (outputPath) => {
          await encoder.storeEncodedVideo(resolution, outputPath, metadata);
          console.log(`Completed encode for resolution: ${resolution.name}`);
        })
        .catch(error => {
          console.error(`Failed to encode resolution ${resolution.name}:`, error);
          throw error;
        });
    });

    // Wait for all encodings to complete
    await Promise.all(encodingPromises);

    await logger.logCompletion();

    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'COMPLETED' }
    });

    // Clean up original file
    await fs.unlink(inputPath);
  } catch (error) {
    console.error('Video processing failed:', error);
    await logger?.logError(error);
    await encoder?.cleanup();
    
    // Update video status to failed
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'FAILED' }
    });

    // Clean up any partial processing results
    await cleanup();
    
    throw error;
  }
}

let channel;
let processingVideos = new Set();

async function setupMessageQueue() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    
    connection.on('close', async (err) => {
      console.error('RabbitMQ connection closed:', err);
      processingVideos.clear();
      setTimeout(setupMessageQueue, 5000);
    });

    channel = await connection.createChannel();
    await channel.assertQueue('video_processing', { durable: true });
    await channel.prefetch(1);
  } catch (error) {
    console.error('Failed to setup message queue:', error);
    throw error;
  }
}

async function startProcessor() {
  try {
    await setupMessageQueue();
    console.log('Video processor service started');

    if (!channel) {
      throw new Error('Channel is undefined before consume');
    }

    channel.consume('video_processing', async (msg) => {
      if (msg === null) return;

      try {
        const { videoId, storagePath, userId } = JSON.parse(msg.content.toString());
        
        if (processingVideos.has(videoId)) {
          channel.nack(msg);
          return;
        }

        processingVideos.add(videoId);
        
        try {
          await processVideo(videoId, storagePath, userId);
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          channel.nack(msg, false, false);
        } finally {
          processingVideos.delete(videoId);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
        channel.nack(msg, false, false);
      }
    });
  } catch (error) {
    console.error('Failed to start processor:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.once('SIGTERM', async () => {
  console.log('Received SIGTERM signal. Shutting down gracefully...');
  if (channel) {
    try {
      await channel.close();
    } catch (error) {
      console.error('Error closing channel:', error);
    }
  }
  process.exit(0);
});

startProcessor();