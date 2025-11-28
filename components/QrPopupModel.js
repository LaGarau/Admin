import React from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function QrPopupModal({ qrDataToShow, setQrDataToShow, setSelectedQR, downloadQR }) {
  if (!qrDataToShow) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl p-8 w-[90%] max-w-md relative animate-fadeIn">
        <button
          onClick={() => {
            setQrDataToShow(null);
            setSelectedQR(null);
          }}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition"
        >
          ✕
        </button>

        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6 text-center">
          Your QR Code is Ready!
        </h2>

        <div className="flex justify-center mb-6">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-inner">
            <QRCodeCanvas value={qrDataToShow} size={200} />
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={downloadQR}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg shadow-md hover:scale-105 transform transition"
          >
            Download
          </button>
          <button
            onClick={() => {
              setQrDataToShow(null);
              setSelectedQR(null);
            }}
            className="px-6 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg shadow-md hover:scale-105 transform transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
