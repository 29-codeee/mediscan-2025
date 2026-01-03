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
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API not supported in this browser. Please use a modern browser.');
        return;
      }

      // Request camera access
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
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(err => {
              console.error('Error playing video:', err);
              setCameraError('Error starting camera video. Please try again.');
            });
          }
        };
        
        setCameraActive(true);
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Unable to access camera. ';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera access in your browser settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Camera is already in use by another application.';
      } else {
        errorMessage += 'Please check permissions and try again.';
      }
      
      setCameraError(errorMessage);
      setCameraActive(false);
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

  // Auto-start camera when switching to camera mode
  useEffect(() => {
    if (captureMode === 'camera' && !cameraActive && !cameraError) {
      startCamera().catch(err => {
        console.error('Auto-start camera failed:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureMode, cameraActive, cameraError]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleScan = async () => {
    if (!image) {
      alert("Please select or capture an image first");
      return;
    }

    setLoading(true);
    setScannedData(null);
    setDrugInfo(null);
    
    try {
      // Convert image to base64
      const reader = new FileReader();
      const imageDataPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          if (!result) {
            reject(new Error('Failed to read image'));
            return;
          }
          resolve(result);
        };
        reader.onerror = () => reject(new Error('Error reading image file'));
        reader.readAsDataURL(image);
      });
      
      const imageData = await imageDataPromise;

      // Get user ID
      let userId = 'mock-user-id';
      try {
        const userData = localStorage.getItem('mediscan_user_data');
        if (userData) {
          const user = JSON.parse(userData);
          userId = user.id || userId;
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
        throw new Error(data.error || 'Scan failed. Please try again.');
      }

      const prescriptionData = data.data || data;

      if (!prescriptionData || !prescriptionData.medications || prescriptionData.medications.length === 0) {
        throw new Error('No medications found in the prescription. Please ensure the image is clear and try again.');
      }
      
      // Map API response to UI format
      const firstMed = prescriptionData.medications[0];
      
      const uiData = {
        medication: firstMed.name || "Not found",
        strength: firstMed.dosage || "Not specified",
        frequency: firstMed.frequency || "Not specified",
        timing: firstMed.instructions || firstMed.duration || "Not specified"
      };

      setScannedData(uiData);

      // Get real drug information from RxNav for the first medication
      if (uiData.medication && uiData.medication !== "Not found") {
        try {
          const info = await getDrugInfo(uiData.medication);
          setDrugInfo(info);
        } catch (drugInfoError) {
          console.warn('Could not fetch drug info:', drugInfoError);
          // Continue without drug info
        }
      }

      alert("✅ Prescription scanned successfully!");

    } catch (error: any) {
      console.error('Scan error:', error);
      const errorMessage = error.message || 'Failed to scan prescription. Please check your image and try again.';
      alert(`❌ ${errorMessage}`);
      setScannedData({ 
        medication: "Error", 
        strength: "Error", 
        frequency: "Error", 
        timing: "Error" 
      });
    } finally {
      setLoading(false);
    }
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
              onClick={async () => {
                setCaptureMode('camera');
                if (!cameraActive) {
                  await startCamera();
                }
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
                    style={{ transform: 'scaleX(-1)' }} // Mirror the video for better UX
                  />
                  <div className="absolute inset-0 border-4 border-white border-dashed rounded-lg m-4 pointer-events-none">
                    <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-white"></div>
                    <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-white"></div>
                    <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-white"></div>
                    <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-white"></div>
                  </div>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4 z-10">
                    <button
                      onClick={capturePhoto}
                      className="bg-white text-gray-900 px-6 py-3 rounded-full font-medium hover:bg-gray-100 transition-colors flex items-center space-x-2 shadow-lg"
                    >
                      <span>📸 Capture</span>
                    </button>
                    <button
                      onClick={() => {
                        stopCamera();
                        setCaptureMode('upload');
                      }}
                      className="bg-red-500 text-white px-4 py-3 rounded-full font-medium hover:bg-red-600 transition-colors shadow-lg"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  {cameraError ? (
                    <div className="text-center text-white p-4">
                      <div className="text-4xl mb-2">📷</div>
                      <p className="text-sm mb-4 max-w-xs">{cameraError}</p>
                      <div className="space-y-2">
                        <button
                          onClick={startCamera}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Try Again
                        </button>
                        <p className="text-xs text-gray-400 mt-2">
                          Make sure you've allowed camera access in your browser settings
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-white">
                      <div className="text-4xl mb-2 animate-pulse">📷</div>
                      <p className="text-sm mb-4">Click to enable camera</p>
                      <button
                        onClick={startCamera}
                        className="bg-green-500 text-white px-6 py-3 rounded-full font-medium hover:bg-green-600 transition-colors shadow-lg"
                      >
                        Enable Camera
                      </button>
                      <p className="text-xs text-gray-400 mt-3">
                        You'll be asked to allow camera access
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {cameraActive 
                ? "Position your prescription clearly in the frame and click Capture"
                : "Position your prescription clearly in the frame for best results"}
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