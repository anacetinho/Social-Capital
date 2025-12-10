# AI-Generated Person Summary Feature

**Created:** 2025-10-21
**Last Updated:** 2025-10-26
**Status:** ✅ Enhanced with First-Degree Connection Data

---

## Overview

This feature generates concise, fact-based AI summaries for each person in the Social Capital CRM. Summaries (500-1000 words) aggregate data from the person's own records AND their first-degree connections (N1), including biographical info, professional history, relationships, events, favors, and assets. The system uses network metrics (professional overlap, interaction frequency, bridging analysis) to create data-driven analytical profiles.

## Use Cases

- **Concise Person Profiles:** Quick, fact-based overview of who someone is and their network position
- **Network Insights:** Understand who bridges different clusters and professional overlap
- **Data-Driven Analysis:** Evidence-based behavioral patterns from actual interactions
- **Resource Mapping:** What assets and capabilities are accessible through direct connections
- **Strategic Networking:** Identify best paths to specific people or resources

---

## Database Changes

### Migration: `016_add_person_summaries.sql`

**Location:** `backend/src/db/migrations/016_add_person_summaries.sql`

```sql
ALTER TABLE people
ADD COLUMN summary TEXT,
ADD COLUMN summary_generated_at TIMESTAMP WITHOUT TIME ZONE;

CREATE INDEX idx_people_summary_generated_at ON people(summary_generated_at);

COMMENT ON COLUMN people.summary IS 'AI-generated comprehensive summary aggregating all person data';
COMMENT ON COLUMN people.summary_generated_at IS 'Timestamp when summary was last generated or updated';
```

**Purpose:**
- `summary`: Stores the LLM-generated text summary (1500-2500 words)
- `summary_generated_at`: Tracks when the summary was last updated
- Index on timestamp for efficient queries to find stale summaries

---

## Backend Implementation

### 1. SummaryGenerationService

**Location:** `backend/src/services/SummaryGenerationService.js`

**Key Methods:**

#### `generatePersonSummary(userId, personId)`
Main entry point for generating a single person's summary.
- Gathers all person data
- Calls LLM to generate summary
- Saves to database
- Returns success/error status

#### `gatherPersonData(userId, personId)`
Aggregates data from 7+ database tables PLUS first-degree connection data:
- **Basic info:** people table (name, email, phone, birthday, notes, etc.)
- **Professional history:** professional_history table (companies, positions, dates)
- **Biography notes:** biographies table (life events, milestones)
- **Relationships:** relationships table with relationship_type and context
- **Assets owned:** assets table (resources, estimated values)
- **Favors:** favors table (given/received, reciprocity analysis)
- **Events:** events table with co-attendees (social activity patterns)
- **First-degree connections (N1):** Complete data for each direct connection via `gatherFirstDegreeConnectionData()`
- **Network metrics:** Professional overlap, interaction frequency, bridging analysis via `calculateNetworkMetrics()`

**Important:** Uses correct column names:
- `relationships.relationship_type` (not `type`)
- `relationships.context` (not `notes`)
- Professional history has NO `user_id` column (RLS handles security)

#### `gatherFirstDegreeConnectionData(userId, personId, relationships)`
**New method** - For each first-degree connection, gathers:
- Basic person info (name, email, phone, birthday, address, linkedin_url, importance)
- Professional history (current/past positions and companies)
- Biographical entries (up to 5 most recent)
- Assets they own (up to 5, ordered by value)
- Their N2 relationships (up to 10, people THEY are connected to)
- Their existing AI summary (if available)
- Shared events count (events both focal person and N1 attended)
- Favors exchanged count (given and received between focal person and N1)

**Performance:** Executes ~9 queries per N1 connection. Person with 10 connections = ~90 additional queries.

#### `calculateNetworkMetrics(personData, firstDegreeConnections)`
**New method** - Analyzes first-degree connection data to compute:

**Professional Overlap:**
- Identifies N1 connections who worked at the same companies
- Tracks positions and time periods
- Useful for understanding professional intersections

**Interaction Frequency:**
- Counts total interactions (events + favors) per N1 connection
- Ranks connections by engagement level
- Highlights most active relationships

**Bridging Analysis:**
- Identifies N1 connections who have unique N2 connections
- Calculates bridging potential percentage
- Shows which connections open doors to new networks

