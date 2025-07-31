# DevQuery Backend API

A powerful multi-database connectivity backend for the DevQuery NLP-based SQL web application. This backend provides user authentication, session management, and secure connections to multiple database types.

## Features

- 🔐 **User Authentication & Authorization** - JWT-based auth with role management
- 🗄️ **Multi-Database Support** - PostgreSQL, MySQL, SQLite, Oracle, MongoDB, SQL Server
- 👥 **User Management** - Registration, login, profile management
- 🎫 **Subscription System** - Free, Pro, Enterprise tiers with different limits
- 🔄 **Session Management** - Persistent database connections across sessions
- 📊 **Admin Dashboard** - User management and system statistics
- 🛡️ **Security Features** - Rate limiting, helmet, CORS protection
- 📝 **Activity Logging** - Query history and user activity tracking

## Supported Databases

| Database | Status | Features |
|----------|--------|----------|
| PostgreSQL | ✅ | Full support |
| MySQL | ✅ | Full support |
| SQLite | ✅ | Full support |
| Oracle | ✅ | Full support |
| MongoDB | ✅ | Full support |
| SQL Server | ✅ | Full support |

## Quick Start

### Prerequisites

- Node.js 16+
- PostgreSQL 12+ (for user management)
- npm or yarn

### Installation

1. **Clone and setup**
   ```bash
   cd auth-backend
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Database Setup**
   ```bash
   npm run setup
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

The API will be running at `http://localhost:5000`

### Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# PostgreSQL (User Management)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=devquery_users
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Admin
ADMIN_EMAIL=admin@devquery.com
ADMIN_PASSWORD=admin123
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/validate` - Validate token

### Database Operations
- `POST /api/database/test-connection` - Test database connection
- `POST /api/database/connect` - Connect to database
- `GET /api/database/connections` - Get user connections
- `GET /api/database/connections/:id/schema` - Get database schema
- `POST /api/database/connections/:id/query` - Execute SQL query
- `POST /api/database/connections/:id/generate-sql` - Generate SQL from NLP
- `DELETE /api/database/connections/:id` - Disconnect from database

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/stats` - Get system statistics
- `POST /api/admin/users/:id/disconnect` - Disconnect user

## Database Connection Examples

### PostgreSQL
```json
{
  "type": "postgresql",
  "host": "localhost",
  "port": 5432,
  "database": "mydb",
  "username": "user",
  "password": "password"
}
```

### MySQL
```json
{
  "type": "mysql",
  "host": "localhost",
  "port": 3306,
  "database": "mydb",
  "username": "user",
  "password": "password"
}
```

### MongoDB
```json
{
  "type": "mongodb",
  "connectionString": "mongodb://localhost:27017/mydb"
}
```

## Subscription Tiers

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Concurrent Connections | 2 | 10 | 50 |
| Monthly Queries | 100 | 1,000 | 10,000 |
| Database Types | All | All | All |
| Priority Support | ❌ | ✅ | ✅ |
| Advanced Analytics | ❌ | ✅ | ✅ |

## Security Features

- **JWT Authentication** with refresh tokens
- **Rate Limiting** - 100 requests per 15 minutes
- **Helmet** security headers
- **CORS** protection
- **Password Hashing** with bcrypt
- **Account Lockout** after failed login attempts
- **Session Management** with automatic cleanup

## Development

### Project Structure
```
auth-backend/
├── src/
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Authentication & validation
│   ├── models/          # Data models
│   ├── routes/          # API routes
│   └── utils/           # Utilities & helpers
├── setup/              # Database setup scripts
├── server.js           # Main application file
└── package.json
```

### Testing
```bash
npm test
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support, email support@devquery.com or create an issue on GitHub.
