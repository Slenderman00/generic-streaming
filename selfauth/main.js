const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    port: process.env.POSTGRES_PORT
});

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

const generateToken = (userId, email, username) => {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (60 * 60);

    const token = jwt.sign(
        { userId, email, username, iat: now, exp },
        JWT_SECRET
    );

    return {
        token,
        issued: new Date(now * 1000).toISOString(),
        expires: new Date(exp * 1000).toISOString()
    };
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired' });
            }
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

app.post('/auth/renew', authenticateToken, async (req, res) => {
    try {
        // Check if user still exists and is not banned
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: 'ERROR',
                error: 'User not found'
            });
        }

        const user = result.rows[0];

        // Generate new token
        const tokenData = generateToken(user.id, user.email, user.username);
        
        res.json({
            status: 'SUCCESS',
            ...tokenData
        });
    } catch (error) {
        console.error('Token renewal error:', error);
        res.status(500).json({
            status: 'ERROR',
            error: 'Token renewal failed'
        });
    }
});

app.get('/auth/health', (req, res) => {
    pool.query('SELECT 1')
        .then(() => {
            res.json({ status: 'healthy', timestamp: new Date().toISOString() });
        })
        .catch(error => {
            console.error('Health check failed:', error);
            res.status(503).json({
                status: 'unhealthy',
                error: 'Database connection failed',
                timestamp: new Date().toISOString()
            });
        });
});

app.post('/auth/register', async (req, res) => {
    try {
        const { email, password, username } = req.body;

        if (!email || !password || !username) {
            return res.status(400).json({
                status: 'FIELD_ERROR',
                formFields: [{ error: 'Email, password, and username required' }]
            });
        }

        const userCheck = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (userCheck.rows.length > 0) {
            const field = userCheck.rows[0].email === email ? 'Email' : 'Username';
            return res.status(409).json({
                status: 'FIELD_ERROR',
                formFields: [{ error: `${field} already taken` }]
            });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const userId = uuidv4();
        const result = await pool.query(
            'INSERT INTO users (id, email, password, username) VALUES ($1, $2, $3, $4) RETURNING id',
            [userId, email, hashedPassword, username]
        );

        const tokenData = generateToken(userId, email, username);
        res.status(201).json({
            status: 'SUCCESS',
            ...tokenData,
            user: { id: userId, email, username }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            status: 'FIELD_ERROR',
            formFields: [{ error: 'Registration failed' }]
        });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: 'WRONG_CREDENTIALS_ERROR'
            });
        }

        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                status: 'WRONG_CREDENTIALS_ERROR'
            });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({
                status: 'WRONG_CREDENTIALS_ERROR'
            });
        }

        const tokenData = generateToken(user.id, user.email, user.username);
        res.json({
            status: 'SUCCESS',
            ...tokenData,
            user: { id: user.id, email: user.email, username: user.username }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            status: 'WRONG_CREDENTIALS_ERROR'
        });
    }
});

app.post('/auth/signout', authenticateToken, (req, res) => {
    res.json({ status: 'SUCCESS' });
});

const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Database initialized');
    } catch (error) {
        console.error('Database initialization error:', error);
        process.exit(1);
    }
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    await initDb();
    console.log(`Auth service running on port ${PORT}`);
});