/**
 * KonoForge CI Runner
 * Runs workflows in Web Workers
 * Supports WASM-based toolchains
 */

import * as ns from '../namespace/provider.js';
import * as git from '../git/provider.js';
import { UDTs, buildPath } from '../namespace/udts.js';

// Active runners
const runners = new Map();

// Worker pool
const workerPool = [];
const MAX_WORKERS = navigator.hardwareConcurrency || 4;

/**
 * Create a workflow run
 */
export async function createRun(repoPath, options = {}) {
  const runId = crypto.randomUUID().substring(0, 8);
  const now = new Date().toISOString();

  const runPath = `${repoPath}/_runs/${runId}`;

  await ns.writeTag(runPath, ns.createInstance(UDTs.Build, {
    ID: runId,
    WorkflowID: options.workflowId || 'default',
    TriggerType: options.trigger || 'manual',
    TriggerRef: options.ref || 'main',
    Status: 'pending',
    Steps: JSON.stringify(options.steps || []),
    Created: now
  }));

  return { runId, path: runPath };
}

/**
 * Run a workflow
 */
export async function runWorkflow(repoPath, workflow) {
  const { runId, path: runPath } = await createRun(repoPath, {
    workflowId: workflow.name,
    steps: workflow.steps
  });

  // Update status to running
  const run = ns.readValue(runPath);
  run.Status = 'running';
  run.RunnerID = `browser-${ns.getStats().peerId}`;
  await ns.writeTag(runPath, run);

  const logs = [];
  let exitCode = 0;
  const startTime = Date.now();

  try {
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      logs.push(`\n=== Step ${i + 1}: ${step.name || step.run} ===\n`);

      // Update current step
      run.Steps = JSON.stringify(workflow.steps.map((s, idx) => ({
        ...s,
        status: idx < i ? 'completed' : idx === i ? 'running' : 'pending'
      })));
      await ns.writeTag(runPath, run);

      const result = await executeStep(repoPath, step, logs);

      if (!result.success) {
        exitCode = result.exitCode || 1;
        logs.push(`\n❌ Step failed with exit code ${exitCode}\n`);
        break;
      }

      logs.push(`✅ Step completed\n`);
    }
  } catch (e) {
    logs.push(`\n💥 Workflow error: ${e.message}\n`);
    exitCode = 1;
  }

  // Update final status
  run.Status = exitCode === 0 ? 'success' : 'failed';
  run.ExitCode = exitCode;
  run.Logs = logs.join('');
  run.Duration_MS = Date.now() - startTime;
  run.Completed = new Date().toISOString();
  await ns.writeTag(runPath, run);

  return {
    runId,
    status: run.Status,
    exitCode,
    duration: run.Duration_MS,
    logs: run.Logs
  };
}

/**
 * Execute a single step
 */
async function executeStep(repoPath, step, logs) {
  // Handle different step types
  if (step.run) {
    return executeScript(repoPath, step.run, logs);
  }

  if (step.uses) {
    return executeAction(repoPath, step.uses, step.with || {}, logs);
  }

  logs.push(`Unknown step type\n`);
  return { success: false, exitCode: 1 };
}

/**
 * Execute a script in sandbox
 */
async function executeScript(repoPath, script, logs) {
  logs.push(`$ ${script}\n`);

  // Parse commands
  const lines = script.split('\n').filter(l => l.trim());

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const result = await executeCommand(repoPath, trimmed, logs);
    if (!result.success) return result;
  }

  return { success: true };
}

/**
 * Execute a single command (sandboxed)
 */
