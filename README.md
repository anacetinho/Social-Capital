# Social Capital CRM

A comprehensive personal relationship management system for tracking and nurturing your professional and personal network, powered by AI.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)

## ✨ Features

### 🔥 Core Features
- 👥 **Contact Management** - Track people with contact history, birthdays, professional details, and profile photos
- 🔗 **Relationship Mapping** - Define relationships with types (family, friend, colleague, acquaintance) and strength ratings (1-5)
- 📅 **Event Logging** - Record meetings, calls, emails, and social interactions with multi-participant tracking
- 🤝 **Favor Tracking** - Monitor favors given and received with status, estimated value, and time commitment
- 💼 **Professional History** - Maintain detailed career timelines for each contact
- 🏠 **Asset Management** - Track shared resources, properties, vehicles, skills, and equipment with availability and value estimates
- 📝 **Biography Notes** - Store rich biographical information with dated entries

### 🤖 AI-Powered Features
- **AI Summaries** - Automatically generate comprehensive person summaries from relationship data, events, favors, and professional history
- **Conversational Assistant** - Natural language data entry via N8N webhook integration with streaming responses
- **Flexible LLM Support** - Works with OpenAI, LM Studio, Ollama, or any OpenAI-compatible API

### 📊 Analytics & Visualization
- 📈 **Advanced Dashboard** - Network health score, relationship strength distribution charts, and top connections leaderboard
- 🧮 **Relationship Scoring** - Multi-factor algorithm combining base strength, interaction frequency, reciprocity, and recency
- 🗺️ **Network Visualization** - Interactive D3.js force-directed graph with zoom, drag, and clustering
- 🔍 **Pathfinding** - Find connection paths between any two people (up to 3 degrees of separation)
- 🎯 **Network Statistics** - Total nodes, edges, clusters, and average connections
- 📊 **Community Detection** - Identify social clusters within your network

### 🔐 User Experience
- **Multi-user Support** - Secure JWT authentication with row-level security (RLS)
- **Responsive Design** - Clean, modern UI that works on all devices
- **Advanced Filtering** - Filter by type, owner, status across all modules
- **Image Upload** - Profile pictures with automatic resizing and optimization
- **Chat Interface** - Floating chat sidebar for conversational AI assistant

## 🏗️ Tech Stack

### Backend
- **Node.js 18+** + Express - REST API server
- **PostgreSQL 15+** - Database with Row-Level Security (RLS)
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Multer + Sharp** - Image upload and processing
- **OpenAI SDK** - AI integrations
- **Axios** - HTTP client for N8N webhooks

### Frontend
- **React 18** - UI framework with hooks
- **React Router v6** - Client-side routing
- **D3.js v7** - Network visualization
- **Axios** - HTTP client with interceptors
- **Framer Motion** - Animations

### AI & Integrations
- **N8N** - Workflow automation for conversational assistant
- **LM Studio / Ollama** - Local LLM support
- **OpenAI API** - Cloud LLM option

### DevOps
- **Docker** + Docker Compose - Multi-container orchestration
- **Nginx** - Frontend web server and reverse proxy with extended timeouts
- **Jest + Supertest** - Backend testing
- **React Testing Library** - Frontend testing

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/social-capital-crm.git
cd social-capital-crm
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start all services**
```bash
docker-compose up -d
```

4. **Access the application**
- **Frontend**: http://localhost
- **Backend API**: http://localhost:5000/api/v1
- **Database**: localhost:5432

5. **Demo credentials**
- Email: `demo@socialcapital.local`
- Password: `demo123`

### Manual Setup

#### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm or yarn

#### Backend Setup

```bash
cd backend

# Install Node.js dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run migrate

# (Optional) Load demo data
npm run seed

# Start the server
npm start
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit REACT_APP_API_URL if needed

# Start development server
npm start
```

## 📁 Project Structure

