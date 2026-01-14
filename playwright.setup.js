import { execSync } from 'child_process';

export default async () => {
  // Clean up any stuck browser processes before running tests
  try {
    execSync('pkill -f "playwright|chrome-mac-arm64|firefox.*Nightly" || true', { stdio: 'ignore' });
    console.log('Cleaned up stuck browser processes');
  } catch (e) {
    // Ignore errors if no processes found
  }
};
