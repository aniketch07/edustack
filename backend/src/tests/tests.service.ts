import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestDto } from './dto/create-test.dto';
import { SubmitTestDto } from './dto/submit-test.dto';
import { loadDevStore } from '../common/dev-store';
import { syncAllDevStore } from '../common/store-sync';
import { sanitizeText } from '../common/sanitize';
import { MEMORY_INSTITUTES, MEMORY_USERS } from '../institutes/institutes.service';
import { MEMORY_COURSES } from '../courses/courses.service';
import { MEMORY_ENROLLMENTS } from '../enrollments/enrollments.service';
import { MEMORY_LESSONS } from '../lessons/lessons.service';
import { MEMORY_ATTENDANCE } from '../attendance/attendance.service';

export let MEMORY_TESTS: any[] = [];
export let MEMORY_QUESTIONS: any[] = [];
export let MEMORY_TEST_ATTEMPTS: any[] = [];

const initialStore = loadDevStore();
if (initialStore.tests) MEMORY_TESTS.push(...initialStore.tests);
if (initialStore.questions) MEMORY_QUESTIONS.push(...initialStore.questions);
if (initialStore.testAttempts) MEMORY_TEST_ATTEMPTS.push(...initialStore.testAttempts);

@Injectable()
export class TestsService implements OnModuleInit {
  private readonly logger = new Logger(TestsService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const loaded = loadDevStore();
    MEMORY_TESTS.length = 0;
    MEMORY_QUESTIONS.length = 0;
    MEMORY_TEST_ATTEMPTS.length = 0;

    if (loaded.tests) MEMORY_TESTS.push(...loaded.tests);
    if (loaded.questions) MEMORY_QUESTIONS.push(...loaded.questions);
    if (loaded.testAttempts) MEMORY_TEST_ATTEMPTS.push(...loaded.testAttempts);
  }

  async create(courseId: string, createTestDto: CreateTestDto) {
    const { duration, totalMarks, passingMarks, questions } = createTestDto;
    const title = sanitizeText(createTestDto.title);
    const description = sanitizeText(createTestDto.description);
    const safeQuestions = questions.map((q) => ({
      ...q,
      question: sanitizeText(q.question),
      options: q.options.map((o) => (typeof o === 'string' ? sanitizeText(o) : o)),
    }));

    try {
      const test = await this.prisma.test.create({
        data: {
          courseId,
          title,
          description: description || null,
          duration: duration || null,
          totalMarks,
          passingMarks,
          isPublished: true,
          questions: {
            create: safeQuestions.map((q, index) => ({
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              marks: q.marks,
              order: index + 1,
            })),
          },
        },
        include: {
          questions: true,
        },
      });

      return {
        message: 'MCQ Test created successfully',
        test,
      };
    } catch (error: any) {
      this.logger.warn(`Database test creation failed. Using dev store for test: ${title}`);
    }

    const testId = `test-${Date.now()}`;
    const createdQuestions = safeQuestions.map((q, index) => ({
      id: `q-${Date.now()}-${index}`,
      testId,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      marks: q.marks,
      order: index + 1,
    }));

    const newTest = {
      id: testId,
      courseId,
      title,
      description: description || null,
      duration: duration || null,
      totalMarks,
      passingMarks,
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      questions: createdQuestions,
    };

    MEMORY_TESTS.push(newTest);
    MEMORY_QUESTIONS.push(...createdQuestions);
    syncAllDevStore();

    return {
      message: 'MCQ Test created successfully (Dev Store)',
      test: newTest,
    };
  }

