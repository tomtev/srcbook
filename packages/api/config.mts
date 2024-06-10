import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileExists } from './fs-utils.mjs';

export const HOME_DIR = os.homedir();
export const SRCBOOK_DIR = path.join(HOME_DIR, '.srcbook');

const CONFIG_FILE_PATH = path.join(SRCBOOK_DIR, 'config.json');
const SECRETS_FILE_PATH = path.join(SRCBOOK_DIR, 'secrets.json');

// This will hold any user settings and configuration.
// Right now the only settings is the base directory.
type ConfigObjectType = {
  baseDir: string;
};

async function load(path: string) {
  const contents = await fs.readFile(path, 'utf8');
  return JSON.parse(contents);
}

export async function getConfig(): Promise<ConfigObjectType> {
  const config = await load(CONFIG_FILE_PATH);
  return { baseDir: config.baseDir || HOME_DIR };
}

export async function updateConfig(attrs: Partial<ConfigObjectType>) {
  const existingConfig = await getConfig();
  const config = { ...existingConfig, ...attrs };
  await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config), 'utf8');
  return config;
}

export function getSecrets(): Promise<Record<string, string>> {
  return load(SECRETS_FILE_PATH);
}

export async function addSecret(name: string, value: string) {
  const secrets = await getSecrets();
  const updated = { ...secrets, [name]: value };
  await fs.writeFile(SECRETS_FILE_PATH, JSON.stringify(updated), 'utf8');
  return updated;
}

export async function removeSecret(name: string) {
  const secrets = await getSecrets();
  delete secrets[name];
  await fs.writeFile(SECRETS_FILE_PATH, JSON.stringify(secrets), 'utf8');
  return secrets;
}

export async function initializeConfig() {
  const [, hasConfigFile, hasSecretsFile] = await Promise.all([
    fs.mkdir(SRCBOOK_DIR, { recursive: true }),
    fileExists(CONFIG_FILE_PATH),
    fileExists(SECRETS_FILE_PATH),
  ]);

  if (!hasConfigFile) {
    fs.writeFile(CONFIG_FILE_PATH, '{}', 'utf8');
  }

  if (!hasSecretsFile) {
    fs.writeFile(SECRETS_FILE_PATH, '{}', 'utf8');
  }
}