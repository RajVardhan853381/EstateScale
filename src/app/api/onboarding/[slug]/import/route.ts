import { NextResponse } from 'next/server';
import { requireOrganizationMember } from '@/lib/auth/authorization';
import { ImportService } from '@/lib/services/import';
import { prisma } from '@/lib/prisma';
import { runWithRequestContext } from '@/lib/observability/context';
import crypto from 'node:crypto';

export const maxDuration = 60;

export async function POST(req: Request, props: { params: Promise<{ slug: string }> }) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  return runWithRequestContext({ requestId }, async () => {
    try {
      const params = await props.params;
      const slug = params.slug;

      const { organization, membership } = await requireOrganizationMember(slug);

      if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      if (!file.name.endsWith('.csv')) {
        return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
      }

      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        return NextResponse.json({ error: 'File too large. Max 5MB allowed.' }, { status: 413 });
      }

      const text = await file.text();

      // Robust CSV parser handling quotes and commas
      const rows: string[][] = [];
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        if (!line.trim()) continue;
        const match = line.match(/(?:\"([^\"]*)\"|([^,]*))(?:,|$)/g);
        if (match) {
          rows.push(
            match.map((m) =>
              m
                .replace(/,$/, '')
                .replace(/^\"|\"$/g, '')
                .trim()
            )
          );
        }
      }

      if (rows.length < 2) {
        return NextResponse.json({ error: 'CSV appears empty or has no headers' }, { status: 400 });
      }

      const headers = rows[0].map((h) => h.trim().toLowerCase());

      const getIndex = (possibleNames: string[]) => {
        return headers.findIndex((h) => possibleNames.some((p) => h.includes(p)));
      };

      const firstIdx = getIndex(['first']);
      const lastIdx = getIndex(['last']);
      const nameIdx = getIndex(['name']);
      const emailIdx = getIndex(['email']);
      const phoneIdx = getIndex(['phone', 'mobile']);
      const sourceIdx = getIndex(['source']);

      const mappedRecords = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < headers.length) continue; // Skip malformed rows

        let firstName = firstIdx >= 0 ? row[firstIdx] : undefined;
        let lastName = lastIdx >= 0 ? row[lastIdx] : undefined;

        // Fallback to splitting full name if first/last not explicitly provided
        if (!firstName && !lastName && nameIdx >= 0) {
          const parts = row[nameIdx].trim().split(' ');
          firstName = parts[0];
          lastName = parts.slice(1).join(' ');
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
      return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
    }
  });
}

export async function GET(req: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const params = await props.params;
    const slug = params.slug;

    const { organization } = await requireOrganizationMember(slug);
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'jobId query parameter is required' }, { status: 400 });
    }

    const job = await prisma.importJob.findFirst({
      where: {
        id: jobId,
        organizationId: organization.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Import job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, job });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}
