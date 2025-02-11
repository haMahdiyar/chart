// server.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chartdb';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Chart Schema
const chartSchema = new mongoose.Schema({
    title: { type: String, required: true },
    state: { type: mongoose.Schema.Types.Mixed, required: true },
    savedAt: { type: Date, default: Date.now }
});

const Chart = mongoose.model('Chart', chartSchema);

// ذخیره نسخه جدید
app.post('/api/save-chart', async (req, res) => {
    try {
        const { title, chartState } = req.body;
        
        if (!title) {
            return res.status(400).json({ success: false, error: 'Title is required' });
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
            error: 'Failed to save chart' 
        });
    }
});

// دریافت لیست نمودارها
app.get('/api/charts', async (req, res) => {
    try {
        const charts = await Chart.find({})
            .select('title savedAt')
            .sort('-savedAt');
        
        const formattedCharts = charts.reduce((acc, chart) => {
            acc[chart._id] = {
                title: chart.title,
                savedAt: chart.savedAt
            };
            return acc;
        }, {});
        
        res.json({ success: true, charts: formattedCharts });
    } catch (error) {
        console.error('Error fetching charts:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch charts' 
        });
    }
});

// دریافت یک نمودار
app.get('/api/charts/:id', async (req, res) => {
    try {
        const chart = await Chart.findById(req.params.id);
        if (!chart) {
            return res.status(404).json({ 
                success: false, 
                error: 'Chart not found' 
            });
        }
        res.json({ success: true, chart: chart.state });
    } catch (error) {
        console.error('Error fetching chart:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch chart' 
        });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});