#### `generateSummaryWithLLM(userId, personData)`
Handles LLM communication:
1. Fetches user's LLM settings from database
2. Creates LLMProviderService instance with 5-minute timeout
3. Builds concise, fact-based prompt (500-1000 words target)
4. Calls `createChatCompletion()` method
5. Extracts text from `response.choices[0].message.content`

**Configuration:**
- `maxTokens: 1500` - Reduced from 3000 for shorter summaries
- `temperature: 0.5` - Reduced from 0.7 for more factual, less creative output
- System prompt emphasizes data-driven analysis over speculation

#### `buildSummaryPrompt(personData)`
Generates concise, data-rich prompt organized into 6 sections:

**Section 1: Core Profile**
- Name, age (calculated from birthday), importance rating
- Current professional position
- User notes

**Section 2: Network Position**
- Total direct connections count
- Relationship breakdown by type with average strength
- Network bridging analysis (top 3 connections with unique N2 access)
- Most frequent interactions (top 5 by events + favors)

**Section 3: Professional Context**
- Career timeline (up to 3 most recent positions)
- Professional overlap with N1 connections (worked at same companies)

**Section 4: Interaction Patterns**
- Event participation (count, types breakdown)
- Most common co-attendees
- Favor reciprocity (given vs received, value, balance ratio)

**Section 5: Assets & Resources**
- Personal assets owned (count, total value)
- Network resources accessible via N1 connections

**Section 6: First-Degree Connection Details**
- Detailed profiles of N1 connections (top 3 with AI summaries)
- Each N1 includes: professional role, shared events, favors exchanged, their N2 connections, summary excerpt
- List of other connections without summaries

**LLM Instructions:**
The prompt asks the LLM to generate a **500-1000 word** summary with:
1. **Core Profile** (100-150 words): Who they are, current role, defining characteristics
2. **Network Position** (150-200 words): Connection breakdown, bridges, most active relationships
3. **Professional Context** (150-200 words): Career trajectory, professional overlap
4. **Interaction Patterns** (150-200 words): Events, favors, engagement frequency
5. **Assets & Resources** (100-150 words): What they offer, what network offers
6. **Key Insights** (100-150 words): Evidence-based patterns, predictive observations

**Guidelines emphasized:**
- Be concise and data-driven
- Use specific numbers, dates, and facts
- Avoid speculation - base insights on verifiable patterns
- Reference actual N1 connections
- Highlight professional overlap and bridging connections

#### `getSummaryStatus(userId)`
Returns statistics:
- Total people count
- Number with summaries generated
- Last generation timestamp

#### `getPeopleNeedingSummaries(userId)`
Returns list of all people ordered by ID for sequential processing.

---

### 2. API Routes

**Location:** `backend/src/api/summaries.js`

#### `GET /api/v1/summaries/status`
Returns summary generation status for the user.

**Response:**
```json
{
  "success": true,
  "status": {
    "total_people": 50,
    "summaries_generated": 12,
    "last_generated": "2025-10-21T15:34:37.000Z"
  }
}
```

#### `POST /api/v1/summaries/:personId`
Generates/regenerates summary for a single person.

**Request:** No body required
**Response:**
```json
{
  "success": true,
  "person_id": "uuid",
  "person_name": "John Doe",
  "summary": "Long generated text...",
  "generated_at": "2025-10-21T15:34:37.000Z"
}
```

#### `GET /api/v1/summaries/generate-all`
**IMPORTANT:** This is a GET request (not POST) because EventSource only supports GET.

Generates summaries for all people with Server-Sent Events (SSE) progress updates.

**Authentication:** Accepts token via query parameter (`?token=...`) for EventSource compatibility.

**SSE Event Types:**
1. `start` - Initial message with total count
2. `progress` - Per-person progress update
3. `person_complete` - Individual completion (success/error)
4. `complete` - All summaries generated
5. `error` - Fatal error occurred

**Example SSE Stream:**
```
data: {"type":"start","total":50,"message":"Starting summary generation for 50 people..."}

data: {"type":"progress","current":1,"total":50,"personId":"uuid","personName":"John Doe","message":"Generating summary for John Doe..."}

data: {"type":"person_complete","current":1,"total":50,"personId":"uuid","personName":"John Doe","success":true,"error":null}

data: {"type":"complete","total":50,"message":"Successfully generated summaries for 50 people"}
```

