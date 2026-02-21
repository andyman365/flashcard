import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function connectDB() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    return client.db('leaderboard');
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (!MONGODB_URI) {
        return res.status(500).json({ error: 'Database not configured' });
    }

    try {
        const db = await connectDB();
        const usersCollection = db.collection('users');
        await usersCollection.createIndex({ username: 1 }, { unique: true });

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const existingUser = await usersCollection.findOne({
            username: { $regex: `^${username.trim()}$`, $options: 'i' }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await usersCollection.insertOne({
            username: username.trim(),
            password: hashedPassword,
            createdAt: new Date(),
            score: 0
        });

        const token = jwt.sign(
            { userId: result.insertedId, username: username.trim() },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        return res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            username: username.trim()
        });

    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
