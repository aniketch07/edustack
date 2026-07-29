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

  const defaultPasswordHash = await bcrypt.hash('admin123', 10);
  const teacherPasswordHash = await bcrypt.hash('teacher123', 10);
  const studentPasswordHash = await bcrypt.hash('student123', 10);

  // 1. Create Super Admin (no instituteId)
  const superAdmin = await upsertUser({
    email: 'admin@edustack.com',
    password: defaultPasswordHash,
    firstName: 'Super',
    lastName: 'Admin',
    role: UserRole.SUPER_ADMIN,
    instituteId: null,
  });
  console.log(`✅ Super Admin created: ${superAdmin.email}`);

  // 2. Create Demo Institute
  const demoInstitute = await prisma.institute.upsert({
    where: { slug: 'demo-coaching' },
    update: {},
    create: {
      name: 'Demo Coaching Academy',
      slug: 'demo-coaching',
      contactEmail: 'contact@democoaching.com',
      contactPhone: '+91 9876543210',
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
    },
  });
  console.log(`✅ Demo Institute created: ${demoInstitute.name} (${demoInstitute.id})`);

  // 3. Create Institute Admin
  const instAdmin = await upsertUser({
    email: 'admin@democoaching.com',
    password: defaultPasswordHash,
    firstName: 'Rajesh',
    lastName: 'Kumar',
    role: UserRole.INSTITUTE_ADMIN,
    instituteId: demoInstitute.id,
  });
  console.log(`✅ Institute Admin created: ${instAdmin.email}`);

  // 4. Create Teacher
  const teacher = await upsertUser({
    email: 'teacher@democoaching.com',
    password: teacherPasswordHash,
    firstName: 'Sharma',
    lastName: 'Sir',
    role: UserRole.TEACHER,
    instituteId: demoInstitute.id,
  });
  console.log(`✅ Teacher created: ${teacher.email}`);

  // 5. Create Student
  const student = await upsertUser({
    email: 'student@democoaching.com',
    password: studentPasswordHash,
    firstName: 'Amit',
    lastName: 'Verma',
    role: UserRole.STUDENT,
    instituteId: demoInstitute.id,
  });
  console.log(`✅ Student created: ${student.email}`);

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
