# 🎬 Demo Scenarios & Troubleshooting Guide

## 🎯 Perfect Demo Walkthrough (10 Minutes)

### **Scenario 1: Complete New User Journey** ✅

**Time: 0:00 - 3:00 (3 minutes)**

**Script:**

```
"Let me show you a complete user journey from scratch."

1. LANDING PAGE (0:00 - 0:30)
   - "This is our landing page with a modern, professional design"
   - Scroll through features
   - "Notice the clean UI and clear value proposition"
   - Click "Get Started"

2. SIGN UP (0:30 - 1:00)
   - Enter email: "demo@devquery.com"
   - Password: "Demo123!"
   - "Form validation in real-time"
   - Show error if password too weak
   - Click "Sign Up"
   - "JWT token generated and stored"

3. AUTO-LOGIN & REDIRECT (1:00 - 1:15)
   - "Automatically logged in and redirected to dashboard"
   - "Token validated with backend"
   - "User state persists across page refreshes"

4. DATABASE CONNECTION (1:15 - 2:15)
   - "First, we need to connect to a database"
   - Click "Connect Database"
   - Fill form:
     * Name: "Demo PostgreSQL"
     * Type: PostgreSQL
     * Host: localhost
     * Port: 5432
     * Username: postgres
     * Password: ****
     * Database: demo_db
   - Click "Test Connection"
   - "✅ Connection successful!"
   - Click "Save"
   - "Schema automatically loaded"

5. FIRST QUERY (2:15 - 3:00)
   - Type: "show me all users who signed up last month"
   - Click "Generate SQL"
   - "AI processes with schema context"
   - Show generated SQL:
     ```sql
     SELECT * FROM users 
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
     ORDER BY created_at DESC;
     ```
   - "User reviews SQL before execution"
   - Click "Execute Query"
   - Show results table
   - "45 rows returned in 52ms"
```

---

### **Scenario 2: Advanced Features Showcase** 🚀

**Time: 3:00 - 7:00 (4 minutes)**

**Script:**

```
"Now let me show you our advanced features."

1. SCHEMA EXPLORER - TABLES VIEW (3:00 - 3:45)
   - Click "Schema Explorer" in sidebar
   - "Here's our database structure"
   - Show search: Type "user"
   - "Real-time filtering with highlighting"
   - Click on "users" table
   - "See all columns with types, keys, constraints"
   - Point out:
     * Yellow background = Primary Key
     * Blue background = Foreign Key

2. SCHEMA EXPLORER - ERD VIEW (3:45 - 4:45)
   - Click "ERD" button
   - "Interactive Entity Relationship Diagram"
   - "Automatic grid layout algorithm"
   - "Tables positioned in sqrt(n) x sqrt(n) grid"
   - Zoom in with + button
   - Zoom out with - button
   - Drag to pan
   - Click on "users" table
   - "See foreign key relationships"
   - Point out relationship lines:
     * "orders.user_id → users.id"
     * "profiles.user_id → users.id"

3. SCHEMA EXPLORER - DOCS VIEW (4:45 - 5:30)
   - Click "Docs" button
   - "Professional database documentation"
   - Show Markdown format
   - Switch to HTML
   - "Styled tables with full schema details"
   - Switch to JSON
   - "Programmatic access format"
   - Click "Copy to Clipboard"
   - "✅ Copied!"
   - Click "Export"
   - "Documentation downloaded as file"

4. AI CHATBOT (5:30 - 6:30)
   - Scroll to chat panel
   - Type: "what tables do I have?"
   - AI responds: "You have 12 tables: users, products, orders..."
   - Type: "show me the structure of the users table"
   - AI responds with column details
   - Type: "what were my last 5 queries?"
   - "AI uses query history from localStorage"
   - AI responds with actual past queries
   - "Context-aware, remembers conversation"

5. QUERY MANAGEMENT (6:30 - 7:00)
   - Click "Save Query" on generated SQL
   - Name: "Monthly Active Users"
   - Description: "Users from last 30 days"
   - Category: "Reports"
   - Click "Save"
   - Open "Saved Queries" from sidebar
   - "Here's our bookmarked query"
   - Click to execute again
   - "One-click replay"
   - Open "Query History"
   - "Last 24 hours of all queries"
   - Show success ✅ and failure ❌ indicators
```

---

### **Scenario 3: Analytics & Visualization** 📊

**Time: 7:00 - 9:00 (2 minutes)**

**Script:**

