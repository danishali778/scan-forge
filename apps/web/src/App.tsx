import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CirclePause,
  CirclePlay,
  Clock3,
  Database,
  ExternalLink,
  FileText,
  Folder,
  Globe2,
  HelpCircle,
  Home,
  Image,
  ListChecks,
  Lock,
  Pause,
  Play,
  RefreshCw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Square,
  TerminalSquare,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";

type TabKey = "overview" | "plan" | "agents" | "logs" | "notes";
type SessionState = "running" | "paused" | "stopped";
type GateStatus = "approved" | "awaiting" | "locked";
type Severity = "critical" | "high" | "medium" | "low";

const navItems = [
  { label: "Workspace", icon: Home },
  { label: "Projects", icon: Folder },
  { label: "Sessions", icon: CirclePlay, badge: "2" },
  { label: "Evidence", icon: Database },
  { label: "Findings", icon: AlertTriangle },
  { label: "Reports", icon: FileText },
  { label: "Policies", icon: Shield },
];

const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "plan", label: "Plan" },
  { key: "agents", label: "Agents" },
  { key: "logs", label: "Logs" },
  { key: "notes", label: "Notes" },
];

const scopeGroups = [
  {
    title: "Allowed in scope",
    icon: Globe2,
    tone: "good",
    lines: ["staging.acme.test", "api.staging.acme.test", "10.50.0.0/24"],
    meta: "3 domains, 1 network",
  },
  {
    title: "Explicitly out of scope",
    icon: XCircle,
    tone: "danger",
    lines: ["acme.com", "production.*", "Third-party services"],
    meta: "12 items",
  },
  {
    title: "Disallowed actions",
    icon: Clock3,
    tone: "neutral",
    lines: [
      "Social engineering",
      "Physical access",
      "Denial of service",
      "Data destruction",
      "Exfiltration attempts",
    ],
    meta: "See policy for all restrictions",
  },
];

const planSteps = [
  { title: "Reconnaissance", detail: "OSINT and footprinting", status: "complete" },
  { title: "Discovery", detail: "Service and asset enumeration", status: "complete" },
  { title: "Analysis", detail: "Configuration and security review", status: "current" },
  { title: "Validation", detail: "Confirm and validate findings", status: "locked" },
  { title: "Reporting", detail: "Compile results and recommendations", status: "locked" },
];

const initialGates = [
  {
    id: 1,
    title: "Scope validation",
    status: "approved" as GateStatus,
    detail: "Approved by Taylor Morgan on May 10, 2026 09:14",
    actor: "View",
  },
  {
    id: 2,
    title: "Discovery activities",
    status: "approved" as GateStatus,
    detail: "Approved by Taylor Morgan on May 10, 2026 09:37",
    actor: "View",
  },
  {
    id: 3,
    title: "Active analysis",
    status: "awaiting" as GateStatus,
    detail: "Awaiting approval",
    actor: "Review",
  },
  {
    id: 4,
    title: "Validation testing",
    status: "locked" as GateStatus,
    detail: "Requires completion of prior gate",
    actor: "Locked",
  },
  {
    id: 5,
    title: "Reporting",
    status: "locked" as GateStatus,
    detail: "Requires completion of prior gate",
    actor: "Locked",
  },
];

const baseActivity = [
  {
    time: "10:25:14",
    role: "Planner",
    label: "Generated analysis plan for web application review",
    status: "Completed",
  },
  {
    time: "10:25:27",
    role: "Executor",
    label: "Tool HTTPX completed approved endpoint inventory",
    status: "Completed",
  },
  {
    time: "10:25:41",
    role: "Analyst",
    label: "Analyzed response patterns and status codes",
    status: "Completed",
  },
  {
    time: "10:26:05",
    role: "Executor",
    label: "Running low-impact template checks against approved scope",
    status: "Running",
  },
  {
    time: "10:26:18",
    role: "Analyst",
    label: "Correlating findings and risk indicators",
    status: "In progress",
  },
];

const riskSnapshot: { key: Severity; label: string; count: number }[] = [
  { key: "critical", label: "Critical", count: 2 },
  { key: "high", label: "High", count: 5 },
  { key: "medium", label: "Medium", count: 12 },
  { key: "low", label: "Low", count: 14 },
];

const healthRows = [
  ["Sandbox environment", "Healthy"],
  ["Agent communication", "Healthy"],
  ["Tool execution", "Healthy"],
  ["Evidence capture", "Healthy"],
  ["Policy compliance", "Enforced"],
];