**Sequential Processing:**
- Processes people one at a time (ordered by ID)
- 500ms delay between people to prevent overwhelming the LLM
- Continues even if individual summaries fail

---

### 3. LLM Provider Updates

**Location:** `backend/src/services/LLMProviderService.js`

**Timeout Configuration:**
```javascript
this.client = new OpenAI({
  baseURL: this.baseURL + '/v1',
  apiKey: apiKey,
  timeout: 300000  // 5 minutes timeout for LLM responses
});
```

**Why 5 minutes?**
- Local LLMs can be slow for long-form generation
- Generating 1500-2500 word summaries takes time
- Prevents premature timeouts

---

### 4. Authentication Middleware Update

**Location:** `backend/src/middleware/auth.js`

**SSE Support:**
Added fallback to accept tokens from query parameters for EventSource compatibility:

```javascript
let token;

// Get token from Authorization header (primary method)
const authHeader = req.headers.authorization;
if (authHeader && authHeader.startsWith('Bearer ')) {
  token = authHeader.substring(7);
}

// Fallback: Get token from query parameter (for SSE/EventSource)
if (!token && req.query.token) {
  token = req.query.token;
}
```

**Why?** EventSource API doesn't support custom headers, so we must pass the token as a query parameter.

---

## Frontend Implementation

### 1. Person Detail Page - Summary Tab

**Location:** `frontend/src/pages/PersonDetail.js`

**New Tab Added:**
- Tab button: "Summary" (after "Favors" tab)
- Displays generated summary with proper formatting
- "Regenerate Summary" button to refresh
- Empty state with link to Settings

**Features:**
- Preserves whitespace and line breaks (`whiteSpace: 'pre-wrap'`)
- Shows generation timestamp
- Loading states during regeneration
- Error handling with user-friendly messages

**Code Structure:**
```javascript
{activeTab === 'summary' && (
  <div className="card">
    <div className="card-header">
      <h2>AI-Generated Summary</h2>
      <button onClick={async () => {
        await api.post(`/summaries/${id}`);
        await fetchPersonData();
      }}>
        Regenerate Summary
      </button>
    </div>
    <div className="card-content">
      {person.summary ? (
        <div style={{ whiteSpace: 'pre-wrap' }}>
          {person.summary}
        </div>
      ) : (
        <p>No summary generated yet.
           Go to <Link to="/settings">Settings</Link> to generate summaries.
        </p>
      )}
    </div>
  </div>
)}
```

---

### 2. Settings Page - Summary Generation Section

**Location:** `frontend/src/pages/Settings.js`

**New State Variables:**
```javascript
const [generating, setGenerating] = useState(false);
const [summaryStatus, setSummaryStatus] = useState({
  total_people: 0,
  summaries_generated: 0
});
const [progress, setProgress] = useState({
  current: 0,
  total: 0,
  personName: ''
});
```

**New Functions:**

#### `fetchSummaryStatus()`
Called on page load to get current summary statistics.

#### `handleGenerateSummaries()`
Main function for batch summary generation:
1. Shows confirmation dialog
2. Opens EventSource connection to `/summaries/generate-all`
3. Handles SSE events:
   - `start`: Initialize progress
   - `progress`: Update current person being processed
   - `person_complete`: Log any errors
   - `complete`: Show success message, refresh status
   - `error`: Show error message, close connection
4. Updates UI in real-time

**EventSource Implementation:**
```javascript
const token = localStorage.getItem('token');
const baseURL = process.env.REACT_APP_API_URL || '/api/v1';

const eventSource = new EventSource(
  `${baseURL}/summaries/generate-all?token=${encodeURIComponent(token)}`
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle different event types...
};

eventSource.onerror = (error) => {
  console.error('EventSource error:', error);
  setError('Connection error during summary generation');
  eventSource.close();
  setGenerating(false);
};
```

**UI Section:**
```jsx
<div className="form-section">
  <h2>Person Summaries</h2>
  <p className="help-text">
    Generate comprehensive AI summaries for each person in your network...
  </p>

  <div className="summary-status">
    <strong>{summaryStatus.summaries_generated} / {summaryStatus.total_people}</strong>
    <span>summaries generated</span>
  </div>

  <button
    onClick={handleGenerateSummaries}
    disabled={!settings.ai_assistant_enabled || generating}
  >
    {generating
      ? `Generating... (${progress.current}/${progress.total})`
      : 'Generate / Update Summaries'}
  </button>

  {generating && progress.personName && (
    <div>Currently processing: {progress.personName}</div>
  )}
</div>
```

