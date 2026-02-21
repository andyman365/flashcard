import { MongoClient } from 'mongodb';

const mongoUrl = process.env.MONGODB_URI;

async function connectDB() {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    return client.db('leaderboard');
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Check if MongoDB URI is set
    if (!mongoUrl) {
        console.error('❌ MONGODB_URI environment variable not set');
        return res.status(500).json({ 
            error: 'Database connection not configured',
            details: 'MONGODB_URI environment variable is missing'
        });
    }

    try {
        const db = await connectDB();
        const scoresCollection = db.collection('scores');

        if (req.method === 'POST') {
            // Submit a new score or add to existing
            const { username, score } = req.body;

            if (!username || score === undefined) {
                return res.status(400).json({ error: 'Username and score are required' });
            }

            // Check if user already exists (case-insensitive)
            const existingUser = await scoresCollection.findOne({
                username: { $regex: `^${username.trim()}$`, $options: 'i' }
            });
            
            if (existingUser) {
                // Add to existing score
                await scoresCollection.updateOne(
                    { _id: existingUser._id },
                    { 
                        $inc: { score: parseInt(score) },
                        $set: { date: new Date() }
                    }
                );
                
                const updated = await scoresCollection.findOne({ _id: existingUser._id });
                
                return res.status(200).json({
                    success: true,
                    id: existingUser._id,
                    message: 'Score added to existing user',
                    totalScore: updated.score
                });
            } else {
                // Create new entry
                const result = await scoresCollection.insertOne({
                    username: username.trim(),
                    score: parseInt(score),
                    date: new Date(),
                });

                return res.status(201).json({ 
                    success: true, 
                    id: result.insertedId,
                    message: 'Score submitted successfully',
                    totalScore: parseInt(score)
                });
            }

        } else if (req.method === 'GET') {
            // Fetch leaderboard with pagination
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;

            // Get all scores sorted
            const allScores = await scoresCollection
                .find()
                .sort({ score: -1, date: -1 })
                .toArray();

            // Add rank to each score
            const rankedScores = allScores.map((score, index) => ({
                rank: index + 1,
                username: score.username,
                score: score.score,
                date: score.date,
                _id: score._id
            }));

            // Paginate
            const start = (page - 1) * limit;
            const paginated = rankedScores.slice(start, start + limit);
            const totalPages = Math.ceil(rankedScores.length / limit);

            return res.status(200).json({
                success: true,
                scores: paginated,
                total: rankedScores.length,
                pagination: {
                    page,
                    limit,
                    pages: totalPages,
                },
            });

        } else if (req.method === 'DELETE') {
            // Delete a user's score
            const { username } = req.body;

            if (!username) {
                return res.status(400).json({ error: 'Username is required' });
            }

            const result = await scoresCollection.deleteOne({
                username: { $regex: `^${username.trim()}$`, $options: 'i' }
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Score not found' });
            }

            return res.status(200).json({
                success: true,
                message: 'Score deleted successfully'
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({ 
            error: 'Failed to process request',
            details: error.message 
        });
    }
}
