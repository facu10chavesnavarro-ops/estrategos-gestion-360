import { execSync } from 'child_process';
import path from 'path';

/**
 * Corre una sola vez antes de toda la suite Playwright (Sprint F4,
 * docs/frontend/07-sprint-f4-stock.md §3.7): vacía la Empresa E2E
 * dedicada para que cada corrida completa arranque sin la basura
 * acumulada de corridas anteriores. Mismo mecanismo cross-paquete que
 * ya usa "predev"/"prebuild" (invocar un script de @estrategos/api
 * desde apps/web vía npm workspaces).
 */
export default function globalSetup() {
  const repoRoot = path.resolve(__dirname, '../../..');
  execSync('npm run reset:e2e --workspace=@estrategos/api', {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}
