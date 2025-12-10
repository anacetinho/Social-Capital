# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Social Capital CRM - A personal relationship management system for tracking and nurturing professional and personal networks. Features contact management, relationship mapping with multi-factor strength scoring, event logging, favor tracking, AI-powered summaries, conversational data entry, interactive network visualization with D3.js, geospatial mapping with Leaflet, and pathfinding algorithms to discover connection paths between people.

## Tech Stack

- **Backend**: Node.js 18 + Express + PostgreSQL 15 with Row-Level Security (RLS)
- **Frontend**: React 18 + D3.js for network visualization + Leaflet for maps + Axios
- **DevOps**: Docker Compose with multi-container setup (db, backend, frontend)
- **AI Integration**: Local LLM for conversational assistant with function calling, OpenAI for summaries
- **Geocoding**: node-geocoder for address-to-coordinates conversion
- **Testing**: Jest + Supertest

## Platform Notes

This codebase is cross-platform compatible but has some platform-specific considerations:

**Windows:**
- Use `\` for file paths in commands (e.g., `backend\src\db\migrations\`)
- Use `type` instead of `cat` for piping files (e.g., `type file.sql | docker-compose exec -T db psql ...`)
- Timeout syntax: `timeout 10` (without the 's' suffix)
- Docker containers run on WSL2 backend with `platform: linux/amd64` specified in docker-compose.yml

**Unix/Mac:**
- Use `/` for file paths
- Use `<` for input redirection (e.g., `docker-compose exec -T db psql ... < file.sql`)
- Timeout syntax: `timeout 10s` (with the 's' suffix)

All code examples in this document show both Windows and Unix/Mac versions where they differ.

## Development Commands

### Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# Rebuild after code changes (CRITICAL for backend changes!)
docker-compose build <service>
docker-compose up -d <service>

# Note: Backend code changes require rebuild + up, NOT just restart!
# Restart alone doesn't reload code changes

# View logs (use -f to follow)
docker-compose logs -f <service>
docker-compose logs -f backend

# Windows: Use timeout command for timed log viewing
timeout 10 docker-compose logs --tail=20 -f backend

# Unix/Mac: Use timeout command for timed log viewing
timeout 10s docker-compose logs --tail=20 -f backend

# Stop services
docker-compose down

# Database access
docker-compose exec db psql -U postgres -d socialcapital

# Run a specific migration file
# Windows:
type backend\src\db\migrations\XXX_migration_file.sql | docker-compose exec -T db psql -U postgres -d socialcapital

# Unix/Mac:
docker-compose exec -T db psql -U postgres -d socialcapital < backend/src/db/migrations/XXX_migration_file.sql
```

### Frontend Development

```bash
cd frontend

# Local development (without Docker)
npm install
npm start

# Build production bundle
npm run build

# Testing
npm test

# Deploy updated frontend to Docker container
docker cp frontend/build/. socialcapital-frontend:/usr/share/nginx/html/
docker-compose restart frontend
```

### Backend Development

```bash
cd backend

# Local development
npm install
npm run dev          # Start with nodemon (auto-reload)
npm start            # Production start

# Database operations
npm run migrate      # Run migrations
npm run seed         # Load demo data (creates user + data)
npm run demo-data    # Load demo data only (no user creation)
npm run setup-db     # Initial database setup

# Geocoding
npm run geocode-addresses  # Geocode all addresses (people + assets)

# Testing
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:watch         # Watch mode
npm run test:contract      # Contract tests
```

## Architecture

### Backend Structure

