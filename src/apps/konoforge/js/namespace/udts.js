/**
 * KonoForge Unified Namespace UDTs
 * ISA-95 hierarchy for all developer resources
 *
 * Enterprise → Forge (platform instance)
 * Site       → Workspace (user/org)
 * Area       → Project (repo, package, site)
 * WorkCenter → Resource (file, branch, build, page)
 * WorkUnit   → Operation (commit, deploy, test, run)
 */

// Level 0: Forge - The platform instance
export const ForgeUDT = {
  name: 'Forge',
  level: 0,
  description: 'KonoForge platform instance',
  members: {
    ID: { type: 'String', default: '' },
    Name: { type: 'String', default: 'KonoForge' },
    Version: { type: 'String', default: '1.0.0' },
    Status: { type: 'String', default: 'online' },
    PeerCount: { type: 'Int4', default: 0 },
    WorkspaceCount: { type: 'Int4', default: 0 },
    StorageUsed_MB: { type: 'Float4', default: 0 },
    Created: { type: 'DateTime', default: '' }
  }
};

// Level 1: Workspace - User or organization
export const WorkspaceUDT = {
  name: 'Workspace',
  level: 1,
  parent: 'Forge',
  description: 'User or organization workspace',
  members: {
    ID: { type: 'String', default: '' },
    Name: { type: 'String', default: '' },
    Type: { type: 'String', default: 'user' }, // user | org
    Owner: { type: 'String', default: '' },
    AvatarHash: { type: 'String', default: '' },
    ProjectCount: { type: 'Int4', default: 0 },
    MemberCount: { type: 'Int4', default: 1 },
    StorageQuota_MB: { type: 'Float4', default: 1024 },
    Created: { type: 'DateTime', default: '' }
  }
};

// Level 2: Project - Repository, Package, or Site
export const ProjectUDT = {
  name: 'Project',
  level: 2,
  parent: 'Workspace',
  description: 'Git repo, package, or hosted site',
  members: {
    ID: { type: 'String', default: '' },
    Name: { type: 'String', default: '' },
    Type: { type: 'String', default: 'repo' }, // repo | package | site
    Description: { type: 'String', default: '' },
    Visibility: { type: 'String', default: 'public' },
    DefaultBranch: { type: 'String', default: 'main' },
    HeadCommit: { type: 'String', default: '' },
    CommitCount: { type: 'Int4', default: 0 },
    BranchCount: { type: 'Int4', default: 1 },
    Size_KB: { type: 'Float4', default: 0 },
    Language: { type: 'String', default: '' },
    License: { type: 'String', default: '' },
    Created: { type: 'DateTime', default: '' },
    Updated: { type: 'DateTime', default: '' }
  }
};

// Level 3: Resource - File, Branch, Build, Page
export const ResourceUDT = {
  name: 'Resource',
  level: 3,
  parent: 'Project',
  description: 'Individual resource within a project',
  members: {
    ID: { type: 'String', default: '' },
    Type: { type: 'String', default: 'file' }, // file | branch | build | page | issue | pr
    Path: { type: 'String', default: '' },
    Name: { type: 'String', default: '' },
    ContentHash: { type: 'String', default: '' },
    Size_Bytes: { type: 'Int4', default: 0 },
    MimeType: { type: 'String', default: '' },
    Status: { type: 'String', default: 'active' },
    Metadata: { type: 'JSON', default: '{}' },
    Created: { type: 'DateTime', default: '' },
    Updated: { type: 'DateTime', default: '' }
  }
};

// Level 4: Operation - Commit, Deploy, Test, Run
export const OperationUDT = {
  name: 'Operation',
  level: 4,
  parent: 'Resource',
  description: 'Action performed on a resource',
  members: {
    ID: { type: 'String', default: '' },
    Type: { type: 'String', default: 'commit' }, // commit | deploy | test | run | merge
    Status: { type: 'String', default: 'pending' }, // pending | running | success | failed
    Author: { type: 'String', default: '' },
    Message: { type: 'String', default: '' },
    ParentID: { type: 'String', default: '' },
    TreeHash: { type: 'String', default: '' },
    Duration_MS: { type: 'Int4', default: 0 },
    Logs: { type: 'String', default: '' },
    Created: { type: 'DateTime', default: '' },
    Completed: { type: 'DateTime', default: '' }
  }
};

