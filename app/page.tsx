"use client";

import React, {
  CSSProperties,
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type BudgetPeriod = "Weekly" | "Monthly" | "Quarterly" | "Yearly";
type BillStatus = "pending" | "paid";
type SortOption =
  | "date-newest"
  | "date-oldest"
  | "amount-highest"
  | "amount-lowest"
  | "category-az";

type FamilyUser = "Robert" | "Kemberly" | "Jamie" | "Bobby" | "Temathy";
type RoleType = "Admin" | "Member";
type WorkspaceId =
  | "Shared Family"
  | "Robert"
  | "Kemberly"
  | "Jamie"
  | "Bobby"
  | "Temathy";

type AuthProviderStatus =
  | "local-session"
  | "database-ready"
  | "supabase-ready";

type NoticeTone = "success" | "warning" | "info";

type Expense = {
  id: number;
  category: string;
  description: string;
  amount: number;
  date: string;
  notes: string;
  recurring: boolean;
};

type Bill = {
  id: number;
  category: string;
  name: string;
  amount: number;
  dueDate: string;
  status: BillStatus;
  notes: string;
  recurring: boolean;
};

type Income = {
  id: number;
  source: string;
  amount: number;
  date: string;
  notes: string;
};

type Goal = {
  id: number;
  title: string;
  target: number;
  current: number;
};

type SavedSnapshot = {
  id: number;
  date: string;
  budgetAmount: number;
  budgetPeriod: BudgetPeriod;
};

type WorkspaceData = {
  budgetAmount: number;
  budgetPeriod: BudgetPeriod;
  expenses: Expense[];
  bills: Bill[];
  incomeEntries: Income[];
  goals: Goal[];
  history: SavedSnapshot[];
};

type WorkspaceMap = Record<WorkspaceId, WorkspaceData>;

type SessionData = {
  isSignedIn: boolean;
  activeUser: FamilyUser | null;
  activeRole: RoleType | null;
  providerStatus: AuthProviderStatus;
};

type PersistedData = {
  storageVersion: string;
  session: SessionData;
  activeWorkspace: WorkspaceId;
  workspaces: WorkspaceMap;
  betaNotes: string;
};

type UserConfig = {
  id: FamilyUser;
  role: RoleType;
  defaultWorkspace: WorkspaceId;
  canAccess: WorkspaceId[];
};

const STORAGE_KEY = "family_financial_dashboard_live_transition_clean";
const STORAGE_VERSION = "6.4-live-online-deployment-prep";
const RUNTIME_SUPABASE_KEY = "family_financial_dashboard_runtime_supabase";

function normalizeSupabaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/$/, "").replace(/\/rest\/v1$/, "");
}

function maskSecret(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Not set";
  if (trimmed.length <= 14) return trimmed;
  return `${trimmed.slice(0, 14)}...${trimmed.slice(-6)}`;
}


const SUPABASE_STATE_TABLE = "family_dashboard_state";
const SUPABASE_SHARED_WORKSPACE_KEY = "shared-family-beta";

const USER_CONFIG: Record<FamilyUser, UserConfig> = {
  Robert: {
    id: "Robert",
    role: "Admin",
    defaultWorkspace: "Shared Family",
    canAccess: [
      "Shared Family",
      "Robert",
      "Kemberly",
      "Jamie",
      "Bobby",
      "Temathy",
    ],
  },
  Kemberly: {
    id: "Kemberly",
    role: "Admin",
    defaultWorkspace: "Shared Family",
    canAccess: [
      "Shared Family",
      "Robert",
      "Kemberly",
      "Jamie",
      "Bobby",
      "Temathy",
    ],
  },
  Jamie: {
    id: "Jamie",
    role: "Member",
    defaultWorkspace: "Jamie",
    canAccess: ["Shared Family", "Jamie"],
  },
  Bobby: {
    id: "Bobby",
    role: "Member",
    defaultWorkspace: "Bobby",
    canAccess: ["Shared Family", "Bobby"],
  },
  Temathy: {
    id: "Temathy",
    role: "Member",
    defaultWorkspace: "Temathy",
    canAccess: ["Shared Family", "Temathy"],
  },
};

const USER_OPTIONS = Object.keys(USER_CONFIG) as FamilyUser[];
const WORKSPACE_OPTIONS: WorkspaceId[] = [
  "Shared Family",
  "Robert",
  "Kemberly",
  "Jamie",
  "Bobby",
  "Temathy",
];
const PERIOD_OPTIONS: BudgetPeriod[] = [
  "Weekly",
  "Monthly",
  "Quarterly",
  "Yearly",
];
const BILL_STATUS_OPTIONS: BillStatus[] = ["pending", "paid"];

const DEFAULT_CATEGORIES = [
  "Housing",
  "Utilities",
  "Groceries",
  "Transportation",
  "Insurance",
  "Medical",
  "Debt",
  "Savings",
  "Entertainment",
  "Dining",
  "Education",
  "Personal",
  "Travel",
  "Business",
  "Other",
];

const EXPENSE_DESCRIPTION_SUGGESTIONS: Record<string, string[]> = {
  Housing: ["Repairs", "Maintenance", "Supplies", "Storage"],
  Utilities: [
    "Electric",
    "Water",
    "Gas",
    "Internet",
    "Phone",
    "Trash",
    "Sewer",
    "Cable",
  ],
  Groceries: ["Groceries", "Produce", "Warehouse Club", "Household Supplies"],
  Transportation: ["Fuel", "Parking", "Maintenance", "Rideshare", "Transit"],
  Insurance: [
    "Auto Insurance",
    "Home Insurance",
    "Medical Insurance",
    "Life Insurance",
  ],
  Medical: ["Doctor Visit", "Prescription", "Dental", "Vision"],
  Debt: ["Loan Payment", "Credit Card Payment", "Interest Payment"],
  Savings: ["Emergency Fund", "Investment Transfer", "Retirement"],
  Entertainment: ["Streaming", "Movies", "Games", "Events"],
  Dining: ["Restaurant", "Coffee", "Takeout", "Lunch"],
  Education: ["Tuition", "Books", "Training", "Certification"],
  Personal: ["Clothing", "Barber", "Salon", "Gym", "Personal Care"],
  Travel: ["Hotel", "Flight", "Rental Car", "Travel Meals"],
  Business: ["Office Supplies", "Software", "Marketing", "Equipment"],
  Other: ["Miscellaneous", "General Purchase"],
};

const BILL_NAME_SUGGESTIONS: Record<string, string[]> = {
  Housing: ["Rent", "Mortgage", "HOA", "Storage Unit"],
  Utilities: [
    "Electric",
    "Water",
    "Gas",
    "Internet",
    "Phone",
    "Trash",
    "Sewer",
    "Cable",
  ],
  Groceries: ["Food Delivery Subscription", "Grocery Card"],
  Transportation: ["Car Payment", "Parking Pass", "Transit Pass", "Toll Account"],
  Insurance: [
    "Auto Insurance",
    "Home Insurance",
    "Health Insurance",
    "Life Insurance",
  ],
  Medical: ["Medical Payment Plan", "Dental Plan", "Vision Plan"],
  Debt: ["Credit Card", "Personal Loan", "Student Loan"],
  Savings: ["Automatic Savings Transfer", "Retirement Contribution"],
  Entertainment: ["Streaming Subscription", "Membership", "Game Pass"],
  Dining: ["Meal Plan", "Coffee Subscription"],
  Education: ["Tuition Payment", "Course Subscription"],
  Personal: ["Gym Membership", "Phone Protection"],
  Travel: ["Travel Club", "Mileage Program Fee"],
  Business: ["Software Subscription", "Business Insurance", "Workspace Rent"],
  Other: ["Custom Bill"],
};

function createEmptyWorkspace(): WorkspaceData {
  return {
    budgetAmount: 0,
    budgetPeriod: "Monthly",
    expenses: [],
    bills: [],
    incomeEntries: [],
    goals: [],
    history: [],
  };
}

function createDefaultWorkspaces(): WorkspaceMap {
  return {
    "Shared Family": createEmptyWorkspace(),
    Robert: createEmptyWorkspace(),
    Kemberly: createEmptyWorkspace(),
    Jamie: createEmptyWorkspace(),
    Bobby: createEmptyWorkspace(),
    Temathy: createEmptyWorkspace(),
  };
}

function createDefaultPersistedData(): PersistedData {
  return {
    storageVersion: STORAGE_VERSION,
    session: {
      isSignedIn: false,
      activeUser: null,
      activeRole: null,
      providerStatus: "supabase-ready",
    },
    activeWorkspace: "Shared Family",
    workspaces: createDefaultWorkspaces(),
    betaNotes: "",
  };
}

const storageService = {
  load(): PersistedData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultPersistedData();

      const parsed = JSON.parse(raw) as Partial<PersistedData>;
      const defaults = createDefaultPersistedData();
      const workspaces = { ...defaults.workspaces };

      if (parsed.workspaces) {
        for (const workspaceId of WORKSPACE_OPTIONS) {
          const workspace = parsed.workspaces[workspaceId];
          if (workspace) {
            workspaces[workspaceId] = {
              ...createEmptyWorkspace(),
              ...workspace,
            };
          }
        }
      }

      const activeUser =
        parsed.session?.activeUser && USER_OPTIONS.includes(parsed.session.activeUser)
          ? parsed.session.activeUser
          : null;

      const activeRole =
        activeUser && USER_CONFIG[activeUser]
          ? USER_CONFIG[activeUser].role
          : null;

      const activeWorkspace =
        parsed.activeWorkspace && WORKSPACE_OPTIONS.includes(parsed.activeWorkspace)
          ? parsed.activeWorkspace
          : "Shared Family";

      const providerStatus =
        parsed.session?.providerStatus === "database-ready" ||
        parsed.session?.providerStatus === "supabase-ready"
          ? parsed.session.providerStatus
          : "local-session";

      return {
        storageVersion: parsed.storageVersion || STORAGE_VERSION,
        session: {
          isSignedIn: Boolean(parsed.session?.isSignedIn && activeUser),
          activeUser,
          activeRole,
          providerStatus,
        },
        activeWorkspace,
        workspaces,
        betaNotes: typeof parsed.betaNotes === "string" ? parsed.betaNotes : "",
      };
    } catch {
      return createDefaultPersistedData();
    }
  },

  save(data: PersistedData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
};

