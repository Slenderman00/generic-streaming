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

// Get posts endpoint
app.get('/posts', verifyToken, async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    try {
        const [posts, totalPosts] = await Promise.all([
            prisma.post.findMany({
                take: parseInt(limit),
                skip,
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    _count: {
                        select: {
                            likes: true
                        }
                    },
                    likes: {
                        where: {
                            userId: req.user.userId
                        },
                        take: 1
                    }
                }
            }),
            prisma.post.count()
        ]);

        const transformedPosts = posts.map(post => ({
            ...post,
            likes_count: post._count.likes,
            liked_by_user: post.likes.length > 0,
            likes: undefined,
            _count: undefined
        }));

        res.json({
            status: 'SUCCESS',
            posts: transformedPosts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalPosts
            }
        });
    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({
            status: 'ERROR',
            error: 'Failed to fetch posts'
        });
    }
});

// Like/Unlike a post
app.post('/posts/:postId/like', verifyToken, async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.userId;

    try {
        // Check if post exists
        const post = await prisma.post.findUnique({
            where: { id: postId }
        });

        if (!post) {
            return res.status(404).json({
                status: 'ERROR',
                error: 'Post not found'
            });
        }

        // Check if already liked
        const existingLike = await prisma.postLike.findUnique({
            where: {
                postId_userId: {
                    postId,
                    userId
                }
            }
        });

        if (existingLike) {
            // Unlike
            await prisma.postLike.delete({
                where: {
                    postId_userId: {
                        postId,
                        userId
                    }
                }
            });
        } else {
            // Like
            await prisma.postLike.create({
                data: {
                    postId,
                    userId
                }
            });
        }

        res.json({
            status: 'SUCCESS',
            liked: !existingLike
        });
    } catch (error) {
        console.error('Like/Unlike error:', error);
        res.status(500).json({
            status: 'ERROR',
            error: 'Failed to process like/unlike'
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

// Start server
app.listen(port, () => {
    console.log(`Posts service listening on port ${port}`);
});