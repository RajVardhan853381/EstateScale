"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/billing/plans";

type Props = {
   slug: string;
   currentPlan: string;
   status: string;
   hasPaymentMethod: boolean;
};

export default function BillingPageClient({ slug, currentPlan, status, hasPaymentMethod }: Props) {
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleCheckout = async (priceId: string, action: "checkout" | "portal") => {
        setIsLoading(action);
        try {
            const res = await fetch(`/api/org/${slug}/billing`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, priceId })
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Billing & Subscriptions</h1>
                    <p className="mt-2 text-gray-600">Manage your plan, limits, and payment methods.</p>
                </div>
                {hasPaymentMethod && (
                    <Button variant="outline" onClick={() => handleCheckout("", "portal")} disabled={isLoading !== null}>
                        {isLoading === "portal" ? "Opening..." : "Billing Portal"}
                    </Button>
                )}
            </div>

            <Card className="bg-slate-50 border-slate-200">
               <CardContent className="p-6">
                   <div className="flex justify-between items-center">
                       <div>
                           <div className="text-sm font-medium text-slate-500 mb-1">Current Plan</div>
                           <div className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                               {PLANS[currentPlan as keyof typeof PLANS]?.name || "Unknown"}
                               <Badge variant={status === "ACTIVE" ? "default" : "destructive"}>{status}</Badge>
                           </div>
                       </div>
                   </div>
               </CardContent>
            </Card>

            <h2 className="text-xl font-bold pt-4">Available Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.values(PLANS).map((plan) => (
                    <Card key={plan.id} className={`flex flex-col ${currentPlan === plan.id ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : ''}`}>
                        <CardHeader>
                            <CardTitle className="text-xl">{plan.name}</CardTitle>
                            <CardDescription className="text-2xl font-bold text-gray-900 mt-2">
                                ${plan.price / 100} <span className="text-sm font-normal text-gray-500">/mo</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4">
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" />
                                    {plan.limits.leads.toLocaleString()} Leads
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" />
                                    {plan.limits.sms.toLocaleString()} SMS / mo
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" />
                                    {plan.limits.aiTokens.toLocaleString()} AI Tokens
                                </li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            {currentPlan === plan.id ? (
                                <Button className="w-full" disabled variant="outline">Current Plan</Button>
                            ) : plan.id === "ENTERPRISE" ? (
                                <Button className="w-full" variant="outline">Contact Sales</Button>
                            ) : (
                                <Button
                                    className="w-full"
                                    onClick={() => handleCheckout(plan.stripePriceId!, "checkout")}
                                    disabled={isLoading !== null || !plan.stripePriceId}
                                >
                                    {isLoading === "checkout" ? "Loading..." : "Upgrade"}
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
