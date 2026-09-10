"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrganizationSetupState } from "@prisma/client";

type WizardProps = {
  slug: string;
  initialState: OrganizationSetupState | null;
};

const steps = [
  "COMPANY",
  "USERS",
  "CRM",
  "IMPORT",
  "AI",
  "COMMUNICATION",
  "REVIEW"
];

export function OnboardingWizard({ slug, initialState }: WizardProps) {
  const router = useRouter();
  const [currentStepIdx, setCurrentStepIdx] = useState(
    steps.indexOf(initialState?.currentStep || "COMPANY")
  );

  const [isActivating, setIsActivating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);

  // CSV Import State
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    totalRecords: number;
    imported: number;
    skipped: number;
    failed: number;
  } | null>(null);

  const nextStep = async () => {
    setIsSaving(true);
    try {
      const currentStep = steps[currentStepIdx];
      let config = {};
      if (currentStep === "AI") config = { enabled: aiEnabled };
      if (currentStep === "COMMUNICATION") config = { enabled: smsEnabled };

      const advanceTo = currentStepIdx < steps.length - 1 ? steps[currentStepIdx + 1] : currentStep;

      const res = await fetch(`/api/onboarding/${slug}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: currentStep, config, advanceTo })
      });

      if (res.ok) {
        if (currentStepIdx < steps.length - 1) {
          setCurrentStepIdx(currentStepIdx + 1);
        }
      } else {
         console.error("Failed to save step configuration");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const prevStep = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files.length > 0) {
        setFile(e.target.files[0]);
     }
  };

  const uploadCsv = async () => {
     if (!file) return;
     setIsUploading(true);
     setUploadResult(null);

     const formData = new FormData();
     formData.append("file", file);

     try {
       const res = await fetch(`/api/onboarding/${slug}/import`, {
          method: "POST",
          body: formData,
       });
       const data = await res.json();
       if (res.ok) {
          setUploadResult(data.job);
       } else {
          alert("Import failed: " + data.error);
       }
     } catch (e) {
       console.error("Upload error", e);
     } finally {
       setIsUploading(false);
     }
  };

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const res = await fetch(`/api/onboarding/${slug}/activate`, {
        method: 'POST'
      });
      if (res.ok) {
        router.push(`/org/${slug}/dashboard`);
      } else {
        const data = await res.json();
        alert(`Activation failed: ${data.error || "Please check requirements."}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsActivating(false);
    }
  };

  const currentStep = steps[currentStepIdx];

  return (
    <div className="max-w-4xl mx-auto my-12 bg-white rounded-lg shadow-lg border overflow-hidden">
      <div className="flex border-b bg-gray-50">
        {steps.map((step, idx) => (
          <div
            key={step}
            className={`flex-1 py-4 text-center text-sm font-medium ${
              idx === currentStepIdx ? "text-blue-600 border-b-2 border-blue-600" :
              idx < currentStepIdx ? "text-green-600" : "text-gray-400"
            }`}
          >
            {idx + 1}. {step}
          </div>
        ))}
      </div>

      <div className="p-8 min-h-[400px]">
        {currentStep === "COMPANY" && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Company Details</h2>
            <p className="text-gray-600 mb-6">Review your basic company settings.</p>
            {/* Simple static view for now, as it's initialized */}
            <div className="bg-gray-100 p-4 rounded text-sm">
               Settings initialized. (Form would go here)
            </div>
          </div>
        )}

        {currentStep === "USERS" && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Invite Team Members</h2>
            <p className="text-gray-600 mb-6">Invite your agents and admins.</p>
            <div className="bg-gray-100 p-4 rounded text-sm text-center">
               (User Invitation Form would go here)
            </div>
          </div>
        )}

        {currentStep === "CRM" && (
          <div>
            <h2 className="text-2xl font-bold mb-4">CRM Defaults</h2>
            <p className="text-gray-600 mb-6">Configure your sales pipeline stages.</p>
            <div className="bg-gray-100 p-4 rounded text-sm text-center">
               Default Pipeline (NEW, CONTACTED, QUALIFIED...) configured.
            </div>
          </div>
        )}

        {currentStep === "IMPORT" && (
          <div>
            <h2 className="text-2xl font-bold mb-4">Import Leads</h2>
            <p className="text-gray-600 mb-6">Upload a CSV file to import your existing leads.</p>

            {uploadResult ? (
              <div className="bg-green-50 p-6 rounded border border-green-200">
                <h3 className="text-green-800 font-bold mb-2">Import Successful</h3>
                <p>Total Processed: {uploadResult.totalRecords}</p>
                <p>Imported: {uploadResult.imported}</p>
                <p>Skipped: {uploadResult.skipped}</p>
                <p>Failed: {uploadResult.failed}</p>
              </div>
            ) : (
               <div className="flex flex-col gap-4 max-w-md">
                 <input
                   type="file"
                   accept=".csv"
                   onChange={handleFileUpload}
                   className="block w-full border rounded p-2"
                 />
                 <button
                   onClick={uploadCsv}
                   disabled={!file || isUploading}
                   className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                 >
                   {isUploading ? "Uploading..." : "Upload and Import"}
                 </button>
               </div>
            )}
          </div>
        )}

        {currentStep === "AI" && (
           <div>
             <h2 className="text-2xl font-bold mb-4">AI Configuration</h2>
             <p className="text-gray-600 mb-6">Enable AI analysis and smart responses.</p>
             <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  id="ai-enable"
                  className="w-5 h-5"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                />
                <label htmlFor="ai-enable">Enable AI Features (Optional)</label>
             </div>
           </div>
        )}

        {currentStep === "COMMUNICATION" && (
           <div>
             <h2 className="text-2xl font-bold mb-4">Communication</h2>
             <p className="text-gray-600 mb-6">Set up your SMS provider.</p>
             <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  id="sms-enable"
                  className="w-5 h-5"
                  checked={smsEnabled}
                  onChange={(e) => setSmsEnabled(e.target.checked)}
                />
                <label htmlFor="sms-enable">Enable SMS (Optional)</label>
             </div>
           </div>
        )}

        {currentStep === "REVIEW" && (
           <div>
             <h2 className="text-2xl font-bold mb-4">Ready to Activate</h2>
             <p className="text-gray-600 mb-6">Review your setup checklist.</p>
             <ul className="list-disc pl-5 space-y-2 mb-8 text-gray-700">
               <li className="text-green-600">Organization created</li>
               <li className="text-green-600">Admin joined</li>
               <li className="text-green-600">CRM Configured</li>
               <li className="text-gray-500">Leads Imported (Optional)</li>
               <li className="text-gray-500">AI Configured (Optional)</li>
               <li className="text-gray-500">Communication Configured (Optional)</li>
             </ul>
           </div>
        )}
      </div>

      <div className="bg-gray-50 p-4 border-t flex justify-between">
        <button
          onClick={prevStep}
          disabled={currentStepIdx === 0 || isSaving}
          className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        >
          Back
        </button>

        {currentStepIdx < steps.length - 1 ? (
          <button
            onClick={nextStep}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Continue"}
          </button>
        ) : (
          <button
            onClick={handleActivate}
            disabled={isActivating || isSaving}
            className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-50"
          >
            {isActivating ? "Activating..." : "Activate EstateScale"}
          </button>
        )}
      </div>
    </div>
  );
}