---

## Key Technical Decisions

### 1. Column Name Mappings

**Problem:** Database column names don't always match what the code expects.

**Solutions Applied:**
- `relationships.relationship_type AS type` (not just `type`)
- `relationships.context AS relationship_notes` (not `notes`)
- `professional_history` has NO `user_id` column (removed from queries)

### 2. EventSource vs Fetch for Progress Updates

**Decision:** Use Server-Sent Events (SSE) with EventSource API

**Why?**
- Real-time progress updates without polling
- Simple unidirectional stream (server → client)
- Automatic reconnection handling
- Native browser API support

**Tradeoffs:**
- EventSource only supports GET requests
- Cannot send custom headers (requires query parameter auth)
- Limited to text/event-stream format

### 3. LLM Provider as Instance vs Static

**Problem:** Originally tried to call `LLMProviderService.chat()` as a static method.

**Solution:** LLMProviderService is an instance class that requires user settings.

**Implementation:**
```javascript
// Get user settings
const userResult = await pool.query(
  `SELECT local_llm_base_url, local_llm_model FROM users WHERE id = $1`,
  [userId]
);

// Create instance
const llmProvider = new LLMProviderService(
  userSettings.local_llm_base_url,
  userSettings.local_llm_model
);

// Call method
const response = await llmProvider.createChatCompletion([...]);
```

### 4. Sequential vs Parallel Processing

**Decision:** Process summaries sequentially (one at a time)

**Why?**
- Local LLMs have limited concurrency
- Prevents resource exhaustion
- Easier error tracking per person
- Simple progress reporting

**Implementation Detail:**
```javascript
for (let i = 0; i < people.length; i++) {
  const person = people[i];

  // Send progress
  res.write(`data: ${JSON.stringify({type: 'progress', ...})}\n\n`);

  // Generate summary
  await SummaryGenerationService.generatePersonSummary(userId, person.id);

  // Small delay to prevent overwhelming LLM
  await new Promise(resolve => setTimeout(resolve, 500));
}
```

---

## Troubleshooting Issues Encountered

### Issue 1: Column "user_id" does not exist in professional_history

**Error:**
```
error: column "user_id" does not exist
    at SummaryGenerationService.gatherPersonData (line 68)
```

**Root Cause:** professional_history table doesn't have a user_id column. It relies on RLS policy through the person_id → people → user_id relationship.

**Fix:** Removed `AND user_id = $2` from the WHERE clause.

---

### Issue 2: Column "r.type" does not exist

**Error:**
```
error: column r.type does not exist
    at SummaryGenerationService.gatherPersonData (line 89)
```

**Root Cause:** relationships table uses `relationship_type`, not `type`.

**Fix:**
```sql
SELECT
  r.relationship_type AS type,  -- Alias to expected name
  r.context AS relationship_notes,  -- Was r.notes
  ...
```

---

### Issue 3: 404 Not Found on /summaries/generate-all

**Error:**
```
GET http://localhost/api/v1/summaries/generate-all?token=... 404 (Not Found)
```

**Root Cause:** Route was defined as POST, but EventSource only makes GET requests.

**Fix:** Changed `router.post('/generate-all', ...)` to `router.get('/generate-all', ...)`

---

### Issue 4: Authentication failed (no token in header)

**Error:**
```
Authentication required: No token provided
```

**Root Cause:** EventSource cannot send custom headers, so Authorization header is missing.

**Fix:** Updated auth middleware to check `req.query.token` as fallback.

---

### Issue 5: LLMProviderService.chat is not a function

**Error:**
```
TypeError: LLMProviderService.chat is not a function
    at SummaryGenerationService.generateSummaryWithLLM (line 229)
```

**Root Cause:** LLMProviderService is a class that must be instantiated. The method is `createChatCompletion()`, not `chat()`.

**Fix:**
1. Fetch user settings from database
2. Create instance: `new LLMProviderService(baseURL, model)`
3. Call: `llmProvider.createChatCompletion([...])`
4. Extract: `response.choices[0].message.content`

---

### Issue 6: LLM Request Timeout

