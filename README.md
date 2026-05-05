# QueryAI — Natural Language to SQL

Ask plain English questions and get real SQL results, powered by Claude AI + Northwind PostgreSQL database.

---

## Project Structure

```
text-to-sql-backend/     ← Node.js + Express
  server.js
  package.json
  .env.example

text-to-sql-frontend/    ← React + Vite
  src/
    App.jsx
    main.jsx
  index.html
  vite.config.js
  package.json
  .env.example
```

---

## Step-by-Step Setup

### 1. Database (already done ✅)
You've already imported the Northwind dataset into Supabase.

Get your **Direct Connection String** from:
Supabase → Settings → Database → Connection string → URI

It looks like:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 2. Anthropic API Key
Get your key from: https://console.anthropic.com/keys

---

### 3. Backend Setup

```bash
cd text-to-sql-backend
npm install

# Create your .env file
cp .env.example .env
```

Edit `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://postgres:...@db....supabase.co:5432/postgres
PORT=3001
```

Run locally:
```bash
npm run dev
```

Test it:
```bash
curl -X POST http://localhost:3001/api/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Show top 5 products by unit price"}'
```

---

### 4. Frontend Setup

```bash
cd text-to-sql-frontend
npm install

cp .env.example .env
```

Edit `.env`:
```
VITE_API_URL=http://localhost:3001
```

Run locally:
```bash
npm run dev
```

Open: http://localhost:5173

---

## Deployment

### Backend → Render
1. Push `text-to-sql-backend/` to GitHub
2. Create new Web Service on Render
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add environment variables: `ANTHROPIC_API_KEY`, `DATABASE_URL`

### Frontend → Vercel
1. Push `text-to-sql-frontend/` to GitHub
2. Import project on Vercel
3. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com`
4. Deploy

---

## How It Works

```
User types question
       ↓
React frontend sends question to Express backend
       ↓
Backend builds prompt: schema + question → Claude API
       ↓
Claude returns SQL (SELECT only)
       ↓
Backend validates (blocks non-SELECT) → runs on Supabase
       ↓
Results returned as JSON → displayed in table
```

---

## Safety
- Only SELECT queries are allowed — no INSERT, UPDATE, DELETE, DROP
- DB errors are caught and shown as friendly messages
- Results capped at 100 rows by default

---

## Tech Stack
- Frontend: React + Vite → Vercel
- Backend: Node.js + Express → Render
- AI: Claude (Anthropic)
- Database: Supabase PostgreSQL (Northwind)
