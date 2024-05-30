import Path from 'node:path';
import { spawn } from 'node:child_process';

export type BaseExecRequestType = {
  cwd: string;
  stdout: (data: Buffer) => void;
  stderr: (data: Buffer) => void;
  onExit?: (code: number) => void;
};

export type NodeRequestType = BaseExecRequestType & {
  env: NodeJS.ProcessEnv;
  entry: string;
};

export type NPMInstallRequestType = BaseExecRequestType & {
  package?: string;
};

/**
 * Execute a JavaScript file using node.
 *
 * Example:
 *
 *     node('{
 *       cwd: '/Users/ben/.srcbook/foo',
 *       env: {FOO_ENV_VAR: 'foooooooo'},
 *       entry: foo.mjs',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 *
 */
export function node(options: NodeRequestType) {
  const { cwd, env, entry, stdout, stderr, onExit } = options;

  const filepath = Path.isAbsolute(entry) ? entry : Path.join(cwd, entry);

  // Explicitly using spawn here (over fork) to make it clear these
  // processes should be as decoupled from one another as possible.
  const child = spawn('node', [filepath], { cwd, env: { ...process.env, ...env } });

  child.stdout.on('data', stdout);
  child.stderr.on('data', stderr);

  child.on('close', (code) => onExit && onExit(code!));
}

/**
 * Run npm install.
 *
 * Install all packages:
 *
 *     node('{
 *       cwd: '/Users/ben/.srcbook/foo',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 *
 * Install a specific package:
 *
 *     node('{
 *       cwd: '/Users/ben/.srcbook/foo',
 *       package: 'marked',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 *
 */
export async function npmInstall(options: NPMInstallRequestType) {
  const { cwd, stdout, stderr, onExit } = options;

  const args = options.package ? ['install', options.package] : ['install'];

  const child = spawn('npm', args, { cwd });

  child.stdout.on('data', stdout);
  child.stderr.on('data', stderr);

  child.on('close', (code) => onExit && onExit(code!));
}
