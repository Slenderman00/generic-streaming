import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3002;

app.use(express.json());
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'DELETE'],
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
        if (!Array.isArray(decoded.videoIds)) {
            decoded.videoIds = [];
        }
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Create post endpoint
app.post('/posts', verifyToken, async (req, res) => {
    const { content, videoIds = [] } = req.body;
    const userId = req.user.userId;

    try {
        const post = await prisma.post.create({
            data: {
                userId,
                content,
                videoIds
            }
        });

        res.status(201).json({
            status: 'SUCCESS',
            post
        });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({
            status: 'ERROR',
            error: 'Failed to create post',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Delete a post
app.delete('/posts/:postId', verifyToken, async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.userId;

    try {
        const post = await prisma.post.deleteMany({
            where: {
                id: postId,
                userId
            }
        });

        if (post.count === 0) {
            return res.status(404).json({
                status: 'ERROR',
                error: 'Post not found or unauthorized'
            });
        }

        res.json({
            status: 'SUCCESS',
            message: 'Post deleted successfully'
        });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            status: 'ERROR',
            error: 'Failed to delete post'
        });
    }
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'healthy' });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({ status: 'unhealthy' });
    }
});

// Cleanup Prisma connection on server shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

app.listen(port, () => {
    console.log(`Posts Write service listening on port ${port}`);
});