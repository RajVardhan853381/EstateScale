"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ContactForm() {
    return (
        <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">First Name</label>
                    <Input name="firstName" placeholder="John" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name</label>
                    <Input name="lastName" placeholder="Doe" />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input name="email" type="email" placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input name="phone" placeholder="+1 (555) 000-0000" />
            </div>
            <Button type="submit">Save Contact</Button>
        </form>
    );
}
