import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create the default admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nflpa.com' },
    update: {},
    create: {
      email: 'admin@nflpa.com',
      password: hashedPassword,
      name: 'Admin',
      isAdmin: true,
      isFullAdmin: true,
    },
  });

  console.log('Created admin user:', admin.email);

  // Create some sample partners for testing
  const partners = [
    { name: 'Nike', contractTotal: 5000000, isFlexFund: false },
    { name: 'Gatorade', contractTotal: 3000000, isFlexFund: false },
    { name: 'EA Sports', contractTotal: 0, isFlexFund: true },
  ];

  for (const partnerData of partners) {
    const partner = await prisma.partner.upsert({
      where: { name: partnerData.name },
      update: {},
      create: partnerData,
    });
    console.log('Created partner:', partner.name);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
