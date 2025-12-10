const OpenAI = require('openai');
const fs = require('fs');

/**
 * LLMProviderService - Handles communication with local LLM servers
 * Supports any OpenAI-compatible endpoint (LM Studio, Ollama, etc.)
 */
class LLMProviderService {
  constructor(baseURL, model, apiKey = 'dummy-key') {
    // Normalize localhost URLs for Docker environments
    this.baseURL = this._normalizeDockerURL(baseURL);
    this.model = model;

    // Initialize OpenAI client with custom base URL
    this.client = new OpenAI({
      baseURL: this.baseURL + '/v1',
      apiKey: apiKey, // Local LLMs typically don't need a real API key
      timeout: 300000 // 5 minutes timeout for LLM responses
    });
  }

  /**
   * Normalize localhost/127.0.0.1 URLs to host.docker.internal when running in Docker
   * This allows Docker containers to connect to services running on the host machine
   * @param {string} url - The URL to normalize
   * @returns {string} - Normalized URL
   * @private
   */
  _normalizeDockerURL(url) {
    if (!url) return url;

    // Check if running in Docker (check for .dockerenv file or DOCKER env var)
    const isDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER === 'true';

    if (isDocker) {
      // Replace localhost or 127.0.0.1 with host.docker.internal
      const normalized = url.replace(
        /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?/i,
        '$1host.docker.internal$3'
      );

      if (normalized !== url) {
        console.log(`🔄 Docker URL normalization: ${url} → ${normalized}`);
      }

      return normalized;
    }

    return url;
  }

  /**
   * Test connection to the LLM server
   */
  async testConnection() {
    try {
      // Try to list models (if supported)
      const response = await this.client.models.list();
      return {
        success: true,
        models: response.data?.map(m => m.id) || []
      };
    } catch (error) {
      // If listing models fails, try a simple completion
      try {
        await this.client.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5
        });
        return { success: true };
      } catch (innerError) {
        return {
          success: false,
          error: innerError.message
        };
      }
    }
  }

  /**
   * Create a chat completion with optional function calling
   * @param {Array} messages - Array of message objects {role, content}
   * @param {Object} options - Additional options
   * @param {Array} options.functions - Function definitions for function calling
   * @param {Boolean} options.stream - Whether to stream the response
   * @param {Number} options.maxTokens - Maximum tokens to generate
   * @param {Number} options.temperature - Temperature (0-2)
   */
  async createChatCompletion(messages, options = {}) {
    const {
      functions = [],
      stream = false,
      maxTokens = 2000,
      temperature = 0.7
    } = options;

    const requestBody = {
      model: this.model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream
    };

    // Add function calling if functions are provided
    if (functions && functions.length > 0) {
      requestBody.tools = functions.map(fn => ({
        type: 'function',
        function: {
          name: fn.name,
          description: fn.description,
          parameters: fn.parameters
        }
      }));
      requestBody.tool_choice = 'auto';
    }

    try {
      if (stream) {
        return await this.client.chat.completions.create(requestBody);
      } else {
        const response = await this.client.chat.completions.create(requestBody);
        return response;
      }
    } catch (error) {
      console.error('LLM API Error:', error);
      throw new Error(`Failed to communicate with LLM: ${error.message}`);
    }
  }

  /**
   * Stream a chat completion response
   * Returns an async generator that yields chunks of the response
   */
  async *streamChatCompletion(messages, options = {}) {
    const stream = await this.createChatCompletion(messages, {
      ...options,
      stream: true
    });

    let fullContent = '';
    let toolCalls = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (!delta) continue;

      // Handle content streaming
      if (delta.content) {
        fullContent += delta.content;
        yield {
          type: 'content',
          content: delta.content,
          fullContent
        };
      }

      // Handle function calling
      if (delta.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          const index = toolCall.index;

          // Initialize tool call if not exists
          if (!toolCalls[index]) {
            toolCalls[index] = {
              id: toolCall.id || '',
              type: 'function',
              function: {
                name: toolCall.function?.name || '',
                arguments: ''
              }
            };
          }

          // Append to function arguments
          if (toolCall.function?.arguments) {
            toolCalls[index].function.arguments += toolCall.function.arguments;
          }

          // Update function name if provided
          if (toolCall.function?.name) {
            toolCalls[index].function.name = toolCall.function.name;
          }
        }

        yield {
          type: 'tool_calls',
          toolCalls: [...toolCalls]
        };
      }

      // Check if finished
      if (chunk.choices[0]?.finish_reason) {
        yield {
          type: 'done',
          finish_reason: chunk.choices[0].finish_reason,
          fullContent,
          toolCalls: toolCalls.length > 0 ? toolCalls : null
        };
      }
    }
  }

  /**
   * Parse function call arguments safely
   */
  static parseFunctionArguments(argsString) {
    try {
      return JSON.parse(argsString);
    } catch (error) {
      console.error('Failed to parse function arguments:', argsString);
      return {};
    }
  }
}

module.exports = LLMProviderService;
