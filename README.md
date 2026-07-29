# 🎓 EduStack - Multi-Tenant Online Learning Platform

> Launch your coaching institute's online academy in 24 hours — zero custom development required.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-E0234E?logo=nestjs)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 📋 Overview

**EduStack** is a complete multi-tenant SaaS platform that enables coaching institutes to launch branded online learning academies within 24 hours, eliminating the typical ₹5-15 lakh cost of custom app development.

**Current Status**: ✅ **100% Core MVP Complete & Production-Ready**

### ✨ Key Features

- 🏢 **Multi-tenant architecture** with full institute isolation
- 👥 **4-tier role system** (Super Admin, Institute Admin, Teacher, Student)
- 🎥 **Video learning** with automatic progress tracking (90% completion threshold)
- 📝 **MCQ test engine** with instant auto-grading + 24-hour retry cooldown
- 📹 **Live class integration** (Google Meet/Zoom scheduling)
- 📊 **Attendance management** with date normalization
- 🎨 **Custom branding** (institute logo + accent colors)
- ✉️ **Automated student onboarding** via EmailJS
- 📱 **Mobile-responsive** across all user portals
- 💾 **Database resilience** with automatic fallback storage

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker & Docker Compose (for PostgreSQL)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/edustack.git
cd edustack
```

### 2. Start PostgreSQL Database

```bash
docker compose up -d
```

### 3. Setup Backend (NestJS)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npx prisma migrate dev --name init
npx prisma db seed  # Creates demo accounts
npm run start:dev  # Runs on http://localhost:4000
```

### 4. Setup Frontend (Next.js)

```bash
cd ../frontend
npm install
cp .env.example .env
# Edit .env with API URL
npm run dev  # Runs on http://localhost:3000
```

### 5. Login with Demo Accounts

Visit `http://localhost:3000/login` and use:

| Role | Email | Password | Dashboard |
|------|-------|----------|-----------|
| **Super Admin** | admin@edustack.com | admin123 | `/admin` |
| **Institute Admin** | admin@democoaching.com | admin123 | `/dashboard` |
| **Teacher** | teacher@democoaching.com | teacher123 | `/teacher/dashboard` |
| **Student** | student@democoaching.com | student123 | `/student/dashboard` |

---

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS 11.0.1 (Node.js + TypeScript)
- **Database**: PostgreSQL 16 (via Docker)
- **ORM**: Prisma 5.22.0
- **Authentication**: JWT (passport-jwt) with 24-hour expiry
- **Security**: bcrypt password hashing
- **Email**: EmailJS for student onboarding

### Frontend
- **Framework**: Next.js 16.2.12 (React 19.2.4)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React

---

## 📂 Project Structure

```
edustack/
├── backend/              # NestJS API server
│   ├── src/
│   │   ├── auth/        # JWT authentication
│   │   ├── institutes/  # Institute management
│   │   ├── users/       # User management
│   │   ├── courses/     # Course management
│   │   ├── lessons/     # Lesson & video tracking
│   │   ├── tests/       # MCQ test engine
│   │   ├── attendance/  # Attendance system
│   │   ├── announcements/
│   │   ├── live-classes/
│   │   ├── enrollments/
│   │   └── common/      # Sanitization, store-sync
│   ├── prisma/
│   │   ├── schema.prisma  # Database schema
│   │   └── seed.ts        # Demo data seeder
│   └── .env.example
│
├── frontend/            # Next.js web app
│   ├── src/
│   │   └── app/
│   │       ├── (super-admin)/  # Super admin portal
│   │       ├── (institute)/    # Institute admin portal
│   │       ├── (teacher)/      # Teacher workspace
│   │       ├── (student)/      # Student academy
│   │       └── (public)/       # Login page
│   └── .env.example
│
├── docker-compose.yml   # PostgreSQL container
├── COMMANDS.md          # Command reference
├── Final_Summary.md     # Complete documentation
└── README.md            # This file
```

---

## 🎯 Core Features by Role

### Super Admin (Platform Owner)
- Platform-wide analytics dashboard
- Institute onboarding workflow
- View all institutes with metrics
- Delete institutes (with cascade)

### Institute Admin
- Dashboard with student/teacher/course counts
- **Logo & branding customizer** (colors + logo)
- Teacher & student account creation
- Course management (create, edit, delete, publish)
- Bulk student enrollment per course
- Institute-wide announcements

### Teacher
- View assigned courses with rosters
- **Attendance marking** (date selector, batch save)
- **Lesson upload** (YouTube/MP4 videos + PDFs)
- **MCQ test builder** (dynamic questions, auto-grading)
- **Live class scheduler** (Google Meet/Zoom links)
- Restricted course editing (content only, no price/teacher changes)

