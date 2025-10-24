# DevQuery - AI-Powered Database Query Generator 🚀

DevQuery is a full-stack web application that leverages Google Gemini AI to convert natural language descriptions into optimized database queries (MongoDB and SQL). It's designed to make database interactions more intuitive and accessible for developers and data analysts.

![DevQuery Logo](frontend/public/img1.png)

## ✨ Features

### 🤖 AI-Powered Query Generation
- Convert natural language descriptions to MongoDB and SQL queries using Google Gemini AI
- Support for complex queries with joins, aggregations, and filters
- Automatic query type detection (MongoDB, SQL, Aggregation Pipeline)
- Intelligent query optimization suggestions

### 📊 Query Management
- Save and organize frequently used queries
- Query history tracking with timestamps
- Favorites system for quick access
- Tag-based organization
- Export and share queries

### 🔍 Query Analysis
- AI-powered query explanations in plain English
- Performance optimization recommendations
- Execution tracking and analytics

### 🔐 User Authentication
- Secure JWT-based authentication
- User registration and login
- Protected API endpoints
- Session management

### 📈 Analytics Dashboard
- Query usage patterns and statistics
- Performance metrics visualization
- User activity tracking

## 🏗️ Project Structure

```
DevQuery.mongodb/
├── auth-backend/                 # Node.js/Express Backend
│   ├── config/
│   │   └── db.js                # MongoDB connection configuration
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic (login, signup)
│   │   └── queryController.js   # Query CRUD operations and AI integration
│   ├── middleware/
│   │   └── authMiddleware.js    # JWT token verification
│   ├── models/
│   │   ├── Query.js             # Query schema (MongoDB)
│   │   └── User.js              # User schema (MongoDB)
│   ├── routes/
│   │   ├── authRoutes.js        # Authentication endpoints
│   │   └── queryRoutes.js       # Query management endpoints
│   ├── services/
│   │   └── geminiService.js     # Google Gemini AI integration
│   ├── utils/
│   │   └── generateToken.js     # JWT token generation utility
│   ├── server.js                # Express server entry point
│   ├── package.json             # Backend dependencies
│   ├── .env                     # Environment variables (not in repo)
│   ├── API_TESTING.md           # API testing guide
│   ├── GEMINI_SETUP_GUIDE.md    # Detailed Gemini AI setup
│   ├── POSTMAN_TEST_COLLECTION.md
│   ├── QUICK_ENDPOINTS_REFERENCE.md
│   └── TROUBLESHOOTING.md       # Common issues and solutions
│
├── frontend/                     # React + Vite Frontend
│   ├── public/
│   │   ├── img1.png             # Application logo
│   │   └── vite.svg             # Vite logo
│   ├── src/
│   │   ├── assets/              # Static assets (images, icons)
│   │   ├── components/
│   │   │   ├── Analytics.jsx    # Analytics dashboard component
│   │   │   ├── Dashboard.jsx    # Main query generation interface
│   │   │   ├── Home.jsx         # Landing page
│   │   │   ├── Login.jsx        # Login form
│   │   │   └── Signup.jsx       # Registration form
│   │   ├── context/
│   │   │   └── UserContext.jsx  # User state management
│   │   ├── utils/
│   │   │   └── api.js           # Axios API client configuration
│   │   ├── App.jsx              # Main app component
│   │   ├── AppRoutes.jsx        # React Router configuration
│   │   ├── main.jsx             # React app entry point
│   │   └── index.css            # Global styles
│   ├── index.html               # HTML entry point
│   ├── package.json             # Frontend dependencies
│   ├── vite.config.js           # Vite configuration
│   └── eslint.config.js         # ESLint configuration
│
├── static/
│   └── chart.umd.js             # Chart.js library
│
├── ANALYTICS_README.md          # Analytics feature documentation
├── INTEGRATION_COMPLETE.md      # Frontend-backend integration guide
├── INTEGRATION_FIX.md           # Integration troubleshooting
├── .gitignore                   # Git ignore rules
└── README.md                    # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18.0.0 or higher)
- **npm** or **yarn**
- **MongoDB** (local installation or MongoDB Atlas account)
- **Google Gemini API Key** ([Get it here](https://makersuite.google.com/app/apikey))

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/Revanth03135/DevQuery.mongodb.git
cd DevQuery.mongodb
```

#### 2. Backend Setup

```bash
cd auth-backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=5000
MONGODB_URI=mongodb://localhost:27017/devquery
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/devquery?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
EOF

# Start the backend server
npm run dev
```

The backend will run on `http://localhost:5000`

#### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:5173`

### Environment Variables

#### Backend (`auth-backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Backend server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/devquery` |
| `JWT_SECRET` | Secret key for JWT tokens | `your_secret_key` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIzaSy...` |

## 📖 Usage

### Quick Start Guide

1. **Register/Login**
   - Navigate to `http://localhost:5173`
   - Create a new account or login with existing credentials

