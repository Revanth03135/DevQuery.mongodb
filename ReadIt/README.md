# DevQuery - NLP-Powered SQL Generator

DevQuery is a modern web application that leverages Natural Language Processing (NLP) and AI to convert plain English descriptions into optimized SQL queries. It's designed to make database interactions more intuitive and accessible for developers and data analysts.

## Features

### 🤖 AI-Powered SQL Generation
- Convert natural language descriptions to SQL queries
- Support for complex queries with joins, aggregations, and filters
- Intelligent query optimization suggestions

### 🗄️ Multi-Database Support
- MySQL
- PostgreSQL
- SQLite
- SQL Server
- Oracle

### 📊 Query Management
- Execute queries in real-time
- Save and organize frequently used queries
- Query history tracking
- Export results to CSV

### 🔍 Schema Explorer
- Visual database schema browser
- Table and column information
- Relationship mapping

### 📈 Analytics & Insights
- Query performance analysis
- Usage patterns and statistics
- Optimization recommendations

## Project Structure

```
DevQuery/
├── index.html          # Login page
├── home.html           # Landing page
├── dashboard.html      # Main application interface
├── script.js           # Login functionality
├── dashboard.js        # Main application logic
├── styles.css          # Login page styles
├── style.css           # Home page styles
├── dashboard.css       # Dashboard styles
├── img1.png           # Logo/branding
└── README.md          # This file
```

## Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server (optional, for development)

### Installation

1. Clone or download the project files
2. Open `home.html` in your web browser to see the landing page
3. Navigate to the login page and use any email/password (demo mode)
4. Access the main dashboard to start generating SQL queries

### Development Setup

For development with live reload:

```bash
# Using Python's built-in server
python -m http.server 8000

# Using Node.js http-server
npx http-server

# Using PHP's built-in server
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Usage

### Quick Start

1. **Login**: Use any email and password (6+ characters) on the login page
2. **Connect Database**: Click "Connect Database" and enter your database credentials
3. **Generate SQL**: Type a natural language description of what you want to query
4. **Execute**: Review the generated SQL and click "Execute Query" to see results

### Example Queries

- "Show me all customers who made purchases in the last 30 days"
- "Find products with low inventory levels"
- "Calculate average order value by region"
- "List the top 10 customers by total revenue"

## Technology Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with Grid and Flexbox
- **JavaScript (ES6+)** - Application logic and DOM manipulation
- **Font Awesome** - Icons and visual elements

### Features Implemented
- Responsive design for mobile and desktop
- Modern UI with smooth animations
- Real-time SQL generation simulation
- Database connection simulation
- Query result visualization
- Keyboard shortcuts (Ctrl+Enter to execute, Ctrl+Shift+F to format)

## Customization

### Adding New Database Types
Edit the database type dropdown in `dashboard.html`:

```html
<select id="dbType" required>
  <option value="mysql">MySQL</option>
  <option value="postgresql">PostgreSQL</option>
  <!-- Add new database types here -->
</select>
```

### Modifying SQL Generation Logic
Update the `callSQLGenerationAPI` method in `dashboard.js`:

```javascript
async callSQLGenerationAPI(naturalLanguage) {
  // Add your custom SQL generation logic here
  // Connect to actual AI/NLP service
}
```

### Styling Customization
Modify CSS custom properties in `dashboard.css`:

```css
:root {
  --primary-color: #5a39c7;
  --secondary-color: #6c757d;
  /* Add your brand colors */
}
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

### Phase 1 (Current)
- ✅ Basic UI/UX implementation
- ✅ SQL generation simulation
- ✅ Database connection interface
- ✅ Query result display

### Phase 2 (Next)
- [ ] Integrate with actual NLP/AI service
- [ ] Real database connectivity
- [ ] User authentication system
- [ ] Query optimization engine

### Phase 3 (Future)
- [ ] Team collaboration features
- [ ] Advanced analytics dashboard
- [ ] API endpoints for external integration
- [ ] Mobile application

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@devquery.com or create an issue in the repository.

## Acknowledgments

- Font Awesome for the beautiful icons
- The open-source community for inspiration and resources

---

**DevQuery** - Making database queries as simple as asking a question! 🚀
