# AI Assistant Function Calling Troubleshooting

**Date**: 2025-10-22
**Status**: ✅ **RESOLVED** - Asset queries now working
**Current Model**: openai/gpt-oss-20b (via LM Studio)
**Context Length**: 50k+ tokens

---

## Problem Summary

The AI assistant function calling works perfectly for most queries:
- ✅ Events queries (e.g., "recent events I was part of")
- ✅ Network queries (e.g., "closest connections")
- ✅ Relationship queries (e.g., "who could introduce me to X")

But was **failing for asset-related queries**:
- ❌ "who has rental properties?"
- ❌ "who has a vacation house?"
- Returned raw LLM internal tokens: `<|start|>assistant<|channel|>commentary to=functions.get_people<|constrain|>json<|message|>...`

---

## Root Cause Analysis ✅ IDENTIFIED

### What Was Happening

1. **First LLM call** (making tool call): ✅ Working perfectly
   - LLM correctly decided to call `get_people` with `include_assets: true`
   - Function executed successfully
   - Data retrieved from database (confirmed in logs)

2. **Second LLM call** (analyzing results): ❌ FAILING
   - After receiving function results with asset data, LLM outputted **raw internal tokens**
   - Tokens like `<|start|>`, `<|channel|>`, `<|message|>` are LM Studio's **sampling switches**
   - These are the model's internal "chain of thought" reasoning markers

### Why It Only Affected Asset Queries

The gpt-oss-20b model has special handling for complex data structures. When it received:
- Simple data (events, relationships) → Clean response
- **Complex nested data (people with assets)** → Triggered recursive "thinking mode" and outputted internal reasoning tokens instead of final answer

### Why Context Length Wasn't the Issue

With 50k+ token context, data size was NOT a factor. The issue was **model behavior**, not capacity.

---

## Solution Applied ✅ FIXED

### Approach: Stop Sequences + Explicit Instructions

Implemented a two-pronged fix to prevent the LLM from outputting internal tokens:

### 1. Added Stop Sequences Support

**File**: `backend/src/services/LLMProviderService.js`

**Changes** (lines 59-77):
```javascript
async createChatCompletion(messages, options = {}) {
  const {
    functions = [],
    stream = false,
    maxTokens = 2000,
    temperature = 0.7,
    stop = []  // ← NEW: Accept stop sequences
  } = options;

  const requestBody = {
    model: this.model,
    messages,
    max_tokens: maxTokens,
    temperature,
    stream
  };

  // ← NEW: Add stop sequences if provided
  if (stop && stop.length > 0) {
    requestBody.stop = Array.isArray(stop) ? stop : [stop];
  }

  // ... rest of function
}
```

**Purpose**: Allows passing stop sequences to OpenAI API to halt generation when internal tokens appear

---

### 2. Applied Stop Sequences to Second LLM Call

**File**: `backend/src/services/AssistantService.js`

**Changes** (lines 199-212):
```javascript
// ← NEW: Add explicit instruction for clean response
updatedMessages.push({
  role: 'system',
  content: 'You have received data from the function calls. Now provide a natural language answer to the user\'s question based on this data. Do NOT make any more function calls. Do NOT output any special tokens or formatting markers. Respond in clean markdown format ONLY.'
});

// Second LLM call with function results
yield { type: 'thinking', message: 'Analyzing data...' };

const secondStream = this.llmProvider.streamChatCompletion(updatedMessages, {
  temperature: 0.7,
  maxTokens: 2000,
  stop: ['<|start|>', '<|channel|>', '<|constrain|>', '<|message|>', '<|end|>', '<|im_end|>']  // ← NEW: Stop sequences
});
```

**Purpose**:
- **Stop sequences**: Halt generation if model tries to output internal tokens
- **System instruction**: Explicitly tell model to respond cleanly without special formatting

---

## How It Works

### Before Fix:
```
User: "who has rental properties?"
↓
LLM Call 1: Makes tool call to get_people(include_assets=true) ✅
↓
Function executes, returns data ✅
↓
LLM Call 2: Receives asset data
↓
Model enters "thinking mode" and outputs:
"<|start|>assistant<|channel|>commentary to=functions.get_people..." ❌
```

### After Fix:
```
User: "who has rental properties?"
↓
LLM Call 1: Makes tool call to get_people(include_assets=true) ✅
↓
Function executes, returns data ✅
↓
System message: "Provide natural language answer, no special tokens"
↓
LLM Call 2: Receives asset data + instruction + stop sequences
↓
Model starts to output "<|start..." but hits STOP sequence
↓
Model responds cleanly in markdown with actual people and properties ✅
```

---

## Testing Results

### Test Cases:
- ✅ "who has rental properties?" → Clean formatted response
- ✅ "who has a vacation house?" → Clean formatted response
- ✅ "recent events I was part of" → Still works
- ✅ "closest connections" → Still works
- ✅ "who could introduce me to X" → Still works

### What Changed:
- **Asset queries**: NOW WORKING ✅
- **Other queries**: Still working (no regression)
- **No hallucinations**: Model only uses real data from database

---

## Files Modified

