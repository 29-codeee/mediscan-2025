const fs = require('fs');

async function testAI() {
  const baseUrl = 'http://localhost:3000';
  const userId = 'mock-user-id'; // Use mock ID to bypass DB checks

  console.log('Testing AI Features...');

  // 1. Test Chatbot API
  console.log('\n--- Testing Chatbot API ---');
  try {
    const chatResponse = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What are the side effects of ibuprofen?',
        userId: userId
      })
    });

    const chatData = await chatResponse.json();
    console.log('Status:', chatResponse.status);
    if (chatResponse.ok) {
      console.log('Chat Response Success!');
      console.log('AI Reply:', chatData.response);
    } else {
      console.error('Chat Failed:', chatData);
    }
  } catch (error) {
    console.error('Chat Error:', error.message);
  }

  // 2. Test Prescription Scanner API
  console.log('\n--- Testing Prescription Scanner API ---');
  try {
    // 1x1 pixel white jpeg base64
    const dummyImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwf/2Q==';
    
    const scanResponse = await fetch(`${baseUrl}/api/prescriptions/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: dummyImage,
        userId: userId
      })
    });

    const scanData = await scanResponse.json();
    console.log('Status:', scanResponse.status);
    if (scanResponse.ok) {
      console.log('Scan Response Success!');
      console.log('Extracted Data:', JSON.stringify(scanData.data || scanData.prescriptionData, null, 2));
    } else {
      console.error('Scan Failed:', scanData);
    }
  } catch (error) {
    console.error('Scan Error:', error.message);
  }
}

testAI();