```
backend/src/
├── api/                     # REST endpoint handlers
│   ├── auth.js             # Login, register
│   ├── people.js           # Contact CRUD + picture upload
│   ├── relationships.js    # Relationship CRUD + scoring
│   ├── events.js           # Event CRUD with participants
│   ├── favors.js           # Favor tracking (giver/receiver)
│   ├── professional-history.js
│   ├── assets.js           # Shared resources
│   ├── biographies.js      # Biography notes
│   ├── dashboard.js        # Dashboard stats + network health
│   ├── network.js          # Network graph, pathfinding, clusters
│   ├── map.js              # Geospatial map endpoints
│   ├── settings.js         # User AI settings
│   ├── preferences.js      # User preferences (summary display settings)
│   ├── chats.js            # Chat sessions and messages
│   └── summaries.js        # AI-generated person summaries
├── models/                  # Database models
├── services/                # Business logic
│   ├── RelationshipScoringService.js  # Multi-factor scoring algorithm
│   ├── PathfindingService.js          # BFS pathfinding (3-degree limit)
│   ├── NetworkGraphService.js         # D3.js graph data + clustering
│   ├── DashboardService.js            # Network health metrics
│   ├── AuthService.js                 # JWT + bcrypt
│   ├── ImageUploadService.js          # Multer + Sharp
│   ├── SummaryGenerationService.js    # AI-powered person summaries
│   ├── LLMProviderService.js          # LLM provider abstraction (OpenAI, local)
│   ├── ChatAssistantService.js        # Local LLM chat with function calling
│   ├── DatabaseQueryService.js        # Read-only database access via Summary A
│   ├── GeocodingService.js            # Address geocoding for maps
│   └── AssetSearchSynonyms.js         # Asset type synonym expansion
├── middleware/              # Express middleware
│   ├── auth.js             # JWT verification
│   ├── validate.js         # express-validator
│   └── errorHandler.js     # Centralized error handling
├── db/
│   ├── connection.js        # PostgreSQL pool
│   ├── migrate.js           # Migration runner
│   ├── migrations/          # SQL migrations (numbered 001-026)
│   └── seeders/             # Demo data scripts
│       └── demo-data.js     # Load demo data without creating user
├── scripts/
│   └── geocode-addresses.js # Batch geocoding script
└── tests/                   # Test suites
    ├── unit/               # Unit tests
    ├── integration/        # Integration tests
    └── contract/           # Contract tests
```

### Frontend Structure

```
frontend/src/
├── pages/                   # Page components (one per route)
│   ├── Dashboard.js        # Network health, top connections, stats
│   ├── NetworkGraph.js     # D3.js force-directed graph
│   ├── Map.js              # Leaflet geospatial map
│   ├── People.js           # Contact list
│   ├── PersonDetail.js     # Contact profile
│   ├── PersonForm.js       # Add/edit contact
│   ├── Relationships.js    # Relationship list
│   ├── Events.js           # Event history
│   ├── Interactions.js     # Interaction timeline view
│   ├── Favors.js           # Favor tracking
│   ├── Assets.js           # Asset management
│   └── Login.js / Register.js
├── components/
│   ├── Layout.js           # Navigation + auth wrapper
│   ├── ProtectedRoute.js   # Auth guard
│   ├── ChatSidebar.js      # Conversational AI chat interface
│   ├── ChatMessage.js      # Individual chat message display
│   ├── ChatFloatingButton.js # Floating chat toggle button
│   ├── StreamingText.js    # Word-by-word streaming animation
│   └── ThinkingIndicator.js # "Assistant is thinking" UI
├── context/
│   └── AuthContext.js      # JWT token management
└── services/
    └── api.js              # Axios instance with interceptors
```

## Critical Architectural Patterns

### Bidirectional Relationship Storage

Relationships are stored in the database using `person_a_id` and `person_b_id` columns (NOT `person1_id`/`person2_id`). The API layer uses `person1_id`/`person2_id` for clarity but must map to database schema:

```javascript
// API accepts: { person1_id, person2_id, type, strength }
// Database stores: { person_a_id, person_b_id, type, strength }
```

When querying relationships, always use bidirectional checks:
```sql
WHERE (person_a_id = $1 AND person_b_id = $2) OR (person_a_id = $2 AND person_b_id = $1)
```

### Row-Level Security (RLS)

