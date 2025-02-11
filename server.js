// server.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('FATAL ERROR: MONGODB_URI environment variable is not set');
    process.exit(1);
}

console.log('Attempting to connect to MongoDB...');

// Improved MongoDB connection handling
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            retryWrites: true,
            w: 'majority'
        });
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return true;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        return false;
    }
};

// Handle MongoDB connection errors
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...');
    setTimeout(connectDB, 5000);
});

mongoose.connection.on('connected', () => {
    console.log('MongoDB connected successfully');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
});

// Chart Schema
const chartSchema = new mongoose.Schema({
    title: { type: String, required: true },
    state: { type: mongoose.Schema.Types.Mixed, required: true },
    savedAt: { type: Date, default: Date.now }
});

const Chart = mongoose.model('Chart', chartSchema);

// Helper function to check DB connection
const ensureDbConnected = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        console.error('Database not connected. Current state:', mongoose.connection.readyState);
        return res.status(500).json({
            success: false,
            error: 'Database connection is not ready. Please try again in a few moments.'
        });
    }
    next();
};

// Apply DB connection check middleware to all API routes
app.use('/api', ensureDbConnected);

// ذخیره نسخه جدید
app.post('/api/save-chart', async (req, res) => {
    try {
        const { title, chartState } = req.body;
        
        if (!title) {
            return res.status(400).json({ 
                success: false, 
                error: 'Title is required' 
            });
        }

        const chart = new Chart({
            title,
            state: chartState,
            savedAt: new Date()
        });
        
        await chart.save();
        res.json({ 
            success: true, 
            message: 'Version saved successfully', 
            versionId: chart._id 
        });
    } catch (error) {
        console.error('Error saving chart:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to save chart'
        });
    }
});

// دریافت لیست نمودارها
app.get('/api/charts', async (req, res) => {
    try {
        const charts = await Chart.find({})
            .select('title savedAt')
            .sort('-savedAt')
            .lean()
            .exec();
        
        const formattedCharts = charts.reduce((acc, chart) => {
            acc[chart._id] = {
                title: chart.title,
                savedAt: chart.savedAt
            };
            return acc;
        }, {});
        
        res.json({ 
            success: true, 
            charts: formattedCharts 
        });
    } catch (error) {
        console.error('Error fetching charts:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to fetch charts'
        });
    }
});

// دریافت یک نمودار
app.get('/api/charts/:id', async (req, res) => {
    try {
        const chart = await Chart.findById(req.params.id).lean().exec();
        if (!chart) {
            return res.status(404).json({ 
                success: false, 
                error: 'Chart not found' 
            });
        }
        res.json({ 
            success: true, 
            chart: chart.state 
        });
    } catch (error) {
        console.error('Error fetching chart:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to fetch chart'
        });
    }
});

// Initialize server
const startServer = async () => {
    // First connect to MongoDB
    const isConnected = await connectDB();
    
    if (!isConnected) {
        console.error('Failed to establish initial MongoDB connection');
        process.exit(1);
    }

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
};

startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});