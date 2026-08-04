/* eslint-disable @typescript-eslint/no-var-requires */
// Creates a dummy institute with 1 admin + 2 teachers + 15 students.
// Uses Prisma directly (NOT the users service) so NO welcome emails are sent.
// Writes all login credentials to /home/an1ket/edustack/dummy-login.txt
require('dotenv').config();
const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');

const prisma = new PrismaClient();

const INSTITUTE_NAME = 'Dummy Test Academy';
const INSTITUTE_SLUG = 'dummy-test-academy';
const PASSWORD = 'Dummy@123';
const PLAN = { planName: 'Growth', studentLimit: 40, subscriptionStatus: 'ACTIVE' };

function email(role, i) {
  return `${role}${i}@dummyacademy.com`;
}

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  // Upsert institute
  let institute = await prisma.institute.findUnique({ where: { slug: INSTITUTE_SLUG } });
  if (!institute) {
    institute = await prisma.institute.create({
      data: {
        name: INSTITUTE_NAME,
        slug: INSTITUTE_SLUG,
        contactEmail: 'admin@dummyacademy.com',
        contactPhone: '+91 0000000000',
        planName: PLAN.planName,
        studentLimit: PLAN.studentLimit,
        subscriptionStatus: PLAN.subscriptionStatus,
      },
    });
    console.log(`✅ Created institute: ${INSTITUTE_NAME} (${PLAN.planName}, ${PLAN.studentLimit} seats)`);
  } else {
    console.log(`ℹ️  Institute already exists: ${INSTITUTE_NAME}`);
  }

  const accounts = [];

  // Helper to create a user (skip if email already exists in this institute)
  async function ensureUser(email, firstName, lastName, role) {
    const existing = await prisma.user.findFirst({ where: { email, instituteId: institute.id } });
    if (existing) {
      console.log(`ℹ️  Skipped (exists): ${email}`);
      return;
    }
    await prisma.user.create({
      data: { email, password: hash, firstName, lastName, role, instituteId: institute.id },
    });
    console.log(`✅ Created ${role}: ${email}`);
    accounts.push({ role, email, password: PASSWORD, firstName, lastName });
  }

  // 1 Institute admin
  await ensureUser('admin@dummyacademy.com', 'Dummy', 'Admin', UserRole.INSTITUTE_ADMIN);

  // 2 Teachers
  for (let i = 1; i <= 2; i++) {
    await ensureUser(email('teacher', i), `DummyTeacher${i}`, 'Faculty', UserRole.TEACHER);
  }

  // 15 Students
  for (let i = 1; i <= 15; i++) {
    await ensureUser(email('student', i), `DummyStudent${i}`, 'Learner', UserRole.STUDENT);
  }

  // Write credentials file
  const lines = [
    `# EduStack — Dummy Login Credentials`,
    `Institute: ${INSTITUTE_NAME} (slug: ${INSTITUTE_SLUG})`,
    `Plan: ${PLAN.planName} | Student seats: ${PLAN.studentLimit}`,
    `Common password: ${PASSWORD}`,
    ``,
    `| Role | Email | Password |`,
    `|---|---|---|`,
  ];
  const ordered = [
    ...accounts.filter((a) => a.role === 'INSTITUTE_ADMIN'),
    ...accounts.filter((a) => a.role === 'TEACHER'),
    ...accounts.filter((a) => a.role === 'STUDENT'),
  ];
  ordered.forEach((a) => {
    lines.push(`| ${a.role.replace('_', ' ').toLowerCase()} | ${a.email} | ${a.password} |`);
  });
  lines.push('', `Total new accounts created: ${accounts.length}`);

  const outPath = '/home/an1ket/edustack/dummy-login.txt';
  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
  console.log(`\n📄 Credentials written to: ${outPath}`);
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
