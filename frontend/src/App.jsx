import { useState, useEffect, useMemo } from "react";

// ============================================
// MOCK DATA - Email & Draft Operations
// ============================================

const MOCK_METRICS = {
  pendingApproval: 12,
  avgResponseTime: "1m 42s",
  emailsProcessed: 247,
  aiConfidence: 87,
  sentToday: 34,
  rejectedToday: 5,
  slaBreaches: 2,
};

const MOCK_EMAILS = [
  {
    id: "em_001",
    status: "pending",
    statusColor: "#f59e0b",
    from: "Sarah Chen",
    email: "sarah.chen@techcorp.com",
    initials: "SC",
    color: "#8b5cf6",
    subject: "Question about your API integration",
    preview: "Hi there, I've been reading about your services and I'm particularly interested in...",
    tags: ["sales", "api"],
    time: "5m ago",
    priority: "high",
    priorityColor: "#ef4444",
    body: `Hi there,

I've been reading about your services and I'm particularly interested in how your API integration works. We're currently evaluating different solutions for our team.

A few specific questions:
1. What's the average response time for the API?
2. Do you support webhooks for real-time updates?
3. What's the pricing model for enterprise usage?

Would love to schedule a call to discuss this further.

Best regards,
Sarah Chen
--
Sarah Chen
Product Manager, TechCorp`,
    sentiment: "interested",
    sentimentScore: 85,
    suggestedAction: "Draft friendly, detailed response with pricing info",
    confidence: 82,
  },
  {
    id: "em_002",
    status: "pending",
    statusColor: "#f59e0b",
    from: "James Wilson",
    email: "james@startupxyz.io",
    initials: "JW",
    color: "#06b6d4",
    subject: "Partnership opportunity",
    preview: "We'd love to explore a strategic partnership with MDX.so...",
    tags: ["partnership", "urgent"],
    time: "23m ago",
    priority: "urgent",
    priorityColor: "#ef4444",
    body: `We'd love to explore a strategic partnership with MDX.so.

Our platform reaches 500K+ developers monthly and we think there's mutual value in collaborating.

Are you free for a 30-min call next week?

Cheers,
James
--
James Wilson
Co-founder, StartupXYZ`,
    sentiment: "positive",
    sentimentScore: 92,
    suggestedAction: "Respond positively, propose specific times for call",
    confidence: 95,
  },
  {
    id: "em_003",
    status: "pending",
    statusColor: "#f59e0b",
    from: "Maria Garcia",
    email: "maria@enterprise.com",
    initials: "MG",
    color: "#10b981",
    subject: "Renewal inquiry - Enterprise plan",
    preview: "Our annual subscription is coming up for renewal next month...",
    tags: ["retention", "enterprise"],
    time: "1h ago",
    priority: "medium",
    priorityColor: "#f59e0b",
    body: `Hello,

Our annual subscription is coming up for renewal next month. We'd like to discuss:

1. Any new features in the enterprise plan
2. Volume pricing for 50+ seats
3. Dedicated support options

Please let us know who we should coordinate with.

Best,
Maria Garcia
Enterprise Operations Manager`,
    sentiment: "neutral",
    sentimentScore: 55,
    suggestedAction: "Schedule demo call with sales team",
    confidence: 78,
  },
  {
    id: "em_004",
    status: "approved",
    statusColor: "#10b981",
    from: "David Kim",
    email: "david@agency.co",
    initials: "DK",
    color: "#f59e0b",
    subject: "Re: Project timeline update",
    preview: "Thanks for the update. We've reviewed the proposed timeline...",
    tags: ["project"],
    time: "2h ago",
    priority: "low",
    priorityColor: "#64748b",
    body: `Thanks for the update. We've reviewed the proposed timeline and everything looks good from our end.

One quick question - will the design review be included in the next sprint?

Thanks,
David`,
    sentiment: "positive",
    sentimentScore: 75,
    suggestedAction: "Confirm timeline, schedule design review",
    confidence: 88,
  },
];