  async findByCourse(courseId: string, studentId?: string) {
    try {
      const tests = await this.prisma.test.findMany({
        where: { courseId, isPublished: true },
        include: {
          questions: {
            select: {
              id: true,
              question: true,
              options: true,
              marks: true,
              order: true,
            },
            orderBy: { order: 'asc' },
          },
          attempts: studentId
            ? {
                where: { studentId },
                orderBy: { attemptedAt: 'desc' },
                take: 1,
              }
            : false,
        },
        orderBy: { createdAt: 'desc' },
      });

      const memoryMatches = MEMORY_TESTS.filter((t) => t.courseId === courseId);
      const dbIds = new Set(tests.map((r) => r.id));
      const uniqueMemory = memoryMatches.filter((m) => !dbIds.has(m.id));
      const combined = [...tests, ...uniqueMemory];

      return combined.map((t) => {
        let lastAttempt = null;
        if (studentId) {
          const memAttempts = MEMORY_TEST_ATTEMPTS.filter((a) => a.testId === t.id && a.studentId === studentId);
          if (memAttempts.length > 0) {
            lastAttempt = memAttempts[memAttempts.length - 1];
          } else if (t.attempts && t.attempts.length > 0) {
            lastAttempt = t.attempts[0];
          }
        }

        const rawQuestions = t.questions || MEMORY_QUESTIONS.filter((q) => q.testId === t.id);
        const safeQuestions = rawQuestions.map(({ correctAnswer, ...rest }: any) => rest);

        return {
          ...t,
          questions: safeQuestions,
          lastAttempt,
        };
      });
    } catch (error) {
      const memoryMatches = MEMORY_TESTS.filter((t) => t.courseId === courseId);
      return memoryMatches.map((t) => {
        let lastAttempt = null;
        if (studentId) {
          const memAttempts = MEMORY_TEST_ATTEMPTS.filter((a) => a.testId === t.id && a.studentId === studentId);
          if (memAttempts.length > 0) {
            lastAttempt = memAttempts[memAttempts.length - 1];
          }
        }

        const rawQuestions = MEMORY_QUESTIONS.filter((q) => q.testId === t.id);
        const safeQuestions = rawQuestions.map(({ correctAnswer, ...rest }: any) => rest);

        return {
          ...t,
          questions: safeQuestions,
          lastAttempt,
        };
      });
    }
  }

  async submitAttempt(testId: string, studentId: string, dto: SubmitTestDto) {
    const { answers } = dto;

    let test: any = null;
    let questions: any[] = [];

    try {
      test = await this.prisma.test.findUnique({
        where: { id: testId },
        include: { questions: true },
      });
      if (test) questions = test.questions;
    } catch (e) {
      this.logger.warn(`Database test lookup failed for test: ${testId}. Falling back to dev store.`);
    }

    if (!test) {
      test = MEMORY_TESTS.find((t) => t.id === testId);
      questions = MEMORY_QUESTIONS.filter((q) => q.testId === testId);
    }

    if (!test) {
      throw new NotFoundException(`Test with ID '${testId}' not found`);
    }

    // Retake cooldown: 24 hours between attempts
    const RETRY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
    let latestAttempt: any = null;

    try {
      const dbAttempts = await this.prisma.testAttempt.findMany({
        where: { testId, studentId },
        orderBy: { attemptedAt: 'desc' },
        take: 1,
      });
      if (dbAttempts.length > 0) latestAttempt = dbAttempts[0];
    } catch (e) {
      this.logger.warn(`Database attempt lookup failed for test: ${testId}, user: ${studentId}. Falling back to memory check.`);
    }

    if (!latestAttempt) {
      const memAttempts = MEMORY_TEST_ATTEMPTS.filter(
        (a) => a.testId === testId && a.studentId === studentId,
      );
      if (memAttempts.length > 0) {
        latestAttempt = memAttempts.reduce((latest, a) =>
          new Date(a.attemptedAt) > new Date(latest.attemptedAt) ? a : latest,
        );
      }
    }

    if (latestAttempt) {
      const elapsed = Date.now() - new Date(latestAttempt.attemptedAt).getTime();
      if (elapsed < RETRY_COOLDOWN_MS) {
        const remainingHours = Math.ceil((RETRY_COOLDOWN_MS - elapsed) / (1000 * 60 * 60));
        throw new BadRequestException(
          `Please wait ${remainingHours} hour(s) before retaking this test. You can retake in approximately ${remainingHours} hour(s).`,
        );
      }
    }

    let score = 0;
    let totalMarks = test.totalMarks || 0;

    questions.forEach((q) => {
      const studentSelectedOption = answers[q.id];
      if (studentSelectedOption !== undefined && studentSelectedOption === q.correctAnswer) {
        score += q.marks || 1;
      }
    });

    const passed = score >= test.passingMarks;

    try {
      const attempt = await this.prisma.testAttempt.create({
        data: {
          testId,
          studentId,
          answers: answers as any,
          score,
          totalMarks,
          passed,
        },
      });

      return {
        message: 'Test submitted and graded successfully',
        attempt,
      };
    } catch (error: any) {
      this.logger.warn(`Database test attempt save failed. Using dev store for test: ${testId}`);
    }

    const newAttempt = {
      id: `attempt-${Date.now()}`,
      testId,
      studentId,
      answers,
      score,
      totalMarks,
      passed,
      attemptedAt: new Date(),
    };

    MEMORY_TEST_ATTEMPTS.push(newAttempt);
    syncAllDevStore();

    return {
      message: 'Test submitted and graded successfully (Dev Store)',
      attempt: newAttempt,
    };
  }
}
