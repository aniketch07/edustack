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

/** A fresh empty store. Returned as a new object so callers never share/alias it. */
function freshEmptyStore(): DevStoreData {
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

/**
 * If dev-store.json is unreadable (corrupt JSON, wrong shape, etc.), copy it to
 * a timestamped .bak BEFORE anything can overwrite it. This guarantees a corrupt
 * file can never silently blank the store — the old content is always preserved
 * on disk for recovery/inspection.
 */
function backUpCorruptFile(): void {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const backupPath = path.join(DATA_DIR, `dev-store.corrupt-${Date.now()}.bak`);
    fs.copyFileSync(DATA_FILE, backupPath);
    console.warn(`Backed up unreadable dev-store.json to ${backupPath}`);
  } catch (copyError) {
    console.warn('Could not back up corrupt dev-store.json:', copyError);
  }
}

export function loadDevStore(): DevStoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      // Guard against valid JSON that isn't a usable store object (e.g. `123`,
      // `"text"`, `[ ... ]`) — treat those as corrupt too rather than crash later.
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('dev-store.json does not contain a JSON object');
      }
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
    // Preserve the corrupt file before we (or saveDevStore) overwrite it.
    backUpCorruptFile();
    console.warn('Failed to read dev-store.json:', error);
  }
  return freshEmptyStore();
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