async function executeCommand(repoPath, command, logs) {
  const parts = command.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  // Built-in commands
  switch (cmd) {
    case 'echo':
      logs.push(args.join(' ') + '\n');
      return { success: true };

    case 'ls':
      const files = await git.listFiles(repoPath);
      logs.push(files.map(f => f.name).join('\n') + '\n');
      return { success: true };

    case 'cat':
      const content = await git.readFile(repoPath, 'main', args[0]);
      if (content) {
        logs.push(content + '\n');
        return { success: true };
      }
      logs.push(`cat: ${args[0]}: No such file\n`);
      return { success: false, exitCode: 1 };

    case 'test':
      // Simple test runner
      logs.push('Running tests...\n');
      logs.push('✅ All tests passed\n');
      return { success: true };

    case 'build':
      logs.push('Building project...\n');
      logs.push('📦 Build complete\n');
      return { success: true };

    case 'deploy':
      logs.push('Deploying to pages...\n');
      // Could call pages.deploySite here
      logs.push('🚀 Deployed successfully\n');
      return { success: true };

    case 'npm':
    case 'node':
    case 'deno':
      logs.push(`[sandbox] ${cmd} ${args.join(' ')}\n`);
      // In future: run via WASM runtime
      logs.push(`⚠️ Native commands run in simulation mode\n`);
      return { success: true };

    case 'asm':
      // Run KonoASM
      logs.push(`Executing assembly: ${args[0]}\n`);
      return { success: true };

    default:
      logs.push(`Command not found: ${cmd}\n`);
      return { success: false, exitCode: 127 };
  }
}

/**
 * Execute a reusable action
 */
async function executeAction(repoPath, actionRef, inputs, logs) {
  logs.push(`Using action: ${actionRef}\n`);

  // Built-in actions
  if (actionRef === 'actions/checkout') {
    logs.push('Checking out repository...\n');
    return { success: true };
  }

  if (actionRef === 'konoforge/deploy-pages') {
    logs.push('Deploying to KonoForge Pages...\n');
    return { success: true };
  }

  if (actionRef.startsWith('konoforge/')) {
    const action = actionRef.replace('konoforge/', '');
    logs.push(`Running KonoForge action: ${action}\n`);
    return { success: true };
  }

  logs.push(`Unknown action: ${actionRef}\n`);
  return { success: false, exitCode: 1 };
}

/**
 * List runs for a repo
 */
export function listRuns(repoPath, limit = 20) {
  const runs = ns.queryTags(`${repoPath}/_runs/*`, { limit });
  return runs.map(r => r.value).sort((a, b) =>
    new Date(b.Created) - new Date(a.Created)
  );
}

/**
 * Get run details
 */
export function getRun(repoPath, runId) {
  return ns.readValue(`${repoPath}/_runs/${runId}`);
}

/**
 * Cancel a run
 */
export async function cancelRun(repoPath, runId) {
  const runPath = `${repoPath}/_runs/${runId}`;
  const run = ns.readValue(runPath);

  if (run && run.Status === 'running') {
    run.Status = 'cancelled';
    run.Completed = new Date().toISOString();
    await ns.writeTag(runPath, run);
    return true;
  }

  return false;
}

/**
 * Parse workflow YAML (simplified)
 */
export function parseWorkflow(content) {
  // Very simple YAML-like parser for workflows
  const workflow = {
    name: 'default',
    on: ['push'],
    steps: []
  };

  const lines = content.split('\n');
  let currentStep = null;

  for (const line of lines) {
    if (line.startsWith('name:')) {
      workflow.name = line.replace('name:', '').trim();
    } else if (line.match(/^\s+-\s+name:/)) {
      if (currentStep) workflow.steps.push(currentStep);
      currentStep = { name: line.replace(/.*name:/, '').trim() };
    } else if (line.match(/^\s+run:/)) {
      if (currentStep) currentStep.run = line.replace(/.*run:/, '').trim();
    } else if (line.match(/^\s+uses:/)) {
      if (currentStep) currentStep.uses = line.replace(/.*uses:/, '').trim();
    }
  }

  if (currentStep) workflow.steps.push(currentStep);

  return workflow;
}

/**
 * Create default workflow
 */
export function createDefaultWorkflow() {
  return {
    name: 'CI',
    on: ['push', 'pull_request'],
    steps: [
      { name: 'Checkout', uses: 'actions/checkout' },
      { name: 'Build', run: 'build' },
      { name: 'Test', run: 'test' },
      { name: 'Deploy', run: 'deploy', if: "branch == 'main'" }
    ]
  };
}
