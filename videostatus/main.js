import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 80;

app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
  credentials: true
}));

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

const generateToken = (userId, email, username, videoIds, existingExp) => {
  const now = Math.floor(Date.now() / 1000);
  const exp = existingExp;

  const token = jwt.sign(
      { userId, email, username, videoIds, iat: now, exp },
      process.env.JWT_SECRET
  );

  return {
      token,
      issued: new Date(now * 1000).toISOString(),
      expires: new Date(exp * 1000).toISOString()
  };
};

app.get('/append-videos', verifyToken, async (req, res) => {
  try {
      const videos = await prisma.video.findMany({
          where: {
              userId: req.user.userId
          },
          select: {
              id: true
          }
      });

      const videoIds = videos.map(video => video.id);

      const tokenData = generateToken(
          req.user.userId,
          req.user.email,
          req.user.username,
          videoIds,
          req.user.exp
      );

      res.set('Authorization', `Bearer ${tokenData.token}`);

      res.json({
          status: 'SUCCESS',
          ...tokenData,
          videoCount: videoIds.length
      });
  } catch (error) {
      console.error('Error appending videos to token:', error);
      res.status(500).json({ 
          status: 'ERROR',
          error: 'Failed to append videos to token' 
      });
  }
});

app.get('/videos', verifyToken, async (req, res) => {
  try {
    const videos = await prisma.video.findMany({
      where: {
        userId: req.user.userId
      },
      include: {
        encodings: {
          select: {
            resolution: true,
            filesize: true,
            width: true,
            height: true,
            bitrate: true,
            createdAt: true
          }
        },
        progress: {
          select: {
            resolution: true,
            progress: true,
            updatedAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const transformedVideos = videos.map(video => ({
      id: video.id,
      filename: video.filename,
      status: video.status,
      createdAt: video.createdAt,
      duration: video.duration,
      originalQuality: {
        width: video.originalWidth,
        height: video.originalHeight,
        bitrate: video.originalBitrate,
        fps: video.fps
      },
      encodings: video.encodings.map(encoding => ({
        resolution: encoding.resolution,
        width: encoding.width,
        height: encoding.height,
        filesize: encoding.filesize,
        bitrate: encoding.bitrate,
        createdAt: encoding.createdAt
      })),
      progress: video.progress.reduce((acc, curr) => {
        acc[curr.resolution] = {
          progress: curr.progress,
          updatedAt: curr.updatedAt
        };
        return acc;
      }, {})
    }));

    res.json(transformedVideos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

app.get('/videos/:videoId', verifyToken, async (req, res) => {
  try {
    const video = await prisma.video.findFirst({
      where: {
        id: req.params.videoId,
      },
      include: {
        encodings: true,
        progress: true
      }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const overallProgress = video.status === 'COMPLETED' 
      ? 100 
      : video.progress.reduce((acc, curr) => acc + curr.progress, 0) / video.progress.length || 0;

    const response = {
      id: video.id,
      filename: video.filename,
      status: video.status,
      createdAt: video.createdAt,
      duration: video.duration,
      originalQuality: {
        width: video.originalWidth,
        height: video.originalHeight,
        bitrate: video.originalBitrate,
        fps: video.fps
      },
      encodings: video.encodings.map(encoding => ({
        resolution: encoding.resolution,
        width: encoding.width,
        height: encoding.height,
        filesize: encoding.filesize,
        bitrate: encoding.bitrate,
        createdAt: encoding.createdAt
      })),
      progress: {
        overall: Math.round(overallProgress),
        byResolution: video.progress.reduce((acc, curr) => {
          acc[curr.resolution] = {
            progress: curr.progress,
            updatedAt: curr.updatedAt
          };
          return acc;
        }, {})
      },
      estimatedTimeRemaining: calculateEstimatedTimeRemaining(video.progress)
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video details' });
  }
});

function calculateEstimatedTimeRemaining(progressHistory) {
  if (!progressHistory.length) return null;
  
  const sortedUpdates = progressHistory.sort((a, b) => b.updatedAt - a.updatedAt);
  const latestUpdate = sortedUpdates[0];
  
  if (latestUpdate.progress >= 100) return 0;
  if (sortedUpdates.length < 2) return null;

  const recentUpdates = sortedUpdates.slice(0, 5);
  let totalProgressRate = 0;
  let validRates = 0;

  for (let i = 0; i < recentUpdates.length - 1; i++) {
    const timeDiff = recentUpdates[i].updatedAt - recentUpdates[i + 1].updatedAt;
    const progressDiff = recentUpdates[i].progress - recentUpdates[i + 1].progress;
    
    if (timeDiff > 0 && progressDiff > 0) {
      totalProgressRate += (progressDiff / timeDiff);
      validRates++;
    }
  }

  if (validRates === 0) return null;

  const averageProgressRate = totalProgressRate / validRates;
  const remainingProgress = 100 - latestUpdate.progress;
  const estimatedSeconds = remainingProgress / averageProgressRate;

  return Math.round(estimatedSeconds);
}

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.listen(port, () => {
  console.log(`Video status service listening on port ${port}`);
});