2. **Generate a Query**
   - Go to the Dashboard
   - Enter a natural language description (e.g., "Find all users who registered in the last 30 days")
   - Click "Generate SQL"
   - The AI will generate the appropriate database query

3. **Manage Queries**
   - View generated query in the editor
   - Click "Explain" to understand what the query does
   - Click "Optimize" for performance improvement suggestions
   - Save queries to favorites for quick access
   - View query history in the sidebar

4. **Analytics**
   - Navigate to the Analytics page
   - View query usage statistics
   - Monitor performance metrics

### Example Queries

```
Natural Language Input → Generated Query

"Get all active users"
→ db.users.find({ status: "active" })

"Find products with price less than 100"
→ db.products.find({ price: { $lt: 100 } })

"Show users who registered last week"
→ db.users.find({ createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) } })

"Calculate average order value by region"
→ db.orders.aggregate([
    { $group: { _id: "$region", avgValue: { $avg: "$total" } } }
  ])
```

## 🛠️ Technology Stack

### Frontend
- **React 19** - UI library
- **Vite 7** - Build tool and dev server
- **React Router 6** - Client-side routing
- **Axios** - HTTP client
- **Chart.js** - Data visualization
- **Lucide React** - Icon library
- **Three.js** - 3D graphics (optional)

### Backend
- **Node.js** - Runtime environment
- **Express 5** - Web framework
- **MongoDB** - Database
- **Mongoose 8** - MongoDB ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Google Gemini AI** - Query generation
- **CORS** - Cross-origin resource sharing

### Development Tools
- **ESLint** - Code linting
- **Nodemon** - Auto-restart dev server
- **dotenv** - Environment variable management

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/signup` | Register new user | No |
| POST | `/api/auth/login` | User login | No |

### Query Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/queries/generate` | Generate new query from natural language | Yes |
| POST | `/api/queries/explain` | Get explanation for a query | Yes |
| POST | `/api/queries/optimize` | Get optimization suggestions | Yes |
| GET | `/api/queries` | Get all user queries | Yes |
| GET | `/api/queries/favorites` | Get favorite queries | Yes |
| GET | `/api/queries/:id` | Get specific query | Yes |
| PUT | `/api/queries/:id` | Update query (title, favorite, tags) | Yes |
| DELETE | `/api/queries/:id` | Delete query | Yes |

For detailed API documentation, see [auth-backend/API_TESTING.md](auth-backend/API_TESTING.md)

## 🧪 Testing

### Backend Testing

```bash
cd auth-backend

# Test Gemini AI models
node test-gemini-models.js

# Use the provided Postman collection
# See POSTMAN_TEST_COLLECTION.md for details
```

### Frontend Testing

```bash
cd frontend

# Run linter
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Configuration

### Customizing Query Generation

Edit `auth-backend/services/geminiService.js` to customize AI prompts and behavior:

```javascript
const prompt = `You are a database query expert. Generate a ${queryType} query for: ${userPrompt}`;
```

### Styling

Modify CSS variables in component stylesheets:

```css
/* frontend/src/components/Dashboard.css */
:root {
  --primary-color: #5a39c7;
  --secondary-color: #6c757d;
}
```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Verify MongoDB is running: `mongod --version`
   - Check connection string in `.env`
   - Ensure network access if using MongoDB Atlas

2. **Gemini API Errors**
   - Verify API key in `.env`
   - Check API quota limits
   - Ensure internet connectivity

3. **CORS Errors**
   - Verify backend URL in `frontend/src/utils/api.js`
   - Check CORS configuration in `auth-backend/server.js`

4. **JWT Token Expired**
   - Re-login to get a new token
   - Check token expiration settings in `auth-backend/utils/generateToken.js`

For more details, see [auth-backend/TROUBLESHOOTING.md](auth-backend/TROUBLESHOOTING.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow existing code patterns
- Use ESLint for JavaScript linting
- Write meaningful commit messages
- Add comments for complex logic

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** - For powerful query generation capabilities
- **MongoDB** - For flexible document database
- **React** - For the amazing UI library
- **Vite** - For lightning-fast development experience
- **Font Awesome / Lucide** - For beautiful icons
- **The open-source community** - For inspiration and support

## 📧 Support

For support and questions:
- Create an issue in the repository
- Email: support@devquery.com

## 🗺️ Roadmap

### Current Release (v1.0) ✅
- ✅ Google Gemini AI integration
- ✅ Natural language to query conversion
- ✅ User authentication (JWT)
- ✅ Query history and favorites
- ✅ Query explanation and optimization
- ✅ Analytics dashboard
- ✅ Responsive UI

### Upcoming Features
- [ ] Multi-database support (PostgreSQL, MySQL)
- [ ] Real-time query execution
- [ ] Query result visualization
- [ ] Team collaboration features
- [ ] Query sharing and templates
- [ ] Advanced analytics and insights
- [ ] Mobile application
- [ ] Browser extension

---

**DevQuery** - Making database queries as simple as asking a question! 🚀

Made with ❤️ by the DevQuery Team
