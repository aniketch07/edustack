import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Real-time event bus (socket.io).
 *
 * Room model:
 *  - `user:{userId}`           -> personal room, targetable per-user at emit time
 *  - `institute:{instituteId}` -> institute-wide broadcasts only
 *
 * Course-level targeting is resolved at emit time by querying the DB
 * (enrolled students + assigned teacher + institute admins), so the
 * recipient set is always current and never cross-bleeds courses.
 */
@Injectable()
@WebSocketGateway({ cors: { origin: true, credentials: true }, transports: ['websocket'] })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new UnauthorizedException('Missing auth token');

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>(
          'JWT_SECRET',
          'edustack-super-secret-jwt-key-2026-change-in-production',
        ),
      });
      if (!payload?.userId) throw new UnauthorizedException('Malformed token');

      client.data.user = payload;
      await client.join(`user:${payload.userId}`);
      if (payload.instituteId) {
        await client.join(`institute:${payload.instituteId}`);
      }
      this.logger.log(`Socket connected: user ${payload.userId} (${payload.role})`);
    } catch (e: any) {
      this.logger.warn(`Socket connection rejected: ${e.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    // socket.io automatically leaves all rooms on disconnect.
  }

  /** Emit an event to a specific set of users (by user id). */
  emitToUsers(userIds: string[], event: string, payload: any) {
    if (!userIds || userIds.length === 0) return;
    const rooms = userIds.map((id) => `user:${id}`);
    this.server.to(rooms).emit(event, payload);
  }

  /** Emit an event to everyone in an institute (global broadcasts). */
  emitToInstitute(instituteId: string, event: string, payload: any) {
    if (!instituteId) return;
    this.server.to(`institute:${instituteId}`).emit(event, payload);
  }

  /**
   * Emit an event to everyone tied to a course:
   * enrolled students + assigned teacher + institute admins.
   * Optionally includes one specific student (e.g. the one who just submitted a test).
   */
  async emitToCourse(
    courseId: string,
    event: string,
    payload: any,
    opts?: { includeStudentId?: string },
  ) {
    try {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { teacherId: true, instituteId: true },
      });
      if (!course) return;

      const [enrollments, admins] = await Promise.all([
        this.prisma.enrollment.findMany({
          where: { courseId },
          select: { studentId: true },
        }),
        this.prisma.user.findMany({
          where: { instituteId: course.instituteId, role: UserRole.INSTITUTE_ADMIN },
          select: { id: true },
        }),
      ]);

      const targets = new Set<string>([course.teacherId]);
      enrollments.forEach((e) => targets.add(e.studentId));
      admins.forEach((a) => targets.add(a.id));
      if (opts?.includeStudentId) targets.add(opts.includeStudentId);

      this.emitToUsers([...targets], event, payload);
    } catch (e: any) {
      this.logger.warn(`emitToCourse failed for course ${courseId}: ${e.message}`);
    }
  }
}
