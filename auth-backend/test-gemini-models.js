require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listAvailableModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    console.log('Testing Gemini API Key...\n');
    console.log('API Key (first 10 chars):', process.env.GEMINI_API_KEY?.substring(0, 10) + '...');
    
    // Try different model names
    const modelNamesToTest = [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest'
    ];
    
    console.log('\nTesting different model names:\n');
    
    for (const modelName of modelNamesToTest) {
      try {
        console.log(`Testing: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Say hello');
        const response = await result.response;
        const text = response.text();
        console.log(`✅ ${modelName} - SUCCESS`);
        console.log(`   Response: ${text.substring(0, 50)}...\n`);
      } catch (error) {
        console.log(`❌ ${modelName} - FAILED`);
        console.log(`   Error: ${error.message}\n`);
      }
    }
    
  } catch (error) {
    console.error('Error testing models:', error);
  }
}

listAvailableModels();
