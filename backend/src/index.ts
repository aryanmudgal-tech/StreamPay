import { runMigrations } from './db/migrate';
import { createApp } from './app';

const PORT = parseInt(process.env.PORT || '3000', 10);

// Run migrations before starting
runMigrations();

const app = createApp();

app.listen(PORT, () => {
  console.log(`[streamfair] Backend running on http://localhost:${PORT}`);
  console.log(`[streamfair] Admin dashboard: http://localhost:${PORT}/admin`);
});
