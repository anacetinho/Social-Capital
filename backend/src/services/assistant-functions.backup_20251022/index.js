/**
 * Assistant Functions Index
 * Exports all available functions for the AI assistant
 */

const GetPeopleFunction = require('./GetPeopleFunction');
const GetNetworkFunction = require('./GetNetworkFunction');
const GetEventsFunction = require('./GetEventsFunction');
const GetFavorsFunction = require('./GetFavorsFunction');
const GetRelationshipsFunction = require('./GetRelationshipsFunction');

// Export all function classes
module.exports = {
  GetPeopleFunction,
  GetNetworkFunction,
  GetEventsFunction,
  GetFavorsFunction,
  GetRelationshipsFunction
};

/**
 * Get all function definitions in OpenAI format
 */
function getAllFunctionDefinitions() {
  return [
    {
      name: GetPeopleFunction.name,
      description: GetPeopleFunction.description,
      parameters: GetPeopleFunction.parameters
    },
    {
      name: GetNetworkFunction.name,
      description: GetNetworkFunction.description,
      parameters: GetNetworkFunction.parameters
    },
    {
      name: GetEventsFunction.name,
      description: GetEventsFunction.description,
      parameters: GetEventsFunction.parameters
    },
    {
      name: GetFavorsFunction.name,
      description: GetFavorsFunction.description,
      parameters: GetFavorsFunction.parameters
    },
    {
      name: GetRelationshipsFunction.name,
      description: GetRelationshipsFunction.description,
      parameters: GetRelationshipsFunction.parameters
    }
  ];
}

/**
 * Execute a function by name
 */
async function executeFunction(functionName, userId, params) {
  const functionMap = {
    [GetPeopleFunction.name]: GetPeopleFunction,
    [GetNetworkFunction.name]: GetNetworkFunction,
    [GetEventsFunction.name]: GetEventsFunction,
    [GetFavorsFunction.name]: GetFavorsFunction,
    [GetRelationshipsFunction.name]: GetRelationshipsFunction
  };

  const FunctionClass = functionMap[functionName];

  if (!FunctionClass) {
    throw new Error(`Unknown function: ${functionName}`);
  }

  return await FunctionClass.execute(userId, params);
}

module.exports.getAllFunctionDefinitions = getAllFunctionDefinitions;
module.exports.executeFunction = executeFunction;
