// Test script for OTP functionality
// Run this in browser console or as a separate script

const testOTP = async () => {
  const email = prompt("Enter your email address:");
  if (!email) return;

  console.log("Sending OTP to:", email);

  try {
    // Test send-otp endpoint
    const sendResponse = await fetch('/api/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        type: 'email',
      }),
    });

    const sendData = await sendResponse.json();
    console.log("Send OTP Response:", sendData);

    if (sendData.otp) {
      console.log("✅ OTP sent successfully!");
      console.log("Demo OTP (development only):", sendData.otp);

      // Test verify-otp endpoint
      const otp = prompt("Enter the OTP you received:");
      if (otp) {
        const verifyResponse = await fetch('/api/verify-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: email,
            otp: otp,
          }),
        });

        const verifyData = await verifyResponse.json();
        console.log("Verify OTP Response:", verifyData);

        if (verifyResponse.ok) {
          console.log("✅ OTP verified successfully!");
        } else {
          console.log("❌ OTP verification failed:", verifyData.error);
        }
      }
    } else {
      console.log("❌ Failed to send OTP:", sendData.error);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
};

// Auto-run the test
testOTP();