const LLMProviderService = require('./LLMProviderService');
const DatabaseQueryService = require('./DatabaseQueryService');
const pool = require('../db/connection');

/**
 * Chat Assistant Service
 * Provides intelligent chat functionality with person-aware features
 * Replaces N8N integration with local LLM + function calling
 */

class ChatAssistantService {
  constructor(baseURL, model, apiKey = 'dummy-key') {
    this.llmService = new LLMProviderService(baseURL, model, apiKey);
  }

  /**
   * Resolve person identifier to UUID
   * Accepts either a UUID or a person name
   * Returns UUID if valid, or looks up person by name
   *
   * @param {string} userId - User ID for RLS
   * @param {string} identifier - Either UUID or person name
   * @returns {string|null} UUID or null if not found
   */
  static async resolvePersonIdentifier(userId, identifier) {
    if (!identifier) return null;

    // Check if it's already a UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(identifier)) {
      // Verify the UUID exists
      const result = await pool.query(
        'SELECT id FROM people WHERE id = $1 AND user_id = $2',
        [identifier, userId]
      );
      return result.rows.length > 0 ? identifier : null;
    }

    // Trim whitespace from identifier
    const trimmedIdentifier = identifier.trim();

    // Try exact match first (fastest, most precise)
    let result = await pool.query(
      'SELECT id, name FROM people WHERE LOWER(name) = LOWER($1) AND user_id = $2 LIMIT 1',
      [trimmedIdentifier, userId]
    );

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    // Fall back to starts-with match (e.g., "Ana" matches "Ana Ilharco")
    result = await pool.query(
      'SELECT id, name FROM people WHERE name ILIKE $1 AND user_id = $2 ORDER BY LENGTH(name) ASC LIMIT 1',
      [trimmedIdentifier + '%', userId]
    );

    if (result.rows.length > 0) {
      return result.rows[0].id;
    }

    // Fall back to contains match (broadest - e.g., "Ilharco" matches "Ana Ilharco")
    result = await pool.query(
      'SELECT id, name FROM people WHERE name ILIKE $1 AND user_id = $2 ORDER BY LENGTH(name) ASC LIMIT 1',
      ['%' + trimmedIdentifier + '%', userId]
    );

