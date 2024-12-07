import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'PUT'],
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

// Get authenticated user's profile (private endpoint)
app.get('/profile', verifyToken, async (req, res) => {
  try {
    const profile = await prisma.user.findUnique({
      where: {
        id: req.user.userId
      },
      select: {
        id: true,
        imageId: true,
        description: true,
        updatedAt: true
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      status: 'SUCCESS',
      profile
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      status: 'ERROR',
      error: 'Failed to fetch profile' 
    });
  }
});


app.put('/profile', verifyToken, async (req, res) => {
  const { imageId, description } = req.body;

  // Validate input
  if (imageId && !isValidUUID(imageId)) {
    return res.status(400).json({ 
      status: 'ERROR',
      error: 'Invalid image ID format' 
    });
  }

  if (description && description.length > 1000) {
    return res.status(400).json({ 
      status: 'ERROR',
      error: 'Description must be 1000 characters or less' 
    });
  }

  try {
    const updatedProfile = await prisma.user.upsert({
      where: {
        id: req.user.userId
      },
      create: {
        id: req.user.userId,
        ...(imageId && { imageId }),
        description: description || ''
      },
      update: {
        ...(imageId && { imageId }),
        ...(description !== undefined && { description })
      },
      select: {
        id: true,
        imageId: true,
        description: true,
        updatedAt: true
      }
    });

    res.json({
      status: 'SUCCESS',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      status: 'ERROR',
      error: 'Failed to update profile' 
    });
  }
});

// Get public profile by user ID (public endpoint - no auth required)
app.get('/profiles/:userId', async (req, res) => {
  const { userId } = req.params;

  // Validate UUID format
  if (!isValidUUID(userId)) {
    return res.status(400).json({ 
      status: 'ERROR',
      error: 'Invalid user ID format' 
    });
  }

  try {
    const profile = await prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true,
        imageId: true,
        description: true,
        updatedAt: true
      }
    });

    if (!profile) {
      return res.status(404).json({ 
        status: 'ERROR',
        error: 'Profile not found' 
      });
    }

    // Rate limiting headers
    res.set({
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '99', // This should be implemented with a proper rate limiter
      'Cache-Control': 'public, max-age=60' // Cache public profiles for 60 seconds
    });

    res.json({
      status: 'SUCCESS',
      profile
    });
  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({ 
      status: 'ERROR',
      error: 'Failed to fetch profile' 
    });
  }
});

// Batch fetch public profiles (public endpoint - no auth required)
app.get('/profiles/batch', async (req, res) => {
  const userIds = req.query.ids?.split(',') || [];

  // Validate input
  if (!userIds.length || userIds.length > 100) {
    return res.status(400).json({ 
      status: 'ERROR',
      error: 'Please provide between 1 and 100 user IDs' 
    });
  }

  // Validate all UUIDs
  if (!userIds.every(isValidUUID)) {
    return res.status(400).json({ 
      status: 'ERROR',
      error: 'Invalid user ID format' 
    });
  }

  try {
    const profiles = await prisma.user.findMany({
      where: {
        id: {
          in: userIds
        }
      },
      select: {
        id: true,
        imageId: true,
        description: true,
        updatedAt: true
      }
    });

    res.set({
      'Cache-Control': 'public, max-age=60'
    });

    res.json({
      status: 'SUCCESS',
      profiles
    });
  } catch (error) {
    console.error('Error fetching batch profiles:', error);
    res.status(500).json({ 
      status: 'ERROR',
      error: 'Failed to fetch profiles' 
    });
  }
});

// UUID validation helper
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Start server
app.listen(port, () => {
  console.log(`Profile service listening on port ${port}`);
});