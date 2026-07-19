/**
 * Stop processes listening on given ports (Windows).
 * Usage: node scripts/stop-services.mjs [3004] [5180] [5181]
 */
import { execSync } from 'child_process';

const ports = process.argv.slice(2).map(Number).filter(Boolean);
const targets = ports.length ? ports : [3004, 5180, 5181];

function getListeningPids(port) {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split('\n')) {
      const m = line.match(new RegExp(`:${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)\\s*$`));
      if (m) pids.add(m[1]);
    }
    return [...pids];
  } catch {
    return [];
  }
}

for (const port of targets) {
  for (const pid of getListeningPids(port)) {
    console.log(`Stopping PID ${pid} on port ${port}`);
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
    } catch {
      /* may need admin or already stopped */
    }
  }
}
