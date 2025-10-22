require('dotenv').config();

console.log('=== Gemini Configuration ===');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 20) + '...' : 'NOT SET');
console.log('GEMINI_MODEL:', process.env.GEMINI_MODEL);
console.log('GEMINI_API_BASE:', process.env.GEMINI_API_BASE);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_BASE = (process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');

// Try the URL with models/ prefix
const url1 = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
// Try without prefix
const url2 = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
// Try with full model path
const url3 = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

console.log('\n=== URL Formats ===');
console.log('URL 1 (with /models/):', url1.replace(GEMINI_API_KEY, 'KEY_HIDDEN'));
console.log('URL 2 (without /models/):', url2.replace(GEMINI_API_KEY, 'KEY_HIDDEN'));

// Test ListModels endpoint first
const listUrl = `${GEMINI_API_BASE}/models?key=${GEMINI_API_KEY}`;
console.log('\nListModels URL:', listUrl.replace(GEMINI_API_KEY, 'KEY_HIDDEN'));

const testListModels = async (fetch) => {
  try {
    console.log('\n\n=== Testing ListModels ===');
    const response = await fetch(listUrl, { method: 'GET' });
    const text = await response.text();
    
    console.log('Status:', response.status);
    if (response.status === 200) {
      const data = JSON.parse(text);
      console.log('Models available:');
      if (data.models) {
        data.models.slice(0, 5).forEach(m => console.log(' -', m.name));
      }
    } else {
      console.log('Error:', text.substring(0, 200));
    }
  } catch (error) {
    console.error('ListModels Error:', error.message);
  }
};

const testGemini = async () => {
  try {
    // Use global fetch for Node 18+
    let fetch;
    try {
      fetch = (await import('node-fetch')).default;
    } catch {
      fetch = global.fetch;
    }
    
    // First test ListModels
    await testListModels(fetch);
    
    const body = JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Say hello in one sentence' }]
        }
      ]
    });

    console.log('\n\n=== Testing generateContent ===');
    console.log('URL:', url1.replace(GEMINI_API_KEY, 'KEY_HIDDEN'));

    const response = await fetch(url1, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });

    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Text:', text.substring(0, 300));
    
    if (text) {
      try {
        const data = JSON.parse(text);
        console.log('Parsed Data:', JSON.stringify(data, null, 2).substring(0, 400));
      } catch (e) {
        console.log('Could not parse as JSON');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
};

testGemini();
