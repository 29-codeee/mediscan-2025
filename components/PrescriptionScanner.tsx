"use client";

import { useState, useRef, useEffect } from "react";

interface DrugInfo {
  name: string;
  rxcui: string;
  interactions: any[];
  warnings: string[];
}

export default function PrescriptionScanner() {
  const [image, setImage] = useState<File | null>(null);
  const [scannedData, setScannedData] = useState<any>(null);
  const [drugInfo, setDrugInfo] = useState<DrugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [captureMode, setCaptureMode] = useState<'upload' | 'camera'>('upload');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // RxNav API functions
  const searchDrugByName = async (drugName: string) => {
    try {
      const response = await fetch(`https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(drugName)}`);
      const data = await response.json();
      return data.drugGroup?.conceptGroup || [];
    } catch (error) {
      console.error('Error searching drug:', error);
      return [];
    }
  };

  const getDrugInteractions = async (rxcui: string) => {
    try {
      const response = await fetch(`https://rxnav.nlm.nih.gov/REST/interaction/interaction.json?rxcui=${rxcui}`);
      const data = await response.json();
      return data.interactionTypeGroup || [];
    } catch (error) {
      console.error('Error getting interactions:', error);
      return [];
    }
  };

  const getDrugInfo = async (drugName: string) => {
    const drugGroups = await searchDrugByName(drugName);
    if (drugGroups.length > 0) {
      const firstGroup = drugGroups[0];
      const rxcui = firstGroup.conceptProperties?.[0]?.rxcui;
      const interactions = await getDrugInteractions(rxcui);

      return {
        name: drugName,
        rxcui: rxcui,
        interactions: interactions,
        warnings: [
          "Always take as prescribed by your healthcare provider",
          "Do not stop taking medication without consulting your doctor",
          "Report any side effects to your healthcare provider immediately"
        ]
      };
    }
    return null;
  };

  // Camera functions
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraError('Unable to access camera. Please check permissions and try again.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'prescription-capture.jpg', { type: 'image/jpeg' });
        setImage(file);
        stopCamera();
        setCaptureMode('upload');
      }
    }, 'image/jpeg', 0.8);
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleScan = async () => {
    if (!image) return;

    setLoading(true);
    try {
      // Convert image to base64
      const reader = new FileReader();
      const imageDataPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(image);
      });
      const imageData = await imageDataPromise;

      // Get user ID
      let userId = 'mock-user-id';
      try {
        const userData = localStorage.getItem('mediscan_user_data');
        if (userData) {
          const user = JSON.parse(userData);
          userId = user.id;
        }
      } catch (e) {
        console.warn('Could not parse user data', e);
      }

      // Call API
      const response = await fetch('/api/prescriptions/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Scan failed');
      }

      const prescriptionData = data.data || data; // API returns { data: ... }

      // Map API response to UI format
      // The API returns { medications: [...], ... }
      // The UI expects scannedData to display simple result, but let's see how it uses it.
      // The UI code below uses: data.medication, data.strength, etc.
      // But the API returns a list of medications.
      // We should update the UI to handle the list, or just pick the first one for the demo box.
      
      const firstMed = prescriptionData.medications?.[0] || {};
      
      const uiData = {
        medication: firstMed.name || "Unknown",
        strength: firstMed.dosage || "Unknown",
        frequency: firstMed.frequency || "Unknown",
        timing: firstMed.instructions || "Unknown"
      };

      setScannedData(uiData);

      // Get real drug information from RxNav for the first medication
      if (uiData.medication !== "Unknown") {
        const info = await getDrugInfo(uiData.medication);
        setDrugInfo(info);
      }

    } catch (error) {
      console.error(error);
      setScannedData({ medication: "Error", strength: "Error", frequency: "Error", timing: "Error" });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <span className="text-2xl">📸</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">MediScan AI</h2>
            <p className="text-green-100">Upload or capture prescriptions & check interactions</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Capture Mode Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => {
                setCaptureMode('upload');
                stopCamera();
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                captureMode === 'upload'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📁 Upload File
            </button>
            <button
              onClick={() => {
                setCaptureMode('camera');
                if (!cameraActive) startCamera();
              }}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                captureMode === 'camera'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📸 Take Photo
            </button>
          </div>
        </div>

        {/* Upload Section */}
        {captureMode === 'upload' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Prescription Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        )}

        {/* Camera Section */}
        {captureMode === 'camera' && (
          <div className="mb-6">
            <div className="bg-gray-900 rounded-lg overflow-hidden relative">
              {cameraActive ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                    <button
                      onClick={capturePhoto}
                      className="bg-white text-gray-900 px-6 py-3 rounded-full font-medium hover:bg-gray-100 transition-colors flex items-center space-x-2"
                    >
                      <span>📸 Capture</span>
                    </button>
                    <button
                      onClick={() => {
                        stopCamera();
                        setCaptureMode('upload');
                      }}
                      className="bg-red-500 text-white px-4 py-3 rounded-full font-medium hover:bg-red-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  {cameraError ? (
                    <div className="text-center text-white">
                      <div className="text-4xl mb-2">📷</div>
                      <p className="text-sm">{cameraError}</p>
                      <button
                        onClick={startCamera}
                        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-white">
                      <div className="text-4xl mb-2">📷</div>
                      <p className="text-sm mb-4">Camera access needed</p>
                      <button
                        onClick={startCamera}
                        className="bg-green-500 text-white px-6 py-3 rounded-full font-medium hover:bg-green-600 transition-colors"
                      >
                        Enable Camera
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Position your prescription clearly in the frame for best results
            </p>
          </div>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Scan Button */}
        {image && (
          <div className="mb-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600">📄</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">{image.name}</p>
                  <p className="text-sm text-gray-500">{(image.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleScan}
              disabled={loading}
              className="btn-primary w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="spinner mr-2"></div>
                  <span>Analyzing Prescription...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>🔍 Scan & Analyze</span>
                </div>
              )}
            </button>
          </div>
        )}

        {/* Results Section */}
        {scannedData && (
          <div className="space-y-6">
            {/* Extracted Data */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 Extracted Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-600">Medication:</span>
                  <p className="text-lg font-bold text-blue-600">{scannedData.medication}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Strength:</span>
                  <p className="text-lg font-bold text-blue-600">{scannedData.strength}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Frequency:</span>
                  <p className="text-lg font-bold text-blue-600">{scannedData.frequency}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Timing:</span>
                  <p className="text-lg font-bold text-blue-600">{scannedData.timing}</p>
                </div>
              </div>
            </div>

            {/* Drug Information from RxNav */}
            {drugInfo && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-3">💊 Drug Information (RxNav)</h3>

                {drugInfo.interactions.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-green-700 mb-2">⚠️ Drug Interactions:</h4>
                    <div className="space-y-2">
                      {drugInfo.interactions.slice(0, 3).map((interaction: any, index: number) => (
                        <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <p className="text-sm text-yellow-800">
                            <strong>Interacts with:</strong> {interaction.interactionType?.[0]?.interactionPair?.[0]?.interactionConcept?.[1]?.sourceConceptItem?.name || 'Unknown'}
                          </p>
                          <p className="text-sm text-yellow-700 mt-1">
                            <strong>Severity:</strong> {interaction.interactionType?.[0]?.interactionPair?.[0]?.severity || 'Unknown'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <h4 className="font-medium text-blue-700 mb-2">📝 Important Warnings:</h4>
                  <ul className="text-sm text-blue-600 space-y-1">
                    {drugInfo.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Friendly Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">💡 Summary</h3>
              <p className="text-gray-700">
                Take <strong>{scannedData.medication} {scannedData.strength}</strong> {scannedData.frequency.toLowerCase()} {scannedData.timing.toLowerCase()}.
                {drugInfo ? ' Drug information retrieved from NIH RxNav database.' : ' Please consult your healthcare provider for complete drug information.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}