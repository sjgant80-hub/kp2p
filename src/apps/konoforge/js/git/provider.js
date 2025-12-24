/**
 * KonoForge Git Provider
 * P2P Git implementation using namespace tags
 * Repos, commits, branches, trees all as tags
 */

import * as ns from '../namespace/provider.js';
import { UDTs, buildPath } from '../namespace/udts.js';

/**
 * Create a new repository
 */
export async function createRepo(workspace, name, options = {}) {
  const repoPath = buildPath('forge', workspace, name);

  // Check if exists
  if (ns.readTag(repoPath)) {
    throw new Error(`Repository ${workspace}/${name} already exists`);
  }

  const now = new Date().toISOString();

  // Create project tag
  await ns.writeTag(repoPath, ns.createInstance(UDTs.Project, {
    ID: crypto.randomUUID(),
    Name: name,
    Type: 'repo',
    Description: options.description || '',
    Visibility: options.visibility || 'public',
    DefaultBranch: options.defaultBranch || 'main',
    Created: now,
    Updated: now
  }));

  // Create initial empty tree
  const emptyTreeHash = await createTree(repoPath, []);

  // Create initial commit
  const commitHash = await createCommit(repoPath, {
    message: 'Initial commit',
    treeHash: emptyTreeHash,
    author: options.author || 'anonymous'
  });

  // Create main branch
  await createBranch(repoPath, 'main', commitHash);

  // Update repo head
  await updateRepoHead(repoPath, commitHash);

  return { path: repoPath, head: commitHash };
}

/**
 * Create a tree object (directory listing)
 */
export async function createTree(repoPath, entries) {
  // entries: [{ name, type: 'blob'|'tree', hash, mode }]
  const content = JSON.stringify(entries.sort((a, b) => a.name.localeCompare(b.name)));
  const hash = await ns.storeBlob(content);

  // Store tree object
  const treePath = `${repoPath}/_objects/tree/${hash.substring(0, 8)}`;
  await ns.writeTag(treePath, {
    _type: 'Tree',
    hash,
    entries
  });

  return hash;
}

/**
 * Create a blob (file content)
 */
export async function createBlob(repoPath, content) {
  const hash = await ns.storeBlob(content);

  const blobPath = `${repoPath}/_objects/blob/${hash.substring(0, 8)}`;
  await ns.writeTag(blobPath, {
    _type: 'Blob',
    hash,
    size: content.length
  });

  return hash;
}

/**
 * Create a commit
 */
export async function createCommit(repoPath, options) {
  const now = new Date().toISOString();

  const commit = {
    tree: options.treeHash,
    parents: options.parents || [],
    author: options.author || 'anonymous',
    authorEmail: options.authorEmail || '',
    committer: options.committer || options.author || 'anonymous',
    committerEmail: options.committerEmail || options.authorEmail || '',
    message: options.message || '',
    timestamp: now
  };

  // Hash the commit
  const content = JSON.stringify(commit);
  const hash = await ns.storeBlob(content);

  // Store commit object
  const commitPath = `${repoPath}/_objects/commit/${hash.substring(0, 8)}`;
  await ns.writeTag(commitPath, ns.createInstance(UDTs.Commit, {
    SHA: hash,
    TreeSHA: options.treeHash,
    ParentSHAs: JSON.stringify(commit.parents),
    Author: commit.author,
    AuthorEmail: commit.authorEmail,
    Committer: commit.committer,
    CommitterEmail: commit.committerEmail,
    Message: commit.message,
    Timestamp: now
  }));

  // Update repo stats
  const repo = ns.readValue(repoPath);
  if (repo) {
    repo.CommitCount = (repo.CommitCount || 0) + 1;
    repo.Updated = now;
    await ns.writeTag(repoPath, repo);
  }

  return hash;
}

/**
 * Create a branch
 */
export async function createBranch(repoPath, name, headSHA) {
  const branchPath = `${repoPath}/_refs/heads/${name}`;

  await ns.writeTag(branchPath, ns.createInstance(UDTs.Branch, {
    Name: name,
    HeadSHA: headSHA,
    LastCommit: new Date().toISOString()
  }));

  // Update repo branch count
  const repo = ns.readValue(repoPath);
  if (repo) {
    repo.BranchCount = (repo.BranchCount || 0) + 1;
    await ns.writeTag(repoPath, repo);
  }

  return branchPath;
}

/**
 * Update branch head
 */
export async function updateBranch(repoPath, branchName, headSHA) {
  const branchPath = `${repoPath}/_refs/heads/${branchName}`;
  const branch = ns.readValue(branchPath);

  if (!branch) {
    throw new Error(`Branch ${branchName} not found`);
  }

  branch.HeadSHA = headSHA;
  branch.LastCommit = new Date().toISOString();

  await ns.writeTag(branchPath, branch);
  return branch;
}

/**
 * Update repo HEAD
 */
