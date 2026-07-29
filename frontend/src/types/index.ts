export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  INSTITUTE_ADMIN = 'INSTITUTE_ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

export interface Institute {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  bannerImage?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: UserRole;
  instituteId?: string | null;
  institute?: Institute | null;
  isActive: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Course {
  id: string;
  instituteId: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  thumbnailUrl?: string | null;
  price: number;
  teacherId: string;
  teacher?: Partial<User>;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    lessons: number;
    enrollments: number;
  };
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  pdfUrl?: string | null;
  order: number;
  duration?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  instituteId: string;
  title: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