**Error:** Summary generation timed out before LLM could respond.

**Root Cause:** OpenAI client default timeout is too short for long-form generation.

**Fix:** Added `timeout: 300000` (5 minutes) to OpenAI client configuration in `backend/src/services/LLMProviderService.js:13-17`.

---

### Issue 7: Biography and Professional History View Buttons Not Working

**Error:** Clicking "View" on biography or professional history entries shows entire React app HTML instead of detail page.

**Root Cause:** Routes `/biographies/:id` and `/professional-history/:id` don't exist in App.js. Only edit routes (`:id/edit`) were defined.

**Fix:**
1. Created `BiographyDetail.js` component (145 lines) - displays biography note with title, date, content, and person link
2. Created `ProfessionalHistoryDetail.js` component (162 lines) - displays job with position, company, date range, notes, and person link
3. Added route imports and definitions in `frontend/src/App.js`:
   - Line 24: `import BiographyDetail from './pages/BiographyDetail';`
   - Line 25: `import ProfessionalHistoryDetail from './pages/ProfessionalHistoryDetail';`
   - Lines 236-243: Route for `/professional-history/:id`
   - Lines 263-270: Route for `/biographies/:id`

---

### Issue 8: Clear Summary Button Returns 404

**Error:** Backend logs show `DELETE /api/v1/summaries/:personId 404 (Not Found)`

**Root Cause:** Express route ordering issue. The `/generate-all` route was defined AFTER the `/:personId` parameterized routes (line 67), causing Express to try matching "generate-all" as a personId parameter before reaching the specific route handler.

**Fix:** Reordered routes in `backend/src/api/summaries.js`:
1. GET `/status` (line 10) - specific route
2. GET `/generate-all` (line 25) - specific route (MOVED BEFORE parameterized routes)
3. POST `/:personId` (line 100) - parameterized route
4. DELETE `/:personId` (line 120) - parameterized route

**Key Learning:** In Express, specific routes must be defined before parameterized routes to prevent the parameter from matching literal strings.

---

## Testing Checklist

### Unit Testing
- ✅ `gatherPersonData()` returns all expected fields
- ✅ `buildSummaryPrompt()` generates comprehensive prompts
- ✅ `calculateFavorStats()` correctly computes reciprocity
- ✅ `identifyCommonAssociates()` finds frequent co-attendees

### Integration Testing
- ✅ Single person summary generation via POST `/summaries/:personId`
- ✅ Batch generation via GET `/summaries/generate-all`
- ✅ SSE progress events stream correctly
- ✅ Authentication works with query parameter tokens
- ✅ Summary saves to database with timestamp

### UI Testing
- ✅ Summary tab displays in PersonDetail page
- ✅ "Regenerate Summary" button works
- ✅ Settings page shows correct summary count
- ✅ "Generate / Update Summaries" button triggers batch process
- ✅ Progress updates display in real-time
- ✅ Success/error messages appear correctly

### Edge Cases
- ✅ Person with no relationships/events/favors/assets
- ✅ Person with only basic info
- ✅ Multiple people processed sequentially
- ✅ LLM connection failure handling
- ✅ Partial completion (some succeed, some fail)

---

## Enhancement History

### Version 2.0 (2025-10-26) - First-Degree Connection Data Integration

**Major Changes:**
1. **N1 Data Gathering:** Added `gatherFirstDegreeConnectionData()` to fetch comprehensive data for all direct connections
2. **Network Metrics:** Added `calculateNetworkMetrics()` for professional overlap, interaction frequency, and bridging analysis
3. **Concise Format:** Changed from 1500-2500 words to 500-1000 words for faster reading
4. **Data-Driven Focus:** Reduced temperature from 0.7 to 0.5, emphasized facts over speculation
5. **Enhanced Prompt:** Restructured to include N1 connection details, network metrics, and resource mapping

**New Data Points:**
- N1 basic info, professional history, biographies, assets, N2 relationships, existing summaries
- Shared events and favors exchanged with each N1 connection
- Professional overlap (worked at same companies)
- Interaction frequency ranking
- Bridging potential (connections to unique N2 people)

**Performance Impact:**
- Query count increased from ~8 to ~8 + (9 × N1_count)
- Example: Person with 10 connections = 98 queries (vs 8 previously)
- Generation time increased proportionally to N1 connection count
- Sequential processing with 500ms delay remains to prevent LLM overload