const MOCK_DRAFTS = [
  {
    id: "dr_001",
    to: "sarah.chen@techcorp.com",
    email: "Sarah Chen",
    subject: "Re: Question about your API integration",
    original: `Hi there, I've been reading about your services and I'm particularly interested in how your API integration works...`,
    draft: `Hi Sarah,

Thank you for reaching out! I'd be happy to answer your questions about our API integration.

**Response to your questions:**

1. **Response Time**: Our API typically responds within 100-200ms for standard requests.

2. **Webhooks**: Yes! We support real-time webhooks with automatic retry logic.

3. **Enterprise Pricing**: We offer flexible volume pricing starting at:
   - 10-49 seats: 15% off
   - 50-99 seats: 25% off
   - 100+ seats: Custom pricing

Would you like me to schedule a call to walk you through a live demo?

Best regards,
The MDX.so Team`,
    confidence: 82,
    tags: ["sales", "api"],
    lang: "EN",
    sla: 3600000,
    status: "pending",
    tone: "professional",
    slaBreach: false,
  },
  {
    id: "dr_002",
    to: "james@startupxyz.io",
    email: "James Wilson",
    subject: "Re: Partnership opportunity",
    original: `We'd love to explore a strategic partnership with MDX.so...`,
    draft: `Hi James,

This sounds exciting! We'd love to explore a partnership opportunity.

I'm available for a 30-min call:
- Tuesday 2-2:30 PM PST
- Wednesday 10-10:30 AM PST
- Thursday 4-4:30 PM PST

Please let me know what works best for you, or feel free to suggest other times.

Looking forward to connecting!

Cheers,
The MDX.so Team`,
    confidence: 95,
    tags: ["partnership"],
    lang: "EN",
    sla: 1800000,
    status: "pending",
    tone: "friendly",
    slaBreach: false,
  },
  {
    id: "dr_003",
    to: "maria@enterprise.com",
    email: "Maria Garcia",
    subject: "Re: Renewal inquiry - Enterprise plan",
    original: `Our annual subscription is coming up for renewal next month...`,
    draft: `Dear Maria,

Thank you for being a valued customer!

I'd be happy to discuss your renewal and answer your questions about our enterprise offerings.

**New Features:**
- Advanced analytics dashboard
- SSO integration (Okta, Azure AD)
- Priority support with 4-hour SLA

For pricing on 50+ seats, let me connect you with our enterprise team directly. They'll be able to provide a custom quote based on your specific needs.

Would you like me to arrange an intro?

Best regards,
The MDX.so Team`,
    confidence: 78,
    tags: ["retention", "enterprise"],
    lang: "EN",
    sla: 7200000,
    status: "pending",
    tone: "professional",
    slaBreach: false,
  },
  {
    id: "dr_004",
    to: "david@agency.co",
    email: "David Kim",
    subject: "Re: Project timeline update",
    original: `Thanks for the update. We've reviewed the proposed timeline...`,
    draft: `Hi David,

Great to hear the timeline looks good! Yes, the design review is scheduled for Sprint 3, Day 5. I'll send out a calendar invite with the details.

Let me know if you have any other questions!

Thanks,
The MDX.so Team`,
    confidence: 88,
    tags: ["project"],
    lang: "EN",
    sla: null,
    status: "approved",
    tone: "direct",
    sentAt: Date.now() - 7200000,
  },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const fmt = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K";
  return n.toLocaleString();
};

const timeAgo = (ts) => {
  if (!ts) return "-";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
};

const durFmt = (ms) => {
  if (!ms) return "-";
  if (ms < 1000) return ms + "ms";
  if (ms < 60000) return (ms / 1000).toFixed(1) + "s";
  return Math.floor(ms / 60000) + "m " + ((ms % 60000) / 1000).toFixed(0) + "s";
};

// ============================================
// COLOR PALETTE & DESIGN SYSTEM
// ============================================

const COLORS = {
  bg: "#0a0e17",
  bgGradient: "#0f1520",
  bgCard: "rgba(15, 23, 42, 0.6)",
  border: "rgba(56, 189, 248, 0.06)",
  primary: "#38bdf8",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  textPrimary: "#e2e8f0",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  cyan: "#38bdf8",
  purple: "#a78bfa",
};

