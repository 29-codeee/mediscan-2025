// const fetch = require('node-fetch');

async function testOTP() {
  try {
    console.log('Testing OTP endpoint...');
    const email = 'test-' + Date.now() + '@example.com';
    console.log('Sending OTP to:', email);
    
    const response = await fetch('http://localhost:3000/api/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        type: 'email'
      })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);

    if (response.ok) {
      console.log('OTP sent successfully!');
      
      if (data.otp) {
        // Legacy behavior or fallback mode might still return OTP
        const otp = data.otp;
        console.log('Received OTP (Debug Mode):', otp);
        
        // Test Verification
        console.log('Verifying OTP...');
        const verifyResponse = await fetch('http://localhost:3000/api/verify-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: email,
            otp: otp
          })
        });
        
        const verifyData = await verifyResponse.json();
        console.log('Verify Status:', verifyResponse.status);
        console.log('Verify Response:', verifyData);
        
        if (verifyResponse.ok) {
          console.log('OTP verified successfully!');
        } else {
          console.log('OTP verification failed!');
        }
      } else {
        console.log('OTP sent securely (not returned in response). Check server logs or email for the code.');
        console.log('To verify, check the console output of the running server for the "Generated OTP" message.');
      }

    } else {
      console.log('Error sending OTP:', data.error);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

testOTP();