All tables have RLS policies enforced. Every query MUST include `user_id` filter. Database ensures users can only access their own data. Never skip user_id in WHERE clauses.

### Event Participants Pattern

Events use many-to-many relationship via `event_participants` join table. When creating/updating events:
1. Insert event record
2. Delete existing participants (if updating)
3. Insert new participant records in bulk
4. Automatically triggers `last_contact` update via database trigger

### Service Layer Pattern

Business logic lives in services, NOT in route handlers. Route handlers should:
1. Validate input (express-validator)
2. Call service methods
3. Format response
4. Handle errors via errorHandler middleware

## Key Algorithms & Business Logic

### Relationship Scoring (RelationshipScoringService.js:16)

Multi-factor weighted algorithm returning 0-100 score:
- **Base Strength** (40%) - Declared relationship strength (1-5 scale)
- **Interaction Frequency** (25%) - Number of shared events
- **Reciprocity** (20%) - Balance of favors exchanged
- **Recency** (15%) - Time since last contact

### Pathfinding (PathfindingService.js:12)

BFS algorithm to find shortest path between people:
- 3-degree separation limit (constraint enforced at PathfindingService.js:70)
- Returns path with intermediaries
- Calculates path strength (minimum relationship strength along path)
- Suggests mutual connections when no direct path exists

### Network Clustering (NetworkGraphService.js)

DFS-based connected components for community detection and visualization.

### Geocoding (GeocodingService.js)

Address-to-coordinates conversion for map visualization:
- Uses node-geocoder with multiple provider support (OpenStreetMap, Google, etc.)
- Batch geocoding via `npm run geocode-addresses` script
- Stores latitude/longitude with geocoded_at timestamp
- Error tracking via geocode_error column
- Automatic retry logic for failed addresses

### AI Services

**Summary Generation (SummaryGenerationService.js)**
- Two-stage summary system:
  - **Summary A**: LLM-formatted plain-text fact listing with relationship context
  - **Summary B**: AI analysis and conclusions based on Summary A
- Summary A aggregates ALL data for main person, 10 most recent for N1 connections
- Includes relationship context (e.g., "Catarina, his sister") from relationships.context field
- Summary B requires Summary A to exist first

**LLM Provider (LLMProviderService.js)**
- Abstraction layer for different LLM providers (OpenAI, local servers)
- Per-user configuration (ai_provider, ai_model, ai_api_url, api_key)
- Supports custom API endpoints for self-hosted models
- Unified configuration (migration 022) - same settings used for both summaries and chat

**Conversational Assistant (ChatAssistantService.js)**
- Integrated local LLM with function/tool calling capabilities
- Uses Summary A as single source of truth for all network data
- Streams responses word-by-word via SSE for real-time UX
- Function calling tools:
  - `search_network`: Search Summary A for people matching criteria
  - `get_person_summary`: Retrieve detailed Summary A for specific person
  - `find_connection_path`: Show connection paths between people (uses PathfindingService)
  - `get_network_context`: Get comprehensive N1/N2 network data
- **Person-aware features**:
  - "Asking as" mode: Query network from specific person's perspective with connection paths
  - "Talking to" mode: Roleplay as any person using their Summary A
- Per-user LLM configuration (unified with Summary Generation settings)

## Database Schema

All tables use Row-Level Security (RLS) enforced at migrations/008_enable_row_level_security.sql.

**Core tables:**
- `users` - User accounts with JWT authentication
  - Migration 013: ai_provider, ai_model, ai_api_url, api_key for AI features
  - Migration 022: Unified LLM config (old local_llm_* columns synced with ai_* columns)
  - Migration 025: key_person_id for default "asking as" persona
- `people` - Contacts with photo_url, birthday, contact info, address, gender (migration 015, 018)
  - Migration 023: summary_a (LLM-formatted fact listing), summary_b (AI analysis)
  - Migration 026: latitude, longitude, geocoded_at, geocode_error for mapping
