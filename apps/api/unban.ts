import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.update({
    where: {
      email: "admin@nexora.io"
    },
    data: {
      isBanned: false
    }
  });

  console.log("Unbanned!");
}

main().finally(() => prisma.$disconnect());