// ============================================
// COMPONENT: Status Pill
// ============================================

function StatusPill({ status, color, children }) {
  const colors = {
    pending: { bg: "#f59e0b20", border: "#f59e0b40", text: "#f59e0b" },
    approved: { bg: "#10b98120", border: "#10b98140", text: "#10b981" },
    rejected: { bg: "#ef444420", border: "#ef444440", text: "#ef4444" },
    urgent: { bg: "#ef444420", border: "#ef444440", text: "#ef4444" },
    high: { bg: "#ef444420", border: "#ef444440", text: "#ef4444" },
    medium: { bg: "#f59e0b20", border: "#f59e0b40", text: "#f59e0b" },
    low: { bg: "#64748b20", border: "#64748b40", text: "#64748b" },
  };
  const c = colors[status?.toLowerCase()] || colors.pending;
  const finalColor = color || c.text;
  const finalBg = color ? `${color}20` : c.bg;
  const finalBorder = color ? `${color}40` : c.border;
  
  return (
    <span style={{ 
      display: "inline-flex", 
      alignItems: "center", 
      gap: 4, 
      padding: "3px 8px", 
      background: finalBg, 
      border: `1px solid ${finalBorder}`, 
      borderRadius: 20, 
      fontSize: 10, 
      fontWeight: 600, 
      color: finalColor,
      textTransform: "capitalize"
    }}>
      {children || status}
    </span>
  );
}

// ============================================
// COMPONENT: Avatar
// ============================================

function Avatar({ initials, color, size = 32 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: `linear-gradient(135deg, ${color}, ${color}80)`,
      border: `2px solid ${color}40`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.4,
      fontWeight: 600,
      color: "#fff",
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ============================================
// COMPONENT: Confidence Bar
// ============================================

function ConfidenceBar({ value, size = "normal" }) {
  const height = size === "small" ? 3 : 4;
  const width = size === "small" ? 32 : 48;
  const colors = value >= 80 ? COLORS.success : value >= 60 ? COLORS.warning : COLORS.error;
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <div style={{ 
          width: width, 
          height: height, 
          background: COLORS.border, 
          borderRadius: height / 2, 
          overflow: "hidden" 
        }}>
          <div style={{ 
            width: `${value}%`, 
            height: "100%", 
            background: colors, 
            borderRadius: height / 2,
            transition: "width 0.3s ease"
          }} />
        </div>
        <span style={{ 
          fontSize: size === "small" ? 9 : 10, 
          color: colors,
          fontWeight: 500 
        }}>{value}%</span>
      </div>
    </div>
  );
}

// ============================================
// COMPONENT: Tag Pill
// ============================================

function TagPill({ tag, small }) {
  return (
    <span style={{
      padding: small ? "1px 5px" : "2px 6px",
      background: `${COLORS.primary}15`,
      border: `1px solid ${COLORS.primary}30`,
      borderRadius: 4,
      fontSize: small ? 9 : 10,
      color: COLORS.primary,
      fontWeight: 500,
    }}>
      {tag}
    </span>
  );
}

// ============================================
// COMPONENT: Card Base
// ============================================

function Card({ children, style, padding = "18px", hover = false, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{
        background: COLORS.bgCard,
        backdropFilter: "blur(20px)",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding,
        ...style,
        ...(hover ? {
          cursor: "pointer",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        } : {}),
      }}
    >
      {children}
    </div>
  );
}

// ============================================
// COMPONENT: Button
// ============================================

function Button({ children, variant = "primary", size = "normal", onClick, disabled }) {
  const variants = {
    primary: {
      background: "linear-gradient(135deg, #0ea5e9, #38bdf8)",
      border: "none",
      color: "#0a0e17",
    },
    secondary: {
      background: "transparent",
      border: `1px solid ${COLORS.border}`,
      color: COLORS.textPrimary,
    },
  };

  const sizes = {
    small: { padding: "6px 12px", fontSize: 11 },
    normal: { padding: "8px 16px", fontSize: 12 },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...variants[variant],
        ...sizes[size],
        borderRadius: 8,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {children}
    </button>
  );
}

