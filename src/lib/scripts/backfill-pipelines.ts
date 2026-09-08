import { PrismaClient } from '@prisma/client';
import { initializeDefaultPipeline } from '../services/pipelines';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting pipeline backfill...');
  const organizations = await prisma.organization.findMany();

  for (const org of organizations) {
    console.log(`Processing organization: ${org.slug}`);
    await initializeDefaultPipeline(org.id);
  }

  console.log('Backfill complete.');
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
