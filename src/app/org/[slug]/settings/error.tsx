"use client";
import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GenericError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="bg-white border border-red-100 rounded-lg p-8 max-w-md text-center shadow-sm">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-500 mb-6">
          We encountered a problem loading this page. Please try again.
        </p>
        <Button onClick={() => reset()} variant="outline" className="w-full justify-center">
          Retry Loading
        </Button>
      </div>
    </div>
  );
}
