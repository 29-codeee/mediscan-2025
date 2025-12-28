"use client";

import { useState } from "react";

export default function SecureLogin() {
  const [email, setEmail] = useState("");

  const requestCode = async () => {
    if (!email) return alert("Enter your email");

    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          type: 'email',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Sending your secure code to your Nowmail inbox...`);
        // In development, show the OTP for testing
        if (data.otp) {
          alert(`Demo OTP: ${data.otp}`);
        }
      } else {
        alert(data.error || "Failed to send OTP");
      }
    } catch (error) {
      alert("Error sending OTP");
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-2">SECURE LOGIN (Nowmail OTP)</h2>
      <input
        type="email"
        placeholder="Enter your Nowmail email"
        className="border p-2 w-full mb-2"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={requestCode} className="bg-indigo-500 text-white px-4 py-2 rounded">
        Request Access Code
      </button>
    </div>
  );
}