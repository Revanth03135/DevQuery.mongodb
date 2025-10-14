const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const queryRoutes = require('./routes/queryRoutes');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors());
app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/queries', queryRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));