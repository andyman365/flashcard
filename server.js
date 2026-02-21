import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// Environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cibap:je47X_AMXx3Awng@cluster0.ww7qelr.mongodb.net/?appName=Cluster0';
let scoresCollection = null;

// MongoDB connection
async function connectDB() {
    if (scoresCollection) return scoresCollection;
    
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db('leaderboard');
        scoresCollection = db.collection('scores');
        console.log('✅ Connected to MongoDB');
        return scoresCollection;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
}

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// API Routes
app.get('/api/scores', async (req, res) => {
    try {
        const collection = await connectDB();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        // Sort by score descending, then by date
        const sorted = await collection
            .find({})
            .sort({ score: -1, date: -1 })
            .toArray();
        
        // Add rank to each score
        const rankedScores = sorted.map((score, index) => ({
            ...score,
            rank: index + 1
        }));
        
        const start = (page - 1) * limit;
        const paginated = rankedScores.slice(start, start + limit);
        const totalPages = Math.ceil(rankedScores.length / limit);
        
        res.json({
            success: true,
            scores: paginated,
            total: rankedScores.length,
            pagination: {
                page,
                limit,
                pages: totalPages
            }
        });
    } catch (error) {
        console.error('Error fetching scores:', error);
        res.status(500).json({ error: 'Failed to fetch scores' });
    }
});

app.post('/api/scores', async (req, res) => {
    try {
        const collection = await connectDB();
        const { username, score } = req.body;
        
        if (!username || score === undefined) {
            return res.status(400).json({ error: 'Username and score are required' });
        }
        
        // Check if user already exists (case-insensitive)
        const existingUser = await collection.findOne({
            username: { $regex: `^${username.trim()}$`, $options: 'i' }
        });
        
        if (existingUser) {
            // Add to existing score
            await collection.updateOne(
                { _id: existingUser._id },
                { 
                    $inc: { score: parseInt(score) },
                    $set: { date: new Date() }
                }
            );
            
            res.status(200).json({
                success: true,
                id: existingUser._id,
                message: 'Score added to existing user',
                totalScore: existingUser.score + parseInt(score)
            });
        } else {
            // Create new entry
            const result = await collection.insertOne({
                username: username.trim(),
                score: parseInt(score),
                date: new Date()
            });
            
            res.status(201).json({
                success: true,
                id: result.insertedId,
                message: 'Score submitted successfully',
                totalScore: parseInt(score)
            });
        }
    } catch (error) {
        console.error('Error saving score:', error);
        res.status(500).json({ error: 'Failed to save score' });
    }
});

// Start server
app.listen(PORT, async () => {
    try {
        await connectDB();
        console.log(`🎮 Flashcards server running at http://localhost:${PORT}`);
        console.log(`📝 Open http://localhost:${PORT}/index.html to play!`);
    } catch (error) {
        console.error('Failed to start server:', error);
    }
});