```
"Let's explore our analytics capabilities."

1. ANALYTICS DASHBOARD (7:00 - 7:15)
   - Click "Analytics" in sidebar
   - "New page with visualization focus"
   - "See metrics cards: Min, Max, Mean, Last Updated"

2. REAL DATA ANALYTICS (7:15 - 8:00)
   - Type: "query history analytics"
   - Click "Submit" or press Enter
   - "Backend analyzes localStorage data"
   - Show chart appearing
   - "[Real Data] indicator in green"
   - "Line chart showing queries per day"
   - Click on sample query: "table count and schema stats"
   - "Bar chart showing actual table counts"
   - "This uses real database schema"

3. CHART TYPES (8:00 - 8:30)
   - Switch to "Bar" chart type
   - "Same data, different visualization"
   - Switch to "Pie" chart
   - "Perfect for distributions"
   - Switch to "Area" chart
   - "Filled line chart"

4. 3D VISUALIZATION (8:30 - 9:00)
   - Toggle "3D Mode" ON
   - "Using Three.js for WebGL rendering"
   - "3D bars with lighting and shadows"
   - Click and drag to rotate
   - "OrbitControls for smooth interaction"
   - Scroll to zoom
   - "GPU-accelerated, 60 FPS"
   - Hover over a bar
   - "See value on hover"
   - "Same data, immersive visualization"
```

---

### **Scenario 4: Security Features** 🔐

**Time: 9:00 - 10:00 (1 minute)**

**Script:**

```
"Finally, our enterprise security features."

1. WHITELIST MANAGER (9:00 - 9:30)
   - Click "🔐 Whitelist" in sidebar
   - "AI access control system"
   - Click "Enable Whitelist"
   - "Now AI can ONLY access whitelisted items"
   - Check "users" table
   - Uncheck "users.password" column
   - Uncheck "users.ssn" column
   - Click "Save"
   - "AI now blocked from sensitive columns"

2. DEMONSTRATE BLOCKING (9:30 - 10:00)
   - Go back to main dashboard
   - Type: "show me user passwords"
   - Click "Generate SQL"
   - "❌ BLOCKED: Column 'password' not in whitelist"
   - "AI prevented from accessing restricted data"
   - "Compliance with data privacy regulations"
   - "Fine-grained security control"
```

---

## 🚨 Common Issues & Solutions

### **Issue 1: Database Connection Fails** ❌

**Symptoms:**
- Red error message: "Connection failed"
- Test connection button shows error

**Causes:**
1. Database not running
2. Wrong credentials
3. Firewall blocking
4. Network issue

**Solutions:**

**Option A - Use Demo Mode:**
```
"For demonstration purposes, I'll show you with our demo database."
- Close connection modal
- Type query anyway
- Click "Generate SQL"
- "Even without connection, AI can generate SQL based on common patterns"
- Show generated SQL
- "In production, this would execute against your database"
```

**Option B - Fix Live:**
```
1. Check backend terminal:
   - Is server running?
   - Any error messages?

2. Check database:
   - Is PostgreSQL/MySQL running?
   - Run: `systemctl status postgresql` (Linux)
   - Run: `brew services list` (Mac)

3. Try localhost alternatives:
   - Change host to "127.0.0.1"
   - Or "0.0.0.0"
   
4. Check credentials:
   - Username correct?
   - Password correct?
   - Database exists?
```

**What to Say:**
```
"Let me troubleshoot this real quick... 
Actually, this demonstrates our error handling nicely.
I'll use our offline demo mode instead to keep moving."
```

---

### **Issue 2: AI Takes Too Long** ⏰

**Symptoms:**
- "Generating SQL..." spinner for 10+ seconds
- No response from AI

**Causes:**
1. Gemini API rate limit
2. Network latency
3. Large schema context

**Solutions:**

**Option A - Wait & Explain:**
```
"The AI is processing the schema context with 50+ tables.
While we wait, let me explain:
- We send the full database schema to Gemini
- AI analyzes table relationships
- Generates optimized SQL
- This typically takes 1-2 seconds
- Current delay might be API rate limiting"
```

**Option B - Cancel & Use Fallback:**
```
- Refresh page
- Try simpler query: "show all users"
- Or use saved query instead
- Show cached results
```

**What to Say:**
```
"Interesting - we're experiencing some API latency.
In production, we implement caching to prevent this.
Let me show you a saved query instead, which loads instantly."
```

---

### **Issue 3: Charts Don't Render** 📊

**Symptoms:**
- Blank chart area
- Console errors
- "Chart failed to render" message

**Causes:**
1. Chart.js not loaded
2. Invalid data format
3. Canvas ref issue
4. Browser compatibility

**Solutions:**

**Option A - Refresh:**
```
- Press F5 to reload
- Try different chart type
- Use sample query instead
```

