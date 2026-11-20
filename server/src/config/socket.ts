import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './index';
import { User } from '../models/User';
import { PrintRequest } from '../models/PrintRequest';
import { Message } from '../models/Message';

interface AuthedSocket extends Socket {
  user?: { id: string; role: 'TEACHER' | 'OFFICER' };
}

export function initSocket(io: Server) {
  io.use(async (socket: AuthedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || (socket.handshake.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith('accessToken='))?.split('=')[1];
      if (!token) return next(new Error('Unauthorized'));
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; role: 'TEACHER' | 'OFFICER' };
      const user = await User.findById(decoded.sub).select('isActive role');
      if (!user || !user.isActive) return next(new Error('Unauthorized'));
      socket.user = { id: user._id.toString(), role: user.role };
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: AuthedSocket) => {
    const userId = socket.user!.id;
    socket.join(`user:${userId}`);
    if (socket.user!.role === 'OFFICER') socket.join('role:OFFICER');
    io.emit('online_status', { userId, online: true });

    const canAccess = async (requestId: string) => {
      if (!requestId) return false;
      const reqDoc = await PrintRequest.findById(requestId).select('teacherId');
      if (!reqDoc) return false;
      if (socket.user!.role === 'OFFICER') return true;
      return reqDoc.teacherId.toString() === userId;
    };

    socket.on('join_request', async ({ requestId }: { requestId: string }) => {
      try {
        if (await canAccess(requestId)) socket.join(`request:${requestId}`);
      } catch {}
    });

    socket.on('leave_request', ({ requestId }: { requestId: string }) => {
      socket.leave(`request:${requestId}`);
    });

    // Messages are persisted exactly once via POST /api/requests/:id/messages,
    // which also broadcasts `new_message` to this room. There is deliberately no
    // socket `send_message` persistence handler (it previously duplicated every
    // message and produced incorrect recipient IDs from populated documents).

    const broadcastTyping = async (requestId: string, typing: boolean) => {
      try {
        if (await canAccess(requestId)) {
          socket.to(`request:${requestId}`).emit('typing', { requestId, userId, typing });
        }
      } catch {}
    };

    socket.on('typing_start', ({ requestId }: { requestId: string }) => { void broadcastTyping(requestId, true); });
    socket.on('typing_stop', ({ requestId }: { requestId: string }) => { void broadcastTyping(requestId, false); });

    socket.on('mark_read', async ({ requestId }: { requestId: string }) => {
      try {
        if (!(await canAccess(requestId))) return;
        await Message.updateMany(
          { requestId, 'readBy.userId': { $ne: userId } },
          { $push: { readBy: { userId, readAt: new Date() } } }
        );
      } catch {}
    });

    socket.on('disconnect', () => {
      io.emit('online_status', { userId, online: false });
    });
  });
}
