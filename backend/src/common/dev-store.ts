import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'dev-store.json');

export interface DevStoreData {
  institutes: any[];
  users: any[];
  courses?: any[];
  enrollments?: any[];
  lessons?: any[];
  attendances?: any[];
  tests?: any[];
  questions?: any[];
  testAttempts?: any[];
  announcements?: any[];
  liveClasses?: any[];
  videoProgress?: any[];
}

export function loadDevStore(): DevStoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return {
        institutes: parsed.institutes || [],
        users: parsed.users || [],
        courses: parsed.courses || [],
        enrollments: parsed.enrollments || [],
        lessons: parsed.lessons || [],
        attendances: parsed.attendances || [],
        tests: parsed.tests || [],
        questions: parsed.questions || [],
        testAttempts: parsed.testAttempts || [],
        announcements: parsed.announcements || [],
        liveClasses: parsed.liveClasses || [],
        videoProgress: parsed.videoProgress || [],
      };
    }
  } catch (error) {
    console.warn('Failed to read dev-store.json:', error);
  }
  return {
    institutes: [],
    users: [],
    courses: [],
    enrollments: [],
    lessons: [],
    attendances: [],
    tests: [],
    questions: [],
    testAttempts: [],
    announcements: [],
    liveClasses: [],
    videoProgress: [],
  };
}

export function saveDevStore(data: Partial<DevStoreData>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const existing = loadDevStore();
    const merged = { ...existing, ...data };
    fs.writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Failed to save dev-store.json:', error);
  }
}
