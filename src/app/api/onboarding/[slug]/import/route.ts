import { NextResponse } from "next/server";
import { requireOrganizationMember } from "@/lib/auth/authorization";
import { ImportService } from "@/lib/services/import";

export async function POST(req: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const params = await props.params;
    const slug = params.slug;

    const { organization, membership } = await requireOrganizationMember(slug);

    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".csv")) {
       return NextResponse.json({ error: "File must be a CSV" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
       return NextResponse.json({ error: "File too large. Max 5MB allowed." }, { status: 413 });
    }

    const text = await file.text();

    // Improved basic CSV parser that handles quotes correctly
    // Split by newlines, then regex to split by commas outside quotes
    const rows: string[][] = [];
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
       if (!line.trim()) continue;
       const match = line.match(/(?:\"([^\"]*)\"|([^,]*))(?:,|$)/g);
       if (match) {
         rows.push(match.map(m => m.replace(/,$/, '').replace(/^\"|\"$/g, '').trim()));
       }
    }

    if (rows.length < 2) {
       return NextResponse.json({ error: "CSV appears empty or has no headers" }, { status: 400 });
    }

    const headers = rows[0].map(h => h.trim().toLowerCase());

    // Map standard columns assuming simple exact or partial matches for MVP
    // A robust mapping UI on the frontend would send explicit mapping indices.
    const getIndex = (possibleNames: string[]) => {
       return headers.findIndex(h => possibleNames.some(p => h.includes(p)));
    };

    const firstIdx = getIndex(["first"]);
    const lastIdx = getIndex(["last"]);
    const nameIdx = getIndex(["name"]);
    const emailIdx = getIndex(["email"]);
    const phoneIdx = getIndex(["phone", "mobile"]);
    const sourceIdx = getIndex(["source"]);

    const mappedRecords = [];

    for (let i = 1; i < rows.length; i++) {
       const row = rows[i];
       if (row.length < headers.length) continue; // Skip malformed rows

       let firstName = firstIdx >= 0 ? row[firstIdx] : undefined;
       let lastName = lastIdx >= 0 ? row[lastIdx] : undefined;

       // Fallback to splitting full name if first/last not explicitly provided
       if (!firstName && !lastName && nameIdx >= 0) {
           const parts = row[nameIdx].trim().split(" ");
           firstName = parts[0];
           lastName = parts.slice(1).join(" ");
       }

       mappedRecords.push({
           firstName: firstName?.trim(),
           lastName: lastName?.trim(),
           email: emailIdx >= 0 ? row[emailIdx]?.trim() : undefined,
           phone: phoneIdx >= 0 ? row[phoneIdx]?.trim() : undefined,
           source: sourceIdx >= 0 ? row[sourceIdx]?.trim() : undefined,
       });
    }

    const job = await ImportService.queueCsvImport(organization.id, mappedRecords);

    return NextResponse.json({ success: true, job });

  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
