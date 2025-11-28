const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chitRoutes = require('./routes/chitRoutes');
const historyRoutes = require('./routes/historyRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chitMemberRoutes = require('./routes/chitMemberRoutes');
const contributionRoutes = require('./routes/contributionRoutes');
const imageRoutes = require("./routes/imageRoutes");
const joinRequestRoutes = require('./routes/joinRequestRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const getAdminReports = require('./routes/adminRoutes');
const generatedChitRoutes = require('./routes/generatedChitRoutes');

const documentRoutes = require('./routes/documentRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const path = require('path');
const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://egs-chitfund.com',
  'https://egs-chitfund-management-frontend-qk.vercel.app'
];

// CORS FIX
app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for this origin'));
    }
  },
  credentials: true,          // allow cookies/auth headers
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

// ======== BODY PARSER ========
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// JSON SIZE FIX (IMPORTANT FOR BASE64 IMAGES)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chit', chitRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chit-member', chitMemberRoutes);
app.use('/api/join-requests', joinRequestRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/adminReport', getAdminReports);
app.use('/api/generateChit', generatedChitRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ERROR HANDLING
app.use(notFound);
app.use(errorHandler);

// DB CONNECTION
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connected');
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})
.catch((err) => {
  console.error('❌ MongoDB connection failed:', err.message);
  process.exit(1);
});