    return result.rows.length > 0 ? result.rows[0].id : null;
  }

  /**
   * Define available tools/functions for the LLM
   * These allow the LLM to query the CRM database via DatabaseQueryService
   */
  static getAvailableTools() {
    return [
      {
        name: 'search_network',
        description: 'Search the user\'s network by querying Summary A data for people matching criteria. Use this to find people with specific skills, attributes, or characteristics.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query - keywords to find in Summary A (e.g., "doctor", "has a car", "speaks spanish")'
            },
            from_person_id: {
              type: 'string',
              description: 'Optional: If provided, show connection paths from this person to search results'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_person_summary',
        description: 'Get the full Summary A for a specific person. Use this to get detailed information about someone.',
        parameters: {
          type: 'object',
          properties: {
            person_id: {
              type: 'string',
              description: 'Person name or ID'
            }
          },
          required: ['person_id']
        }
      },
      {
        name: 'find_connection_path',
        description: 'Find how two people are connected in the network. Shows the relationship path and intermediaries.',
        parameters: {
          type: 'object',
          properties: {
            from_person_id: {
              type: 'string',
              description: 'Starting person name or ID'
            },
            to_person_id: {
              type: 'string',
              description: 'Target person name or ID'
            }
          },
          required: ['from_person_id', 'to_person_id']
        }
      },
      {
        name: 'get_network_context',
        description: 'Get comprehensive network information for a person including all their N1 and N2 connections with summaries.',
        parameters: {
          type: 'object',
          properties: {
            person_id: {
              type: 'string',
              description: 'Person name or ID'
            }
          },
          required: ['person_id']
        }
      },
      {
        name: 'search_assets',
        description: 'Search for physical resources, property, vehicles, or equipment owned by people in the network. Searches across asset names, descriptions, types, addresses (locations), and notes. Handles synonyms automatically (e.g., "motorcycle" matches "motorbike", "vacation house" matches "summer house", "rental property" matches "rental home"). Supports location searches (e.g., "Tavira", "Lisbon"). Use for tangible resources.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query - can be: property type (vacation house, rental property, apartment), vehicle (car, motorcycle, boat), equipment (pool, camera, tools), or location (Tavira, Lisbon, Algés). Synonyms handled automatically.'
            },
            from_person_id: {
              type: 'string',
              description: 'Optional: If provided, show connection paths from this person to asset owners. Use when in "asking as" mode.'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'search_people_by_demographics',
        description: 'Search for people by demographic criteria (age, gender, location, relationship status). Use for matchmaking, finding professionals in specific age ranges, organizing events, or filtering people by demographic attributes. Returns people with connection paths if from_person_id provided.',
        parameters: {
          type: 'object',
          properties: {
            relationship_status: {
              type: 'string',
              description: 'Filter by relationship status: "single" (not in any romantic relationship), "in_relationship" (married, dating, etc.), or "any" (no filter). Default: "any"'
            },
            min_age: {
              type: 'number',
              description: 'Minimum age in years (optional). Example: 30'
            },
            max_age: {
              type: 'number',
              description: 'Maximum age in years (optional). Example: 45'
            },
            gender: {
              type: 'string',
              description: 'Filter by gender: "male", "female", or "any" (no filter). Default: "any"'
            },
            location: {
              type: 'string',
              description: 'Filter by location/address (optional). Partial match supported (e.g., "Lisbon" matches "Amoreiras, Lisbon"). Example: "Lisbon", "Porto", "Algarve"'
            },
            from_person_id: {
              type: 'string',
              description: 'Optional: Person name or ID to show connection paths from. Use when in "asking as" mode to find how they connect to matching people.'
            }
          },
          required: []
        }
      }
    ];
  }

  /**
   * Build system prompt based on chat context
   * Adapts prompt for generic mode, "asking as" mode, or "talking to" mode
   */
  static buildSystemPrompt(askingAsPerson, talkingToPerson) {
    let basePrompt = `You are an AI assistant for a Social Capital CRM system. You help users understand and navigate their professional and personal networks.

You have access to Summary A data for people in the network. Summary A contains:
- Biographical information and background
- Relationships and connections
- Professional history and expertise
- Events, interactions, and favors exchanged

You also have direct access to the assets database for searching physical resources.

Available tools:
- search_network: Search Summary A for people with specific skills, attributes, or characteristics
- search_assets: Search for physical resources, property, vehicles, equipment (e.g., pool, car, house, boat)
- get_person_summary: Get full Summary A for a specific person
- find_connection_path: Find how people are connected
- get_network_context: Get comprehensive network data for a person

When answering "who has X" questions:
- For tangible resources/property (pool, car, house, boat, etc.), use search_assets
- For skills/attributes (doctor, speaks spanish, works at X), use search_network
- Always show connection paths when relevant using the from_person_id parameter

When calling tools, prefer using person names (e.g., "Ana Ilharco") rather than IDs unless a specific UUID is provided to you.`;

    // Add "asking as" context
    if (askingAsPerson) {
      basePrompt += `\n\n**IMPORTANT - ASKING AS MODE:**
The user is asking from the perspective of ${askingAsPerson.name} (ID: ${askingAsPerson.id}).

When they ask "who can help me with X" or "who has Y":
1. Search the network for people with X/Y using search_network
2. IMPORTANT: When using from_person_id parameter, use the UUID "${askingAsPerson.id}"
3. Show how ${askingAsPerson.name} is connected to each result
4. Format paths as: "${askingAsPerson.name} → [connection] → [person with X]"
5. Prioritize closer connections (fewer degrees of separation)
6. Include relationship context and strength in your explanation`;
    }

    // Add "talking to" roleplay mode
    if (talkingToPerson) {
      basePrompt = `**ROLEPLAY MODE:** You are ${talkingToPerson.name}.

Here is everything known about you:

${talkingToPerson.summary_a || 'No detailed information available.'}

Instructions:
- Respond as this person based on their background, relationships, and experiences described above
- Use first person ("I", "my", "me")
- Reference your connections and experiences naturally as they would
- Stay in character but be helpful and conversational
- If asked about something this person wouldn't know, respond authentically: "I'm not sure about that" or "I don't have information on that"
- You can still use tools to look up information, but present it as if you're recalling from your own knowledge

Remember: You ARE ${talkingToPerson.name}. Everything you say should be from their perspective.`;
    }

    return basePrompt;
  }

  /**
   * Execute a tool call via DatabaseQueryService
   */
  static async executeToolCall(userId, toolName, args) {
    try {
      switch (toolName) {
        case 'search_network':
          if (args.from_person_id) {
            // Resolve person identifier to UUID
            const fromPersonId = await ChatAssistantService.resolvePersonIdentifier(
              userId,
              args.from_person_id
            );

            if (!fromPersonId) {
              return {
                error: `Person not found: "${args.from_person_id}". Please use a valid person UUID or exact name.`,
                results: []
              };
            }

            // Search with connection paths
            return await DatabaseQueryService.searchByCapability(
              userId,
              args.query,
              fromPersonId
            );
          } else {
            // Simple search
            return await DatabaseQueryService.searchPeopleBySummary(
              userId,
              args.query
            );
          }

        case 'get_person_summary':
          const personId = await ChatAssistantService.resolvePersonIdentifier(
            userId,
            args.person_id
          );

          if (!personId) {
            return {
              error: `Person not found: "${args.person_id}". Please use a valid person UUID or exact name.`
            };
          }

          return await DatabaseQueryService.getPersonWithSummary(
            userId,
            personId
          );

        case 'find_connection_path':
          const fromId = await ChatAssistantService.resolvePersonIdentifier(
            userId,
            args.from_person_id
          );
          const toId = await ChatAssistantService.resolvePersonIdentifier(
            userId,
            args.to_person_id
          );

          if (!fromId || !toId) {
            return {
              error: `Person not found. From: "${args.from_person_id}" ${!fromId ? '(invalid)' : '(valid)'}, To: "${args.to_person_id}" ${!toId ? '(invalid)' : '(valid)'}`
            };
          }

          return await DatabaseQueryService.findConnectionPath(
            userId,
            fromId,
            toId
          );

        case 'get_network_context':
          const contextPersonId = await ChatAssistantService.resolvePersonIdentifier(
            userId,
            args.person_id
          );

          if (!contextPersonId) {
            return {
              error: `Person not found: "${args.person_id}". Please use a valid person UUID or exact name.`
            };
          }

          return await DatabaseQueryService.getPersonNetworkContext(
            userId,
            contextPersonId
          );

        case 'search_assets':
          if (args.from_person_id) {
            // Resolve person identifier to UUID
            const assetFromPersonId = await ChatAssistantService.resolvePersonIdentifier(
              userId,
              args.from_person_id
            );

            if (!assetFromPersonId) {
              return {
                error: `Person not found: "${args.from_person_id}". Please use a valid person UUID or exact name.`,
                results: []
              };
            }

            // Search with connection paths
            return await DatabaseQueryService.searchAssets(
              userId,
              args.query,
              assetFromPersonId
            );
          } else {
            // Simple search without paths
            return await DatabaseQueryService.searchAssets(
              userId,
              args.query
            );
          }

        case 'search_people_by_demographics':
          // Resolve from_person_id if provided
          let demographicsFromPersonId = null;
          if (args.from_person_id) {
            demographicsFromPersonId = await ChatAssistantService.resolvePersonIdentifier(
              userId,
              args.from_person_id
            );

            if (!demographicsFromPersonId) {
              return {
                error: `Person not found: "${args.from_person_id}". Please use a valid person name or ID.`,
                results: []
              };
            }
          }

          // Call demographic search
          return await DatabaseQueryService.searchPeopleByDemographics(
            userId,
            {
              relationshipStatus: args.relationship_status || 'any',
              minAge: args.min_age,
              maxAge: args.max_age,
              gender: args.gender || 'any',
              location: args.location
            },
            demographicsFromPersonId
          );

        default:
          return { error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      console.error(`Tool execution error (${toolName}):`, error);
      return { error: error.message };
    }
  }

  /**
   * Process a message with streaming response
   * Handles tool calls and streams LLM responses word-by-word
   *
   * This is an async generator that yields events for the SSE stream
   */
  async *processMessage(userId, messages, askingAsPerson, talkingToPerson) {
    try {
      // Build system prompt
      const systemPrompt = ChatAssistantService.buildSystemPrompt(
        askingAsPerson,
        talkingToPerson
      );

      // Prepend system message
      const messagesWithSystem = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      // Get available tools
      const tools = ChatAssistantService.getAvailableTools();

      // Start streaming from LLM
      yield { type: 'thinking', message: 'Processing your request...' };

      let fullContent = '';
      let toolCalls = [];
      let hasToolCalls = false;

      // Stream LLM response
      for await (const chunk of this.llmService.streamChatCompletion(
        messagesWithSystem,
        { functions: tools, temperature: 0.7, maxTokens: 2000 }
      )) {
        if (chunk.type === 'content') {
          // Stream content chunks
          fullContent = chunk.fullContent;
          yield {
            type: 'content',
            content: chunk.content
          };
        } else if (chunk.type === 'tool_calls') {
          // Tool calls detected
          toolCalls = chunk.toolCalls;
          hasToolCalls = true;

          // Notify about tool execution
          for (const toolCall of toolCalls) {
            if (toolCall.function.name) {
              yield {
                type: 'tool_call',
                tool: toolCall.function.name,
                status: 'detected'
              };
            }
          }
        } else if (chunk.type === 'done') {
          // LLM finished - execute tool calls if any
          if (hasToolCalls && chunk.toolCalls) {
            // Execute each tool call
            const toolResults = [];

            for (const toolCall of chunk.toolCalls) {
              const toolName = toolCall.function.name;
              const args = LLMProviderService.parseFunctionArguments(
                toolCall.function.arguments
              );

              yield {
                type: 'tool_call',
                tool: toolName,
                args: args,
                status: 'running'
              };

              // Execute tool
              const result = await ChatAssistantService.executeToolCall(
                userId,
                toolName,
                args
              );

              toolResults.push({
                tool_call_id: toolCall.id,
                role: 'tool',
                name: toolName,
                content: JSON.stringify(result)
              });

              yield {
                type: 'tool_call',
                tool: toolName,
                args: args,
                status: 'complete',
                result: result
              };
            }

            // Add tool results to conversation and get follow-up response
            const followUpMessages = [
              ...messagesWithSystem,
              {
                role: 'assistant',
                content: fullContent || null,
                tool_calls: chunk.toolCalls
              },
              ...toolResults
            ];

            // Stream follow-up response from LLM
            yield { type: 'thinking', message: 'Analyzing results...' };

            for await (const followUpChunk of this.llmService.streamChatCompletion(
              followUpMessages,
              { functions: tools, temperature: 0.7, maxTokens: 2000 }
            )) {
              if (followUpChunk.type === 'content') {
                yield {
                  type: 'content',
                  content: followUpChunk.content
                };
              } else if (followUpChunk.type === 'done') {
                yield {
                  type: 'done',
                  content: followUpChunk.fullContent
                };
              }
            }
          } else {
            // No tool calls - just return final content
            yield {
              type: 'done',
              content: chunk.fullContent
            };
          }
        }
      }
    } catch (error) {
      console.error('Chat processing error:', error);
      yield {
        type: 'error',
        error: error.message || 'An error occurred while processing your message'
      };
    }
  }

  /**
   * Test connection to LLM server
   */
  async testConnection() {
    return await this.llmService.testConnection();
  }
}

module.exports = ChatAssistantService;