- `relationships` - Connections (person_a_id, person_b_id, type, strength 1-5)
  - Types: family, friend, colleague, acquaintance, extended_family, other
- `events` - Interaction history (meetings, calls, emails, social)
- `event_participants` - Many-to-many join table
- `favors` - Favors given/received (giver_id, receiver_id, status, estimated_value, time_commitment)
  - Migration 012: added estimated_value and time_commitment fields
  - Migration 021 (favor_type): added favor_type field
- `professional_history` - Career timeline
- `assets` - Shared resources (owner_id, type, availability, estimated_value, address)
  - Availability: always, by_request, never, other
  - Migration 010: added estimated_value
  - Migration 018: added address
  - Migration 026: latitude, longitude, geocoded_at, geocode_error for mapping
- `biographies` - Biography notes for people (person_id, title, note, note_date) - migration 011
- `user_preferences` - UI preferences (show_summary_a, show_summary_b) - migration 023
- `chats` - Conversational AI chat sessions with context (migration 014, 019)
  - Migration 024: asking_as_person_id, talking_to_person_id for persona features
- `messages` - Chat messages (user and assistant) - migration 014

**Database migrations (numbered 001-026):**
Note: There are two migration files numbered 021 (021_add_concordia_ai_columns.sql and 021_add_favor_type.sql) - this is expected and both should be applied.
- 001-007: Core tables (users, people, professional_history, relationships, events, favors, assets)
- 008: Enable Row-Level Security (RLS) policies
- 009: Trigger for auto-updating `last_contact` on people
- 010: Add estimated_value to assets
- 011: Create biographies table
- 012: Add estimated_value and time_commitment to favors
- 013: Add AI settings to users (ai_provider, ai_model, ai_api_url, api_key)
- 014: Create chats and messages tables
- 015: Add address to people
- 016: Create person_summaries table (deprecated in migration 023)
- 018: Add gender to people, address to assets
- 019: Add context column to chats
- 020: Add n8n_webhook_url to users (deprecated)
- 021 (concordia): Add Concordia AI columns (deprecated - merged into unified config)
- 021 (favor_type): Add favor_type to favors
- 022: Migrate LLM config to unified columns (sync local_llm_* with ai_*)
- 023: Rework summaries - Add summary_a/summary_b to people, create user_preferences table
- 024: Add persona fields to chats (asking_as_person_id, talking_to_person_id)
- 025: Add key_person_id to users for default "asking as" persona
- 026: Add geocoding columns (latitude, longitude, geocoded_at, geocode_error) to people and assets

**Database trigger:** migrations/009_create_last_contact_trigger.sql auto-updates `last_contact` field on people when events are created/updated.

## Code Style & Patterns

### Backend
- async/await patterns throughout (no callbacks)
- Parameterized queries for SQL injection protection
- JWT middleware on all protected routes (middleware/auth.js)
- Centralized error handling (middleware/errorHandler.js)
- Business logic in services, not in route handlers

### Frontend
- Functional components with hooks (no class components)
- Controlled forms with local state
- **Dropdown selects** for constrained values (relationship type, asset availability)
- **Checkbox lists** for multi-select (event participants)
- AuthContext provides token + user state globally
- All API calls through services/api.js with JWT interceptors

### Database
- Always use RLS policies for multi-tenant security
- Parameterized queries only (never string concatenation)
- person_a_id and person_b_id pattern for bidirectional relationships
- Use FILTER in aggregate queries for conditional counting

## Important Implementation Notes

1. **Relationship Creation**: Use person1_id/person2_id in API but map to person_a_id/person_b_id in database (api/relationships.js). The database schema uses person_a_id/person_b_id, NOT person1_id/person2_id.

2. **Event Participants**: Use checkbox-based multi-select UI, not dropdown multi-select (frontend/src/pages/EventForm.js)

3. **Asset Estimated Value**: Column added in migration 010, ensure estimated_value is handled in all asset operations

4. **Favor Value & Time**: Migration 012 added estimated_value and time_commitment fields to favors table