---

## Performance Considerations

### Database Queries
- **Version 1.0:** ~8 queries per person (basic data only)
- **Version 2.0:** ~8 + (9 × N1_count) queries per person
- Example scenarios:
  - Person with 0 connections: 8 queries
  - Person with 5 connections: 53 queries
  - Person with 10 connections: 98 queries
  - Person with 20 connections: 188 queries
- Consider caching if regenerating frequently
- RLS policies add minimal overhead

### LLM Generation Time
- **Prompt size increased** due to N1 data inclusion
- Expect 30-180 seconds per person (depends on N1 count and local LLM speed)
- Person with many connections = longer prompts = slower generation
- 50 people with average 10 connections each = ~2-3 hours total
- Sequential processing prevents resource contention

### Memory Usage
- Each summary is ~1-3KB of text (reduced from 2-5KB due to shorter format)
- 1000 people = ~1-3MB of summary data
- Negligible compared to other database content
- N1 data fetched on-demand, not stored in memory long-term

---

## Future Enhancements

### Potential Improvements

1. **Incremental Updates**
   - Only regenerate if data changed since last summary
   - Track last_modified timestamps on related tables
   - Skip unchanged people during batch generation

2. **Summary Versioning**
   - Keep history of previous summaries
   - Compare changes over time
   - Restore previous versions

3. **Custom Summary Templates**
   - Allow users to customize prompt structure
   - Different summary styles (brief, detailed, professional)
   - Focus areas (social, professional, assets)

4. **Summary Comparison**
   - Generate "relationship summaries" between two people
   - Predict compatibility scores
   - Suggest collaboration opportunities

5. **Auto-regeneration**
   - Scheduled background job to update stale summaries
   - Webhook triggers on major data changes
   - Smart priority (update important people first)

6. **Summary Search**
   - Full-text search across all summaries
   - Find people by personality traits or behaviors
   - Natural language queries

7. **Export/Sharing**
   - Export summaries to PDF
   - Share with other users (multi-tenant scenarios)
   - Anonymized summaries for research

---

## Dependencies

### Backend
- `openai` - For OpenAI-compatible API communication
- `pg` - PostgreSQL database queries
- `express` - REST API routes and SSE

### Frontend
- React built-in `EventSource` API
- `axios` - HTTP requests
- React Router - Navigation

### External
- Local LLM server (LM Studio, Ollama, etc.)
- Must support OpenAI-compatible `/v1/chat/completions` endpoint

---

## Configuration

### Environment Variables
No new environment variables required. Uses existing:
- `REACT_APP_API_URL` - Frontend API endpoint
- Database connection settings (existing)
- JWT settings (existing)

### User Settings (Database)
Used from `users` table:
- `ai_assistant_enabled` - Must be true to generate summaries
- `local_llm_base_url` - LLM server URL (e.g., `http://localhost:1234`)
- `local_llm_model` - Model name (e.g., `llama-2-7b-chat`)

---

## API Documentation

### Summary Endpoints

#### GET /api/v1/summaries/status
Get summary generation status for current user.

**Authentication:** Required (JWT)

**Response:**
```json
{
  "success": true,
  "status": {
    "total_people": 50,
    "summaries_generated": 12,
    "summaries_with_timestamp": 12,
    "last_generated": "2025-10-21T15:34:37.741Z"
  }
}
```

---

#### POST /api/v1/summaries/:personId
Generate or regenerate summary for a specific person.

**Authentication:** Required (JWT)

**Parameters:**
- `personId` (UUID) - ID of person to generate summary for

**Response (Success):**
```json
{
  "success": true,
  "person_id": "518c2b14-d88b-441f-a04a-5f64eb9bfff7",
  "person_name": "Miguel Ribeiro Arala Chaves",
  "summary": "Long generated summary text...",
  "generated_at": "2025-10-21T15:34:37.741Z"
}
```

**Response (Error):**
```json
{
  "success": false,
  "person_id": "518c2b14-d88b-441f-a04a-5f64eb9bfff7",
  "error": "Error message"
}
```

---

#### GET /api/v1/summaries/generate-all
Generate summaries for all people with real-time progress via SSE.

**Authentication:** Required (JWT via query parameter)

**Query Parameters:**
- `token` (string) - JWT authentication token