### Student
- Enrolled courses with **progress bars**
- **Video player** with auto-save progress (90% = complete)
- PDF study notes download
- **MCQ test taking** with instant scorecard
- **24-hour retry cooldown** on tests
- Attendance report (overall + per-course)
- **Live class alerts** with join buttons
- Tabbed course detail modal (Materials/Tests/Live/Attendance)

---

## 🔒 Security Features

✅ JWT tokens with 24-hour expiry  
✅ bcrypt password hashing (salt rounds: 10)  
✅ Role-based access control (RolesGuard)  
✅ Per-institute email isolation (`@@unique([instituteId, email])`)  
✅ Test answer key protection (server-side grading only)  
✅ Input sanitization (HTML tag stripping)  
✅ URL validation on all URL fields  
✅ Role-based field filtering (teachers can't steal courses)  

---

## 📊 Database Schema

12 core models: **Institute**, **User** (4 roles), **Course**, **Lesson**, **Enrollment**, **Attendance**, **Test**, **Question**, **TestAttempt**, **VideoProgress**, **Announcement**, **LiveClass**

**Key Relationships**:
- Institute → Users, Courses, Announcements
- Course → Teacher, Lessons, Tests, Enrollments, LiveClasses
- Student → Enrollments, TestAttempts, VideoProgress, Attendance
- Test → Questions, TestAttempts

See [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) for complete schema.

---

## 🌐 API Endpoints

Base URL: `http://localhost:4000/api/v1`

### Authentication
- `POST /auth/login` - Login (returns JWT + profile)
- `GET /auth/me` - Get current user

### Institutes (Super Admin)
- `POST /institutes` - Create institute + admin
- `GET /institutes` - List all institutes
- `PATCH /institutes/me/branding` - Update branding (Institute Admin)

### Users (Institute Admin)
- `POST /users` - Create teacher/student
- `GET /users?role=TEACHER` - List teachers

### Courses
- `POST /courses` - Create course
- `GET /courses` - List courses (role-filtered)
- `POST /courses/:id/enrollments` - Enroll students

### Lessons
- `POST /courses/:id/lessons` - Add lesson
- `POST /lessons/:id/progress` - Update watch progress

### Tests
- `POST /courses/:id/tests` - Create MCQ test
- `POST /tests/:id/submit` - Submit test (auto-graded)

### Attendance
- `POST /courses/:id/attendance` - Mark attendance
- `GET /students/me/attendance` - View attendance

### Live Classes
- `POST /courses/:id/live-classes` - Schedule session
- `GET /courses/:id/live-classes?upcoming=true` - List upcoming

See [`Final_Summary.md`](Final_Summary.md) for complete API documentation.

---

## 🧪 Testing

### Backend
```bash
cd backend
npm run test        # Unit tests
npm run test:e2e    # E2E tests
```

### Frontend
```bash
cd frontend
npm run test
```

---

## 🐛 Known Issues

All critical bugs have been resolved (16/24 total issues fixed on 2026-07-29).

**Remaining 8 items** are low-priority UX polish and code quality improvements. See [`fixes_verified.md`](fixes_verified.md) for details.

---

## 📦 Environment Variables

### Backend `.env`
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/edustack
JWT_SECRET=your-secure-random-secret-change-in-production
JWT_EXPIRES_IN=24h
FRONTEND_URL=http://localhost:3000
EMAILJS_PUBLIC_KEY=your-emailjs-public-key
EMAILJS_SERVICE_ID=your-emailjs-service-id
EMAILJS_TEMPLATE_ID=your-emailjs-template-id
```

### Frontend `.env`
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## 🚢 Deployment

### Production Build

**Backend**:
```bash
cd backend
npm run build
npm run start:prod
```

**Frontend**:
```bash
cd frontend
npm run build
npm start
```

### Docker Deployment (Coming Soon)
Full Docker Compose setup with Nginx reverse proxy.

---

## 📖 Documentation

- [`Final_Summary.md`](Final_Summary.md) - Complete project documentation with user workflows
- [`COMMANDS.md`](COMMANDS.md) - Quick command reference
- [`PROJECT_STATE.md`](PROJECT_STATE.md) - Current development state
- [`fixes_verified.md`](fixes_verified.md) - Bug fixes log

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Aniket** - Initial work

---

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/) and [Next.js](https://nextjs.org/)
- Icons by [Lucide](https://lucide.dev/)
- Database by [PostgreSQL](https://www.postgresql.org/)
- Email service by [EmailJS](https://www.emailjs.com/)

---

## 📞 Support

For issues and questions, please open a GitHub issue.

---

**Made with ❤️ for coaching institutes worldwide**