export async function updateRepoHead(repoPath, headSHA) {
  const repo = ns.readValue(repoPath);
  if (repo) {
    repo.HeadCommit = headSHA;
    repo.Updated = new Date().toISOString();
    await ns.writeTag(repoPath, repo);
  }
}

/**
 * Get branch
 */
export function getBranch(repoPath, branchName) {
  return ns.readValue(`${repoPath}/_refs/heads/${branchName}`);
}

/**
 * List branches
 */
export function listBranches(repoPath) {
  const tags = ns.queryTags(`${repoPath}/_refs/heads/*`);
  return tags.map(t => t.value);
}

/**
 * Get commit
 */
export function getCommit(repoPath, sha) {
  const commits = ns.queryTags(`${repoPath}/_objects/commit/*`);
  return commits.find(c => c.value.SHA === sha || c.value.SHA.startsWith(sha))?.value;
}

/**
 * Get commit log
 */
export function getLog(repoPath, branchName = 'main', limit = 50) {
  const branch = getBranch(repoPath, branchName);
  if (!branch) return [];

  const commits = [];
  let currentSHA = branch.HeadSHA;

  while (currentSHA && commits.length < limit) {
    const commit = getCommit(repoPath, currentSHA);
    if (!commit) break;

    commits.push(commit);

    const parents = JSON.parse(commit.ParentSHAs || '[]');
    currentSHA = parents[0] || null;
  }

  return commits;
}

/**
 * Get tree
 */
export async function getTree(repoPath, treeHash) {
  const trees = ns.queryTags(`${repoPath}/_objects/tree/*`);
  const tree = trees.find(t => t.value.hash === treeHash || t.value.hash.startsWith(treeHash));
  return tree?.value || null;
}

/**
 * Write file to repo (creates blob + updates tree + commits)
 */
export async function writeFile(repoPath, branchName, filePath, content, options = {}) {
  // Get current branch
  const branch = getBranch(repoPath, branchName);
  if (!branch) throw new Error(`Branch ${branchName} not found`);

  // Create blob
  const blobHash = await createBlob(repoPath, content);

  // Get current tree
  const currentCommit = getCommit(repoPath, branch.HeadSHA);
  let currentTree = currentCommit ? await getTree(repoPath, currentCommit.TreeSHA) : null;
  let entries = currentTree?.entries || [];

  // Update or add entry
  const fileName = filePath.split('/').pop();
  const existingIdx = entries.findIndex(e => e.name === fileName);

  if (existingIdx >= 0) {
    entries[existingIdx].hash = blobHash;
  } else {
    entries.push({
      name: fileName,
      type: 'blob',
      hash: blobHash,
      mode: '100644'
    });
  }

  // Create new tree
  const newTreeHash = await createTree(repoPath, entries);

  // Create commit
  const commitHash = await createCommit(repoPath, {
    message: options.message || `Update ${filePath}`,
    treeHash: newTreeHash,
    parents: [branch.HeadSHA],
    author: options.author || 'anonymous'
  });

  // Update branch
  await updateBranch(repoPath, branchName, commitHash);
  await updateRepoHead(repoPath, commitHash);

  return { commit: commitHash, blob: blobHash };
}

/**
 * Read file from repo
 */
export async function readFile(repoPath, branchName, filePath) {
  const branch = getBranch(repoPath, branchName);
  if (!branch) return null;

  const commit = getCommit(repoPath, branch.HeadSHA);
  if (!commit) return null;

  const tree = await getTree(repoPath, commit.TreeSHA);
  if (!tree) return null;

  const fileName = filePath.split('/').pop();
  const entry = tree.entries.find(e => e.name === fileName);
  if (!entry) return null;

  const content = await ns.getBlob(entry.hash);
  if (!content) return null;

  const decoder = new TextDecoder();
  return decoder.decode(content);
}

/**
 * List files in repo
 */
export async function listFiles(repoPath, branchName = 'main') {
  const branch = getBranch(repoPath, branchName);
  if (!branch) return [];

  const commit = getCommit(repoPath, branch.HeadSHA);
  if (!commit) return [];

  const tree = await getTree(repoPath, commit.TreeSHA);
  if (!tree) return [];

  return tree.entries.map(e => ({
    name: e.name,
    type: e.type,
    hash: e.hash,
    mode: e.mode
  }));
}

/**
 * List all repos in workspace
 */
export function listRepos(workspace) {
  const path = buildPath('forge', workspace);
  return ns.getChildren(path)
    .filter(t => t.value?.Type === 'repo')
    .map(t => t.value);
}

/**
 * Delete repo
 */
export async function deleteRepo(repoPath) {
  // Delete all tags under repo path
  const tags = ns.queryTags(`${repoPath}/*`);
  for (const tag of tags) {
    await ns.deleteTag(tag.path);
  }
  await ns.deleteTag(repoPath);
}
