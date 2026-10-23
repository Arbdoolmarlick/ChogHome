// scripts/tunnel_daemon.mjs
// Persistent tunnel runner that maintains public URL https://chogtown-monad.loca.lt
import { spawn } from 'child_process';

function startTunnel() {
  console.log('[TunnelDaemon] Starting localtunnel on port 3001 (subdomain: chogtown-monad)...');
  const lt = spawn('npx', ['--yes', 'localtunnel', '--port', '3001', '--subdomain', 'chogtown-monad'], {
    shell: true,
    stdio: 'inherit',
  });

  lt.on('close', (code) => {
    console.warn(`[TunnelDaemon] Localtunnel process exited with code ${code}. Reconnecting in 3s...`);
    setTimeout(startTunnel, 3000);
  });

  lt.on('error', (err) => {
    console.error('[TunnelDaemon] Process error:', err.message);
  });
}

startTunnel();
