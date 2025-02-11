// server.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const CHARTS_FILE = path.join(__dirname, 'charts.json');

async function ensureChartFile() {
    try {
        await fs.access(CHARTS_FILE);
    } catch {
        await fs.writeFile(CHARTS_FILE, JSON.stringify({}));
    }
}

async function readCharts() {
    await ensureChartFile();
    const data = await fs.readFile(CHARTS_FILE, 'utf8');
    return JSON.parse(data);
}

async function writeCharts(charts) {
    await fs.writeFile(CHARTS_FILE, JSON.stringify(charts, null, 2));
}

// ذخیره نسخه جدید
app.post('/api/save-chart', async (req, res) => {
    try {
        const { title, chartState } = req.body;
        
        if (!title) {
            return res.status(400).json({ success: false, error: 'Title is required' });
        }

        const charts = await readCharts();
        const versionId = `version_${Date.now()}`;
        
        charts[versionId] = {
            title,
            state: chartState,
            savedAt: new Date().toISOString()
        };
        
        await writeCharts(charts);
        res.json({ success: true, message: 'Version saved successfully', versionId });
    } catch (error) {
        console.error('Error saving version:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// بازیابی یک نسخه خاص
app.get('/api/load-chart/:versionId', async (req, res) => {
    try {
        const { versionId } = req.params;
        const charts = await readCharts();
        
        if (!charts[versionId]) {
            return res.status(404).json({ success: false, error: 'Version not found' });
        }
        
        res.json({ success: true, data: charts[versionId] });
    } catch (error) {
        console.error('Error loading version:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// گرفتن لیست تمام نسخه‌ها
app.get('/api/charts', async (req, res) => {
    try {
        const charts = await readCharts();
        res.json({ success: true, data: charts });
    } catch (error) {
        console.error('Error listing versions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    ensureChartFile();
});