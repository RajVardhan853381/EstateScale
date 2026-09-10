"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Provide a mock structure for the settings client
import { useParams } from "next/navigation";

export default function SettingsPage() {
    const params = useParams();
    const slug = params.slug as string;
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: "success" | "error" } | null>(null);

    const [name, setName] = useState("Acme Real Estate");
    const [aiAnalysis, setAiAnalysis] = useState(true);
    const [aiDrafts, setAiDrafts] = useState(true);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setToast(null);

        try {
            const res = await fetch(`/api/org/${slug}/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    ai: {
                        leadAnalysis: aiAnalysis,
                        responseDrafts: aiDrafts
                    }
                })
            });

            if (res.ok) {
                setToast({ message: "Settings saved successfully.", type: "success" });
            } else {
                const data = await res.json();
                setToast({ message: data.error || "Failed to save settings.", type: "error" });
            }
        } catch (error) {
            setToast({ message: "An unexpected error occurred.", type: "error" });
        } finally {
            setIsSaving(false);
            setTimeout(() => setToast(null), 3000);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Organization Settings</h1>
                <p className="mt-2 text-gray-600">Manage your organization&apos;s general configuration and integrations.</p>
            </div>

            {toast && (
                <div className={`p-4 rounded-md shadow-sm border ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                    {toast.message}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>General Information</CardTitle>
                        <CardDescription>Basic settings for your EstateScale organization.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="orgName" className="text-sm font-medium text-gray-700">Organization Name</label>
                            <Input
                               id="orgName"
                               value={name}
                               onChange={(e) => setName(e.target.value)}
                               className="max-w-md"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="orgSlug" className="text-sm font-medium text-gray-700">Organization Slug</label>
                            <Input
                               id="orgSlug"
                               value={slug}
                               disabled
                               className="max-w-md bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-500">The slug cannot be changed after creation.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                           <div>
                               <CardTitle>AI Configuration</CardTitle>
                               <CardDescription>Manage how AI interacts with your leads.</CardDescription>
                           </div>
                           <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Enabled</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <input
                               type="checkbox"
                               id="ai-lead-analysis"
                               checked={aiAnalysis}
                               onChange={(e) => setAiAnalysis(e.target.checked)}
                               className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                            />
                            <div>
                                <label htmlFor="ai-lead-analysis" className="text-sm font-medium text-gray-900">Automatic Lead Analysis</label>
                                <p className="text-xs text-gray-500">AI will automatically score and analyze new leads.</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <input
                               type="checkbox"
                               id="ai-response-drafts"
                               checked={aiDrafts}
                               onChange={(e) => setAiDrafts(e.target.checked)}
                               className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                            />
                            <div>
                                <label htmlFor="ai-response-drafts" className="text-sm font-medium text-gray-900">Response Drafting</label>
                                <p className="text-xs text-gray-500">AI will generate suggested SMS responses for hot leads.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Communication (Twilio)</CardTitle>
                        <CardDescription>SMS messaging configuration.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="twilioNumber" className="text-sm font-medium text-gray-700">Sender Phone Number</label>
                            <Input id="twilioNumber" defaultValue="+1 (555) 019-2834" disabled className="max-w-md bg-gray-50 text-gray-500" />
                            <p className="text-xs text-gray-500">Please contact support to change your verified sender number.</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end space-x-4">
                    <Button type="button" variant="outline">Cancel</Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? "Saving Changes..." : "Save Settings"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
