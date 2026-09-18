import { prisma } from '../prisma';
import { auditLogger } from '../observability/logger';

export type TemplateType = 'CRM_PIPELINE' | 'JOURNEY' | 'AI_AGENT' | 'SMS';

export class TemplateService {
  /**
   * Returns all templates available to a tenant (Global System Defaults + Tenant Custom)
   */
  static async getAvailableTemplates(organizationId: string, type?: TemplateType) {
    return prisma.template.findMany({
      where: {
        OR: [
          { organizationId: null }, // Global defaults
          { organizationId }, // Tenant specific
        ],
        ...(type && { type }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Safely duplicates a System Template (or an existing tenant template) into a new Tenant-owned configuration.
   */
  static async duplicateTemplate(organizationId: string, templateId: string, newName: string) {
    const source = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!source) {
      throw new Error('Template not found');
    }

    // Security Check: Ensure the user isn't copying another private tenant's template
    if (source.organizationId && source.organizationId !== organizationId) {
      throw new Error(
        'Forbidden: Tenant isolation violation. Cannot copy template from another organization.'
      );
    }

    const newTemplate = await prisma.template.create({
      data: {
        organizationId,
        type: source.type,
        name: newName,
        description: source.description,
        config: source.config ?? {},
      },
    });

    auditLogger.info(
      { organizationId, templateId: newTemplate.id, action: 'TEMPLATE_DUPLICATED' },
      'Template duplicated into tenant workspace'
    );

    return newTemplate;
  }

  /**
   * Modifies a Tenant-Owned Template configuration safely.
   */
  static async updateTemplate(
    organizationId: string,
    templateId: string,
    updates: { name?: string; config?: object; isActive?: boolean }
  ) {
    const target = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!target) throw new Error('Template not found');
    if (!target.organizationId) throw new Error('Forbidden: Cannot modify Global System templates');
    if (target.organizationId !== organizationId)
      throw new Error('Forbidden: Tenant isolation violation');

    const updated = await prisma.template.update({
      where: { id: templateId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.config && { config: updates.config }),
        ...(updates.isActive !== undefined && { isActive: updates.isActive }),
      },
    });

    auditLogger.info(
      { organizationId, templateId, action: 'TEMPLATE_UPDATED' },
      'Template updated'
    );

    return updated;
  }
}