**Option B - Show Data Table:**
```
"While the chart loads, let me show you the raw data:"
- Scroll down to data table
- "Here's the underlying data"
- "In production, we have fallback renderers"
```

**What to Say:**
```
"The chart rendering had a hiccup - probably a race condition.
Let me refresh... There we go!
This shows the importance of error boundaries and fallbacks,
which we've implemented throughout the app."
```

---

### **Issue 4: 3D Visualization Black Screen** 🎮

**Symptoms:**
- Black canvas when 3D enabled
- No bars visible
- Console: "WebGL not supported"

**Causes:**
1. GPU not available
2. WebGL disabled
3. Browser doesn't support
4. Three.js not loaded

**Solutions:**

**Option A - Enable WebGL:**
```
Chrome: chrome://flags/#enable-webgl
Firefox: about:config → webgl.disabled = false
```

**Option B - Use 2D Instead:**
```
- Toggle back to "2D Mode"
- "For compatibility, we support both 2D and 3D"
- "2D uses Chart.js, 3D uses Three.js"
- Show 2D chart instead
```

**What to Say:**
```
"Looks like WebGL isn't available on this system.
That's why we provide 2D fallback charts.
Let me show you the same data in 2D format."
```

---

### **Issue 5: Nothing Happens on Button Click** 🖱️

**Symptoms:**
- Click button, no response
- No loading state
- No errors

**Causes:**
1. Event handler not attached
2. JavaScript error blocking
3. Backend not responding
4. CORS issue

**Solutions:**

**Option A - Check Console:**
```
F12 → Console tab
Look for red errors
Common fixes:
- Refresh page
- Check backend running
- Check network tab
```

**Option B - Use Keyboard:**
```
- Try keyboard shortcuts instead
- Ctrl+Enter to execute
- Tab to navigate
```

**What to Say:**
```
"Let me check the console for errors...
Ah, the backend isn't responding.
Let me restart it quickly.
[Restart backend]
This demonstrates the importance of backend monitoring,
which we'd have in production with health checks."
```

---

### **Issue 6: Modal Won't Close** 🔲

**Symptoms:**
- Click X or outside, modal stays
- Can't access main app
- Overlay stuck

**Solutions:**

**Option A - ESC Key:**
```
Press ESC
Or click backdrop multiple times
```

**Option B - Refresh:**
```
F5 to reload
Or Ctrl+R
State will reset
```

**What to Say:**
```
"The modal state got stuck - probably a z-index conflict.
Let me refresh to reset the UI state.
In production, we'd have better state management here."
```

---

## 🎯 Backup Demo Plans

### **Plan A: Full Live Demo** ✅
- Everything works
- Database connected
- AI responsive
- Charts rendering
- **Duration:** 10 minutes

### **Plan B: Partial Live Demo** ⚠️
- Database connection fails
- Use demo/mock data
- Show AI with cached responses
- Display pre-generated charts
- **Duration:** 10 minutes

### **Plan C: Code Walkthrough** 📝
- Demo completely broken
- Open code in VS Code
- Walk through key components
- Show architecture diagrams
- Explain implementation
- **Duration:** 10 minutes

### **Plan D: Video Backup** 🎥
- Have screen recording ready
- Play video of full demo
- Pause to explain features
- Show code separately
- **Duration:** 5 min video + 5 min code

---

## 💡 Pro Tips for Smooth Demo

### **Before Demo:**

```bash
# 1. Clear browser data
Ctrl+Shift+Delete → Clear everything

# 2. Test all features
✓ Sign up/login
✓ Database connection
✓ SQL generation
✓ Query execution
✓ Schema explorer (all 3 modes)
✓ Chatbot
✓ Analytics
✓ Whitelist

# 3. Prepare sample queries
Save in notepad:
- "show all users from last month"
- "top 10 products by sales"
- "query history analytics"

# 4. Have terminals ready
Terminal 1: Backend (npm run dev)
Terminal 2: Frontend (npm run dev)
Terminal 3: Database (if needed)

# 5. Close unnecessary tabs
Only keep:
- Demo browser tab
- VS Code (for code questions)
- This guide

# 6. Set browser zoom to 100%
Ctrl+0 to reset zoom
```

### **During Demo:**

```
✓ Speak clearly and slowly
✓ Explain BEFORE clicking
  "Now I'll click Generate SQL..."
✓ Wait for animations to finish
✓ Keep mouse cursor visible
✓ Use full screen mode (F11)
✓ Disable notifications
✓ Put phone on silent
✓ Have water nearby
```

### **Handling Questions:**

