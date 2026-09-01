"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { triggerLeadAnalysis } from "@/lib/actions/ai";
import { Sparkles, Loader2 } from "lucide-react";

import { Prisma } from "@prisma/client";

type AssessmentPayload = Prisma.AiAssessmentGetPayload<Prisma.AiAssessmentDefaultArgs>;

export function AiLeadAssessment({
    slug,
    leadId,
    assessment
}: {
    slug: string,
    leadId: string,
    assessment?: AssessmentPayload | null
}) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setError(null);
        try {
            const res = await triggerLeadAnalysis(slug, leadId);
            if (!res.success) {
                setError(res.error || "Failed to queue analysis.");
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Unknown Error");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <Card className="border-blue-100 shadow-sm">
            <CardHeader className="bg-blue-50/50 pb-4">
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-blue-900">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        AI Assessment
                    </CardTitle>
                    <Button
                        size="sm"
                        variant="outline"
                        className="bg-white"
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Queuing...</>
                        ) : (
                            "Re-analyze"
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
                {error && <div className="text-red-500 text-sm p-2 bg-red-50 rounded">{error}</div>}

                {!assessment ? (
                    <div className="text-gray-500 italic text-center py-4">No AI assessment generated yet.</div>
                ) : (
                    <>
                        <div className="flex gap-4">
                            <div className="flex-1 bg-gray-50 p-3 rounded-lg border">
                                <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Score</div>
                                <div className="text-2xl font-bold text-gray-900">{assessment.score ?? "-"}</div>
                            </div>
                            <div className="flex-1 bg-gray-50 p-3 rounded-lg border">
                                <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Intent</div>
                                <div className="font-medium">{assessment.intent || "-"}</div>
                            </div>
                            <div className="flex-1 bg-gray-50 p-3 rounded-lg border">
                                <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Status</div>
                                <div><Badge variant="outline">{assessment.qualificationStatus || "-"}</Badge></div>
                            </div>
                        </div>

                        <div>
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Score Reasoning</div>
                            <p className="text-gray-700 leading-relaxed">{assessment.scoreReasoning || "-"}</p>
                        </div>

                        <div>
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Qualification Logic</div>
                            <p className="text-gray-700 leading-relaxed">{assessment.qualificationReason || "-"}</p>
                        </div>

                        {assessment.suggestedResponse && (
                            <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                                <div className="text-xs text-blue-800 uppercase font-semibold mb-2">Suggested Response Draft</div>
                                <p className="text-gray-800 italic">{assessment.suggestedResponse}</p>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
