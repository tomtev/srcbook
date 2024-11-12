import { ChildProcess } from 'node:child_process';
import { pathToApp } from './disk.mjs';
import { npmInstall as execNpmInstall, vite as execVite, astro as execAstro } from '../exec.mjs';
import { wss } from '../index.mjs';

export type ProcessType = 'npm:install' | 'vite:server' | 'astro:server';

export interface NpmInstallProcessType {
  type: 'npm:install';
  process: ChildProcess;
}

export interface ViteServerProcessType {
  type: 'vite:server';
  process: ChildProcess;
  port: number | null;
}

export interface AstroServerProcessType {
  type: 'astro:server';
  process: ChildProcess;
  port: number | null;
}

export type AppProcessType = NpmInstallProcessType | ViteServerProcessType | AstroServerProcessType;

class Processes {
  private map: Map<string, AppProcessType> = new Map();

  has(appId: string, type: ProcessType) {
    return this.map.has(this.toKey(appId, type));
  }

  get(appId: string, type: ProcessType) {
    return this.map.get(this.toKey(appId, type));
  }

  set(appId: string, process: AppProcessType) {
    this.map.set(this.toKey(appId, process.type), process);
  }

  del(appId: string, type: ProcessType) {
    return this.map.delete(this.toKey(appId, type));
  }

  private toKey(appId: string, type: ProcessType) {
    return `${appId}:${type}`;
  }
}

const processes = new Processes();

export function getAppProcess(appId: string, type: 'npm:install'): NpmInstallProcessType;
export function getAppProcess(appId: string, type: 'vite:server'): ViteServerProcessType;
export function getAppProcess(appId: string, type: 'astro:server'): AstroServerProcessType;
export function getAppProcess(appId: string, type: ProcessType): AppProcessType {
  switch (type) {
    case 'npm:install':
      return processes.get(appId, type) as NpmInstallProcessType;
    case 'vite:server':
      return processes.get(appId, type) as ViteServerProcessType;
    case 'astro:server':
      return processes.get(appId, type) as AstroServerProcessType;
  }
}

export function setAppProcess(appId: string, process: AppProcessType) {
  processes.set(appId, process);
}

export function deleteAppProcess(appId: string, process: ProcessType) {
  processes.del(appId, process);
}

async function waitForProcessToComplete(process: AppProcessType) {
  if (process.process.exitCode !== null) {
    return process;
  }

  return new Promise<AppProcessType>((resolve, reject) => {
    process.process.once('exit', () => {
      resolve(process);
    });
    process.process.once('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Runs npm install for the given app.
 *
 * If there's already a process running npm install, it will return that process.
 */
export function npmInstall(
  appId: string,
  options: Omit<Partial<Parameters<typeof execNpmInstall>[0]>, 'cwd'> & { onStart?: () => void },
) {
  const runningProcess = processes.get(appId, 'npm:install');
  if (runningProcess) {
    return waitForProcessToComplete(runningProcess);
  }

  wss.broadcast(`app:${appId}`, 'deps:install:status', { status: 'installing' });
  if (options.onStart) {
    options.onStart();
  }

  const newlyStartedProcess: NpmInstallProcessType = {
    type: 'npm:install',
    process: execNpmInstall({
      ...options,

      cwd: pathToApp(appId),
      stdout: (data) => {
        wss.broadcast(`app:${appId}`, 'deps:install:log', {
          log: { type: 'stdout', data: data.toString('utf8') },
        });

        if (options.stdout) {
          options.stdout(data);
        }
      },
      stderr: (data) => {
        wss.broadcast(`app:${appId}`, 'deps:install:log', {
          log: { type: 'stderr', data: data.toString('utf8') },
        });

        if (options.stderr) {
          options.stderr(data);
        }
      },
      onExit: (code, signal) => {
        // We must clean up this process so that we can run npm install again
        deleteAppProcess(appId, 'npm:install');

        wss.broadcast(`app:${appId}`, 'deps:install:status', {
          status: code === 0 ? 'complete' : 'failed',
          code,
        });

        if (code === 0) {
          wss.broadcast(`app:${appId}`, 'deps:status:response', {
            nodeModulesExists: true,
          });
        }

        if (options.onExit) {
          options.onExit(code, signal);
        }
      },
    }),
  };
  processes.set(appId, newlyStartedProcess);

  return waitForProcessToComplete(newlyStartedProcess);
}

/**
 * Runs a vite dev server for the given app.
 *
 * If there's already a process running the vite dev server, it will return that process.
 */
export function viteServer(appId: string, options: Omit<Parameters<typeof execAstro>[0], 'cwd'>) {
  const runningProcess = processes.get(appId, 'astro:server') as AstroServerProcessType;
  
  if (runningProcess) {
    // If we have a running process and port, send the running status immediately
    if (runningProcess.port) {
      wss.broadcast(`app:${appId}`, 'preview:status', {
        status: 'running',
        url: `http://localhost:${runningProcess.port}`,
      });
    }
    return runningProcess;
  }

  // Send initial booting status for new server
  wss.broadcast(`app:${appId}`, 'preview:status', {
    status: 'booting',
    url: null,
  });

  const newProcess: AstroServerProcessType = {
    type: 'astro:server',
    process: execAstro({ cwd: pathToApp(appId), ...options }),
    port: null,
  };

  processes.set(appId, newProcess);

  newProcess.process.stdout?.on('data', (data) => {
    const output = data.toString('utf8');
    
    wss.broadcast(`app:${appId}`, 'astro:server:log', {
      log: { type: 'stdout', data: output },
    });
    
    // Look for Astro's local server URL pattern
    const localMatch = output.match(/Local\s+(http:\/\/localhost:\d+)/);
    if (localMatch) {
      const url = localMatch[1];
      
      // Extract port from URL
      const port = parseInt(url.split(':').pop() || '');
      newProcess.port = port;
      
      // Send preview:status event
      wss.broadcast(`app:${appId}`, 'preview:status', {
        status: 'running',
        url: url,
      });
    }
  });

  newProcess.process.stderr?.on('data', (data) => {
    const output = data.toString('utf8');
    wss.broadcast(`app:${appId}`, 'astro:server:log', {
      log: { type: 'stderr', data: output },
    });
  });

  newProcess.process.on('exit', (code) => {
    processes.del(appId, 'astro:server');
    wss.broadcast(`app:${appId}`, 'preview:status', {
      status: code === 0 ? 'stopped' : 'failed',
      url: null
    });
  });

  return newProcess;
}