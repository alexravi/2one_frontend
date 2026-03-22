"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";
import { TermsDialog } from "@/components/auth/TermsDialog";

export function TopBar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium cursor-pointer transition-colors"
        title="View Instructions and Key Terms"
      >
        <Info className="w-4 h-4" />
        <span>Instructions / Key Terms and Conditions</span>
      </div>
      
      <TermsDialog 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        isInformational={true} 
      />
    </>
  );
}
