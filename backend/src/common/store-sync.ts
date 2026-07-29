import { MEMORY_INSTITUTES, MEMORY_USERS } from '../institutes/institutes.service';
import { MEMORY_COURSES } from '../courses/courses.service';
import { MEMORY_ENROLLMENTS } from '../enrollments/enrollments.service';
import { MEMORY_LESSONS, MEMORY_VIDEO_PROGRESS } from '../lessons/lessons.service';
import { MEMORY_ATTENDANCE } from '../attendance/attendance.service';
import { MEMORY_TESTS, MEMORY_QUESTIONS, MEMORY_TEST_ATTEMPTS } from '../tests/tests.service';
import { MEMORY_ANNOUNCEMENTS } from '../announcements/announcements.service';
import { MEMORY_LIVE_CLASSES } from '../live-classes/live-classes.service';
import { saveDevStore } from './dev-store';

/**
 * Saves ALL in-memory stores to the dev store file in a single call.
 *
 * Previously each service had its own syncStore() that only saved a subset of
 * keys (e.g. institutes.service saved only institutes + users). Because saveDevStore
 * merges new data over the existing file, partial saves didn't *lose* data that
 * was already on disk — but they DID miss any un-flushed in-memory changes that
 * other services had made since their last write.
 *
 * By importing every MEMORY_* array by reference, this function always captures
 * the LIVE in-memory state of ALL modules, ensuring no pending change is omitted
 * regardless of which service initiated the save.
 */
export function syncAllDevStore(): void {
  saveDevStore({
    institutes: MEMORY_INSTITUTES,
    users: MEMORY_USERS,
    courses: MEMORY_COURSES,
    enrollments: MEMORY_ENROLLMENTS,
    lessons: MEMORY_LESSONS,
    attendances: MEMORY_ATTENDANCE,
    tests: MEMORY_TESTS,
    questions: MEMORY_QUESTIONS,
    testAttempts: MEMORY_TEST_ATTEMPTS,
    announcements: MEMORY_ANNOUNCEMENTS,
    liveClasses: MEMORY_LIVE_CLASSES,
    videoProgress: MEMORY_VIDEO_PROGRESS,
  });
}
