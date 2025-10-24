# DevQuery - AI-Powered Database Query Platform

<div align="center">

![DevQuery Logo](frontend/public/img1.png)

**Transform Natural Language into SQL Queries with AI**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/react-19.1.1-blue.svg)](https://reactjs.org)
[![MongoDB](https://img.shields.io/badge/mongodb-6.11.0-green.svg)](https://www.mongodb.com)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Directory Structure](#-directory-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Endpoints](#-api-endpoints)
- [Database Support](#-database-support)
- [Security Features](#-security-features)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**DevQuery** is an intelligent database query platform that leverages Large Language Models (LLMs) to convert natural language descriptions into optimized SQL queries. It provides a modern web interface for managing database connections, executing queries, and analyzing results across multiple database systems.

### Key Capabilities

- **Natural Language to SQL**: Convert plain English to SQL queries using AI (Google Gemini)
- **Multi-Database Support**: Connect to MySQL, PostgreSQL, MongoDB, SQLite, SQL Server, and Oracle
- **Read & Write Operations**: Execute both read and write operations with comprehensive security controls
- **Schema Explorer**: Visualize and explore database schemas interactively
- **Query Management**: Save, organize, and share queries with team members
- **Analytics Dashboard**: Track query performance and database usage patterns
- **Whitelist Management**: Fine-grained access control for AI operations
- **User Authentication**: Secure JWT-based authentication and authorization

---

## ✨ Features

### 🤖 AI-Powered Query Generation
- Convert natural language descriptions to SQL queries
- Context-aware query suggestions
- Smart SQL optimization with LIMIT clauses
- Support for complex JOIN operations
- Automatic schema inference

### 🗄️ Database Management
- Multiple database connection management
- Persistent connection pooling
- Connection health monitoring
- Schema caching for performance
- Support for connection strings and individual parameters

### 🔐 Security & Access Control
- JWT-based authentication
- Role-based access control (Admin/User)
- Whitelist management for AI operations
- Column-level restrictions
- User confirmation for write operations
- SHA-256 password hashing
- Comprehensive audit logging

### 📊 Analytics & Monitoring
- Query execution history
- Performance metrics tracking
- Usage pattern analysis
- Real-time connection status
- Error tracking and logging

### 💾 Query Management
- Save frequently used queries
- Organize queries by category
- Share queries with team members
- Query history with execution details
- Export query results

### 🎨 Modern UI/UX
- Responsive design for all devices
- Dark/light theme support
- Syntax-highlighted SQL editor
- Interactive schema visualization
- Real-time notifications
- Smooth animations and transitions

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js (v16+)
- **Framework**: Express.js
- **Database**: MongoDB (for user data and metadata)
- **Authentication**: JWT (JSON Web Tokens)
- **AI Integration**: Google Gemini API
- **Security**: Helmet, bcryptjs, express-rate-limit
- **Database Drivers**:
  - MySQL: mysql2
  - PostgreSQL: pg
  - MongoDB: mongodb
  - SQLite: sqlite3
  - SQL Server: tedious
  - Oracle: oracledb
- **Logging**: Winston
- **Caching**: node-cache

### Frontend
- **Framework**: React 19.1.1
- **Bundler**: Vite
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios
- **Charts**: Chart.js, react-chartjs-2
- **Icons**: Lucide React, Font Awesome
- **3D Graphics**: Three.js
- **Styling**: CSS3 with modern features

### Development Tools
- **Linting**: ESLint
- **Package Manager**: npm
- **Version Control**: Git
- **API Testing**: Built-in test scripts

---

## 📁 Directory Structure

```
DevQuery.mongodb/
│
├── auth-backend/                     # Backend application
│   ├── config/                       # Configuration files
│   │   ├── db.js                     # Database configuration
│   │   └── mongo.js                  # MongoDB connection setup
│   │
│   ├── src/
│   │   ├── controllers/              # Request handlers
│   │   │   ├── adminController.js    # Admin operations
│   │   │   ├── analyticsController.js # Analytics endpoints
│   │   │   ├── assistantController.js # AI assistant logic
│   │   │   ├── authController.js     # Authentication logic
│   │   │   ├── databaseController.js # Database operations
│   │   │   └── whitelistController.js # Whitelist management
│   │   │
│   │   ├── middleware/               # Express middleware
│   │   │   ├── auth.js               # JWT authentication
│   │   │   ├── authMiddleware.js     # Auth verification
│   │   │   └── validation.js         # Input validation
│   │   │
│   │   ├── models/                   # Data models
│   │   │   ├── AuditLog.js          # Audit logging model
│   │   │   ├── QueryLog.js          # Query history model
│   │   │   ├── User.js              # User model
│   │   │   ├── UserConnection.js    # Database connections model
│   │   │   ├── UserManager.js       # User management logic
│   │   │   ├── UserSession.js       # Session management
│   │   │   └── WhitelistManager.js  # Whitelist logic
│   │   │
│   │   ├── routes/                   # API routes
│   │   │   ├── adminRoutes.js       # Admin endpoints
│   │   │   ├── analyticsRoutes.js   # Analytics endpoints
│   │   │   ├── assistantRoutes.js   # AI assistant endpoints
│   │   │   ├── authRoutes.js        # Authentication endpoints
│   │   │   ├── databaseRoutes.js    # Database endpoints
│   │   │   └── whitelistRoutes.js   # Whitelist endpoints
│   │   │
│   │   └── utils/                    # Utility functions
│   │       ├── DatabaseConnectionManager.js # Connection pooling
│   │       ├── aiClient.js          # AI/LLM integration
│   │       ├── dbManager.js         # Database manager
│   │       ├── jwtUtils.js          # JWT utilities
│   │       └── logger.js            # Winston logger
│   │
│   ├── server.js                     # Express server entry point
│   ├── package.json                  # Backend dependencies
│   ├── test-chat.js                  # Chat functionality tests
│   ├── test-gemini.js               # Gemini API tests
│   ├── test-persistent-connections.js # Connection pooling tests
│   └── test-schema-retrieval.js     # Schema retrieval tests
│
├── frontend/                         # React application
│   ├── public/                       # Static assets
│   │   ├── img1.png                 # Logo image
│   │   └── vite.svg                 # Vite logo
│   │
│   ├── src/
│   │   ├── assets/                   # Images and icons
│   │   │   ├── img1.png             # Logo
│   │   │   └── react.svg            # React logo
│   │   │
│   │   ├── components/               # React components
│   │   │   ├── Analytics.css        # Analytics styles
│   │   │   ├── Analytics.jsx        # Analytics dashboard
│   │   │   ├── Auth.css             # Auth styles
│   │   │   ├── Dashboard.css        # Dashboard styles
│   │   │   ├── Dashboard.jsx        # Main dashboard
│   │   │   ├── Home.css             # Home page styles
│   │   │   ├── Home.jsx             # Landing page
│   │   │   ├── Home_Exact.css       # Alternative home styles
│   │   │   ├── Home_New.jsx         # New home page variant
│   │   │   ├── Login.jsx            # Login component
│   │   │   ├── QueryHistory.css     # Query history styles
│   │   │   ├── QueryHistory.jsx     # Query history component
│   │   │   ├── SavedQueries.css     # Saved queries styles
│   │   │   ├── SavedQueries.jsx     # Saved queries component
│   │   │   ├── Signup.jsx           # Registration component
│   │   │   ├── WhitelistManager.css # Whitelist manager styles
│   │   │   ├── WhitelistManager.jsx # Whitelist UI component
│   │   │   ├── useNotifications.js  # Notification hook
│   │   │   └── useSQLDrawer.js      # SQL drawer hook
│   │   │
│   │   ├── utils/                    # Utility functions
│   │   │   └── api.js               # API client (Axios)
│   │   │
│   │   ├── App.css                   # Global app styles
│   │   ├── App.jsx                   # Root component
│   │   ├── index.css                 # Global styles
│   │   └── main.jsx                  # App entry point
│   │
│   ├── index.html                    # HTML template
│   ├── package.json                  # Frontend dependencies
│   ├── vite.config.js               # Vite configuration
│   ├── eslint.config.js             # ESLint configuration
│   └── test-auth.html               # Auth testing page
│
├── static/                           # Static files
│   └── chart.umd.js                 # Chart.js library
│
├── .gitignore                        # Git ignore rules
├── organize-docs.ps1                 # Documentation organizer script
└── verify-installation.sh            # Installation verification script
```

---

## 📋 Prerequisites

Before installing DevQuery, ensure you have the following installed:

- **Node.js**: v16.0.0 or higher ([Download](https://nodejs.org))
- **npm**: v7.0.0 or higher (comes with Node.js)
- **MongoDB**: v4.4 or higher ([Download](https://www.mongodb.com/try/download/community))
- **Git**: For version control ([Download](https://git-scm.com))
- **Google Gemini API Key**: For AI functionality ([Get API Key](https://makersuite.google.com/app/apikey))

### Optional (for database connections)
- MySQL Server (if using MySQL)
- PostgreSQL Server (if using PostgreSQL)
- Oracle Database (if using Oracle)
- SQL Server (if using SQL Server)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Revanth03135/DevQuery.mongodb.git
cd DevQuery.mongodb
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd auth-backend

# Install dependencies
npm install

# Create environment file
touch .env  # Create .env file manually
```

### 3. Configure Environment Variables

Create a `.env` file in the `auth-backend` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/devquery
MONGODB_DB_NAME=devquery

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key-here

# Whitelist Admin Password
WHITELIST_ADMIN_PASSWORD=your-secure-password

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### 4. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install
```

### 5. Start the Application

**Start Backend (from auth-backend directory):**
```bash
npm start
# Or for development with auto-reload:
npm run dev
```

**Start Frontend (from frontend directory):**
```bash
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

---

## ⚙️ Configuration

### Backend Configuration

Edit `auth-backend/.env` to configure:

- **MongoDB**: Update `MONGO_URI` with your MongoDB connection string
- **JWT**: Set a strong `JWT_SECRET` for production
- **Gemini API**: Add your `GEMINI_API_KEY` for AI features
- **Whitelist**: Set `WHITELIST_ADMIN_PASSWORD` for access control
- **Port**: Change `PORT` if 5000 is already in use

### Frontend Configuration

Edit `frontend/src/utils/api.js` to update the backend URL:

```javascript
const API_BASE_URL = 'http://localhost:5000';
```

For production, update to your deployed backend URL.

---

## 📖 Usage

### 1. User Registration

1. Navigate to `http://localhost:5173/signup`
2. Fill in your details (name, email, password)
3. Click "Sign Up"
4. You'll be redirected to login

### 2. Login

1. Navigate to `http://localhost:5173/login`
2. Enter your email and password
3. Click "Login"
4. You'll be redirected to the dashboard

### 3. Add Database Connection

1. In the dashboard, click "Add Connection"
2. Select database type (MySQL, PostgreSQL, MongoDB, etc.)
3. Enter connection details:
   - Host
   - Port
   - Database name
   - Username
   - Password
   - Or use connection string
4. Click "Test Connection" to verify
5. Click "Save" to store the connection

### 4. Execute Queries

**Natural Language Query:**
1. Select a database connection
2. Type your query in plain English (e.g., "Show all users")
3. Click "Generate SQL"
4. Review the generated SQL
5. Click "Execute" to run

**Direct SQL Query:**
1. Select a database connection
2. Click "SQL Editor"
3. Write your SQL query
4. Click "Execute"

### 5. Schema Explorer

1. Select a database connection
2. Click "Schema Explorer"
3. Browse tables and columns
4. Click on a table to see details
5. Generate insights with AI

### 6. Whitelist Management (Admin)

1. Click "🔐 Manage AI Whitelist"
2. Enter admin password
3. Add tables to whitelist
4. Configure column restrictions
5. Enable/disable whitelist

### 7. View Analytics

1. Navigate to the Analytics page
2. View query execution history
3. Analyze performance metrics
4. Track usage patterns

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/validate` | Validate JWT token |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/profile` | Get user profile |

### Database Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/database/connect` | Create database connection |
| GET | `/api/database/connections` | Get user's connections |
| DELETE | `/api/database/connections/:id` | Delete connection |
| POST | `/api/database/test-connection` | Test connection |
| POST | `/api/database/execute-query` | Execute SQL query |
| GET | `/api/database/schema/:connectionId` | Get database schema |

### AI Assistant

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assistant/chat/:connectionId` | Chat with AI assistant |
| POST | `/api/assistant/confirm-write` | Confirm write operation |
| POST | `/api/assistant/generate-sql` | Generate SQL from description |
| GET | `/api/assistant/debug-schema/:connectionId` | Debug schema retrieval |

### Whitelist Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/whitelist/authenticate` | Authenticate admin |
| GET | `/api/whitelist/config/:connectionId` | Get whitelist config |
| POST | `/api/whitelist/config/:connectionId` | Update whitelist config |
| DELETE | `/api/whitelist/config/:connectionId` | Delete whitelist config |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Get dashboard analytics |
| GET | `/api/analytics/query-history` | Get query history |
| GET | `/api/analytics/usage` | Get usage statistics |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | Get all users |
| PUT | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/audit-logs` | Get audit logs |

---

## 🗄️ Database Support

DevQuery supports the following database systems:

### MySQL
- **Driver**: mysql2
- **Features**: Full read/write support, schema exploration, connection pooling
- **Connection**: Host/port or connection string

### PostgreSQL
- **Driver**: pg
- **Features**: Full read/write support, advanced query features, schema exploration
- **Connection**: Host/port or connection string

### MongoDB
- **Driver**: mongodb
- **Features**: Document queries, aggregation, schema inference
- **Connection**: Connection string (mongodb://)

### SQLite
- **Driver**: sqlite3
- **Features**: File-based database, local development
- **Connection**: File path

### SQL Server
- **Driver**: tedious
- **Features**: Full T-SQL support, stored procedures
- **Connection**: Host/port or connection string

### Oracle
- **Driver**: oracledb
- **Features**: PL/SQL support, enterprise features
- **Connection**: Connection string (Oracle format)

---

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication with secure token generation
- Password hashing using bcryptjs
- Role-based access control (Admin/User)
- Session management with timeout
- Secure HTTP-only cookies

### Access Control
- Whitelist management for AI operations
- Table-level access restrictions
- Column-level permission control
- User confirmation required for write operations
- Admin password protection for sensitive operations

### Data Protection
- SQL injection prevention
- Input validation and sanitization
- Rate limiting to prevent abuse
- Helmet.js for HTTP security headers
- CORS configuration for cross-origin requests

### Audit & Monitoring
- Comprehensive audit logging
- Query execution tracking
- User activity monitoring
- Error logging with Winston
- Connection status monitoring

### Best Practices
- Environment variables for sensitive data
- Secure database connection strings
- Regular security updates
- Minimal permission principle
- Default-safe configuration

---

## 🤝 Contributing

We welcome contributions to DevQuery! Here's how you can help:

### Getting Started

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/DevQuery.mongodb.git
   cd DevQuery.mongodb
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, documented code
   - Follow existing code style
   - Add tests if applicable

4. **Test your changes**
   ```bash
   # Backend tests
   cd auth-backend
   npm test
   
   # Frontend tests
   cd frontend
   npm run lint
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add: Brief description of your changes"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your feature branch
   - Describe your changes
   - Submit for review

### Development Guidelines

- **Code Style**: Follow the existing code style and formatting
- **Commits**: Write clear, concise commit messages
- **Documentation**: Update documentation for new features
- **Testing**: Add tests for new functionality
- **Security**: Never commit sensitive data or credentials

### Areas for Contribution

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- ⚡ Performance optimizations
- 🔒 Security improvements
- 🌐 Internationalization

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the community
- Show empathy towards others

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini**: AI-powered query generation
- **MongoDB**: Database for user data and metadata
- **React**: Frontend framework
- **Express.js**: Backend framework
- **All contributors**: Thank you for your support!

---

## 📞 Support

For questions, issues, or feature requests:

- **GitHub Issues**: [Create an issue](https://github.com/Revanth03135/DevQuery.mongodb/issues)
- **Documentation**: Check the `ReadIt` directory for detailed guides
- **Email**: Contact the maintainers

---

## 🗺️ Roadmap

### Planned Features

- [ ] Support for more database types (Cassandra, Redis, etc.)
- [ ] Query optimization suggestions
- [ ] Collaborative query editing
- [ ] Export results in multiple formats (CSV, JSON, Excel)
- [ ] Database migration tools
- [ ] Visual query builder
- [ ] Advanced analytics and reporting
- [ ] API documentation with Swagger
- [ ] Docker containerization
- [ ] Kubernetes deployment support

---

## 🌟 Show Your Support

If you find DevQuery helpful, please consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting new features
- 🤝 Contributing code
- 📢 Sharing with others

---

<div align="center">

**Made with ❤️ by the DevQuery Team**

</div>
