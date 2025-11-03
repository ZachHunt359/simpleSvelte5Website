import { spawn } from 'child_process';
import { isAdmin } from '$lib/auth/helpers';
import { logInfo } from '$lib/logger';

export const POST = async ({ cookies }) => {
  try {
    if (!await isAdmin(cookies)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Run ensure-youtube script
    return new Promise((resolve) => {
      const proc = spawn('npm', ['run', 'ensure-youtube'], {
        cwd: process.cwd(),
        shell: true
      });

      let output = '';
      let errorOutput = '';

      proc.stdout?.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      proc.on('close', (code) => {
        logInfo('Ensure YouTube Entries', { exitCode: code });
        
        if (code === 0) {
          resolve(new Response(JSON.stringify({ success: true, output }), { status: 200 }));
        } else {
          resolve(new Response(JSON.stringify({ 
            error: 'Script failed', 
            exitCode: code, 
            output: errorOutput || output 
          }), { status: 500 }));
        }
      });

      proc.on('error', (err) => {
        resolve(new Response(JSON.stringify({ 
          error: 'Failed to run script', 
          message: err.message 
        }), { status: 500 }));
      });
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
