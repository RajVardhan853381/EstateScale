import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/authorization';
import { TemplateService, TemplateType } from '@/lib/services/templates';

export async function GET(req: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const params = await props.params;
    const { organization } = await requireRole(params.slug, ['OWNER', 'ADMIN']);
    const url = new URL(req.url);
    const type = url.searchParams.get('type') as TemplateType | null;

    const templates = await TemplateService.getAvailableTemplates(
      organization.id,
      type || undefined
    );
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}

export async function POST(req: Request, props: { params: Promise<{ slug: string }> }) {
  try {
    const params = await props.params;
    // Strict Authorization: Only Admins configure templates
    const { organization } = await requireRole(params.slug, ['OWNER', 'ADMIN']);
    const body = await req.json();

    if (body.action === 'DUPLICATE') {
      const { templateId, newName } = body;
      const newTemplate = await TemplateService.duplicateTemplate(
        organization.id,
        templateId,
        newName
      );
      return NextResponse.json(newTemplate);
    }

    if (body.action === 'UPDATE') {
      const { templateId, updates } = body;
      const updated = await TemplateService.updateTemplate(organization.id, templateId, updates);
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 403 });
  }
}