const evidenceRows = [
  { label: "Screenshots", count: 18, icon: Image },
  { label: "HTTP transcripts", count: 21, icon: FileText },
  { label: "Configuration snapshots", count: 12, icon: ListChecks },
  { label: "Other artifacts", count: 16, icon: Database },
];

const agentRows = [
  {
    name: "Planner",
    status: "Idle",
    detail: "Plan has been accepted and is waiting on Gate 3.",
  },
  {
    name: "Executor",
    status: "Running",
    detail: "Collecting approved low-impact observations.",
  },
  {
    name: "Analyst",
    status: "In review",
    detail: "Correlating evidence against candidate findings.",
  },
  {
    name: "Reporter",
    status: "Queued",
    detail: "Draft report begins after validation approval.",
  },
];

const findings = [
  {
    severity: "critical",
    title: "Admin test route exposed in staging",
    asset: "staging.acme.test",
    owner: "Platform",
  },
  {
    severity: "high",
    title: "Overly permissive CORS policy",
    asset: "api.staging.acme.test",
    owner: "AppSec",
  },
  {
    severity: "medium",
    title: "Missing security header",
    asset: "staging.acme.test",
    owner: "Web",
  },
  {
    severity: "low",
    title: "Verbose server banner",
    asset: "10.50.0.0/24",
    owner: "Infrastructure",
  },
];