// Git-specific: Commit
export const CommitUDT = {
  name: 'Commit',
  extends: 'Operation',
  description: 'Git commit',
  members: {
    SHA: { type: 'String', default: '' },
    TreeSHA: { type: 'String', default: '' },
    ParentSHAs: { type: 'Array', default: '[]' },
    Author: { type: 'String', default: '' },
    AuthorEmail: { type: 'String', default: '' },
    Committer: { type: 'String', default: '' },
    CommitterEmail: { type: 'String', default: '' },
    Message: { type: 'String', default: '' },
    Timestamp: { type: 'DateTime', default: '' },
    Signature: { type: 'String', default: '' }
  }
};

// Git-specific: Branch
export const BranchUDT = {
  name: 'Branch',
  extends: 'Resource',
  description: 'Git branch',
  members: {
    Name: { type: 'String', default: '' },
    HeadSHA: { type: 'String', default: '' },
    Protected: { type: 'Bool', default: false },
    AheadBy: { type: 'Int4', default: 0 },
    BehindBy: { type: 'Int4', default: 0 },
    LastCommit: { type: 'DateTime', default: '' }
  }
};

// CI-specific: Build
export const BuildUDT = {
  name: 'Build',
  extends: 'Operation',
  description: 'CI build/workflow run',
  members: {
    WorkflowID: { type: 'String', default: '' },
    TriggerType: { type: 'String', default: 'push' }, // push | pr | manual | schedule
    TriggerRef: { type: 'String', default: '' },
    RunnerID: { type: 'String', default: '' },
    Steps: { type: 'Array', default: '[]' },
    Artifacts: { type: 'Array', default: '[]' },
    ExitCode: { type: 'Int4', default: 0 }
  }
};

// Pages-specific: Site
export const SiteUDT = {
  name: 'Site',
  extends: 'Resource',
  description: 'Hosted static site',
  members: {
    Domain: { type: 'String', default: '' },
    CustomDomain: { type: 'String', default: '' },
    RootHash: { type: 'String', default: '' },
    EntryPoint: { type: 'String', default: 'index.html' },
    DeployedAt: { type: 'DateTime', default: '' },
    DeployedBy: { type: 'String', default: '' },
    BuildCommand: { type: 'String', default: '' },
    OutputDir: { type: 'String', default: 'dist' }
  }
};

// Package-specific: Package
export const PackageUDT = {
  name: 'Package',
  extends: 'Resource',
  description: 'Published package',
  members: {
    Registry: { type: 'String', default: 'npm' }, // npm | cargo | pip | go
    Version: { type: 'String', default: '0.0.0' },
    Versions: { type: 'Array', default: '[]' },
    Dependencies: { type: 'JSON', default: '{}' },
    Downloads: { type: 'Int4', default: 0 },
    TarballHash: { type: 'String', default: '' },
    Readme: { type: 'String', default: '' }
  }
};

// Assembly instruction
export const InstructionUDT = {
  name: 'Instruction',
  description: 'KonoASM instruction',
  members: {
    Opcode: { type: 'UInt1', default: 0 },
    Mnemonic: { type: 'String', default: '' },
    Operands: { type: 'Array', default: '[]' },
    Addressing: { type: 'String', default: 'immediate' },
    Cycles: { type: 'Int4', default: 1 },
    Flags: { type: 'UInt1', default: 0 }
  }
};

// Export all UDTs
export const UDTs = {
  Forge: ForgeUDT,
  Workspace: WorkspaceUDT,
  Project: ProjectUDT,
  Resource: ResourceUDT,
  Operation: OperationUDT,
  Commit: CommitUDT,
  Branch: BranchUDT,
  Build: BuildUDT,
  Site: SiteUDT,
  Package: PackageUDT,
  Instruction: InstructionUDT
};

// Namespace path builder
export function buildPath(...parts) {
  return parts.filter(Boolean).join('/');
}

// Parse namespace path
export function parsePath(path) {
  const parts = path.split('/').filter(Boolean);
  return {
    forge: parts[0] || null,
    workspace: parts[1] || null,
    project: parts[2] || null,
    resource: parts[3] || null,
    operation: parts[4] || null,
    full: path
  };
}