**Response:** Server-Sent Events stream

**SSE Event Format:**
```
data: <JSON object>\n\n
```

**Event Types:**

1. **start**
```json
{
  "type": "start",
  "total": 50,
  "message": "Starting summary generation for 50 people..."
}
```

2. **progress**
```json
{
  "type": "progress",
  "current": 1,
  "total": 50,
  "personId": "uuid",
  "personName": "John Doe",
  "message": "Generating summary for John Doe..."
}
```

3. **person_complete**
```json
{
  "type": "person_complete",
  "current": 1,
  "total": 50,
  "personId": "uuid",
  "personName": "John Doe",
  "success": true,
  "error": null
}
```

4. **complete**
```json
{
  "type": "complete",
  "total": 50,
  "message": "Successfully generated summaries for 50 people"
}
```

5. **error**
```json
{
  "type": "error",
  "error": "Error message"
}
```

---

## Code Snippets

### Example: Manual Summary Generation

```javascript
const SummaryGenerationService = require('./services/SummaryGenerationService');

// Generate for single person
const result = await SummaryGenerationService.generatePersonSummary(
  userId,
  personId
);

if (result.success) {
  console.log(`Summary generated for ${result.person_name}`);
  console.log(result.summary);
} else {
  console.error(`Failed: ${result.error}`);
}
```

### Example: Custom Prompt Modification

To customize the summary prompt, edit `buildSummaryPrompt()` in SummaryGenerationService.js:

```javascript
static buildSummaryPrompt(data) {
  // ... existing data aggregation ...

  // Customize instructions
  prompt += `\n---\n\n`;
  prompt += `Generate a summary focusing on:\n`;
  prompt += `1. Professional expertise and career trajectory\n`;
  prompt += `2. Social influence and network position\n`;
  prompt += `3. Key relationships and collaborations\n`;
  // Add your custom instructions here

  return prompt;
}
```

---

## Maintenance Notes

### When to Regenerate Summaries

- After significant data updates (new events, relationships, favors)
- When changing LLM models (different writing styles)
- Periodically (monthly?) to keep summaries fresh
- After adding new people to the network

### Database Cleanup

If summaries become stale or corrupted:

```sql
-- Clear all summaries
UPDATE people SET summary = NULL, summary_generated_at = NULL;

-- Clear summaries older than 30 days
UPDATE people
SET summary = NULL, summary_generated_at = NULL
WHERE summary_generated_at < NOW() - INTERVAL '30 days';
```

### Monitoring

Track summary generation success rate:

```sql
SELECT
  COUNT(*) as total_people,
  COUNT(summary) as with_summary,
  ROUND(100.0 * COUNT(summary) / COUNT(*), 2) as completion_rate
FROM people
WHERE user_id = 'your-user-id';
```

---

## Security Considerations

### Authentication
- All endpoints require valid JWT token
- SSE endpoint accepts token via query parameter (necessary for EventSource)
- Token validation performed by auth middleware

### Authorization
- Row-Level Security (RLS) ensures users only access their own data
- Summary generation only processes people owned by authenticated user
- No cross-user data leakage

### Data Privacy
- Summaries contain sensitive personal information
- Generated summaries stored in database (consider encryption at rest)
- LLM requests go to local server (no external API calls)
- Be cautious when sharing summaries

### Rate Limiting
- Consider implementing rate limits on batch generation
- Prevent abuse of compute-intensive LLM operations
- Current implementation: 500ms delay between people (built-in throttle)

---

## License & Attribution

This feature was implemented for the Social Capital CRM project.

**LLM-Generated Content Notice:**
Summaries are generated by AI and should be reviewed for accuracy. The quality depends on:
- Input data completeness
- LLM model capabilities
- Prompt engineering

---

## Support & Resources

### Related Files
- Backend Service: `backend/src/services/SummaryGenerationService.js`
- API Routes: `backend/src/api/summaries.js`
- Frontend Settings: `frontend/src/pages/Settings.js`
- Frontend Detail: `frontend/src/pages/PersonDetail.js`
- LLM Provider: `backend/src/services/LLMProviderService.js`
- Migration: `backend/src/db/migrations/016_add_person_summaries.sql`

### External Documentation
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Server-Sent Events Spec](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [EventSource API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-21
**Author:** Claude Code Implementation