function App() {
  const [activeNav, setActiveNav] = useState("Workspace");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [sessionState, setSessionState] = useState<SessionState>("running");
  const [selectedSeverity, setSelectedSeverity] = useState<Severity>("high");
  const [selectedEvidence, setSelectedEvidence] = useState("HTTP transcripts");
  const [showApproval, setShowApproval] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [noteText, setNoteText] = useState(
    "Confirm that Gate 3 stays limited to passive analysis and configuration review until validation is approved.",
  );
  const [gates, setGates] = useState(initialGates);
  const [activity, setActivity] = useState(baseActivity);

  function addActivity(role: string, label: string, status = "Completed") {
    const now = new Date();
    const time = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    setActivity((items) => [{ time, role, label, status }, ...items].slice(0, 7));
  }

  function setControlState(next: SessionState) {
    setSessionState(next);
    const label =
      next === "running"
        ? "Session resumed inside approved scope"
        : next === "paused"
          ? "Operator paused tool execution"
          : "Operator stopped the active session";
    addActivity("Supervisor", label, next === "running" ? "Running" : "Completed");
  }

  function approveGate() {
    setGates((items) =>
      items.map((gate) => {
        if (gate.id === 3) {
          return {
            ...gate,
            status: "approved",
            detail: "Approved by Alex Smith just now",
            actor: "View",
          };
        }

        if (gate.id === 4) {
          return {
            ...gate,
            status: "awaiting",
            detail: "Ready for operator review",
            actor: "Review",
          };
        }

        return gate;
      }),
    );
    setShowApproval(false);
    addActivity("Supervisor", "Gate 3 approved for scoped analysis");
  }

  function refreshHealth() {
    addActivity("Supervisor", "Runtime health check completed across all services");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <ShieldCheck size={24} />
          </span>
          <span>Pentagi</span>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`nav-item ${activeNav === item.label ? "active" : ""}`}
                key={item.label}
                type="button"
                onClick={() => {
                  setActiveNav(item.label);
                  addActivity("Workspace", `${item.label} view selected`, "Updated");
                }}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{item.label}</span>
                {item.badge ? <strong>{item.badge}</strong> : null}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="organization-switcher" type="button">
            <Database size={19} aria-hidden="true" />
            <span>
              <small>Organization</small>
              Acme Corp
            </span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          <button className="nav-item footer-action" type="button">
            <Settings size={19} aria-hidden="true" />
            <span>Settings</span>
          </button>
          <button className="nav-item footer-action" type="button">
            <HelpCircle size={19} aria-hidden="true" />
            <span>Help & Docs</span>
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="project-switcher">
            <span>Project</span>
            <button type="button">
              Staging Review
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="status-banner">
            <ShieldCheck size={22} aria-hidden="true" />
            <span>
              <strong>Authorized scope active</strong>
              Scope enforced
            </span>
          </div>

          <div className="topbar-actions">
            <div className="runtime-clock">
              <Clock3 size={22} aria-hidden="true" />
              <span>
                Session runtime
                <strong>01:24:37</strong>
              </span>
            </div>

            <button
              className="profile-button"
              type="button"
              onClick={() => setShowUserMenu((visible) => !visible)}
              aria-expanded={showUserMenu}
            >
              <span className="avatar">AS</span>
              <span>
                <strong>Alex Smith</strong>
                Security Engineer
              </span>
              <ChevronDown size={16} aria-hidden="true" />
            </button>

            <button
              className="icon-button notification-button"
              type="button"
              aria-label="Open notifications"
              onClick={() => setShowNotifications((visible) => !visible)}
            >
              <Bell size={19} aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
          </div>

          {showUserMenu ? (
            <div className="popover user-menu">
              <button type="button">Profile and permissions</button>
              <button type="button">API tokens</button>
              <button type="button">Sign out</button>
            </div>
          ) : null}

          {showNotifications ? (
            <div className="popover notification-menu">
              <strong>2 session updates</strong>
              <p>Gate 3 is waiting for review.</p>
              <p>Report draft reached 58% readiness.</p>
            </div>
          ) : null}
        </header>

        <div className="screen-grid">
          <section className="main-column">
            <section className="hero-panel">
              <div className="session-copy">
                <p className="eyebrow">Session objective</p>
                <h1>Assess approved staging perimeter</h1>
                <p>
                  Validate security posture of the staging environment within the
                  authorized scope and identify potential misconfigurations.
                </p>
              </div>

              <div className="authorization-card">
                <div className="authorization-title">
                  <ShieldCheck size={22} aria-hidden="true" />
                  <strong>Authorization boundary</strong>
                  <span>Active</span>
                </div>
                <p>
                  This engagement is authorized for the assets and activities defined
                  below. All actions are monitored and logged.
                </p>
                <button className="text-button" type="button">
                  View full authorization
                  <ExternalLink size={14} aria-hidden="true" />
                </button>
              </div>
            </section>

            <div className="tab-list" role="tablist" aria-label="Session sections">
              {tabs.map((tab) => (
                <button
                  aria-selected={activeTab === tab.key}
                  className={activeTab === tab.key ? "active" : ""}
                  key={tab.key}
                  role="tab"
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "overview" ? (
              <OverviewTab
                activity={activity}
                gates={gates}
                onReview={(gateId) => {
                  const gate = gates.find((item) => item.id === gateId);
                  if (gate?.status === "awaiting") setShowApproval(true);
                }}
              />
            ) : null}

            {activeTab === "plan" ? <PlanTab /> : null}
            {activeTab === "agents" ? <AgentsTab /> : null}
            {activeTab === "logs" ? <LogsTab activity={activity} /> : null}
            {activeTab === "notes" ? (
              <NotesTab
                noteText={noteText}
                onChange={setNoteText}
                onSave={() => addActivity("Reviewer", "Session note saved", "Saved")}
              />
            ) : null}
          </section>

          <aside className="insight-column" aria-label="Session insights">
            <section className="control-strip">
              <button
                className={`control-button start ${sessionState === "running" ? "active" : ""}`}
                type="button"
                onClick={() => setControlState("running")}
              >
                <Play size={18} aria-hidden="true" />
                Start
              </button>
              <button
                className={`control-button pause ${sessionState === "paused" ? "active" : ""}`}
                type="button"
                onClick={() => setControlState("paused")}
              >
                <Pause size={18} aria-hidden="true" />
                Pause
              </button>
              <button
                className={`control-button stop ${sessionState === "stopped" ? "active" : ""}`}
                type="button"
                onClick={() => setControlState("stopped")}
              >
                <Square size={16} aria-hidden="true" />
                Stop
              </button>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>Risk snapshot</h2>
                <button className="text-button" type="button" onClick={() => setActiveNav("Findings")}>
                  See all findings
                </button>
              </div>

              <div className="risk-grid">
                {riskSnapshot.map((risk) => (
                  <button
                    className={`risk-item ${risk.key} ${
                      selectedSeverity === risk.key ? "selected" : ""
                    }`}
                    key={risk.key}
                    type="button"
                    onClick={() => setSelectedSeverity(risk.key)}
                  >
                    <AlertTriangle size={17} aria-hidden="true" />
                    <span>{risk.label}</span>
                    <strong>{risk.count}</strong>
                  </button>
                ))}
              </div>

              <div className="risk-meta">
                <span>
                  <small>Total findings</small>
                  33
                </span>
                <span>
                  <small>New this session</small>
                  7
                </span>
                <span>
                  <small>Risk trend</small>
                  +2
                </span>
              </div>

            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>Runtime health</h2>
                <span className="panel-status">Sandbox healthy</span>
              </div>
              <div className="health-list">
                {healthRows.map(([label, value]) => (
                  <div className="health-row" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <button className="text-button" type="button" onClick={refreshHealth}>
                View health details
                <ExternalLink size={14} aria-hidden="true" />
              </button>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>Evidence queue</h2>
                <span className="muted">67 items</span>
              </div>
              <div className="evidence-list">
                {evidenceRows.map((row) => {
                  const Icon = row.icon;
                  return (
                    <button
                      className={selectedEvidence === row.label ? "selected" : ""}
                      key={row.label}
                      type="button"
                      onClick={() => setSelectedEvidence(row.label)}
                    >
                      <Icon size={17} aria-hidden="true" />
                      <span>{row.label}</span>
                      <strong>{row.count}</strong>
                    </button>
                  );
                })}
              </div>
              <div className="selected-evidence">
                Selected queue: <strong>{selectedEvidence}</strong>
              </div>
              <button className="text-button" type="button">
                View all evidence
                <ExternalLink size={14} aria-hidden="true" />
              </button>
            </section>

            <section className="panel report-panel">
              <h2>Report readiness</h2>
              <div className="report-content">
                <div className="progress-ring" style={{ "--progress": "58%" } as React.CSSProperties}>
                  <strong>58%</strong>
                </div>
                <div>
                  <strong>Draft report in progress</strong>
                  <p>Findings are being organized and validated. Report will be ready after approval.</p>
                </div>
              </div>
              <button className="text-button" type="button" onClick={() => setShowReport(true)}>
                View report preview
                <ExternalLink size={14} aria-hidden="true" />
              </button>
            </section>
          </aside>
        </div>
      </section>

      {showApproval ? <ApprovalModal onClose={() => setShowApproval(false)} onApprove={approveGate} /> : null}
      {showReport ? <ReportModal onClose={() => setShowReport(false)} /> : null}
    </main>
  );
}

function OverviewTab({
  activity,
  gates,
  onReview,
}: {
  activity: typeof baseActivity;
  gates: typeof initialGates;
  onReview: (gateId: number) => void;
}) {
  return (
    <>
      <section className="section-block">
        <div className="section-title">
          <h2>Scope summary</h2>
          <span className="status-pill good">Scope enforced</span>
        </div>
        <div className="scope-grid">
          {scopeGroups.map((group) => {
            const Icon = group.icon;
            return (
              <article className="scope-group" key={group.title}>
                <Icon className={group.tone} size={42} aria-hidden="true" />
                <div>
                  <h3>{group.title}</h3>
                  <ul>
                    {group.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <small>{group.meta}</small>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <h2>Proposed plan</h2>
          <span className="status-pill outline">Current step 3 of 5</span>
        </div>
        <div className="plan-rail">
          {planSteps.map((step, index) => (
            <div className={`plan-step ${step.status}`} key={step.title}>
              <span>{step.status === "complete" ? <CheckCircle2 size={16} /> : index + 1}</span>
              <strong>{step.title}</strong>
              <small>{step.detail}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <h2>Approval gates</h2>
        </div>
        <div className="gate-list">
          {gates.map((gate) => (
            <div className={`gate-row ${gate.status}`} key={gate.id}>
              <span className="gate-icon">
                {gate.status === "approved" ? <CheckCircle2 size={18} /> : null}
                {gate.status === "awaiting" ? <Clock3 size={18} /> : null}
                {gate.status === "locked" ? <Lock size={18} /> : null}
              </span>
              <strong>Gate {gate.id}</strong>
              <span>{gate.title}</span>
              <small>{gate.detail}</small>
              <button type="button" disabled={gate.status === "locked"} onClick={() => onReview(gate.id)}>
                {gate.actor}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <h2>Live agent and tool activity</h2>
        </div>
        <ActivityList activity={activity} />
        <button className="text-button activity-link" type="button">
          View full activity log
          <ExternalLink size={14} aria-hidden="true" />
        </button>
      </section>
    </>
  );
}

function PlanTab() {
  return (
    <section className="section-block">
      <div className="section-title">
        <h2>Execution plan</h2>
        <span className="status-pill outline">Assisted mode</span>
      </div>
      <div className="plan-detail-list">
        {planSteps.map((step, index) => (
          <article className={`plan-detail ${step.status}`} key={step.title}>
            <span>{index + 1}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
              <small>
                {step.status === "complete"
                  ? "Completed and evidence-linked"
                  : step.status === "current"
                    ? "In progress, policy monitored"
                    : "Locked until the required approval gate is complete"}
              </small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AgentsTab() {
  return (
    <section className="section-block">
      <div className="section-title">
        <h2>Agent roster</h2>
        <span className="status-pill good">Policy monitored</span>
      </div>
      <div className="agent-grid">
        {agentRows.map((agent) => (
          <article className="agent-row" key={agent.name}>
            <User size={19} aria-hidden="true" />
            <div>
              <strong>{agent.name}</strong>
              <p>{agent.detail}</p>
            </div>
            <span>{agent.status}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function LogsTab({ activity }: { activity: typeof baseActivity }) {
  return (
    <section className="section-block">
      <div className="section-title">
        <h2>Session logs</h2>
        <span className="status-pill outline">Live stream</span>
      </div>
      <div className="log-toolbar">
        <label>
          <Search size={16} aria-hidden="true" />
          <input placeholder="Filter activity" />
        </label>
        <button type="button">
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </button>
      </div>
      <ActivityList activity={activity} />
    </section>
  );
}

function NotesTab({
  noteText,
  onChange,
  onSave,
}: {
  noteText: string;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <section className="section-block">
      <div className="section-title">
        <h2>Reviewer notes</h2>
        <span className="status-pill outline">Private to Acme Corp</span>
      </div>
      <label className="note-editor">
        Session note
        <textarea value={noteText} onChange={(event) => onChange(event.target.value)} />
      </label>
      <button className="primary-action" type="button" onClick={onSave}>
        Save note
      </button>
    </section>
  );
}

function ActivityList({ activity }: { activity: typeof baseActivity }) {
  return (
    <div className="activity-table">
      {activity.map((item) => (
        <div className="activity-row" key={`${item.time}-${item.label}`}>
          <time>{item.time}</time>
          <span className={`role-badge ${item.role.toLowerCase()}`}>
            {item.role === "Planner" ? <BookOpen size={15} aria-hidden="true" /> : null}
            {item.role === "Executor" ? <TerminalSquare size={15} aria-hidden="true" /> : null}
            {item.role === "Analyst" ? <BarChart3 size={15} aria-hidden="true" /> : null}
            {item.role === "Supervisor" ? <ShieldCheck size={15} aria-hidden="true" /> : null}
            {item.role === "Workspace" ? <Users size={15} aria-hidden="true" /> : null}
            {item.role === "Reviewer" ? <User size={15} aria-hidden="true" /> : null}
            {item.role}
          </span>
          <span>{item.label}</span>
          <strong>{item.status}</strong>
        </div>
      ))}
    </div>
  );
}

function ApprovalModal({ onApprove, onClose }: { onApprove: () => void; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="approval-title">
        <button className="modal-close" type="button" aria-label="Close approval review" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
        <p className="eyebrow">Approval gate</p>
        <h2 id="approval-title">Review Gate 3: Active analysis</h2>
        <p>
          This step keeps testing inside the approved staging scope and limits activity to
          configuration analysis, response review, and evidence organization.
        </p>
        <div className="modal-summary">
          <span>
            <strong>Policy</strong>
            Scope enforced before every tool action
          </span>
          <span>
            <strong>Runtime</strong>
            Isolated sandbox with evidence capture enabled
          </span>
        </div>
        <div className="modal-actions">
          <button className="secondary-action" type="button" onClick={onClose}>
            Keep waiting
          </button>
          <button className="primary-action" type="button" onClick={onApprove}>
            Approve analysis
          </button>
        </div>
      </section>
    </div>
  );
}

function ReportModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <button className="modal-close" type="button" aria-label="Close report preview" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
        <p className="eyebrow">Report preview</p>
        <h2 id="report-title">Staging Review draft</h2>
        <div className="report-outline">
          <span>Executive summary</span>
          <span>Scope and methodology</span>
          <span>Validated findings</span>
          <span>Evidence appendix</span>
          <span>Remediation plan</span>
        </div>
        <p>
          The draft is assembling from reviewed findings and linked evidence. Validation and
          final operator approval are still required before export.
        </p>
        <div className="modal-actions">
          <button className="secondary-action" type="button" onClick={onClose}>
            Close preview
          </button>
          <button className="primary-action" type="button">
            Prepare export
          </button>
        </div>
      </section>
    </div>
  );
}

export default App;