```
social-capital-crm/
├── backend/
│   ├── src/
│   │   ├── api/                      # API route handlers
│   │   │   ├── auth.js
│   │   │   ├── people.js
│   │   │   ├── relationships.js
│   │   │   ├── events.js
│   │   │   ├── favors.js
│   │   │   ├── assets.js
│   │   │   ├── biographies.js
│   │   │   ├── professional-history.js
│   │   │   ├── network.js            # Graph, pathfinding, clusters
│   │   │   ├── dashboard.js
│   │   │   ├── settings.js           # AI configuration
│   │   │   ├── chats.js              # Conversational assistant
│   │   │   └── summaries.js          # AI-powered summaries
│   │   ├── services/                 # Business logic
│   │   │   ├── RelationshipScoringService.js
│   │   │   ├── PathfindingService.js
│   │   │   ├── NetworkGraphService.js
│   │   │   ├── DashboardService.js
│   │   │   ├── AuthService.js
│   │   │   ├── ImageUploadService.js
│   │   │   ├── SummaryGenerationService.js
│   │   │   ├── LLMProviderService.js
│   │   │   └── AssistantServiceN8N.js
│   │   ├── middleware/               # Express middleware
│   │   ├── models/                   # Database models
│   │   ├── db/
│   │   │   ├── migrations/           # SQL migrations (001-022)
│   │   │   └── seeders/              # Demo data
│   │   ├── app.js                    # Express app
│   │   └── server.js                 # Server entry point
│   ├── tests/                        # Backend tests
│   ├── uploads/                      # User-uploaded files
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/                    # Page components
│   │   │   ├── Dashboard.js
│   │   │   ├── NetworkGraph.js       # D3.js visualization
│   │   │   ├── People.js
│   │   │   ├── PersonDetail.js
│   │   │   ├── Relationships.js
│   │   │   ├── Events.js
│   │   │   ├── Favors.js
│   │   │   ├── Assets.js
│   │   │   ├── Settings.js           # AI configuration UI
│   │   │   └── Login.js / Register.js
│   │   ├── components/
│   │   │   ├── Layout.js
│   │   │   ├── ProtectedRoute.js
│   │   │   ├── ChatSidebar.js        # Conversational assistant
│   │   │   ├── ChatMessage.js
│   │   │   ├── ChatFloatingButton.js
│   │   │   ├── StreamingText.js
│   │   │   └── ThinkingIndicator.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── services/
│   │   │   └── api.js                # Axios instance
│   │   └── styles/                   # CSS files
│   ├── public/
│   ├── Dockerfile
│   ├── nginx.conf                    # Nginx config with extended timeouts
│   └── package.json
├── logs/
│   └── next/                         # Implementation notes and guides
├── scripts/
│   ├── init-db.sh
│   └── init-db.ps1
├── docker-compose.yml
├── .env.example
├── CLAUDE.md                         # Development guidelines for Claude Code
└── README.md
```

## 📡 API Documentation

### Authentication
- `POST /api/v1/auth/register` - Create new account
- `POST /api/v1/auth/login` - Login and get JWT token

### People
- `GET /api/v1/people` - List all contacts (with search/filter)
- `GET /api/v1/people/:id` - Get person details
- `POST /api/v1/people` - Create new person
- `PUT /api/v1/people/:id` - Update person
- `DELETE /api/v1/people/:id` - Delete person
- `POST /api/v1/people/:id/picture` - Upload profile picture

### Relationships
- `GET /api/v1/relationships` - List relationships (filter by person_id, type)
- `POST /api/v1/relationships` - Create relationship
- `GET /api/v1/relationships/score?person1_id=X&person2_id=Y` - Get computed score
- `GET /api/v1/relationships/scores` - Get all relationship scores
- `PUT /api/v1/relationships/:id` - Update relationship
- `DELETE /api/v1/relationships/:id` - Delete relationship

### Events
- `GET /api/v1/events` - List events (filter by person_id, event_type)
- `POST /api/v1/events` - Create event with participants
- `PUT /api/v1/events/:id` - Update event
- `DELETE /api/v1/events/:id` - Delete event

### Favors
- `GET /api/v1/favors` - List favors (filter by status, person_id)
- `POST /api/v1/favors` - Create favor
- `PUT /api/v1/favors/:id` - Update favor status
- `DELETE /api/v1/favors/:id` - Delete favor

### Professional History
- `GET /api/v1/professional-history` - List job history
- `POST /api/v1/professional-history` - Add job entry
- `PUT /api/v1/professional-history/:id` - Update job
- `DELETE /api/v1/professional-history/:id` - Delete job