```
GOOD RESPONSES:

Q: "How does [X] work?"
A: "Great question! Let me show you the code..."
   [Open VS Code, navigate to component]

Q: "What if [edge case]?"
A: "We handle that with [solution]. Let me demonstrate..."
   [Try to reproduce or explain]

Q: "Why [technology choice]?"
A: "We chose [X] because [reason 1], [reason 2], [reason 3]"
   [Give specific benefits]

BAD RESPONSES:

❌ "I don't know"
✓ "I'd need to check the documentation, but I believe..."

❌ "That's not important"
✓ "That's an edge case we plan to handle in version 2"

❌ "It just works"
✓ "It works by [brief technical explanation]"
```

---

## 🎬 Practice Script (Full Dialogue)

**Opening:**
```
"Good morning/afternoon everyone. Today I'm presenting DevQuery,
an AI-powered database query assistant built with React 19.

The problem: SQL is complex, time-consuming to write, and 
inaccessible to non-technical users.

Our solution: Natural language to SQL conversion with an 
intelligent AI that understands your database schema.

Let me show you how it works..."
```

**Demo Section:**
```
[Follow Scenario 1, 2, or 3 above]

"As you can see, DevQuery simplifies database interaction
through natural language, provides visual schema exploration,
and includes enterprise-grade security features."
```

**Technical Deep Dive:**
```
"From a technical perspective:
- Frontend: React 19 with Vite
- Visualization: Chart.js for 2D, Three.js for 3D
- State: Pure React hooks, no Redux needed
- Performance: Code splitting, lazy loading, memoization
- Security: JWT auth, AI whitelist, XSS protection

Our most complex component is Dashboard.jsx at 2,974 lines,
managing 20+ state variables with perfect synchronization.

The ERD visualization uses an automatic grid layout algorithm
that positions tables in sqrt(n) x sqrt(n) grid and detects
foreign key relationships by pattern matching column names."
```

**Closing:**
```
"To summarize:
✓ Modern tech stack (React 19, Vite, Three.js)
✓ AI-powered features (NL to SQL, chatbot)
✓ Advanced visualizations (ERD, 3D charts)
✓ Enterprise security (whitelist, JWT)
✓ Production-ready (92 Lighthouse score, 1.5s load)

We've built a tool that makes databases accessible to everyone,
from developers to business analysts.

I'm happy to answer any questions."
```

---

## 📋 Demo Checklist

### **30 Minutes Before:**
- [ ] Backend running (no errors)
- [ ] Frontend running (no errors)
- [ ] Database running and populated
- [ ] Browser tested with demo flow
- [ ] VS Code open with code
- [ ] This guide visible
- [ ] Backup video ready
- [ ] Screen recording started
- [ ] Phone silent
- [ ] Water bottle filled

### **5 Minutes Before:**
- [ ] Deep breath
- [ ] Review key numbers
- [ ] Clear browser cache
- [ ] Close extra tabs
- [ ] Test one query
- [ ] Full screen browser
- [ ] Confident mindset

### **During Demo:**
- [ ] Speak clearly
- [ ] Explain actions
- [ ] Highlight features
- [ ] Show unique capabilities
- [ ] Handle errors gracefully
- [ ] Make eye contact
- [ ] Stay calm

### **After Demo:**
- [ ] Summarize achievements
- [ ] Invite questions
- [ ] Thank audience
- [ ] Collect feedback

---

## 🏆 Success Metrics

**A GREAT demo includes:**
- ✅ Smooth flow (no major errors)
- ✅ All 3 schema modes shown
- ✅ At least 1 AI query
- ✅ Analytics with chart
- ✅ Security demonstration
- ✅ Code shown when asked
- ✅ Questions answered confidently

**A GOOD demo includes:**
- ✅ Most features shown
- ✅ Minor errors recovered
- ✅ Some questions answered
- ✅ Overall positive impression

**An ACCEPTABLE demo includes:**
- ✅ Core features shown
- ✅ Major errors but recovered
- ✅ Key concepts explained
- ✅ Backup plan used

---

## 💪 Confidence Boosters

**Before going in, remind yourself:**

```
✓ You built a 6,500+ line application
✓ Using the latest technologies (React 19!)
✓ With advanced features (3D, AI, ERD)
✓ That actually works and solves problems
✓ You understand every component
✓ You know the codebase inside out
✓ You can explain any part
✓ You've practiced the demo
✓ You're prepared for questions
✓ You've got backup plans

YOU GOT THIS! 🚀
```

---

**Remember:** Even if something goes wrong, your knowledge and preparation will shine through. The invigilators want to see that you understand what you built, not that everything is perfect.

**Good luck! You're going to do great! 🎉**

---

*Demo Guide - November 2, 2024*
