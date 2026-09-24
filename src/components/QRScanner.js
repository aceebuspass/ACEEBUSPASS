import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FaQrcode, FaTimes, FaCheckCircle, FaClock, FaBus, FaIdCard } from 'react-icons/fa';
import styles from './QRScanner.module.css';
import MobilePassView from './MobilePassView';
import BusPassTemplate from './BusPassTemplate';
import { verifyPassData } from '../utils/api';

function QRScanner() {
  const [scannedData, setScannedData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const startScanning = async () => {
    try {
      setError('');
      setIsScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Camera access denied or not available');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setScannedData(null);
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Simple QR detection simulation - in real implementation, use a QR library
    // For now, we'll simulate scanning with a button
    return canvas.toDataURL();
  };

  const simulateQRScan = () => {
    // Simulate scanning a QR code with sample data
    const sampleData = {
      name: "Mohammed Faizan N",
      regNo: "6176AC22UC5094",
      route: "ACE TO KRISHNAGIRI",
      validity: "",  // Will be set by the server
      approvedAt: "2025-09-12T15:14:30.166Z",
      branchYear: "B.E/CSE IV",
      dob: "2002-05-15",
      mobile: "9876543210",
      photo: "1757734786412-957329662-pavan passport.jpg", // Use existing photo

    };
    setScannedData(sampleData);
    stopScanning();
  };

  const handleQRData = async (data) => {
    try {
      // Try to parse as JSON first
      const parsedData = JSON.parse(data);

      // Check if the pass is cancelled
      if (parsedData.cancelled) {
        setError('This pass has been cancelled and is no longer valid');
        setScannedData({
          ...parsedData,
          status: 'cancelled',
          cancelMessage: `Cancelled on ${new Date(parsedData.cancelledAt).toLocaleDateString()} by ${parsedData.cancelledBy}`
        });
        return;
      }

      // Check pass validity with the server
      const passId = parsedData.regNo || parsedData.passNo;
      const verificationData = await verifyPassData(passId);

      if (!verificationData.valid) {
        setError(verificationData.message);
        setScannedData({
          ...parsedData,
          status: 'invalid',
          invalidMessage: verificationData.message
        });
        return;
      }

      if (parsedData.passUrl) {
        window.location.href = parsedData.passUrl;
        return;
      }

      setScannedData({
        ...parsedData,
        status: 'valid',
        verifiedAt: new Date().toISOString()
      });
    } catch (e) {
      // If not JSON, check if it's a URL
      if (data.startsWith('http')) {
        window.location.href = data;
        return;
      }
      // Otherwise treat as plain text
      setScannedData({ rawData: data });
    }
    stopScanning();
  };

  const clearResult = () => {
    setScannedData(null);
    setError('');
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (scannedData) {
    // If it's raw data, show it as text
    // If we have scanned data, show the mobile pass view
    if (scannedData) {
      try {
        const passData = typeof scannedData === 'string' ? JSON.parse(scannedData) : scannedData;
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="p-4"
          >
            <MobilePassView passData={passData} />
          </motion.div>
        );
      } catch (error) {
        console.error('Error parsing pass data:', error);
        return (
          <div className="p-4 bg-red-100 text-red-700 rounded-lg">
            Invalid QR code format. Please scan a valid bus pass QR code.
          </div>
        );
      }
    }

    // If it's structured data, show the bus pass template
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-lg p-8 border-2 border-blue-200 mt-8 max-w-4xl mx-auto"
      >
        <div className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 rounded-t-lg mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <FaQrcode className="text-2xl mr-3" />
            <h2 className="text-xl font-bold">Pass Verification Result</h2>
          </div>
          <button
            onClick={clearResult}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className={`text-lg font-bold mb-4 flex items-center ${scannedData.status === 'cancelled' ? 'text-red-600' :
                scannedData.status === 'invalid' ? 'text-yellow-600' :
                  'text-green-600'
              }`}>
              {scannedData.status === 'cancelled' ? (
                <>
                  <FaTimes className="mr-2" />
                  Pass Cancelled
                </>
              ) : scannedData.status === 'invalid' ? (
                <>
                  <FaTimes className="mr-2" />
                  Invalid Pass
                </>
              ) : (
                <>
                  <FaCheckCircle className="mr-2" />
                  <span className="text-green-600 font-bold">APPROVED</span>
                </>
              )}
            </div>

            {(scannedData.status === 'cancelled' || scannedData.status === 'invalid') && (
              <div className={`p-4 rounded-lg mb-4 ${scannedData.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                }`}>
                {scannedData.status === 'cancelled' ? scannedData.cancelMessage : scannedData.invalidMessage}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Verification Time</span>
                <span className="font-semibold">{new Date().toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Pass Status</span>
                <span className={`font-semibold ${scannedData.status === 'cancelled' ? 'text-red-600' :
                    scannedData.status === 'invalid' ? 'text-yellow-600' :
                      'text-green-600'
                  }`}>
                  {scannedData.status === 'cancelled' ? 'CANCELLED' :
                    scannedData.status === 'invalid' ? 'INVALID' :
                      'ACTIVE'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Valid Until</span>
                <span className="font-semibold">{scannedData.validTill}</span>
              </div>
            </div>
          </div>

          {/* Pass Details Card */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Pass Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Name</span>
                <span className="font-semibold">{scannedData.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Registration No.</span>
                <span className="font-semibold">{scannedData.regNo}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Branch/Year</span>
                <span className="font-semibold">{scannedData.branch} {scannedData.year}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Bus No.</span>
                <span className="font-semibold">{scannedData.busNo}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Pass No.</span>
                <span className="font-semibold">{scannedData.passNo}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Full Bus Pass Template */}
        <div className="w-full">
          <h3 className="text-lg font-bold mb-4 text-gray-800">Original Pass</h3>
          <BusPassTemplate studentData={scannedData} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-lg p-8 border-2 border-blue-200 mt-8"
    >
      <h2 className="text-lg font-bold text-blue-700 mb-4">
        <FaQrcode style={{ marginRight: 8, color: '#6366f1', verticalAlign: 'middle' }} />
        QR Scanner
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isScanning ? (
        <div className="w-full max-w-md">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-64 bg-black rounded-lg"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-lg"></div>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <button
              onClick={stopScanning}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Stop Scanning
            </button>
            <button
              onClick={simulateQRScan}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Simulate Scan
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className="w-24 h-24 mb-4 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <FaQrcode className="w-12 h-12 text-blue-500" />
          </div>
          <p className="text-gray-600 mb-4">Click to start scanning QR codes</p>
          <button
            onClick={startScanning}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded transition-colors"
          >
            Start Scanning
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default QRScanner;