function createId() {
  return Date.now() + Math.floor(Math.random() * 100000);
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDateLabel(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(dateString: string) {
  if (!dateString) return null;
  const now = new Date();
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return null;

  const current = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const due = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime();

  return Math.round((due - current) / 86400000);
}

function getWeekDetails() {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay();
  const diffToMonday = (day + 6) % 7;
  start.setDate(start.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDays = Math.floor(
    (now.getTime() - firstDayOfYear.getTime()) / 86400000
  );
  const weekNumber = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7);

  return {
    weekNumber,
    rangeLabel: `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`,
  };
}

function getPeriodLabel(period: BudgetPeriod) {
  const week = getWeekDetails();

  switch (period) {
    case "Weekly":
      return `Week ${week.weekNumber} • ${week.rangeLabel}`;
    case "Monthly":
      return new Date().toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    case "Quarterly": {
      const month = new Date().getMonth();
      const quarter = Math.floor(month / 3) + 1;
      return `Q${quarter} ${new Date().getFullYear()}`;
    }
    case "Yearly":
      return `${new Date().getFullYear()}`;
    default:
      return period;
  }
}

function SolidBarChart({
  items,
}: {
  items: { label: string; value: number; sublabel?: string }[];
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  if (items.length === 0) {
    return <div style={styles.emptyStateCompact}>No chart data available yet.</div>;
  }

  return (
    <div style={styles.chartWrap}>
      {items.map((item) => {
        const width =
          maxValue > 0 ? clampPercent((item.value / maxValue) * 100) : 0;

        return (
          <div key={`${item.label}-${item.sublabel ?? ""}`} style={styles.chartRow}>
            <div style={styles.chartLabelBlock}>
              <div style={styles.chartLabel}>{item.label}</div>
              {item.sublabel ? (
                <div style={styles.chartSublabel}>{item.sublabel}</div>
              ) : null}
            </div>

            <div style={styles.chartBarArea}>
              <div style={styles.chartTrack}>
                <div
                  style={{
                    ...styles.chartFill,
                    width: `${width || 2}%`,
                  }}
                />
              </div>
            </div>

            <div style={styles.chartValue}>{formatCurrency(item.value)}</div>
          </div>
        );
      })}
    </div>
  );
}
export default function Page() {
  const today = new Date().toISOString().slice(0, 10);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isReady, setIsReady] = useState(false);

  const [session, setSession] = useState<SessionData>({
    isSignedIn: false,
    activeUser: null,
    activeRole: null,
    providerStatus: "supabase-ready",
  });

  const [activeWorkspace, setActiveWorkspace] =
    useState<WorkspaceId>("Shared Family");
  const [workspaces, setWorkspaces] =
    useState<WorkspaceMap>(createDefaultWorkspaces());
  const [loginUser, setLoginUser] = useState<FamilyUser>("Robert");
  const [betaNotes, setBetaNotes] = useState("");

  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<NoticeTone>("info");

  const [cloudSyncStatus, setCloudSyncStatus] = useState("Cloud sync idle.");
  const [cloudSyncTone, setCloudSyncTone] = useState<NoticeTone>("info");
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  const [runtimeSupabaseUrl, setRuntimeSupabaseUrl] = useState("");
  const [runtimeSupabaseAnonKey, setRuntimeSupabaseAnonKey] = useState("");
  const [runtimeConfigMessage, setRuntimeConfigMessage] = useState("");

  const [budgetDraftAmount, setBudgetDraftAmount] = useState("");
  const [budgetDraftPeriod, setBudgetDraftPeriod] =
    useState<BudgetPeriod>("Monthly");
  const [budgetMessage, setBudgetMessage] = useState("");

  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(today);
  const [expenseNotes, setExpenseNotes] = useState("");
  const [expenseRecurring, setExpenseRecurring] = useState(false);
  const [expenseMessage, setExpenseMessage] = useState("");

  const [billCategory, setBillCategory] = useState("");
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [billStatus, setBillStatus] = useState<BillStatus>("pending");
  const [billNotes, setBillNotes] = useState("");
  const [billRecurring, setBillRecurring] = useState(false);
  const [billMessage, setBillMessage] = useState("");

  const [incomeSource, setIncomeSource] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeDate, setIncomeDate] = useState(today);
  const [incomeNotes, setIncomeNotes] = useState("");
  const [incomeMessage, setIncomeMessage] = useState("");

  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("");
  const [goalMessage, setGoalMessage] = useState("");

  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortOption, setSortOption] = useState<SortOption>("date-newest");

  useEffect(() => {
    const loaded = storageService.load();
    setSession(loaded.session);
    setActiveWorkspace(loaded.activeWorkspace);
    setWorkspaces(loaded.workspaces);
    setBetaNotes(loaded.betaNotes);

    try {
      const runtimeRaw = localStorage.getItem(RUNTIME_SUPABASE_KEY);
      if (runtimeRaw) {
        const runtimeParsed = JSON.parse(runtimeRaw) as { url?: string; anonKey?: string };
        setRuntimeSupabaseUrl(runtimeParsed.url ?? "");
        setRuntimeSupabaseAnonKey(runtimeParsed.anonKey ?? "");
      }
    } catch {
      localStorage.removeItem(RUNTIME_SUPABASE_KEY);
    }

    if (loaded.session.activeUser) {
      setLoginUser(loaded.session.activeUser);
    }

    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    storageService.save({
      storageVersion: STORAGE_VERSION,
      session,
      activeWorkspace,
      workspaces,
      betaNotes,
    });
  }, [isReady, session, activeWorkspace, workspaces, betaNotes]);

  useEffect(() => {
    if (!isReady) return;

    localStorage.setItem(
      RUNTIME_SUPABASE_KEY,
      JSON.stringify({
        url: runtimeSupabaseUrl,
        anonKey: runtimeSupabaseAnonKey,
      })
    );
  }, [isReady, runtimeSupabaseUrl, runtimeSupabaseAnonKey]);

  const activeUser = session.activeUser;
  const activeUserConfig = activeUser ? USER_CONFIG[activeUser] : null;
  const isAdmin = activeUserConfig?.role === "Admin";
  const allowedWorkspaces = activeUserConfig?.canAccess ?? ["Shared Family"];
  const canUseAdminControls = isAdmin;

  const envSupabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  const envSupabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  const fallbackSupabaseUrl = normalizeSupabaseUrl(runtimeSupabaseUrl);
  const fallbackSupabaseAnonKey = runtimeSupabaseAnonKey.trim();

  const supabaseUrl = envSupabaseUrl || fallbackSupabaseUrl;
  const supabaseAnonKey = envSupabaseAnonKey || fallbackSupabaseAnonKey;

  const hasSupabaseUrl = Boolean(supabaseUrl);
  const hasSupabaseAnonKey = Boolean(supabaseAnonKey);
  const supabaseReady = hasSupabaseUrl && hasSupabaseAnonKey;
  const usingRuntimeSupabaseFallback =
    !envSupabaseUrl && !envSupabaseAnonKey && supabaseReady;

  useEffect(() => {
    if (!activeUserConfig) return;
    if (!allowedWorkspaces.includes(activeWorkspace)) {
      setActiveWorkspace(activeUserConfig.defaultWorkspace);
    }
  }, [activeUserConfig, activeWorkspace, allowedWorkspaces]);

  const currentWorkspace = workspaces[activeWorkspace] ?? createEmptyWorkspace();

  useEffect(() => {
    setBudgetDraftAmount("");
    setBudgetDraftPeriod(currentWorkspace.budgetPeriod);
    setBudgetMessage("");
    setExpenseMessage("");
    setBillMessage("");
    setIncomeMessage("");
    setGoalMessage("");
  }, [activeWorkspace, currentWorkspace.budgetPeriod]);

  const {
    budgetAmount,
    budgetPeriod,
    expenses,
    bills,
    incomeEntries,
    goals,
    history,
  } = currentWorkspace;

  const expenseSuggestions = expenseCategory
    ? EXPENSE_DESCRIPTION_SUGGESTIONS[expenseCategory] || []
    : [];

  const billSuggestions = billCategory
    ? BILL_NAME_SUGGESTIONS[billCategory] || []
    : [];

  const totalSpent = useMemo(
    () => expenses.reduce((sum, item) => sum + item.amount, 0),
    [expenses]
  );
  const totalBills = useMemo(
    () => bills.reduce((sum, item) => sum + item.amount, 0),
    [bills]
  );
  const totalIncome = useMemo(
    () => incomeEntries.reduce((sum, item) => sum + item.amount, 0),
    [incomeEntries]
  );
  const recurringSpent = useMemo(
    () =>
      expenses.reduce(
        (sum, item) => sum + (item.recurring ? item.amount : 0),
        0
      ),
    [expenses]
  );

  const remainingBudget = budgetAmount - totalSpent;
  const netBalance = totalIncome - totalSpent;
  const usagePercent =
    budgetAmount > 0 ? clampPercent((totalSpent / budgetAmount) * 100) : 0;

  const filteredExpenses = useMemo(() => {
    const filtered = expenses.filter((expense) => {
      const text = searchText.toLowerCase();
      const matchesSearch =
        expense.description.toLowerCase().includes(text) ||
        expense.category.toLowerCase().includes(text) ||
        expense.notes.toLowerCase().includes(text);

      const matchesCategory =
        filterCategory === "All" || expense.category === filterCategory;

      return matchesSearch && matchesCategory;
    });

    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "date-newest":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date-oldest":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "amount-highest":
          return b.amount - a.amount;
        case "amount-lowest":
          return a.amount - b.amount;
        case "category-az":
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });
  }, [expenses, searchText, filterCategory, sortOption]);

  const filteredSpent = useMemo(
    () => filteredExpenses.reduce((sum, item) => sum + item.amount, 0),
    [filteredExpenses]
  );

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const expense of expenses) {
      totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
    }
    return Object.entries(totals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [expenses]);

  const incomeTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const income of incomeEntries) {
      totals[income.source] = (totals[income.source] || 0) + income.amount;
    }
    return Object.entries(totals)
      .map(([source, amount]) => ({ source, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [incomeEntries]);

  const billTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const bill of bills) {
      totals[bill.category] = (totals[bill.category] || 0) + bill.amount;
    }
    return Object.entries(totals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [bills]);

  const budgetHistory = useMemo(() => {
    return [...history]
      .slice(0, 6)
      .map((entry, index) => ({
        label: `${entry.budgetPeriod.slice(0, 1)}${index + 1}`,
        value: entry.budgetAmount,
        sublabel: `${entry.budgetPeriod} • ${formatDateLabel(entry.date)}`,
      }));
  }, [history]);

  const overdueBills = useMemo(() => {
    return bills.filter((bill) => {
      const due = daysUntil(bill.dueDate);
      return bill.dueDate && bill.status !== "paid" && due !== null && due < 0;
    });
  }, [bills]);

  const upcomingBills = useMemo(() => {
    return bills
      .filter((bill) => {
        const due = daysUntil(bill.dueDate);
        return bill.dueDate && bill.status !== "paid" && due !== null && due >= 0;
      })
      .sort((a, b) => (daysUntil(a.dueDate) ?? 9999) - (daysUntil(b.dueDate) ?? 9999))
      .slice(0, 8);
  }, [bills]);

  const deploymentRows = useMemo(
    () => [
      { label: "Storage Version", value: STORAGE_VERSION },
      { label: "Provider Status", value: session.providerStatus },
      { label: "Vercel Hosting", value: "Ready" },
      { label: "Supabase URL", value: hasSupabaseUrl ? "Detected" : "Missing" },
      {
        label: "Supabase Anon Key",
        value: hasSupabaseAnonKey ? "Detected" : "Missing",
      },
      {
        label: "Supabase Readiness",
        value: supabaseReady ? "Ready" : "Needs Env Vars",
      },
      { label: "Cloud Session Layer", value: supabaseReady ? (usingRuntimeSupabaseFallback ? "Runtime Fallback Ready" : "Transition Build Ready") : "Prepared" },
      { label: "Cloud Data Layer", value: supabaseReady ? "Push/Pull Beta Ready" : "Prepared" },
      { label: "Migration Mode", value: "Local Prototype -> Live Online" },
    ],
    [session.providerStatus, hasSupabaseUrl, hasSupabaseAnonKey, supabaseReady]
  );

  const deploymentChecklist = [
    {
      label: "Keep stable local beta build intact",
      done: true,
      detail: "Current prototype is stable and usable while deployment prep continues.",
    },
    {
      label: "Vercel project connected",
      done: true,
      detail: "App structure is already suitable for Vercel deployment.",
    },
    {
      label: "Supabase URL environment variable",
      done: hasSupabaseUrl,
      detail: "Requires NEXT_PUBLIC_SUPABASE_URL.",
    },
    {
      label: "Supabase anon key environment variable",
      done: hasSupabaseAnonKey,
      detail: "Requires NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    },
    {
      label: "Live auth replacement layer",
      done: false,
      detail: "Still pending. This build focuses on shared beta cloud data first.",
    },
    {
      label: "Cloud-backed user/workspace persistence",
      done: supabaseReady,
      detail: supabaseReady
        ? "Cloud push/pull controls are now available in the header for family beta testing."
        : "Set env vars first, then use Push Cloud Beta / Pull Cloud Beta in the header.",
    },
  ];

  const envStatusCards = [
    {
      title: "Supabase URL",
      status: hasSupabaseUrl ? (usingRuntimeSupabaseFallback ? "Runtime Fallback" : "Detected") : "Missing",
      tone: hasSupabaseUrl ? "good" : "warn",
    },
    {
      title: "Supabase Anon Key",
      status: hasSupabaseAnonKey ? (usingRuntimeSupabaseFallback ? "Runtime Fallback" : "Detected") : "Missing",
      tone: hasSupabaseAnonKey ? "good" : "warn",
    },
    {
      title: "Deployment Mode",
      status: "Local Beta -> Live Online",
      tone: "info",
    },
    {
      title: "Live Auth Layer",
      status: supabaseReady ? (usingRuntimeSupabaseFallback ? "Runtime cloud keys active" : "Cloud sync buttons ready") : "Waiting on env vars",
      tone: supabaseReady ? "good" : "warn",
    },
  ] as const;

  function getPersistedPayload(): PersistedData {
    return {
      storageVersion: STORAGE_VERSION,
      session,
      activeWorkspace,
      workspaces,
      betaNotes,
    };
  }

  function saveRuntimeSupabaseConfig() {
    const normalizedUrl = normalizeSupabaseUrl(runtimeSupabaseUrl);
    const trimmedKey = runtimeSupabaseAnonKey.trim();

    setRuntimeSupabaseUrl(normalizedUrl);
    setRuntimeSupabaseAnonKey(trimmedKey);

    if (!normalizedUrl || !trimmedKey) {
      setRuntimeConfigMessage("Enter both the Supabase URL and the publishable anon key before saving runtime cloud settings.");
      showNotice("Runtime cloud settings are incomplete.", "warning");
      return;
    }

    setRuntimeConfigMessage("Runtime cloud settings saved on this device. Restart is not required.");
    setCloudSyncStatus("Runtime cloud settings are ready. You can now push or pull the shared beta data.");
    setCloudSyncTone("success");
    showNotice("Runtime Supabase settings saved for this device.", "success");
  }

  function clearRuntimeSupabaseConfig() {
    setRuntimeSupabaseUrl("");
    setRuntimeSupabaseAnonKey("");
    setRuntimeConfigMessage("Runtime cloud settings cleared from this device.");

    if (!envSupabaseUrl || !envSupabaseAnonKey) {
      setCloudSyncStatus("Cloud sync idle. Add env vars or save runtime cloud settings to enable Push/Pull.");
      setCloudSyncTone("warning");
    } else {
      setCloudSyncStatus("Cloud sync idle.");
      setCloudSyncTone("info");
    }

    showNotice("Runtime Supabase settings cleared.", "warning");
  }

  async function pullFromSupabase() {
    if (!supabaseReady) {
      showNotice("Add the Supabase URL and anon key, or save the runtime cloud settings below first.", "warning");
      setCloudSyncStatus("Cloud sync unavailable until env vars or runtime cloud settings are set.");
      setCloudSyncTone("warning");
      return;
    }

    setIsCloudSyncing(true);
    setCloudSyncStatus("Pulling shared beta data from Supabase...");
    setCloudSyncTone("info");

    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/${SUPABASE_STATE_TABLE}?workspace=eq.${encodeURIComponent(
          SUPABASE_SHARED_WORKSPACE_KEY
        )}&select=payload,updated_at&order=updated_at.desc&limit=1`,
        {
          method: "GET",
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Supabase pull failed.");
      }

      const rows = (await response.json()) as Array<{ payload?: PersistedData; updated_at?: string }>;
      const payload = rows?.[0]?.payload;

      if (!payload?.workspaces) {
        setCloudSyncStatus("No shared beta data found yet. Push this build first.");
        setCloudSyncTone("warning");
        showNotice("No cloud record found yet. Push your beta data first.", "warning");
        return;
      }

      setSession(payload.session);
      setActiveWorkspace(payload.activeWorkspace);
      setWorkspaces(payload.workspaces);
      setBetaNotes(payload.betaNotes ?? "");

      setCloudSyncStatus(
        rows?.[0]?.updated_at
          ? `Cloud data pulled successfully. Last cloud update: ${formatDateLabel(rows[0].updated_at.slice(0, 10))}.`
          : "Cloud data pulled successfully."
      );
      setCloudSyncTone("success");
      showNotice("Shared beta data pulled from Supabase.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Supabase pull failed.";
      setCloudSyncStatus("Cloud pull failed. Check table, policies, and env vars.");
      setCloudSyncTone("warning");
      showNotice(message, "warning");
    } finally {
      setIsCloudSyncing(false);
    }
  }

  async function pushToSupabase() {
    if (!supabaseReady) {
      showNotice("Add the Supabase URL and anon key, or save the runtime cloud settings below first.", "warning");
      setCloudSyncStatus("Cloud sync unavailable until env vars or runtime cloud settings are set.");
      setCloudSyncTone("warning");
      return;
    }

    setIsCloudSyncing(true);
    setCloudSyncStatus("Pushing shared beta data to Supabase...");
    setCloudSyncTone("info");

    try {
      const payload = getPersistedPayload();
      const sharedRecord = {
        workspace: SUPABASE_SHARED_WORKSPACE_KEY,
        payload,
        updated_at: new Date().toISOString(),
      };

      const existingResponse = await fetch(
        `${supabaseUrl}/rest/v1/${SUPABASE_STATE_TABLE}?workspace=eq.${encodeURIComponent(
          SUPABASE_SHARED_WORKSPACE_KEY
        )}&select=id&limit=1`,
        {
          method: "GET",
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            Accept: "application/json",
          },
        }
      );

      if (!existingResponse.ok) {
        const errorText = await existingResponse.text();
        throw new Error(errorText || "Supabase push lookup failed.");
      }

      const existingRows = (await existingResponse.json()) as Array<{ id: string }>;
      const hasExistingRecord = Boolean(existingRows?.[0]?.id);

      const response = await fetch(
        hasExistingRecord
          ? `${supabaseUrl}/rest/v1/${SUPABASE_STATE_TABLE}?workspace=eq.${encodeURIComponent(
              SUPABASE_SHARED_WORKSPACE_KEY
            )}`
          : `${supabaseUrl}/rest/v1/${SUPABASE_STATE_TABLE}`,
        {
          method: hasExistingRecord ? "PATCH" : "POST",
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(hasExistingRecord ? sharedRecord : [sharedRecord]),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Supabase push failed.");
      }

      setCloudSyncStatus("Cloud data pushed successfully. Family testers can now pull the latest beta data.");
      setCloudSyncTone("success");
      showNotice("Shared beta data pushed to Supabase.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Supabase push failed.";
      setCloudSyncStatus("Cloud push failed. Check table, policies, and env vars.");
      setCloudSyncTone("warning");
      showNotice(message, "warning");
    } finally {
      setIsCloudSyncing(false);
    }
  }

  function showNotice(message: string, tone: NoticeTone) {
    setNotice(message);
    setNoticeTone(tone);
  }

  function updateWorkspace(updater: (workspace: WorkspaceData) => WorkspaceData) {
    setWorkspaces((prev) => {
      const current = prev[activeWorkspace] ?? createEmptyWorkspace();
      return {
        ...prev,
        [activeWorkspace]: updater(current),
      };
    });
  }

  function signIn() {
    const config = USER_CONFIG[loginUser];
    setSession({
      isSignedIn: true,
      activeUser: loginUser,
      activeRole: config.role,
      providerStatus: supabaseReady ? "supabase-ready" : "database-ready",
    });
    setActiveWorkspace(config.defaultWorkspace);
    showNotice(`${loginUser} signed in successfully.`, "success");
  }

  function signOut() {
    setSession({
      isSignedIn: false,
      activeUser: null,
      activeRole: null,
      providerStatus: supabaseReady ? "supabase-ready" : "local-session",
    });
    setActiveWorkspace("Shared Family");
    setSearchText("");
    setFilterCategory("All");
    setSortOption("date-newest");
    setNotice("");
  }

  function applyBudget() {
    const parsedBudget = parseOptionalNumber(budgetDraftAmount);

    if (parsedBudget === null || parsedBudget < 0) {
      setBudgetMessage("Enter a valid budget amount before applying.");
      return;
    }

    updateWorkspace((current) => ({
      ...current,
      budgetAmount: parsedBudget,
      budgetPeriod: budgetDraftPeriod,
    }));

    setBudgetDraftAmount("");
    setBudgetMessage("Budget applied successfully.");
    showNotice(`Budget updated for ${activeWorkspace}.`, "success");
  }

  function addExpense() {
    const parsedAmount = parseOptionalNumber(expenseAmount);

    if (!expenseCategory || !expenseDescription.trim() || parsedAmount === null || parsedAmount <= 0) {
      setExpenseMessage("Choose a category, add a description, and enter a valid amount.");
      return;
    }

    const newExpense: Expense = {
      id: createId(),
      category: expenseCategory,
      description: expenseDescription.trim(),
      amount: parsedAmount,
      date: expenseDate,
      notes: expenseNotes.trim(),
      recurring: expenseRecurring,
    };

    updateWorkspace((current) => ({
      ...current,
      expenses: [newExpense, ...current.expenses],
    }));

    setExpenseCategory("");
    setExpenseDescription("");
    setExpenseAmount("");
    setExpenseDate(today);
    setExpenseNotes("");
    setExpenseRecurring(false);
    setExpenseMessage("Expense added.");
    showNotice(`Expense added to ${activeWorkspace}.`, "success");
  }

  function addBill() {
    const parsedAmount = parseOptionalNumber(billAmount);

    if (!billCategory || !billName.trim() || !billDueDate || parsedAmount === null || parsedAmount <= 0) {
      setBillMessage("Choose a category, add a bill name, due date, and valid amount.");
      return;
    }

    const newBill: Bill = {
      id: createId(),
      category: billCategory,
      name: billName.trim(),
      amount: parsedAmount,
      dueDate: billDueDate,
      status: billStatus,
      notes: billNotes.trim(),
      recurring: billRecurring,
    };

    updateWorkspace((current) => ({
      ...current,
      bills: [newBill, ...current.bills],
    }));

    setBillCategory("");
    setBillName("");
    setBillAmount("");
    setBillDueDate("");
    setBillStatus("pending");
    setBillNotes("");
    setBillRecurring(false);
    setBillMessage("Bill added.");
    showNotice(`Bill added to ${activeWorkspace}.`, "success");
  }

  function addIncome() {
    const parsedAmount = parseOptionalNumber(incomeAmount);

    if (!incomeSource.trim() || parsedAmount === null || parsedAmount <= 0) {
      setIncomeMessage("Enter an income source and a valid amount.");
      return;
    }

    const newIncome: Income = {
      id: createId(),
      source: incomeSource.trim(),
      amount: parsedAmount,
      date: incomeDate,
      notes: incomeNotes.trim(),
    };

    updateWorkspace((current) => ({
      ...current,
      incomeEntries: [newIncome, ...current.incomeEntries],
    }));

    setIncomeSource("");
    setIncomeAmount("");
    setIncomeDate(today);
    setIncomeNotes("");
    setIncomeMessage("Income added.");
    showNotice(`Income added to ${activeWorkspace}.`, "success");
  }

  function addGoal() {
    const parsedTarget = parseOptionalNumber(goalTarget);
    const parsedCurrent = parseOptionalNumber(goalCurrent);

    if (!goalTitle.trim() || parsedTarget === null || parsedTarget <= 0) {
      setGoalMessage("Enter a goal title and a valid target amount.");
      return;
    }

    const newGoal: Goal = {
      id: createId(),
      title: goalTitle.trim(),
      target: parsedTarget,
      current: parsedCurrent ?? 0,
    };

    updateWorkspace((current) => ({
      ...current,
      goals: [newGoal, ...current.goals],
    }));

    setGoalTitle("");
    setGoalTarget("");
    setGoalCurrent("");
    setGoalMessage("Goal added.");
    showNotice(`Goal added to ${activeWorkspace}.`, "success");
  }
    function saveBudgetSnapshot() {
    const snapshot: SavedSnapshot = {
      id: createId(),
      date: new Date().toISOString(),
      budgetAmount,
      budgetPeriod,
    };

    updateWorkspace((current) => ({
      ...current,
      history: [snapshot, ...current.history].slice(0, 8),
    }));

    showNotice("Budget snapshot saved.", "success");
  }

  function markBillPaid(id: number) {
    if (!window.confirm("Mark this bill as paid?")) return;

    updateWorkspace((current) => ({
      ...current,
      bills: current.bills.map((bill) =>
        bill.id === id ? { ...bill, status: "paid" } : bill
      ),
    }));

    showNotice("Bill marked as paid.", "success");
  }

  function deleteExpense(id: number) {
    if (!window.confirm("Delete this expense?")) return;

    updateWorkspace((current) => ({
      ...current,
      expenses: current.expenses.filter((expense) => expense.id !== id),
    }));

    showNotice("Expense deleted.", "warning");
  }

  function deleteBill(id: number) {
    if (!window.confirm("Delete this bill?")) return;

    updateWorkspace((current) => ({
      ...current,
      bills: current.bills.filter((bill) => bill.id !== id),
    }));

    showNotice("Bill deleted.", "warning");
  }

  function deleteGoal(id: number) {
    if (!window.confirm("Delete this goal?")) return;

    updateWorkspace((current) => ({
      ...current,
      goals: current.goals.filter((goal) => goal.id !== id),
    }));

    showNotice("Goal deleted.", "warning");
  }

  function resetCurrentWorkspace() {
    if (!window.confirm(`Reset everything in ${activeWorkspace}?`)) return;

    updateWorkspace(() => createEmptyWorkspace());

    setBudgetDraftAmount("");
    setBudgetDraftPeriod("Monthly");
    setExpenseCategory("");
    setExpenseDescription("");
    setExpenseAmount("");
    setExpenseDate(today);
    setExpenseNotes("");
    setExpenseRecurring(false);
    setBillCategory("");
    setBillName("");
    setBillAmount("");
    setBillDueDate("");
    setBillStatus("pending");
    setBillNotes("");
    setBillRecurring(false);
    setIncomeSource("");
    setIncomeAmount("");
    setIncomeDate(today);
    setIncomeNotes("");
    setGoalTitle("");
    setGoalTarget("");
    setGoalCurrent("");
    setSearchText("");
    setFilterCategory("All");
    setSortOption("date-newest");

    showNotice(`${activeWorkspace} was reset.`, "warning");
  }

  function resetAllWorkspaces() {
    if (!canUseAdminControls) return;
    if (!window.confirm("Reset all workspaces?")) return;

    setWorkspaces(createDefaultWorkspaces());
    setActiveWorkspace(activeUserConfig?.defaultWorkspace ?? "Shared Family");

    setBudgetDraftAmount("");
    setBudgetDraftPeriod("Monthly");
    setExpenseCategory("");
    setExpenseDescription("");
    setExpenseAmount("");
    setExpenseDate(today);
    setExpenseNotes("");
    setExpenseRecurring(false);
    setBillCategory("");
    setBillName("");
    setBillAmount("");
    setBillDueDate("");
    setBillStatus("pending");
    setBillNotes("");
    setBillRecurring(false);
    setIncomeSource("");
    setIncomeAmount("");
    setIncomeDate(today);
    setIncomeNotes("");
    setGoalTitle("");
    setGoalTarget("");
    setGoalCurrent("");
    setSearchText("");
    setFilterCategory("All");
    setSortOption("date-newest");

    showNotice("All workspaces were reset.", "warning");
  }

  function handleDownloadBackup() {
    if (!canUseAdminControls) return;

    const payload: PersistedData = {
      storageVersion: STORAGE_VERSION,
      session,
      activeWorkspace,
      workspaces,
      betaNotes,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `family-dashboard-backup-${today}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showNotice("Backup downloaded.", "success");
  }

  function handleExportCsv() {
    if (!canUseAdminControls) return;

    const rows: string[][] = [[
      "Workspace",
      "Type",
      "Category/Source",
      "Description",
      "Amount",
      "Date",
      "Due Date",
      "Status",
      "Recurring",
      "Notes",
    ]];

    for (const [workspaceName, workspace] of Object.entries(workspaces)) {
      for (const income of workspace.incomeEntries) {
        rows.push([
          workspaceName,
          "Income",
          income.source,
          income.source,
          income.amount.toString(),
          income.date,
          "",
          "",
          "No",
          income.notes,
        ]);
      }

      for (const expense of workspace.expenses) {
        rows.push([
          workspaceName,
          "Expense",
          expense.category,
          expense.description,
          expense.amount.toString(),
          expense.date,
          "",
          "",
          expense.recurring ? "Yes" : "No",
          expense.notes,
        ]);
      }

      for (const bill of workspace.bills) {
        rows.push([
          workspaceName,
          "Bill",
          bill.category,
          bill.name,
          bill.amount.toString(),
          "",
          bill.dueDate,
          bill.status,
          bill.recurring ? "Yes" : "No",
          bill.notes,
        ]);
      }
    }

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `family-dashboard-export-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showNotice("CSV export downloaded.", "success");
  }

  function handleUploadBackup(event: ChangeEvent<HTMLInputElement>) {
    if (!canUseAdminControls) return;

    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm("Import this backup and replace current local data?")) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<PersistedData>;
        const defaults = createDefaultPersistedData();
        const merged = { ...defaults.workspaces };

        if (parsed.workspaces) {
          for (const workspaceId of WORKSPACE_OPTIONS) {
            const workspace = parsed.workspaces[workspaceId];
            if (workspace) {
              merged[workspaceId] = {
                ...createEmptyWorkspace(),
                ...workspace,
              };
            }
          }
        }

        setWorkspaces(merged);
        setBetaNotes(typeof parsed.betaNotes === "string" ? parsed.betaNotes : "");

        const nextWorkspace =
          parsed.activeWorkspace && allowedWorkspaces.includes(parsed.activeWorkspace)
            ? parsed.activeWorkspace
            : activeUserConfig?.defaultWorkspace ?? "Shared Family";

        setActiveWorkspace(nextWorkspace);
        showNotice("Backup imported successfully.", "success");
      } catch {
        alert("That backup file could not be read.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    reader.readAsText(file);
  }

  if (!isReady) {
    return <div style={styles.loadingPage}>Loading dashboard...</div>;
  }

  if (!session.isSignedIn || !activeUser || !activeUserConfig) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <div style={styles.loginLogoWrap}>
            <img src="/logo.png" alt="Family crest logo" style={styles.loginLogo} />
          </div>

          <div style={styles.loginEyebrow}>Live Online Transition</div>
          <h1 style={styles.loginTitle}>Financial Planning Dashboard</h1>
          <p style={styles.loginSubtitle}>
            This build is prepared for Vercel deployment and Supabase migration while preserving local stability.
          </p>

          <label style={styles.inputGroup}>
            <span style={styles.label}>Select User</span>
            <select
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value as FamilyUser)}
              style={styles.input}
            >
              {USER_OPTIONS.map((user) => (
                <option key={user} value={user}>
                  {user} • {USER_CONFIG[user].role}
                </option>
              ))}
            </select>
          </label>

          <div style={styles.loginNotice}>
            {supabaseReady
              ? "Supabase environment values were detected. This app is ready for the next live-auth phase."
              : "Supabase environment values are not set yet. The app still runs locally while waiting for live deployment configuration."}
          </div>

          <div style={styles.loginNoticeSecondary}>
            Admin users retain all controls. Members remain restricted to Shared Family plus their private workspace.
          </div>

          <button style={styles.primaryButtonLarge} onClick={signIn}>
            Enter Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.appShell}>
        <section style={styles.heroCard}>
          <div style={styles.heroMainRow}>
            <div style={styles.heroBrandBlock}>
              <div style={styles.logoWrap}>
                <img src="/logo.png" alt="Family crest logo" style={styles.heroLogo} />
              </div>

              <div style={styles.heroTextBlock}>
                <div style={styles.heroEyebrow}>Live Online Deployment Prep</div>
                <h1 style={styles.heroTitle}>Financial Planning Dashboard</h1>
                <p style={styles.heroSubtitle}>
                  Stable beta build prepared for Vercel deployment now, with Supabase cloud-sync controls added for shared family testing.
                </p>

                <div style={styles.heroMeta}>
                  <span style={styles.heroMetaPill}>{activeUser}</span>
                  <span style={styles.heroMetaPill}>{activeUserConfig.role}</span>
                  <span style={styles.heroMetaPill}>{activeWorkspace}</span>
                  <span style={styles.heroMetaPill}>{session.providerStatus}</span>
                  <span style={styles.heroMetaPill}>
                    {supabaseReady ? "Supabase Ready" : "Env Vars Needed"}
                  </span>
                </div>
              </div>
            </div>

            <div style={styles.heroActionBlock}>
              <button style={styles.primaryButton} onClick={saveBudgetSnapshot}>
                Save Budget Snapshot
              </button>

              {canUseAdminControls ? (
                <>
                  <button style={styles.secondaryButton} onClick={handleDownloadBackup}>
                    Download Backup
                  </button>
                  <button style={styles.secondaryButton} onClick={handleExportCsv}>
                    Export CSV
                  </button>
                  <button
                    style={styles.secondaryButton}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload Backup
                  </button>
                  <button
                    style={styles.secondaryButton}
                    onClick={pushToSupabase}
                    disabled={isCloudSyncing}
                  >
                    {isCloudSyncing ? "Working..." : "Push Cloud Beta"}
                  </button>
                  <button
                    style={styles.secondaryButton}
                    onClick={pullFromSupabase}
                    disabled={isCloudSyncing}
                  >
                    {isCloudSyncing ? "Working..." : "Pull Cloud Beta"}
                  </button>
                </>
              ) : null}

              <button style={styles.secondaryButton} onClick={signOut}>
                Sign Out
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={handleUploadBackup}
              />
            </div>
          </div>


          <div style={styles.heroInfoGrid}>
            <div style={styles.workspaceCard}>
              <div style={styles.sectionHeader}>
                <div>
                  <h2 style={styles.sectionTitleDark}>Signed-In User</h2>
                  <p style={styles.sectionSubtitleDark}>
                    Session-based identity remains active during transition.
                  </p>
                </div>
              </div>

              <div style={styles.formGrid}>
                <label style={styles.inputGroup}>
                  <span style={styles.labelLight}>Current User</span>
                  <input
                    value={`${activeUser} • ${activeUserConfig.role}`}
                    readOnly
                    style={styles.inputDarkReadOnly}
                  />
                </label>

                <label style={styles.inputGroup}>
                  <span style={styles.labelLight}>Role</span>
                  <input value={activeUserConfig.role} readOnly style={styles.inputDarkReadOnly} />
                </label>
              </div>
            </div>

            <div style={styles.workspaceCard}>
              <div style={styles.sectionHeader}>
                <div>
                  <h2 style={styles.sectionTitleDark}>Workspace Access</h2>
                  <p style={styles.sectionSubtitleDark}>
                    Shared Family is open to all. Private workspaces follow user permissions.
                  </p>
                </div>
              </div>

              <div style={styles.formGrid}>
                <label style={styles.inputGroup}>
                  <span style={styles.labelLight}>Active Workspace</span>
                  <select
                    value={activeWorkspace}
                    onChange={(e) => setActiveWorkspace(e.target.value as WorkspaceId)}
                    style={styles.inputDark}
                  >
                    {allowedWorkspaces.map((workspace) => (
                      <option key={workspace} value={workspace}>
                        {workspace}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section style={styles.gridTwo}>
          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Budget Setup</h2>
                <p style={styles.sectionSubtitle}>
                  Each workspace maintains its own budget independently.
                </p>
              </div>
            </div>

            <div style={styles.formGrid}>
              <label style={styles.inputGroup}>
                <span style={styles.label}>Budget Amount</span>
                <input
                  type="number"
                  value={budgetDraftAmount}
                  onChange={(e) => setBudgetDraftAmount(e.target.value)}
                  style={styles.input}
                  placeholder="Enter budget amount"
                />
              </label>

              <label style={styles.inputGroup}>
                <span style={styles.label}>Budget Period</span>
                <select
                  value={budgetDraftPeriod}
                  onChange={(e) => setBudgetDraftPeriod(e.target.value as BudgetPeriod)}
                  style={styles.input}
                >
                  {PERIOD_OPTIONS.map((period) => (
                    <option key={period} value={period}>
                      {period}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={styles.buttonRow}>
              <button style={styles.primaryButton} onClick={applyBudget}>
                Apply Budget
              </button>
            </div>

            {budgetMessage ? <div style={styles.fieldMessage}>{budgetMessage}</div> : null}

            <div style={styles.infoStrip}>
              <div style={styles.infoBlock}>
                <div style={styles.infoLabel}>Current View</div>
                <div style={styles.infoValue}>{getPeriodLabel(budgetPeriod)}</div>
              </div>
              <div style={styles.infoBlock}>
                <div style={styles.infoLabel}>Usage</div>
                <div style={styles.infoValue}>{usagePercent.toFixed(1)}%</div>
              </div>
              <div style={styles.infoBlock}>
                <div style={styles.infoLabel}>Recurring Expenses</div>
                <div style={styles.infoValue}>{formatCurrency(recurringSpent)}</div>
              </div>
            </div>

            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${usagePercent}%` }} />
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Summary</h2>
                <p style={styles.sectionSubtitle}>
                  Stable local functionality remains in place while cloud migration is prepared.
                </p>
              </div>
            </div>

            <div style={styles.summaryGrid}>
              <div style={styles.summaryCard}>
                <div style={styles.summaryLabel}>Expenses</div>
                <div style={styles.summaryValue}>{formatCurrency(totalSpent)}</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryLabel}>Bills</div>
                <div style={styles.summaryValue}>{formatCurrency(totalBills)}</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryLabel}>Income</div>
                <div style={styles.summaryValue}>{formatCurrency(totalIncome)}</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryLabel}>Remaining Budget</div>
                <div style={styles.summaryValue}>{formatCurrency(remainingBudget)}</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryLabel}>Filtered Expenses</div>
                <div style={styles.summaryValue}>{formatCurrency(filteredSpent)}</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryLabel}>Net Balance</div>
                <div style={styles.summaryValue}>{formatCurrency(netBalance)}</div>
              </div>
            </div>

            <div style={styles.buttonRow}>
              <button style={styles.secondaryButton} onClick={resetCurrentWorkspace}>
                Reset Current Workspace
              </button>
              {canUseAdminControls ? (
                <button style={styles.dangerButton} onClick={resetAllWorkspaces}>
                  Reset All Workspaces
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section style={styles.gridTwo}>
          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Add Income</h2>
                <p style={styles.sectionSubtitle}>Track income for the selected workspace.</p>
              </div>
            </div>

            <div style={styles.formGrid}>
              <label style={styles.inputGroup}>
                <span style={styles.label}>Source</span>
                <input
                  type="text"
                  value={incomeSource}
                  onChange={(e) => setIncomeSource(e.target.value)}
                  style={styles.input}
                  placeholder="Salary, Contract, Transfer"
                />
              </label>

              <label style={styles.inputGroup}>
                <span style={styles.label}>Amount</span>
                <input
                  type="number"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  style={styles.input}
                  placeholder="Enter amount"
                />
              </label>

              <label style={styles.inputGroup}>
                <span style={styles.label}>Date</span>
                <input
                  type="date"
                  value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)}
                  style={styles.input}
                />
              </label>

              <label style={styles.inputGroup}>
                <span style={styles.label}>Notes</span>
                <input
                  type="text"
                  value={incomeNotes}
                  onChange={(e) => setIncomeNotes(e.target.value)}
                  style={styles.input}
                  placeholder="Optional note"
                />
              </label>
            </div>

            <div style={styles.buttonRow}>
              <button style={styles.primaryButton} onClick={addIncome}>
                Add Income
              </button>
            </div>

            {incomeMessage ? <div style={styles.fieldMessage}>{incomeMessage}</div> : null}
          </div>

          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Add Expense</h2>
                <p style={styles.sectionSubtitle}>Expenses are tracked separately from bills.</p>
              </div>
            </div>

            <div style={styles.formGrid}>
              <label style={styles.inputGroup}>
                <span style={styles.label}>Category</span>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  style={styles.input}
                >
                  <option value="">Select category</option>
                  {DEFAULT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.inputGroup}>
                <span style={styles.label}>Description</span>
                <>
                  <input
                    list="expense-description-options"
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    style={styles.input}
                    placeholder="Type any description you want"
                  />
                  <datalist id="expense-description-options">
                    {expenseSuggestions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </>
              </label>

              <label style={styles.inputGroup}>
                <span style={styles.label}>Amount</span>
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  style={styles.input}
                  placeholder="Enter amount"
                />
              </label>

              <label style={styles.inputGroup}>
                <span style={styles.label}>Date</span>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  style={styles.input}
                />
              </label>

              <label style={styles.inputGroup}>
                <span style={styles.label}>Notes</span>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  style={styles.input}
                  placeholder="Optional notes"
                />
              </label>

              <label style={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  checked={expenseRecurring}
                  onChange={(e) => setExpenseRecurring(e.target.checked)}
                />
                <span style={styles.checkboxLabel}>Recurring Expense</span>
              </label>
            </div>

            <div style={styles.buttonRow}>
              <button style={styles.primaryButton} onClick={addExpense}>
                Add Expense
              </button>
            </div>

            {expenseMessage ? <div style={styles.fieldMessage}>{expenseMessage}</div> : null}
          </div>
        </section>

        <section style={styles.gridTwo}>
          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Add Bill</h2>
                <p style={styles.sectionSubtitle}>
                  Bills are tracked independently with due dates and payment status.
                </p>
              </div>
            </div>

            <div style={styles.formGrid}>
              <label style={styles.inputGroup}>
                <span style={styles.label}>Category</span>
                <select
                  value={billCategory}
                  onChange={(e) => setBillCategory(e.target.value)}
                  style={styles.input}
                >
                  <option value="">Select category</option>
                  {DEFAULT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.inputGroup}>
                <span style={styles.label}>Bill Name</span>
                <>
                  <input
                    list="bill-name-options"
                    value={billName}
                    onChange={(e) => setBillName(e.target.value)}
                    style={styles.input}
                    placeholder="Type any bill name you want"
                  />
                  <datalist id="bill-name-options">
                    {billSuggestions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </>
              </label>

              <label style={styles.inputGroup}>
                <span style={styles.label}>Amount Due</span>
                <input
                  type="number"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  style={styles.input}
                  placeholder="Enter amount due"
                />
              </label>

              <label style={styles.inputGroup}>
                <span style={styles.label}>Due Date</span>
                <input
                  type="date"
                  value={billDueDate}
                  onChange={(e) => setBillDueDate(e.target.value)}
                  style={styles.input}
                />
              </label>

              <label style={styles.inputGroup}>
                <span style={styles.label}>Status</span>
                <select
                  value={billStatus}
                  onChange={(e) => setBillStatus(e.target.value as BillStatus)}
                  style={styles.input}
                >
                  {BILL_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status === "paid" ? "Paid" : "Pending"}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.inputGroup}>
                <span style={styles.label}>Notes</span>
                <input
                  type="text"
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  style={styles.input}
                  placeholder="Optional notes"
                />
              </label>

              <label style={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  checked={billRecurring}
                  onChange={(e) => setBillRecurring(e.target.checked)}
                />
                <span style={styles.checkboxLabel}>Recurring Bill</span>
              </label>
            </div>

            <div style={styles.buttonRow}>
              <button style={styles.primaryButton} onClick={addBill}>
                Add Bill
              </button>
            </div>

            {billMessage ? <div style={styles.fieldMessage}>{billMessage}</div> : null}
          </div>

          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Goal Tracker</h2>
                <p style={styles.sectionSubtitle}>
                  Each workspace has its own learning goals and targets.
                </p>
              </div>
            </div>

            <div style={styles.formGrid}>
              <label style={styles.inputGroup}>
                <span style={styles.label}>Goal Title</span>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  style={styles.input}
                  placeholder="Enter goal title"
                />
              </label>

              <label style={styles.inputGroup}>
                <span style={styles.label}>Target Amount</span>
                <input
                  type="number"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  style={styles.input}
                  placeholder="Enter target amount"
                />
              </label>

              <label style={styles.inputGroup}>
                <span style={styles.label}>Current Amount</span>
                <input
                  type="number"
                  value={goalCurrent}
                  onChange={(e) => setGoalCurrent(e.target.value)}
                  style={styles.input}
                  placeholder="Enter current amount"
                />
              </label>
            </div>

            <div style={styles.buttonRow}>
              <button style={styles.primaryButton} onClick={addGoal}>
                Add Goal
              </button>
            </div>

            {goalMessage ? <div style={styles.fieldMessage}>{goalMessage}</div> : null}

            {goals.length === 0 ? (
              <div style={styles.emptyStateCompact}>
                No goals added yet for this workspace.
              </div>
            ) : (
              <div style={styles.goalList}>
                {goals.map((goal) => {
                  const progress =
                    goal.target > 0
                      ? clampPercent((goal.current / goal.target) * 100)
                      : 0;

                  return (
                    <div key={goal.id} style={styles.goalCard}>
                      <div style={styles.goalTopRow}>
                        <div>
                          <div style={styles.goalTitle}>{goal.title}</div>
                          <div style={styles.goalAmounts}>
                            {formatCurrency(goal.current)} of {formatCurrency(goal.target)}
                          </div>
                        </div>

                        <button
                          style={styles.deleteButton}
                          onClick={() => deleteGoal(goal.id)}
                        >
                          Delete
                        </button>
                      </div>

                      <div style={styles.progressTrack}>
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${progress}%`,
                          }}
                        />
                      </div>

                      <div style={styles.goalPercent}>
                        {progress.toFixed(1)}% complete
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section style={styles.gridTwo}>
          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Upcoming Bills</h2>
                <p style={styles.sectionSubtitle}>
                  Bills stay separate from expenses and can be marked paid independently.
                </p>
              </div>
            </div>

            {upcomingBills.length === 0 && overdueBills.length === 0 ? (
              <div style={styles.emptyStateCompact}>
                No upcoming or overdue bills tracked yet for this workspace.
              </div>
            ) : (
              <div style={styles.expenseList}>
                {[...overdueBills, ...upcomingBills].slice(0, 8).map((bill) => (
                  <div key={bill.id} style={styles.expenseRow}>
                    <div style={styles.expenseMain}>
                      <div style={styles.expenseDescription}>{bill.name}</div>
                      <div style={styles.expenseMeta}>
                        {bill.category} • Due {formatDateLabel(bill.dueDate)}
                      </div>
                      <div style={styles.expenseMeta}>
                        {bill.status === "paid"
                          ? "Paid"
                          : daysUntil(bill.dueDate) === 0
                            ? "Due today"
                            : `${daysUntil(bill.dueDate)} day(s) away`}
                      </div>
                      {bill.notes ? (
                        <div style={styles.expenseNotes}>{bill.notes}</div>
                      ) : null}
                    </div>

                    <div style={styles.expenseSide}>
                      <div style={styles.expenseAmount}>
                        {formatCurrency(bill.amount)}
                      </div>
                      <div style={styles.buttonRowCompact}>
                        {bill.status !== "paid" ? (
                          <button
                            style={styles.secondaryButtonSmall}
                            onClick={() => markBillPaid(bill.id)}
                          >
                            Mark Paid
                          </button>
                        ) : null}
                        <button
                          style={styles.deleteButton}
                          onClick={() => deleteBill(bill.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Expense Log</h2>
                <p style={styles.sectionSubtitle}>
                  Expenses remain separate and do not use paid bill logic.
                </p>
              </div>
            </div>

            <div style={styles.formGrid}>
              <label style={styles.inputGroup}>
                <span style={styles.label}>Search</span>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={styles.input}
                  placeholder="Search expenses"
                />
              </label>

              <label style={styles.inputGroup}>
                <span style={styles.label}>Category Filter</span>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={styles.input}
                >
                  <option value="All">All</option>
                  {DEFAULT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.inputGroup}>
                <span style={styles.label}>Sort By</span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  style={styles.input}
                >
                  <option value="date-newest">Date: Newest First</option>
                  <option value="date-oldest">Date: Oldest First</option>
                  <option value="amount-highest">Amount: Highest First</option>
                  <option value="amount-lowest">Amount: Lowest First</option>
                  <option value="category-az">Category: A to Z</option>
                </select>
              </label>
            </div>

            {filteredExpenses.length === 0 ? (
              <div style={styles.emptyStateCompact}>
                No expenses found for the current filter.
              </div>
            ) : (
              <div style={styles.expenseList}>
                {filteredExpenses.map((expense) => (
                  <div key={expense.id} style={styles.expenseRow}>
                    <div style={styles.expenseMain}>
                      <div style={styles.expenseDescription}>
                        {expense.description}
                      </div>
                      <div style={styles.expenseMeta}>
                        {expense.category} • {formatDateLabel(expense.date)} •{" "}
                        {expense.recurring ? "Recurring" : "One-Time"}
                      </div>
                      {expense.notes ? (
                        <div style={styles.expenseNotes}>{expense.notes}</div>
                      ) : null}
                    </div>

                    <div style={styles.expenseSide}>
                      <div style={styles.expenseAmount}>
                        {formatCurrency(expense.amount)}
                      </div>
                      <button
                        style={styles.deleteButton}
                        onClick={() => deleteExpense(expense.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Charts</h2>
              <p style={styles.sectionSubtitle}>
                Financial behavior for the active workspace.
              </p>
            </div>
          </div>

          <h3 style={styles.smallHeading}>Income by Source</h3>
          <SolidBarChart
            items={incomeTotals.map((item) => ({
              label: item.source,
              value: item.amount,
            }))}
          />

          <h3 style={styles.smallHeading}>Expenses by Category</h3>
          <SolidBarChart
            items={categoryTotals.map((item) => ({
              label: item.category,
              value: item.amount,
            }))}
          />

          <h3 style={styles.smallHeading}>Bills by Category</h3>
          <SolidBarChart
            items={billTotals.map((item) => ({
              label: item.category,
              value: item.amount,
            }))}
          />

          <h3 style={styles.smallHeading}>Saved Budget by Period</h3>
          <SolidBarChart items={budgetHistory} />
        </section>

        <section style={styles.gridTwo}>
          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Environment Status</h2>
                <p style={styles.sectionSubtitle}>
                  A cleaner view of what is already present and what still must be connected for live online use.
                </p>
              </div>
            </div>

            <div style={styles.envGrid}>
              {envStatusCards.map((item) => (
                <div key={item.title} style={styles.envCard}>
                  <div style={styles.envLabel}>{item.title}</div>
                  <div
                    style={{
                      ...styles.envValue,
                      ...(item.tone === "good"
                        ? styles.envGood
                        : item.tone === "warn"
                          ? styles.envWarn
                          : styles.envInfo),
                    }}
                  >
                    {item.status}
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.liveModePanel}>
              <div style={styles.liveModeTitle}>Live Mode Placeholder Layer</div>
              <div style={styles.liveModeText}>
                This build still keeps local stability, but now adds a Supabase transition layer for shared family beta testing. Use Push Cloud Beta to publish the current state and Pull Cloud Beta on another device to retrieve it.
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Deployment Checklist</h2>
                <p style={styles.sectionSubtitle}>
                  Follow this order so the live rollout stays controlled and does not break the stable beta build.
                </p>
              </div>
            </div>

            <div style={styles.checklistWrap}>
              {deploymentChecklist.map((item) => (
                <div key={item.label} style={styles.checklistRow}>
                  <div
                    style={{
                      ...styles.checklistStatusDot,
                      background: item.done ? "#10b981" : "#f59e0b",
                    }}
                  />
                  <div style={styles.checklistTextBlock}>
                    <div style={styles.checklistTitle}>
                      {item.done ? "Done" : "Pending"} — {item.label}
                    </div>
                    <div style={styles.checklistDetail}>{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ ...styles.gridTwo, gridTemplateColumns: "1fr" }}>
          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Beta Notes</h2>
                <p style={styles.sectionSubtitle}>
                  Capture tester comments, issues, and follow-up ideas while preparing for live deployment.
                </p>
              </div>
            </div>

            <textarea
              value={betaNotes}
              onChange={(e) => setBetaNotes(e.target.value)}
              style={styles.textArea}
              placeholder="Example: Accountant wants export summaries. Family members want easier bill reminders. Beta tester requested mobile layout changes..."
            />

            <div style={styles.emptyStateCompact}>
              These notes remain part of the saved dashboard payload. When you push the beta to Supabase, these notes travel with the shared test data.
            </div>
          </div>
        </section>


        <section style={{ ...styles.gridTwo, gridTemplateColumns: "1fr" }}>
          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Beta Cloud Tools</h2>
                <p style={styles.sectionSubtitle}>
                  Keep cloud-sync controls and deployment helpers at the bottom during family beta testing so the budgeting tools stay front and center.
                </p>
              </div>
            </div>

            {notice ? (
              <div style={styles.noticeStack}>
                <div
                  style={{
                    ...styles.noticeBar,
                    ...(noticeTone === "success"
                      ? styles.noticeSuccess
                      : noticeTone === "warning"
                        ? styles.noticeWarning
                        : styles.noticeInfo),
                  }}
                >
                  {notice}
                </div>
              </div>
            ) : null}

            <div
              style={{
                ...styles.noticeBar,
                ...(cloudSyncTone === "success"
                  ? styles.noticeSuccess
                  : cloudSyncTone === "warning"
                    ? styles.noticeWarning
                    : styles.noticeInfo),
                marginTop: notice ? "0" : "4px",
                marginBottom: "18px",
              }}
            >
              {cloudSyncStatus}
            </div>

            <div style={styles.runtimeConfigPanel}>
              <div style={styles.sectionHeader}>
                <div>
                  <h2 style={styles.sectionTitleDark}>Cloud Connection Backup</h2>
                  <p style={styles.sectionSubtitleDark}>
                    If your .env.local file does not load reliably on this Mac, save the Supabase URL and publishable anon key here once on this device.
                  </p>
                </div>
              </div>

              <div style={styles.formGrid}>
                <label style={styles.inputGroup}>
                  <span style={styles.labelLight}>Supabase Project URL</span>
                  <input
                    type="text"
                    value={runtimeSupabaseUrl}
                    onChange={(e) => setRuntimeSupabaseUrl(e.target.value)}
                    style={styles.inputDark}
                    placeholder="https://your-project.supabase.co"
                  />
                </label>

                <label style={styles.inputGroup}>
                  <span style={styles.labelLight}>Publishable Anon Key</span>
                  <input
                    type="text"
                    value={runtimeSupabaseAnonKey}
                    onChange={(e) => setRuntimeSupabaseAnonKey(e.target.value)}
                    style={styles.inputDark}
                    placeholder="sb_publishable_..."
                  />
                </label>
              </div>

              <div style={styles.buttonRow}>
                <button style={styles.primaryButton} onClick={saveRuntimeSupabaseConfig}>
                  Save Runtime Cloud Settings
                </button>
                <button style={styles.secondaryButton} onClick={clearRuntimeSupabaseConfig}>
                  Clear Runtime Cloud Settings
                </button>
              </div>

              <div style={styles.runtimeHelperTextDark}>
                Env URL: {envSupabaseUrl ? "Detected" : "Missing"} • Env Key: {envSupabaseAnonKey ? "Detected" : "Missing"} • Runtime URL: {fallbackSupabaseUrl ? "Saved" : "Missing"} • Runtime Key: {fallbackSupabaseAnonKey ? maskSecret(fallbackSupabaseAnonKey) : "Missing"}
              </div>

              {runtimeConfigMessage ? (
                <div style={styles.runtimeHelperTextDark}>{runtimeConfigMessage}</div>
              ) : null}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: "22px 16px 56px",
    color: "#111827",
  },
  loadingPage: {
    minHeight: "100vh",
    background: "#f4f7fb",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    color: "#111827",
    fontSize: "20px",
    fontWeight: 800,
  },
  loginPage: {
    minHeight: "100vh",
    background: "#f4f7fb",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "24px",
  },
  loginCard: {
    width: "100%",
    maxWidth: "580px",
    background: "#ffffff",
    borderRadius: "28px",
    padding: "32px",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.10)",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  loginLogoWrap: {
    alignSelf: "center",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "14px",
    border: "1px solid #dbe4f0",
  },
  loginLogo: {
    width: "170px",
    height: "170px",
    objectFit: "contain",
    display: "block",
  },
  loginEyebrow: {
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "1.6px",
    textTransform: "uppercase",
    color: "#1d4ed8",
    textAlign: "center",
  },
  loginTitle: {
    margin: 0,
    textAlign: "center",
    fontSize: "36px",
    fontWeight: 800,
    color: "#0f172a",
    lineHeight: 1.1,
  },
  loginSubtitle: {
    margin: 0,
    textAlign: "center",
    color: "#64748b",
    fontSize: "15px",
    lineHeight: 1.6,
  },
  loginNotice: {
    padding: "14px 16px",
    borderRadius: "16px",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  loginNoticeSecondary: {
    padding: "14px 16px",
    borderRadius: "16px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#475569",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  primaryButtonLarge: {
    border: "none",
    borderRadius: "16px",
    padding: "14px 18px",
    background: "linear-gradient(135deg, #0b2a7d 0%, #133a98 55%, #0b2b6f 100%)",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 800,
    cursor: "pointer",
  },
  appShell: {
    maxWidth: "1400px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  heroCard: {
    background:
      "linear-gradient(135deg, #0b2a7d 0%, #133a98 38%, #0e307e 68%, #081b45 100%)",
    borderRadius: "24px",
    padding: "24px 24px 36px",
    color: "#ffffff",
    border: "1px solid rgba(191, 219, 254, 0.18)",
    boxShadow: "0 18px 42px rgba(8, 27, 69, 0.30)",
    overflow: "hidden",
  },
  heroMainRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 236px",
    alignItems: "start",
    gap: "24px",
  },
  heroBrandBlock: {
    display: "grid",
    gridTemplateColumns: "170px minmax(0, 1fr)",
    gap: "22px",
    alignItems: "start",
    minWidth: 0,
  },
  logoWrap: {
    background: "rgba(255,255,255,0.94)",
    borderRadius: "16px",
    padding: "10px",
    border: "1px solid #dbe4f0",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.12)",
  },
  heroLogo: {
    width: "154px",
    height: "154px",
    objectFit: "contain",
    display: "block",
  },
  heroTextBlock: {
    width: "100%",
    maxWidth: "760px",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    paddingTop: "6px",
  },
  heroEyebrow: {
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "1.8px",
    color: "#e3ebff",
  },
  heroTitle: {
    margin: 0,
    fontSize: "29px",
    lineHeight: 1.05,
    fontWeight: 800,
    color: "#ffffff",
  },
  heroSubtitle: {
    margin: 0,
    color: "#e8efff",
    fontSize: "13px",
    lineHeight: 1.5,
  },
  heroMeta: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
    marginTop: "8px",
  },
  heroMetaPill: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(219,234,254,0.26)",
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#eff6ff",
  },
  heroActionBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "9px",
    width: "100%",
    maxWidth: "236px",
    justifySelf: "end",
  },
  noticeOuter: {
    display: "flex",
    justifyContent: "center",
    marginTop: "12px",
    marginBottom: "12px",
    padding: "0 18px",
  },
  noticeStack: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "12px",
  },
  noticeBar: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    borderRadius: "18px",
    padding: "14px 18px",
    fontSize: "14px",
    fontWeight: 700,
    border: "1px solid transparent",
    textAlign: "left",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  noticeSuccess: {
    background: "#ecfdf5",
    color: "#047857",
    borderColor: "#a7f3d0",
  },
  noticeWarning: {
    background: "#fff7ed",
    color: "#c2410c",
    borderColor: "#fdba74",
  },
  noticeInfo: {
    background: "#eff6ff",
    color: "#1d4ed8",
    borderColor: "#bfdbfe",
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "18px",
  },
  heroInfoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "18px",
    marginTop: "18px",
    alignItems: "start",
  },
  workspaceCard: {
    background: "rgba(255,255,255,0.10)",
    borderRadius: "16px",
    padding: "16px",
    border: "1px solid rgba(219,234,254,0.24)",
    minHeight: 0,
    minWidth: 0,
    alignSelf: "start",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
  },
  runtimeConfigCard: {
    background: "rgba(255,255,255,0.10)",
    borderRadius: "16px",
    padding: "16px",
    border: "1px solid rgba(219,234,254,0.24)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
  },
  runtimeConfigPanel: {
    background: "#1d4ed8",
    borderRadius: "18px",
    padding: "18px",
    border: "1px solid #93c5fd",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
  },
  runtimeHelperText: {
    marginTop: "10px",
    fontSize: "13px",
    color: "#dbeafe",
    lineHeight: 1.5,
  },
  runtimeHelperTextDark: {
    marginTop: "10px",
    fontSize: "13px",
    color: "#dbeafe",
    lineHeight: 1.5,
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
    marginBottom: "14px",
    flexWrap: "wrap",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "21px",
    fontWeight: 800,
    color: "#0f172a",
  },
  sectionTitleDark: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 800,
    color: "#ffffff",
  },
  sectionSubtitle: {
    margin: "6px 0 0 0",
    fontSize: "14px",
    color: "#64748b",
  },
  sectionSubtitleDark: {
    margin: "6px 0 0 0",
    fontSize: "14px",
    color: "#e4ecff",
  },
  card: {
    background: "#ffffff",
    borderRadius: "24px",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
    padding: "18px",
    color: "#111827",
    minHeight: "100%",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px",
    alignItems: "start",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#2563eb",
  },
  labelLight: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#ffffff",
  },
  input: {
    width: "100%",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    padding: "13px 15px",
    fontSize: "15px",
    boxSizing: "border-box",
    color: "#111827",
    outline: "none",
  },
  inputDark: {
    width: "100%",
    borderRadius: "14px",
    border: "1px solid rgba(219,234,254,0.22)",
    background: "rgba(15,23,42,0.20)",
    padding: "13px 15px",
    fontSize: "15px",
    boxSizing: "border-box",
    color: "#ffffff",
    outline: "none",
  },
  inputDarkReadOnly: {
    width: "100%",
    borderRadius: "14px",
    border: "1px solid rgba(219,234,254,0.22)",
    background: "rgba(255,255,255,0.08)",
    padding: "13px 15px",
    fontSize: "15px",
    boxSizing: "border-box",
    color: "#ffffff",
    outline: "none",
  },
  textArea: {
    width: "100%",
    minHeight: "140px",
    borderRadius: "16px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    padding: "14px 16px",
    fontSize: "15px",
    boxSizing: "border-box",
    color: "#111827",
    resize: "vertical",
    outline: "none",
  },
  checkboxGroup: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    paddingTop: "30px",
    color: "#111827",
  },
  checkboxLabel: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#111827",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "16px",
  },
  buttonRowCompact: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  primaryButton: {
    border: "none",
    borderRadius: "12px",
    padding: "10px 14px",
    background: "linear-gradient(135deg, #0b2a7d 0%, #133a98 55%, #0b2b6f 100%)",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #bfdbfe",
    borderRadius: "12px",
    padding: "9px 13px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButtonSmall: {
    border: "1px solid #bfdbfe",
    borderRadius: "12px",
    padding: "8px 12px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  dangerButton: {
    border: "1px solid #fca5a5",
    borderRadius: "14px",
    padding: "12px 16px",
    background: "#fff1f2",
    color: "#b91c1c",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  deleteButton: {
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "8px 12px",
    background: "#ffffff",
    color: "#111827",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  fieldMessage: {
    marginTop: "12px",
    padding: "10px 12px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#475569",
    fontSize: "13px",
  },
  infoStrip: {
    marginTop: "16px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "18px",
  },
  infoBlock: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "14px",
  },
  infoLabel: {
    fontSize: "12px",
    color: "#2563eb",
    marginBottom: "5px",
  },
  infoValue: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#111827",
  },
  progressTrack: {
    width: "100%",
    height: "12px",
    borderRadius: "999px",
    background: "#e2e8f0",
    overflow: "hidden",
    marginTop: "16px",
  },
  progressFill: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #0b2a7d 0%, #133a98 55%, #0b2b6f 100%)",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "18px",
    alignItems: "stretch",
  },
  summaryCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "14px",
  },
  summaryLabel: {
    fontSize: "12px",
    color: "#2563eb",
    marginBottom: "6px",
  },
  summaryValue: {
    fontSize: "22px",
    fontWeight: 800,
    color: "#111827",
  },
  platformPrepWrap: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "18px",
    marginTop: "16px",
  },
  platformPrepRow: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "12px 14px",
  },
  platformPrepLabel: {
    fontSize: "12px",
    color: "#2563eb",
    marginBottom: "4px",
  },
  platformPrepValue: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#111827",
  },
  envGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "10px",
    marginBottom: "14px",
  },
  envCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "12px",
  },
  envLabel: {
    fontSize: "12px",
    color: "#2563eb",
    marginBottom: "8px",
  },
  envValue: {
    fontSize: "15px",
    fontWeight: 800,
  },
  envGood: {
    color: "#047857",
  },
  envWarn: {
    color: "#b45309",
  },
  envInfo: {
    color: "#1d4ed8",
  },
  liveModePanel: {
    borderRadius: "18px",
    background: "#f4f8ff",
    border: "1px solid #d7e6ff",
    padding: "14px",
  },
  liveModeTitle: {
    fontSize: "15px",
    fontWeight: 800,
    color: "#1d4ed8",
    marginBottom: "6px",
  },
  liveModeText: {
    fontSize: "14px",
    lineHeight: 1.6,
    color: "#475569",
  },
  checklistWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  checklistRow: {
    display: "flex",
    gap: "18px",
    alignItems: "flex-start",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "12px",
  },
  checklistStatusDot: {
    width: "12px",
    height: "12px",
    borderRadius: "999px",
    marginTop: "5px",
    flexShrink: 0,
  },
  checklistTextBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  checklistTitle: {
    fontSize: "14px",
    fontWeight: 800,
    color: "#111827",
  },
  checklistDetail: {
    fontSize: "13px",
    color: "#64748b",
    lineHeight: 1.5,
  },
  expenseList: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  expenseRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    flexWrap: "wrap",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "16px",
  },
  expenseMain: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  expenseDescription: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#111827",
  },
  expenseMeta: {
    fontSize: "13px",
    color: "#64748b",
  },
  expenseNotes: {
    fontSize: "13px",
    color: "#475569",
    marginTop: "2px",
  },
  expenseSide: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "10px",
  },
  expenseAmount: {
    fontSize: "20px",
    fontWeight: 800,
    color: "#111827",
  },
  goalList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    marginTop: "16px",
  },
  goalCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "16px",
  },
  goalTopRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  goalTitle: {
    fontSize: "16px",
    fontWeight: 800,
    color: "#111827",
  },
  goalAmounts: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "4px",
  },
  goalPercent: {
    fontSize: "13px",
    color: "#2563eb",
    marginTop: "8px",
    fontWeight: 700,
  },
  chartWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  chartRow: {
    display: "grid",
    gridTemplateColumns: "minmax(100px, 180px) 1fr minmax(90px, 120px)",
    gap: "18px",
    alignItems: "flex-start",
  },
  chartLabelBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  chartLabel: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#111827",
  },
  chartSublabel: {
    fontSize: "12px",
    color: "#64748b",
  },
  chartBarArea: {
    width: "100%",
  },
  chartTrack: {
    width: "100%",
    height: "14px",
    background: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden",
  },
  chartFill: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #0b2a7d 0%, #1f5eff 100%)",
    minWidth: "8px",
  },
  chartValue: {
    textAlign: "right",
    fontSize: "14px",
    fontWeight: 800,
    color: "#111827",
  },
  emptyStateCompact: {
    padding: "14px 16px",
    borderRadius: "16px",
    background: "#ffffff",
    border: "1px dashed #cbd5e1",
    color: "#64748b",
    fontSize: "14px",
    marginTop: "12px",
  },
  smallHeading: {
    marginTop: "18px",
    marginBottom: "14px",
    color: "#2563eb",
    fontSize: "15px",
    fontWeight: 800,
  },
};
