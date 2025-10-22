const fetch = global.fetch;

const testChat = async () => {
  try {
    console.log('=== Testing Chat Endpoint ===\n');

    // Step 1: Signup
    console.log('1. Signing up...');
    const signupRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test' + Date.now() + '@test.com',
        password: 'password123',
        username: 'testuser' + Date.now()
      })
    });

    const signupData = await signupRes.json();
    if (!signupData.token) {
      console.error('Signup failed:', signupData);
      process.exit(1);
    }
    const token = signupData.token;
    console.log('✓ Signed up successfully\n');

    // Step 2: Send chat message
    console.log('2. Sending chat message to assistant...');
    const chatRes = await fetch('http://localhost:5000/api/assistant/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: 'What is 2+2?',
        connectionId: '000000',
        options: { runQuery: false }
      })
    });

    const chatData = await chatRes.json();
    console.log('Status:', chatRes.status);
    console.log('Response:', JSON.stringify(chatData, null, 2));

    if (chatRes.status === 200 && chatData.success) {
      console.log('\n✓ Chat API working correctly!');
      const assistantMessage = chatData.data?.messages?.[0]?.content;
      console.log('Assistant response:', assistantMessage || 'No response');
      console.log('Model used:', chatData.meta?.model);
    } else {
      console.log('\n✗ Chat API failed');
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

testChat();
