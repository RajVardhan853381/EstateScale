import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@estatescale.com';
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Ensure SuperAdmin User with verified passwordHash
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      name: 'Super Admin',
    },
    create: {
      email,
      name: 'Super Admin',
      passwordHash,
    },
  });
  console.log(`Ensured platform admin user: ${email} with password123`);

  // 2. Ensure PlatformAdmin Role
  const existingAdmin = await prisma.platformAdmin.findUnique({
    where: { userId: user.id },
  });

  if (!existingAdmin) {
    await prisma.platformAdmin.create({
      data: {
        userId: user.id,
        role: 'SUPER_ADMIN',
      },
    });
    console.log(`Granted platform admin role to user: ${email}`);
  }

  // 3. Ensure Demo Organization
  let org = await prisma.organization.findUnique({
    where: { slug: 'demo' },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Demo Organization',
        slug: 'demo',
        status: 'ACTIVE',
      },
    });
    console.log(`Created Demo Organization: demo`);
  }

  // 4. Ensure SuperAdmin Membership in Demo Org
  const membership = await prisma.organizationMembership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id,
      },
    },
  });

  if (!membership) {
    await prisma.organizationMembership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'OWNER',
      },
    });
    console.log(`Linked ${email} as OWNER to Demo Organization`);
  }

  // 5. Ensure OrganizationCommunicationConfig for Demo Org
  const commConfig = await prisma.organizationCommunicationConfig.findFirst({
    where: { organizationId: org.id },
  });

  if (!commConfig) {
    await prisma.organizationCommunicationConfig.create({
      data: {
        organizationId: org.id,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+15550000000',
        isActive: true,
        provider: 'TWILIO',
      },
    });
    console.log(`Created default OrganizationCommunicationConfig for Demo Organization`);
  }

  // 6. Ensure Sample Leads for Demo Org
  const leadCount = await prisma.lead.count({ where: { organizationId: org.id } });
  if (leadCount === 0) {
    const contact1 = await prisma.contact.create({
      data: {
        organizationId: org.id,
        firstName: 'Eleanor',
        lastName: 'Vance',
        email: 'eleanor.vance@example.com',
        phone: '+15552345678',
      },
    });

    await prisma.lead.create({
      data: {
        organizationId: org.id,
        contactId: contact1.id,
        status: 'QUALIFIED',
        score: 92,
        intent: 'BUY',
        budget: 1250000,
        location: 'Beverly Hills / Westside',
        propertyType: 'SINGLE_FAMILY',
        timeline: 'IMMEDIATE',
        notesText: 'Pre-approved for $1.5M with Chase Private Client. Looking for modern architectural estate.',
      },
    });

    const contact2 = await prisma.contact.create({
      data: {
        organizationId: org.id,
        firstName: 'Marcus',
        lastName: 'Sterling',
        email: 'marcus.sterling@example.com',
        phone: '+15559876543',
      },
    });

    await prisma.lead.create({
      data: {
        organizationId: org.id,
        contactId: contact2.id,
        status: 'NEW',
        score: 78,
        intent: 'INVEST',
        budget: 2800000,
        location: 'Downtown Waterfront',
        propertyType: 'MULTI_FAMILY',
        timeline: '1_MONTH',
        notesText: '1031 Exchange buyer seeking commercial multi-family property with cap rate > 6.5%.',
      },
    });
    console.log(`Created sample leads and contacts for Demo Organization`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