// ============================================
// COMPONENT: Nav Button
// ============================================

function NavButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "10px 14px",
        background: active ? `${COLORS.primary}15` : "transparent",
        border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
        borderRadius: 8,
        color: active ? COLORS.primary : COLORS.textMuted,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        transition: "all 0.2s",
        fontFamily: "'DM Sans', sans-serif",
        textAlign: "left",
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ============================================
// COMPONENT: Search Input
// ============================================

function SearchInput({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative" }}>
      <svg 
        style={{ 
          position: "absolute", 
          left: 10, 
          top: "50%", 
          transform: "translateY(-50%)",
          color: COLORS.textMuted,
          width: 14,
          height: 14,
        }}
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 6,
          padding: "8px 10px 8px 32px",
          color: COLORS.textPrimary,
          fontSize: 11,
          outline: "none",
          fontFamily: "'DM Sans', sans-serif",
          transition: "all 0.2s",
        }}
      />
    </div>
  );
}

// ============================================
// COMPONENT: KPI Card
// ============================================

function KPICard({ title, value, sub, trend, trendUp, color, icon }) {
  return (
    <Card style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 500, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</span>
        {icon && <span style={{ fontSize: 16, opacity: 0.3 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || COLORS.textPrimary, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>
        {value}
      </div>
      {sub && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          {trend !== undefined && (
            <span style={{ 
              fontSize: 11, 
              color: trendUp ? COLORS.success : COLORS.error,
              display: "flex",
              alignItems: "center",
            }}>
              {trendUp ? "↑" : "↓"} {trend}%
            </span>
          )}
          <span style={{ fontSize: 11, color: COLORS.textMuted }}>{sub}</span>
        </div>
      )}
    </Card>
  );
}

// ============================================
// COMPONENT: Drawer Panel
// ============================================

function Drawer({ title, onClose, children, actions }) {
  return (
    <div style={{
      position: "fixed",
      top: 0,
      right: 0,
      bottom: 0,
      width: 520,
      maxWidth: "100vw",
      background: COLORS.bg,
      borderLeft: `1px solid ${COLORS.border}`,
      zIndex: 200,
      display: "flex",
      flexDirection: "column",
      animation: "slideInRight 0.3s ease-out",
    }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div style={{ 
        padding: "16px 20px", 
        borderBottom: `1px solid ${COLORS.border}`, 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>{title}</h2>
        <button 
          onClick={onClose} 
          style={{ 
            background: "none", 
            border: "none", 
            color: COLORS.textMuted, 
            cursor: "pointer", 
            fontSize: 18,
            padding: 4,
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
        {children}
      </div>
      {actions && (
        <div style={{ 
          padding: "16px 20px", 
          borderTop: `1px solid ${COLORS.border}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
        }}>
          {actions}
        </div>
      )}
    </div>
  );
}

// ============================================
// VIEW: Overview Tab
// ============================================

function OverviewTab({ onViewEmail }) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const sparklineData = useMemo(() => 
    Array.from({ length: 12 }, () => Math.floor(Math.random() * 40) + 60),
    []
  );

  return (
    <div style={{ animation: "fadeInUp 0.4s ease" }}>
      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        <KPICard 
          title="Pending Approval" 
          value={MOCK_METRICS.pendingApproval} 
          sub="Needs attention"
          color={COLORS.warning}
          icon="●"
        />
        <KPICard 
          title="Avg Response" 
          value={MOCK_METRICS.avgResponseTime} 
          sub="Last 24h"
          color={COLORS.cyan}
          icon="◇"
        />
        <KPICard 
          title="Emails Processed" 
          value={MOCK_METRICS.emailsProcessed} 
          sub="+18% vs yesterday"
          trend={18}
          trendUp={true}
          color={COLORS.success}
          icon="✉"
        />
        <KPICard 
          title="AI Confidence" 
          value={MOCK_METRICS.aiConfidence + "%"} 
          sub="87 drafts approved"
          color={COLORS.primary}
          icon="◈"
        />
        <KPICard 
          title="SLA Breaches" 
          value={MOCK_METRICS.slaBreaches} 
          sub="This week"
          color={COLORS.error}
          icon="!"
        />
      </div>

      {/* Quick Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card padding="0" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}` }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Recent Emails</span>
          </div>
          <div style={{ maxHeight: 320, overflow: "auto" }}>
            {MOCK_EMAILS.slice(0, 4).map((email, i) => (
              <div 
                key={email.id}
                onClick={() => onViewEmail(email)}
                style={{
                  padding: "12px 18px",
                  borderBottom: i < 3 ? `1px solid ${COLORS.border}` : "none",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <Avatar initials={email.initials} color={email.color} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textPrimary }}>{email.from}</span>
                      <span style={{ fontSize: 10, color: COLORS.textMuted }}>{email.time}</span>
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {email.subject}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="0" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Activity Trend</span>
            <span style={{ fontSize: 10, color: COLORS.textMuted }}>Last 12 hours</span>
          </div>
          <div style={{ padding: 20, display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
            {sparklineData.map((v, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", height: v, background: `linear-gradient(to top, ${COLORS.primary}40, ${COLORS.primary})`, borderRadius: "4px 4px 0 0", transition: "height 0.3s" }} />
              </div>
            ))}
          </div>
          <div style={{ padding: "0 18px 14px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, color: COLORS.textMuted }}>Sent: {MOCK_METRICS.sentToday}</span>
            <span style={{ fontSize: 10, color: COLORS.textMuted }}>Rejected: {MOCK_METRICS.rejectedToday}</span>
          </div>
        </Card>
      </div>

      {/* Pending Drafts Preview */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Pending Drafts ({MOCK_DRAFTS.filter(d => d.status === "pending").length})
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {MOCK_DRAFTS.filter(d => d.status === "pending").slice(0, 3).map(draft => (
            <Card key={draft.id} padding="14px" hover>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Avatar initials={draft.email.split(" ").map(n => n[0]).join("")} color={COLORS.primary} size={24} />
                <ConfidenceBar value={draft.confidence} size="small" />
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {draft.to}
              </div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 8 }}>{draft.subject}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {draft.tags.map(tag => <TagPill key={tag} tag={tag} small />)}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// VIEW: Emails Tab
// ============================================

function EmailsTab({ onViewEmail }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredEmails = MOCK_EMAILS.filter(e => {
    if (filter === "pending" && e.status !== "pending") return false;
    if (filter === "approved" && e.status !== "approved") return false;
    if (search && !e.subject.toLowerCase().includes(search.toLowerCase()) && !e.from.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ animation: "fadeInUp 0.4s ease" }}>
      {/* Filter Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <NavButton active={filter === "all"} onClick={() => setFilter("all")} label="All" icon="◎" />
        <NavButton active={filter === "pending"} onClick={() => setFilter("pending")} label={`Pending (${MOCK_EMAILS.filter(e => e.status === "pending").length})`} icon="◐" />
        <NavButton active={filter === "approved"} onClick={() => setFilter("approved")} label="Approved" icon="◉" />
        <div style={{ flex: 1 }} />
        <div style={{ width: 200 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search emails..." />
        </div>
      </div>

      {/* Email Cards */}
      <div style={{ display: "grid", gap: 12 }}>
        {filteredEmails.map((email, i) => (
          <div 
            key={email.id}
            style={{
              animation: `fadeInUp 0.4s ease ${i * 0.05}s both`,
            }}
          >
            <Card padding="16px" hover onClick={() => onViewEmail(email)}>
              <div style={{ display: "flex", gap: 14 }}>
                <Avatar initials={email.initials} color={email.color} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>{email.from}</span>
                      <span style={{ fontSize: 10, color: COLORS.textMuted, marginLeft: 8 }}>{email.email}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {email.priority !== "low" && <StatusPill status={email.priority}>{email.priority}</StatusPill>}
                      <StatusPill status={email.status}>{email.status}</StatusPill>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 6 }}>
                    {email.subject}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 10, lineHeight: 1.5 }}>
                    {email.preview}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {email.tags.map(tag => <TagPill key={tag} tag={tag} small />)}
                    <span style={{ fontSize: 10, color: COLORS.textMuted, marginLeft: "auto" }}>{email.time}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// VIEW: Drafts Tab
// ============================================

function DraftsTab({ onViewDraft }) {
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");

  const filteredDrafts = MOCK_DRAFTS.filter(d => {
    if (filter === "pending" && d.status !== "pending") return false;
    if (filter === "approved" && d.status !== "approved") return false;
    if (filter === "all" && d.status === "approved") return false;
    if (search && !d.subject.toLowerCase().includes(search.toLowerCase()) && !d.to.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ animation: "fadeInUp 0.4s ease" }}>
      {/* Filter Bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <NavButton active={filter === "pending"} onClick={() => setFilter("pending")} label={`Pending (${MOCK_DRAFTS.filter(d => d.status === "pending").length})`} icon="◐" />
        <NavButton active={filter === "approved"} onClick={() => setFilter("approved")} label="Approved" icon="◉" />
        <div style={{ flex: 1 }} />
        <div style={{ width: 200 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search drafts..." />
        </div>
      </div>

      {/* Draft Cards */}
      <div style={{ display: "grid", gap: 12 }}>
        {filteredDrafts.map((draft, i) => (
          <div 
            key={draft.id}
            style={{
              animation: `fadeInUp 0.4s ease ${i * 0.05}s both`,
            }}
          >
            <Card padding="16px" hover onClick={() => onViewDraft(draft)}>
              <div style={{ display: "flex", gap: 14 }}>
                <Avatar initials={draft.email.split(" ").map(n => n[0]).join("")} color={COLORS.primary} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>{draft.email}</span>
                      <span style={{ fontSize: 10, color: COLORS.textMuted, marginLeft: 8 }}>{draft.to}</span>
                    </div>
                    <StatusPill status={draft.status}>{draft.status}</StatusPill>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 6 }}>
                    {draft.subject}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {draft.tags.map(tag => <TagPill key={tag} tag={tag} small />)}
                      <span style={{ padding: "1px 5px", background: `${COLORS.purple}20`, border: `1px solid ${COLORS.purple}40`, borderRadius: 4, fontSize: 9, color: COLORS.purple }}>{draft.tone}</span>
                    </div>
                    <ConfidenceBar value={draft.confidence} size="small" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// COMPONENT: Email Drawer
// ============================================

function EmailDrawer({ email, onClose }) {
  if (!email) return null;

  return (
    <Drawer title="Email Details" onClose={onClose} actions={
      <>
        <Button variant="secondary" size="small">Reject</Button>
        <Button size="small">Generate Draft</Button>
      </>
    }>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Avatar initials={email.initials} color={email.color} size={48} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>{email.from}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>{email.email}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {email.tags.map(tag => <TagPill key={tag} tag={tag} />)}
          {email.priority !== "low" && <StatusPill status={email.priority}>{email.priority}</StatusPill>}
          <StatusPill status={email.status}>{email.status}</StatusPill>
        </div>
      </div>

      <Card padding="16px" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 12 }}>{email.subject}</h3>
        <div style={{ fontSize: 11, color: COLORS.textSecondary, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {email.body}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <Card>
          <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 4 }}>Sentiment</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: email.sentimentScore >= 70 ? COLORS.success : email.sentimentScore >= 40 ? COLORS.warning : COLORS.error }}>
            {email.sentiment} ({email.sentimentScore}%)
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 4 }}>AI Confidence</div>
          <ConfidenceBar value={email.confidence} />
        </Card>
      </div>

      <Card padding="16px" style={{ background: `${COLORS.primary}10`, borderColor: `${COLORS.primary}30` }}>
        <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 6, textTransform: "uppercase" }}>Suggested Action</div>
        <div style={{ fontSize: 12, color: COLORS.textPrimary }}>{email.suggestedAction}</div>
      </Card>
    </Drawer>
  );
}

// ============================================
// COMPONENT: Draft Drawer
// ============================================

function DraftDrawer({ draft, onClose }) {
  if (!draft) return null;

  return (
    <Drawer title="Draft Details" onClose={onClose} actions={
      <>
        <Button variant="secondary" size="small">Edit</Button>
        <Button size="small">Approve & Send</Button>
      </>
    }>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <Avatar initials={draft.email.split(" ").map(n => n[0]).join("")} color={COLORS.primary} size={48} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>{draft.email}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>{draft.to}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {draft.tags.map(tag => <TagPill key={tag} tag={tag} />)}
          <span style={{ padding: "2px 6px", background: `${COLORS.purple}20`, border: `1px solid ${COLORS.purple}40`, borderRadius: 4, fontSize: 10, color: COLORS.purple }}>{draft.tone}</span>
          <span style={{ padding: "2px 6px", background: `${COLORS.cyan}20`, border: `1px solid ${COLORS.cyan}40`, borderRadius: 4, fontSize: 10, color: COLORS.cyan }}>{draft.lang}</span>
          <StatusPill status={draft.status}>{draft.status}</StatusPill>
        </div>
      </div>

      <Card padding="16px" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 12 }}>{draft.subject}</h3>
        <div style={{ fontSize: 11, color: COLORS.textSecondary, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {draft.draft}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        <Card style={{ padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 4 }}>Confidence</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: draft.confidence >= 80 ? COLORS.success : draft.confidence >= 60 ? COLORS.warning : COLORS.error }}>
            {draft.confidence}%
          </div>
        </Card>
        <Card style={{ padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 4 }}>SLA Status</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: draft.slaBreach ? COLORS.error : COLORS.success }}>
            {draft.slaBreach ? "Breached" : "On Track"}
          </div>
        </Card>
        <Card style={{ padding: 12, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 4 }}>Tone</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.purple }}>
            {draft.tone}
          </div>
        </Card>
      </div>
    </Drawer>
  );
}

// ============================================
// MAIN APP COMPONENT
// ============================================

export default function MDXDashboard() {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case "emails":
        return <EmailsTab onViewEmail={setSelectedEmail} />;
      case "drafts":
        return <DraftsTab onViewDraft={setSelectedDraft} />;
      default:
        return <OverviewTab onViewEmail={setSelectedEmail} />;
    }
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: `radial-gradient(ellipse at 20% 0%, #0f173c 0%, ${COLORS.bg} 60%)`, color: COLORS.textPrimary, minHeight: "100vh", display: "flex" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; font-family: 'DM Sans', sans-serif; background: ${COLORS.bg}; color: ${COLORS.textPrimary}; }
        input::placeholder { color: ${COLORS.textMuted}; }
        button:hover { opacity: 0.9; }
        tr:hover { background: rgba(255,255,255,0.02); }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: 240, borderRight: `1px solid ${COLORS.border}`, padding: "20px 12px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32, padding: "0 10px" }}>
          <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.cyan})`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            ✉
          </div>
          <div>
            <h1 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>MDX Mail Ops</h1>
            <span style={{ fontSize: 10, color: COLORS.textMuted }}>Email automation</span>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          <NavButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon="◎" label="Overview" />
          <NavButton active={activeTab === "emails"} onClick={() => setActiveTab("emails")} icon="✉" label="Emails" />
          <NavButton active={activeTab === "drafts"} onClick={() => setActiveTab("drafts")} icon="◫" label="Drafts" />
        </nav>

        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: COLORS.bgCard, borderRadius: 8, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: autoRefresh ? COLORS.success : COLORS.textMuted, animation: autoRefresh ? "pulse 2s infinite" : "none" }} />
              <span style={{ fontSize: 11, color: COLORS.textMuted }}>Auto-refresh</span>
            </div>
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)} 
              style={{ accentColor: COLORS.primary }}
            />
          </div>
          <div style={{ padding: "10px 14px", fontSize: 11, color: COLORS.textMuted, textAlign: "center" }}>
            {new Date(currentTime).toLocaleTimeString()}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "24px 32px", overflowY: "auto" }}>
        {renderTabContent()}
      </main>

      {/* Drawers */}
      {selectedEmail && <EmailDrawer email={selectedEmail} onClose={() => setSelectedEmail(null)} />}
      {selectedDraft && <DraftDrawer draft={selectedDraft} onClose={() => setSelectedDraft(null)} />}
    </div>
  );
}