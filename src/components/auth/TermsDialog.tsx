import React, { useState } from "react";
import { Button } from "@/components/ui/Button";

interface TermsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export function TermsDialog({ isOpen, onClose, onAccept }: TermsDialogProps) {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 relative mx-auto my-auto border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Review Before Continuing</h2>
        <p className="text-sm shadow-sm text-gray-600 dark:text-gray-300 mb-5">
          Please review and accept our terms:
        </p>
        
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6 border border-gray-100 dark:border-gray-800">
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Your recordings will be used strictly for AI training and research purposes</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>You must have consent from all participants in the recording</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Only real phone call conversations are allowed (no music, podcasts, or fake audio)</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Payments are made only for approved recordings after validation</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Invalid, duplicate, or fraudulent uploads will be rejected and may lead to account suspension</span>
            </li>
          </ul>
        </div>

        <div className="flex items-start mb-6">
          <div className="flex items-center h-5">
            <input
              id="terms-agree"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-600 dark:ring-offset-gray-800"
            />
          </div>
          <label htmlFor="terms-agree" className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300 cursor-pointer">
            By continuing, you confirm that you understand and agree to these terms.
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button 
            onClick={() => { if (agreed) onAccept(); }} 
            disabled={!agreed}
            className="w-full sm:w-auto"
          >
            I Agree & Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