### Assets
- `GET /api/v1/assets` - List assets (filter by type, owner)
- `POST /api/v1/assets` - Create asset
- `PUT /api/v1/assets/:id` - Update asset
- `DELETE /api/v1/assets/:id` - Delete asset

### Biographies
- `GET /api/v1/biographies` - List biography notes
- `POST /api/v1/biographies` - Create biography note
- `PUT /api/v1/biographies/:id` - Update note
- `DELETE /api/v1/biographies/:id` - Delete note

### Network Analysis
- `GET /api/v1/network/graph` - Get D3.js network graph with clusters
- `GET /api/v1/network/path?from=X&to=Y` - Find shortest path (BFS, 3-degree limit)
- `GET /api/v1/network/clusters` - Get network clusters
- `GET /api/v1/network/central-nodes` - Get most central nodes
- `GET /api/v1/network/isolated` - Get people with few connections

### Dashboard
- `GET /api/v1/dashboard/stats` - Get comprehensive statistics:
  - Total counts (people, relationships, events, favors)
  - Network health score (0-100)
  - Relationship strength distribution
  - Top connections (most connected people)
  - Recent events
  - Upcoming birthdays

### AI & Summaries
- `GET /api/v1/summaries/:personId` - Get AI-generated person summary
- `POST /api/v1/summaries/:personId/generate` - Generate new summary
- `GET /api/v1/summaries/status` - Check summary generation status
- `GET /api/v1/settings/ai` - Get user's AI configuration
- `PUT /api/v1/settings/ai` - Update AI settings (provider, model, API URL, API key)

### Conversational Assistant (N8N)
- `GET /api/v1/chats` - List chat sessions
- `GET /api/v1/chats/:chatId` - Get chat with messages
- `POST /api/v1/chats` - Create new chat session
- `POST /api/v1/chats/:chatId/messages` - Send message to assistant (streaming response)
- `DELETE /api/v1/chats/:chatId` - Delete chat session

## 🗄️ Database Schema

### Core Tables
- **users** - User accounts with AI settings (provider, model, API URL, API key, N8N webhook)
- **people** - Contacts with profile details, birthdays, contact info, address, gender, photos
- **relationships** - Connections (person_a_id, person_b_id, type, strength 1-5)
- **events** - Interaction history (meetings, calls, emails, social)
- **event_participants** - Many-to-many join table
- **favors** - Favors (giver_id, receiver_id, status, estimated_value, time_commitment)
- **professional_history** - Career timeline
- **assets** - Shared resources (owner_id, type, availability, estimated_value, address)
- **biographies** - Biography notes (person_id, title, note, note_date)

### AI-Related Tables
- **person_summaries** - AI-generated summaries (person_id, summary, generated_at)
- **chats** - Conversational assistant sessions (user_id, context, created_at)
- **messages** - Chat messages (chat_id, role, content, created_at)

### Security Features
- Row-Level Security (RLS) ensures users only access their own data
- JWT-based authentication
- Password hashing with bcryptjs (10 rounds)
- SQL injection protection via parameterized queries
- All sensitive operations require authentication

## 🧮 Algorithms

### Relationship Scoring
Multi-factor weighted algorithm (0-100 scale):
- **Base Strength** (40%) - Declared relationship strength (1-5 scale)
- **Interaction Frequency** (25%) - Number of shared events
- **Reciprocity** (20%) - Balance of favors exchanged
- **Recency** (15%) - Time since last contact

### Pathfinding
- **Algorithm**: Breadth-First Search (BFS)
- **Limit**: 3 degrees of separation
- **Path Strength**: Minimum relationship strength along path
- **Mutual Connections**: Suggests mutual friends when no direct path exists

### Network Clustering
- **Algorithm**: Depth-First Search (DFS) for connected components
- **Purpose**: Community detection and visualization
- **Output**: Clustered groups for D3.js force-directed layout

## 🤖 AI Configuration

### Setting Up Local LLM (LM Studio)

1. **Install LM Studio**
   - Download from https://lmstudio.ai/

2. **Load a Model**
   - Recommended: Llama 2 7B Chat, Mistral 7B, or similar
   - Start local server on port 1234

