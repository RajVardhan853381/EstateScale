import { prisma } from "@/lib/prisma";
import { contactSchema, paginationSchema } from "@/lib/validations/crm";
import { requireOrganizationMember } from "@/lib/auth/authorization";

export async function createContact(slug: string, data: unknown) {
  const { organization } = await requireOrganizationMember(slug);
  const validated = contactSchema.parse(data);

  return prisma.contact.create({
    data: {
      ...validated,
      organizationId: organization.id,
    },
  });
}

export async function getContact(slug: string, contactId: string) {
  const { organization } = await requireOrganizationMember(slug);

  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      organizationId: organization.id,
    },
    include: {
      _count: {
        select: { leads: true },
      },
    },
  });

  if (!contact) {
    throw new Error("NOT_FOUND");
  }

  return contact;
}

export async function listContacts(slug: string, queryParams: unknown) {
  const { organization } = await requireOrganizationMember(slug);
  const { page, limit } = paginationSchema.parse(queryParams);
  const skip = (page - 1) * limit;

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where: { organizationId: organization.id },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      include: {
        _count: { select: { leads: true } },
        leads: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { updatedAt: true },
        },
      },
    }),
    prisma.contact.count({
      where: { organizationId: organization.id },
    }),
  ]);

  return {
    contacts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