5. **Biography System**: PersonDetail page includes a Biography tab for managing notes about people

6. **Profile Pictures**: Uploaded to backend/uploads/, served at /uploads/:filename, processed with Sharp for resizing

7. **Docker Nginx Proxy**: Frontend uses REACT_APP_API_URL=/api/v1 (proxied through nginx.conf). For local dev without Docker, use http://localhost:5000/api/v1

8. **Currency**: All monetary values (favors, assets, net worth) are displayed in EUR (€)

9. **Health Checks**:
   - Backend: GET /health and GET /api/v1/health
   - Frontend: nginx health endpoint
   - Database: pg_isready

10. **AI Features**:
    - **Person Summaries**: AI-generated summaries aggregating relationship, event, favor, and professional data (SummaryGenerationService.js)
    - **Conversational Assistant**: Local LLM-based chat with function calling and database query capabilities (ChatAssistantService.js)
    - **Person-Aware Chat**: "Asking as" mode (find connections from specific person's perspective) and "Talking to" mode (roleplay as any person using their Summary A)
    - **Per-User Configuration**: AI settings (provider, model, API URL, API key) stored in users table
    - **Unified LLM Config**: Migration 022 unified local_llm_* and ai_* columns - same settings apply to both summaries and chat
    - **Streaming Responses**: Assistant responses stream word-by-word to frontend via SSE
    - **Full Markdown Support**: Rich text formatting with code highlighting via react-markdown

11. **Chat System Features**:
    - **Function Calling**: LLM can call database query tools (search_network, find_connection_path, get_person_summary, get_network_context)
    - **Summary A Integration**: All network queries use Summary A as single source of truth
    - **Connection Visualization**: Visual display of relationship paths with strength indicators
    - **Chat Management**: Search, rename, and delete chats
    - **Tool Call Display**: Shows database queries performed by AI with expandable results
    - **Chat History**: Last 10 messages sent as context to LLM

12. **Geospatial Features** (Migration 026):
    - **Geocoding**: Addresses automatically geocoded to latitude/longitude
    - **Batch Processing**: Use `npm run geocode-addresses` to geocode all addresses
    - **Error Tracking**: geocode_error column stores failure messages
    - **Map Display**: Leaflet-based map (frontend/src/pages/Map.js) shows people and assets
    - **API Endpoints**: GET /api/v1/map/locations returns geocoded people/assets with stats

## Environment Configuration

Required .env variables (see .env.example):
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `JWT_SECRET` (must change in production)
- `NODE_ENV` (development/production)
- `REACT_APP_API_URL` (frontend API endpoint)

Optional AI-related variables (can also be set per-user in UI):
- `OPENAI_API_KEY` - For OpenAI integration
- `AI_PROVIDER` - LLM provider (openai, local, etc.)
- `AI_MODEL` - Model name to use
- `AI_API_URL` - Custom API endpoint for self-hosted models

## Demo Credentials

When demo data is loaded (npm run seed):
- Email: demo@socialcapital.local
- Password: demo123

## Common Development Workflows

### Adding a New Database Column

1. Create migration file in `backend/src/db/migrations/` with next number (e.g., `027_add_column.sql`)
2. Write SQL with `IF NOT EXISTS` checks for idempotency
3. Apply migration:
   - **Windows**: `type backend\src\db\migrations\027_add_column.sql | docker-compose exec -T db psql -U postgres -d socialcapital`
   - **Unix/Mac**: `docker-compose exec -T db psql -U postgres -d socialcapital < backend/src/db/migrations/027_add_column.sql`
4. Update model in `backend/src/models/`
5. Update API route handlers and services
6. Update frontend forms and display logic
7. Test with demo data: `npm run demo-data` (backend)

### Adding a New API Endpoint

1. Create route handler in appropriate `backend/src/api/*.js` file
2. Add business logic to service in `backend/src/services/` (or create new service)
3. Add validation middleware using express-validator
4. Protect route with `authenticate` middleware if needed
5. Mount route in `backend/src/app.js`
6. Add API call to `frontend/src/services/api.js`
7. Create/update React component to use the endpoint
8. Write tests in `backend/tests/`

### Updating Frontend After Backend Code Changes

**CRITICAL**: Backend code changes in Docker require rebuild, NOT just restart!

```bash
# Wrong (won't reload code):
docker-compose restart backend

# Correct:
docker-compose build backend
docker-compose up -d backend
```

Frontend changes:
```bash
cd frontend && npm run build
docker cp frontend/build/. socialcapital-frontend:/usr/share/nginx/html/
docker-compose restart frontend
```

### Working with Local LLM Chat Assistant

**Setup:**
1. Install and run local LLM server (LM Studio, Ollama, etc.) with OpenAI-compatible API
2. In Settings UI, configure:
   - AI Provider: "local" or "openai"
   - AI API URL (e.g., `http://localhost:1234` for local)
   - Model name (e.g., `llama-3-8b`)
   - Enable AI Assistant toggle
3. Optionally set key_person_id for default "asking as" persona
4. Test connection via Settings > Test Connection button

**Chat Features:**
- **Generic Mode**: Standard AI assistant answering questions about your network
- **"Asking As" Mode**: Select a person from dropdown - AI finds connections from their perspective
  - Example: "Who has a car?" shows connection paths from selected person to people with cars
- **"Talking To" Mode**: Select a person to roleplay - AI simulates that person using their Summary A
  - Requires person to have Summary A generated first
- **Tool Calling**: LLM automatically calls database query functions when needed
- **Markdown**: Full markdown support including code blocks, lists, links, tables

**Troubleshooting:**
- Check LLM server is running and accessible
- Verify model supports function calling (recommended: llama-3, mistral, qwen)
- Check backend logs: `docker-compose logs -f backend`
- Ensure Summary A is generated for people used in "Talking To" mode

### Working with Map Feature

**Geocoding Addresses:**
```bash
cd backend
npm run geocode-addresses  # Geocodes all people and assets with addresses
```

**Map Display:**
- Navigate to Map page in UI
- View people (blue markers) and assets (green markers)
- Click markers to see details
- Filter by type (people/assets/all)
- Search by name or address

**Geocoding Process:**
1. Addresses from people.address and assets.address are geocoded
2. Coordinates stored in latitude/longitude columns
3. Timestamp stored in geocoded_at
4. Errors stored in geocode_error for troubleshooting
5. Indexes on lat/lon for fast geospatial queries

## Troubleshooting

**Database connection issues:**
```bash
docker-compose ps                    # Check service status
docker-compose logs db               # View database logs
docker-compose restart db            # Restart database
```

**Backend issues:**
```bash
docker-compose logs backend          # View backend logs
curl http://localhost:5000/health    # Test health endpoint
docker-compose restart backend       # Restart backend
```

**Frontend rebuild needed:**
```bash
cd frontend && npm run build
docker cp frontend/build/. socialcapital-frontend:/usr/share/nginx/html/
docker-compose restart frontend
```

**Geocoding issues:**
- Check backend logs for geocoding errors
- Verify addresses are well-formatted (street, city, country)
- Try different geocoding providers in GeocodingService.js
- Check geocode_error column in database for specific failures

## Custom Slash Commands

This project includes custom slash commands in `.claude/commands/` for structured development workflows:

- `/specify` - Create or update feature specifications from natural language descriptions
- `/plan` - Execute implementation planning workflow to generate design artifacts
- `/tasks` - Generate actionable, dependency-ordered tasks for features
- `/clarify` - Identify underspecified areas in specs and ask targeted clarification questions
- `/implement` - Execute the implementation plan by processing all defined tasks
- `/analyze` - Perform cross-artifact consistency analysis across spec, plan, and tasks
- `/constitution` - Create or update project constitution from principle inputs

These commands use templates from `.specify/templates/` to maintain consistency across the development lifecycle.
