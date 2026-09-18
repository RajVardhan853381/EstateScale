import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@estatescale.com';
  const passwordHash = await bcrypt.hash('password123', 10);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!existingUser) {
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Super Admin',
        passwordHash,
      },
    });

    await prisma.platformAdmin.create({
      data: {
        userId: user.id,
        role: 'SUPER_ADMIN',
      },
    });

    console.log(`Created platform admin user: ${email}`);
  } else {
    console.log(`User ${email} already exists.`);

    const existingAdmin = await prisma.platformAdmin.findUnique({
        where: { userId: existingUser.id }
    });

    if (!existingAdmin) {
         await prisma.platformAdmin.create({
          data: {
            userId: existingUser.id,
            role: 'SUPER_ADMIN',
          },
        });
        console.log(`Granted platform admin role to existing user: ${email}`);
    }
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