3. **Configure in Social Capital CRM**
   - Navigate to Settings → AI Configuration
   - Provider: "local"
   - API URL: "http://localhost:1234"
   - Model: "llama-2-7b-chat" (or your loaded model)

### Setting Up N8N Integration

1. **Run N8N** (optional, for conversational assistant)
   - Use docker-compose or standalone installation
   - Configure webhook workflow to handle Social Capital queries

2. **Configure N8N URL**
   - Settings → AI Configuration → N8N Webhook URL
   - Example: `http://n8n:5678/webhook/social-capital`

3. **Expected N8N Workflow Format**
   - **Input**: `{ userId, message, chatHistory, context }`
   - **Output**: `{ response: string, tool_calls?: array }`

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:contract      # Contract tests
npm run test:watch         # Watch mode
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🚢 Deployment

### Docker Production Build

```bash
# Build all images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Environment Variables

#### Backend (.env)
```env
# Server
NODE_ENV=production
PORT=5000

# Database
DB_HOST=db
DB_PORT=5432
DB_NAME=socialcapital
DB_USER=postgres
DB_PASSWORD=your_secure_password_here

# Authentication
JWT_SECRET=your_jwt_secret_key_minimum_32_characters

# AI (Optional - can also configure per-user in UI)
OPENAI_API_KEY=sk-your-key-here
AI_PROVIDER=local
AI_MODEL=llama-2-7b-chat
AI_API_URL=http://localhost:1234
N8N_WEBHOOK_URL=http://n8n:5678/webhook/social-capital
N8N_WEBHOOK_TOKEN=optional_auth_token
```

#### Frontend (.env)
```env
REACT_APP_API_URL=/api/v1
```

## 🔧 Development

### Adding New Features

1. **Backend**: Create route → service → model
2. **Frontend**: Create page → component → API call
3. **Database**: Add migration in `backend/src/db/migrations/`

### Code Style
- **Backend**:
  - async/await patterns (no callbacks)
  - Parameterized SQL queries only
  - Business logic in services, not routes
  - JWT middleware on protected routes

- **Frontend**:
  - Functional components with hooks
  - Controlled forms with local state
  - All API calls through services/api.js

- **Database**:
  - Row-Level Security (RLS) policies on all tables
  - Bidirectional relationships use person_a_id/person_b_id

### Docker Development Workflow

```bash
# After backend code changes
docker-compose build backend
docker-compose up -d backend

# After frontend code changes
cd frontend && npm run build
docker cp frontend/build/. socialcapital-frontend:/usr/share/nginx/html/
docker-compose restart frontend

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
docker-compose ps                     # Check service status
docker-compose logs db                # View database logs
docker-compose restart db             # Restart database
```

### Backend Issues
```bash
docker-compose logs backend           # View logs
curl http://localhost:5000/health     # Test health endpoint
docker-compose restart backend        # Restart service
```

### Frontend Issues
```bash
docker-compose logs frontend          # View nginx logs
docker-compose restart frontend       # Restart service
```

### AI Features Not Working
- Verify LM Studio is running and accessible
- Check AI settings in Settings UI
- Test LLM connection in settings
- Review backend logs for API errors

## 📚 Additional Documentation

- **Development Guidelines**: See `CLAUDE.md` for coding patterns and best practices
- **API Examples**: See `backend/tests/` for request/response examples

## 🗺️ Roadmap

### Planned Features
- [ ] Mobile app (React Native)
- [ ] Email integration (automatic event logging)
- [ ] Calendar sync
- [ ] Reminder system for keeping in touch
- [ ] Export/import functionality
- [ ] Advanced analytics and insights
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Batch operations
- [ ] Advanced search with filters

### AI Enhancements
- [ ] Voice interface for conversational assistant
- [ ] Multi-model support for different features
- [ ] Enhanced summary generation with more context

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Write tests for new features
- Update documentation
- Keep commits atomic and well-described

## 📞 Support

- **Issues**: Open an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check CLAUDE.md for complete development guide

## 🙏 Acknowledgments

- **D3.js** - Network visualization
- **OpenAI** - LLM API
- **LM Studio** - Local LLM deployment
- **N8N** - Workflow automation
- **React & Node.js communities** - Excellent frameworks and tools

---

**Built with ❤️ for managing meaningful relationships through technology and AI**