### Session 1: SQL and Service Fixes
1. `backend/src/services/AssistantService.js` - Added explicit tool usage instructions to system prompt
2. `backend/src/services/assistant-functions/GetNetworkFunction.js` - Fixed SQL column names (`type` → `relationship_type`)
3. `backend/src/services/assistant-functions/GetRelationshipsFunction.js` - Fixed SQL column names + function name (`computeScore` → `calculateScore`)
4. `backend/src/services/assistant-functions/GetPeopleFunction.js` - Simplified user_id query
5. `backend/src/services/assistant-functions/GetNetworkFunction.js` - Fixed service function name (`getNetworkHealthScore` → `calculateNetworkHealthScore`)

### Session 2: LLM Token Output Fix ✅ FINAL FIX
6. `backend/src/services/LLMProviderService.js` - Added stop sequences support
7. `backend/src/services/AssistantService.js` - Applied stop sequences + explicit instruction to second LLM call

---

## Key Learnings

### 1. Function Calling Works Well with gpt-oss-20b
- First call (deciding to use tools) is very reliable
- No hallucinations when making tool call decisions
- Model correctly identifies when to call `get_people`, `get_network`, etc.

### 2. Second Call Needs Guardrails
- After receiving function results, model can enter "thinking mode"
- Stop sequences prevent internal token leakage
- Explicit system instructions help maintain clean output

### 3. Model-Specific Behaviors
- gpt-oss-20b uses special tokens for chain-of-thought reasoning
- LM Studio sampling switches: `<|start|>`, `<|channel|>`, `<|constrain|>`, etc.
- These need to be explicitly stopped to prevent output

### 4. Context Length Not Always the Issue
- With 50k+ tokens, data size was not a factor
- Complex nested structures (assets) triggered different model behavior
- Solution was behavioral (stop sequences), not capacity-based

---

## Alternative Architecture: 2-Step Process

*(Kept for reference - not currently needed since function calling is working)*

### Current Architecture (Working Now ✅)
```
User Question → LLM decides tools → Executes functions → LLM analyzes data → Response
```
**Status**: Working with stop sequences and explicit instructions

### Alternative: 2-Step Architecture

If function calling ever becomes unreliable again, consider:

#### Step 1: Query Identification
```javascript
System Prompt: "Return ONLY JSON with function and params"
User: "who has rental properties?"
LLM: { "function": "get_people", "params": { "include_assets": true } }
```

#### Step 2: Data Analysis
```javascript
System Prompt: "Here is data from database. Answer the question."
Data: [actual people with assets JSON]
LLM: "These people have rental properties: Miguel has 3 properties at..."
```

**Benefits**:
- Simpler for LLM (two simple tasks vs one complex)
- More reliable (JSON parsing easier than function calling protocol)
- Model agnostic (works even without function calling support)

**When to Consider**:
- If stop sequences become insufficient
- If need to support models without function calling
- If want simpler debugging and error handling

---

## Debugging Commands

### Check if fixes are deployed:
```bash
# Verify stop sequences in LLMProviderService
docker-compose exec backend cat /app/src/services/LLMProviderService.js | grep -A 3 "stop ="

# Verify stop sequences in AssistantService
docker-compose exec backend cat /app/src/services/AssistantService.js | grep -A 3 "stop:"

# Check backend logs for function execution
docker-compose logs backend --tail=50 | grep "Executing function"
```

### Test functions directly:
```bash
# Check what assets exist
docker-compose exec -T db psql -U postgres -d socialcapital -c "SELECT p.name, a.name as asset_name, a.asset_type, a.description FROM assets a JOIN people p ON p.id = a.owner_id LIMIT 10;"
```

### Monitor real-time:
```bash
# Follow backend logs during testing
docker-compose logs -f backend

# Watch for errors
docker-compose logs backend | grep -i error
```

---

## Configuration

### LM Studio Settings
- **Model**: openai/gpt-oss-20b
- **Context Length**: 50k+ tokens
- **Temperature**: 0.7
- **Max Tokens**: 2000 (first call), 2000 (second call)
- **Stop Sequences**: Applied programmatically via API

### Backend Settings (`.env`)
```
LOCAL_LLM_BASE_URL=http://host.docker.internal:1234
LOCAL_LLM_MODEL=openai/gpt-oss-20b
```

---

## Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Function Calling (First Call) | ✅ Working | LLM correctly decides which tools to call |
| Function Execution | ✅ Working | SQL queries fixed, no errors |
| Data Retrieval | ✅ Working | Assets, events, relationships all retrieving correctly |
| Response Generation (Second Call) | ✅ Working | Stop sequences prevent token leakage |
| Asset Queries | ✅ **FIXED** | "who has rental properties?" now works |
| Event Queries | ✅ Working | No issues |
| Network Queries | ✅ Working | No issues |
| Context Awareness | ✅ Working | Key person context passed correctly |

---

## Final Notes

- **gpt-oss-20b is the only model that doesn't hallucinate** - keeping this model is correct
- **Function calling approach is working well** - no need for 2-step architecture
- **Stop sequences are the key** - prevent internal token leakage
- **Model-specific quirks are manageable** - just need proper guardrails

The system is now production-ready for asset queries! 🎉
