const SUBAGENT_PERMISSION_ENV = {
  PI_IS_SUBAGENT: "1",
  PI_SUBAGENT_CHILD: "1",
} as const;

const PARENT_SESSION_ENV = "PI_AGENT_ROUTER_PARENT_SESSION_ID";
const FORWARDING_AGENT_DIR_ENV = "PI_PERMISSION_SYSTEM_FORWARDING_AGENT_DIR";

let activeScopes = 0;
let savedEnv: Map<string, string | undefined> | undefined;

export interface SubagentPermissionForwardingOptions {
  parentSessionId?: string;
  agentDir?: string;
}

/**
 * Make SDK-created workflow agents look like Pi subagents to native permission
 * extensions. In particular, pi-permission-system forwards ask decisions to the
 * parent session when these env hints are present.
 */
export function installSubagentPermissionForwarding(options: SubagentPermissionForwardingOptions): () => void {
  const parentSessionId = options.parentSessionId?.trim();
  if (!parentSessionId) return () => {};

  const next: Record<string, string> = {
    ...SUBAGENT_PERMISSION_ENV,
    [PARENT_SESSION_ENV]: parentSessionId,
  };
  if (options.agentDir?.trim()) next[FORWARDING_AGENT_DIR_ENV] = options.agentDir.trim();

  if (activeScopes === 0) {
    savedEnv = new Map(Object.keys(next).map((key) => [key, process.env[key]]));
  }
  activeScopes++;
  for (const [key, value] of Object.entries(next)) process.env[key] = value;

  return () => {
    activeScopes = Math.max(0, activeScopes - 1);
    if (activeScopes !== 0 || !savedEnv) return;
    for (const [key, value] of savedEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    savedEnv = undefined;
  };
}
