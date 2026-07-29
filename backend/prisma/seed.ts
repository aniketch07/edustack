import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function upsertUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  instituteId?: string | null;
}) {
  const existing = await prisma.user.findFirst({
    where: {
      email: data.email,
      ...(data.instituteId ? { instituteId: data.instituteId } : { role: data.role }),
    },
  });

  if (existing) return existing;

  return prisma.user.create({
    data: {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      instituteId: data.instituteId || null,
    },
  });
}

async function main() {
  console.log('🌱 Starting EduStack Database Seeding...');

  // Environment variables with defaults for production
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@your-domain.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'change-this-in-production';

  const superAdminPasswordHash = await bcrypt.hash(superAdminPassword, 10);

  // 1. Create Super Admin (no instituteId)
  const superAdmin = await upsertUser({
    email: superAdminEmail,
    password: superAdminPasswordHash,
    firstName: 'Aniket',
    lastName: 'Admin',
    role: UserRole.SUPER_ADMIN,
    instituteId: null,
  });
  console.log(`✅ Super Admin created: ${superAdmin.email}`);

  console.log('🎉 Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
