const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

app.use(cors());
app.use(express.json());

const ipRequestCount = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000;

const rateLimitMiddleware = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!ipRequestCount.has(ip)) {
    ipRequestCount.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return next();
  }
  
  const ipData = ipRequestCount.get(ip);
  
  if (now > ipData.resetTime) {
    ipData.count = 1;
    ipData.resetTime = now + RATE_WINDOW;
    return next();
  }
  
  if (ipData.count >= RATE_LIMIT) {
    return res.status(429).json({ error: '提交过于频繁，请稍后再试' });
  }
  
  ipData.count++;
  next();
};

const md5 = (str) => crypto.createHash('md5').update(str).digest('hex');

let Suggestion;

const getSuggestionModel = () => {
  if (!Suggestion) {
    const suggestionSchema = new mongoose.Schema({
      title: { type: String, required: true },
      type: { 
        type: String, 
        required: true, 
        enum: ['网站建议', '其他建议', '个人建议', '开发建议'] 
      },
      text: { type: String, required: true },
      deviceHash: { type: String, default: '' },
      deviceDetail: {
        userAgent: String,
        language: String,
        platform: String,
        screenWidth: Number,
        screenHeight: Number,
        timezone: String,
        ip: String,
        cpuCores: String,
        deviceMemory: String,
        gpu: String,
        hardDisk: String
      },
      status: { 
        type: String, 
        enum: ['待处理', '处理中', '已完成', '已拒绝'],
        default: '待处理'
      },
      progress: { type: Number, default: 0 },
      createdAt: { type: Date, default: Date.now }
    }, { collection: 'suggestions' });
    
    Suggestion = mongoose.model('Suggestion', suggestionSchema);
  }
  return Suggestion;
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI not configured');
    }
    await mongoose.connect(uri);
  }
};

app.post('/api/suggestions', rateLimitMiddleware, async (req, res) => {
  try {
    await connectDB();
    
    let { title, type, text, deviceInfo } = req.body;
    
    if (!title || !type || !text) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }
    
    try {
      const decodedTitle = Buffer.from(title, 'base64').toString('utf8');
      const decodedText = Buffer.from(text, 'base64').toString('utf8');
      if (decodedTitle && decodedText) {
        title = decodedTitle;
        text = decodedText;
      }
    } catch (e) {}
    
    let hashedDeviceInfo = '';
    let deviceDetail = {};
    const clientIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
    
    if (deviceInfo) {
      try {
        const decodedDevice = Buffer.from(deviceInfo, 'base64').toString('utf8');
        hashedDeviceInfo = md5(decodedDevice);
        deviceDetail = JSON.parse(decodedDevice);
        deviceDetail.ip = clientIp;
      } catch (e) {
        hashedDeviceInfo = md5(deviceInfo);
      }
    }
    
    const SuggestionModel = getSuggestionModel();
    const suggestion = new SuggestionModel({ 
      title, 
      type, 
      text, 
      deviceHash: hashedDeviceInfo,
      deviceDetail: deviceDetail
    });
    const saved = await suggestion.save();
    
    res.json({ id: saved._id.toString(), message: '建议提交成功' });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: '提交失败: ' + error.message });
  }
});

app.get('/api/suggestions/:id', async (req, res) => {
  try {
    await connectDB();
    
    const SuggestionModel = getSuggestionModel();
    const suggestion = await SuggestionModel.findById(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ error: '未找到该建议' });
    }
    res.json(suggestion);
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ error: '查询失败' });
  }
});

app.get('/', (req, res) => {
  res.send('Suggestion API Running');
});

module.exports = app;
