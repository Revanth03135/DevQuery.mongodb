const { GoogleGenerativeAI } = require('@google/generative-ai');

// Function to get initialized Gemini AI instance
const getGenAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

/**
 * Generate MongoDB query from natural language using Gemini AI
 * @param {string} userPrompt - Natural language description of what query should do
 * @param {string} queryType - Type of query: 'mongodb', 'sql', 'aggregation'
 * @returns {Promise<string>} - Generated query as string
 */
const generateQuery = async (userPrompt, queryType = 'mongodb') => {
  try {
    // Get the Gemini model (using gemini-2.0-flash for text generation)
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Create a detailed prompt based on query type
    let systemPrompt = '';
    
    if (queryType === 'mongodb') {
      systemPrompt = `You are an expert MongoDB query generator. Convert the following natural language description into a valid MongoDB query.

Rules:
1. Return ONLY the MongoDB query code, no explanations
2. Use proper MongoDB syntax (find, findOne, aggregate, etc.)
3. Include appropriate operators like $gt, $lt, $regex, etc.
4. Format the output as a ready-to-use MongoDB command
5. Do not include semicolons or extra formatting
6. Use JavaScript object notation

User request: ${userPrompt}

Generate the MongoDB query:`;
    } else if (queryType === 'sql') {
      systemPrompt = `You are an expert SQL query generator. Convert the following natural language description into a valid SQL query.

Rules:
1. Return ONLY the SQL query, no explanations
2. Use proper SQL syntax (SELECT, WHERE, JOIN, etc.)
3. Include appropriate conditions and operators
4. Format the output as a ready-to-execute SQL command
5. End with a semicolon

User request: ${userPrompt}

Generate the SQL query:`;
    } else if (queryType === 'aggregation') {
      systemPrompt = `You are an expert MongoDB aggregation pipeline generator. Convert the following natural language description into a valid MongoDB aggregation pipeline.

Rules:
1. Return ONLY the aggregation pipeline array, no explanations
2. Use proper MongoDB aggregation stages ($match, $group, $sort, $project, etc.)
3. Format as a JavaScript array of stages
4. Do not include db.collection.aggregate() wrapper

User request: ${userPrompt}

Generate the aggregation pipeline:`;
    }

    // Generate content using Gemini
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    let generatedQuery = response.text();

    // Clean up the response (remove markdown code blocks if present)
    generatedQuery = generatedQuery
      .replace(/```javascript\n?/g, '')
      .replace(/```json\n?/g, '')
      .replace(/```mongodb\n?/g, '')
      .replace(/```sql\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return generatedQuery;
  } catch (error) {
    console.error('Gemini API Error Details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to generate query using AI: ${error.message}`);
  }
};

/**
 * Explain what a query does in plain English
 * @param {string} query - The database query to explain
 * @returns {Promise<string>} - Plain English explanation
 */
const explainQuery = async (query) => {
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `Explain what this database query does in simple, plain English (2-3 sentences max):

Query: ${query}

Explanation:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to explain query using AI');
  }
};

/**
 * Suggest optimizations for a query
 * @param {string} query - The database query to optimize
 * @returns {Promise<string>} - Optimization suggestions
 */
const optimizeQuery = async (query) => {
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `Analyze this database query and suggest performance optimizations:

Query: ${query}

Provide 2-3 specific optimization suggestions:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to optimize query using AI');
  }
};

module.exports = {
  generateQuery,
  explainQuery,
  optimizeQuery
};
