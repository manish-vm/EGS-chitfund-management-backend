
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chitRoutes = require('./routes/chitRoutes');
const historyRoutes = require('./routes/historyRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chitMemberRoutes = require('./routes/chitMemberRoutes');
const contributionRoutes = require('./routes/contributionRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const imageRoutes = require("./routes/imageRoutes");
const joinRequestRoutes = require('./routes/joinRequestRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const getAdminReports = require('./routes/adminRoutes');
const generatedChitRoutes = require('./routes/generatedChitRoutes');


const path = require('path');
const documentRoutes = require('./routes/documentRoutes');

const app = express();
const allowedOrigins = ['http://localhost:3000', 'https://egschitfund.com/'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json()); 

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chit', chitRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chit-member', chitMemberRoutes);
app.use('/api/join-requests', joinRequestRoutes);
app.use('/api/contributions', contributionRoutes);
app.use("/api/images", imageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/adminReport', getAdminReports);
app.use('/api/generateChit', generatedChitRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(notFound);
app.use(errorHandler);
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
