import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { connectDB } from './config/db';
import { env, isProduction } from './config';
import { initSocket } from './config/socket';
import { User } from './models/User';
import bcrypt from 'bcrypt';

async function seedOfficer() {
  const count = await User.countDocuments({ role: 'OFFICER' });
  if (count === 0) {
    const nationalId = process.env.SEED_OFFICER_NATIONAL_ID || (isProduction ? '' : '0000000000000001');
    const password = process.env.SEED_OFFICER_PASSWORD || (isProduction ? '' : 'Admin@12345');
    if (!nationalId || !password) {
      console.warn('No officer exists and SEED_OFFICER_NATIONAL_ID / SEED_OFFICER_PASSWORD are not configured. Set them to create the first officer.');
      return;
    }
    await User.create({
      nationalId,
      password,
      fullName: 'Printing Officer',
      role: 'OFFICER',
      isActive: true,
      isFirstLogin: true,
      department: 'Administration',
    });
    console.log(`Seeded default officer (nationalId: ${nationalId}). A password change is required on first login.`);
  }
}

async function start() {
  await connectDB();
  await seedOfficer();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });
  app.set('io', io);
  initSocket(io);
  server.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
