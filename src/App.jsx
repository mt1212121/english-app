import { useState, useEffect, useRef, useMemo } from "react";
import {
  Menu,
  ArrowLeft,
  ArrowRight,
  X,
  Clock,
  Trophy,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  BookOpen,
  Layers,
  ClipboardList,
  Timer as TimerIcon,
  Share2,
  Check,
  Loader2,
  WifiOff,
  Lock,
  Upload,
  Download,
  Trash2,
  Moon,
  Home,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  GraduationCap,
} from "lucide-react";
import { LEVELS, CATEGORY_META, pickQuestions, estimateLevel, estimateExplanation, levelName, categoryQuestionCounts, computeScore } from "./data/bank";
import { fetchAIQuestions } from "./lib/aiQuestions";
import { getHistory, addHistoryEntry, getSeenUids, addSeenUids } from "./lib/storage";

/* ------------------------------------------------------------------ */
/*  DESIGN TOKENS                                                      */
/*  Primary: royal blue #3F66F5. White surfaces, soft blue gradients.  */
/* ------------------------------------------------------------------ */

const BLUE = "#3F66F5";
const BLUE_DARK = "#2E4FD1";
const BLUE_LIGHT = "#7C97FF";

const CATEGORY_ICONS = { grammar: ClipboardList, vocabulary: Layers, reading: BookOpen };
const CATEGORIES = CATEGORY_META.map((c) => ({ ...c, icon: CATEGORY_ICONS[c.id] }));

/* ------------------------------------------------------------------ */
/*  SMALL UI PIECES                                                    */
/* ------------------------------------------------------------------ */

function DifficultyBars({ count }) {
  return (
    <div className="flex items-end gap-[3px] h-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="w-[3px] rounded-full"
          style={{
            height: `${i * 3 + 3}px`,
            backgroundColor: i <= count ? BLUE : "#E2E6F5",
          }}
        />
      ))}
    </div>
  );
}

function GradientButton({ children, onClick, disabled, className = "", type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={
        "w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-white transition-all active:scale-[0.98] hover:brightness-110 disabled:opacity-40 disabled:active:scale-100 disabled:hover:brightness-100 " +
        className
      }
      style={{
        background: disabled
          ? "#B7C2F5"
          : `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)`,
        boxShadow: disabled ? "none" : `0 10px 24px -8px ${BLUE}66`,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, disabled, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold border transition-colors hover:bg-[#F7F9FF] dark:hover:bg-[#1E2440] disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#161B2E] bg-white dark:bg-[#161B2E] text-[#2B2F45] dark:text-[#F0F2FA] " +
        className
      }
      style={{ borderColor: "#DCE2F7" }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  SCREEN: HOME                                                       */
/* ------------------------------------------------------------------ */

function AccordionRow({ icon, title, soon, summary, onSeeMore }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] bg-white dark:bg-[#161B2E] overflow-hidden mb-2.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 p-3.5 text-left font-semibold text-[14px] text-[#1B1E2B] dark:text-[#F0F2FA]"
      >
        {icon}
        <span>{title}</span>
        {soon && (
          <span className="text-[10px] font-bold bg-[#EEF1FE] dark:bg-[#20264A] text-[#3F66F5] px-1.5 py-0.5 rounded">soon</span>
        )}
        <ChevronRight
          size={16}
          className="ml-auto text-[#8890AE] dark:text-[#8A93B8] transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        />
      </button>
      {open && (
        <div className="px-3.5 pb-3.5">
          <p className="text-[12.5px] text-[#6B7190] dark:text-[#9AA3C4] leading-relaxed mb-2">{summary}</p>
          {onSeeMore && (
            <button onClick={onSeeMore} className="text-[12px] font-semibold" style={{ color: BLUE }}>
              {`See full ${title} →`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function HomeScreen({ onStart, historyCount, history, onOpenHistory, onOpenProgress, darkMode, onToggleDark }) {
  const [dashOpen, setDashOpen] = useState(false);
  const counts = categoryQuestionCounts();
  const last = history[history.length - 1];
  const currentLevel = last?.estLevel || null;

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center justify-between px-5 md:px-8 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${BLUE}, ${BLUE_LIGHT})` }}
          >
            <BookOpen size={16} className="text-white" />
          </div>
          <span className="font-semibold text-[17px] text-[#1B1E2B] dark:text-[#F0F2FA]">English Test</span>
        </div>
        <button onClick={() => setDashOpen(true)} className="w-8 h-8 flex items-center justify-center">
          <Menu size={20} className="text-[#8890AE] dark:text-[#8A93B8]" />
        </button>
      </div>

      <div className="px-5 md:px-8 pt-2">
        <p className="text-[13px] tracking-wide text-[#8890AE] dark:text-[#8A93B8]">
          Practice, improve, and track your progress
        </p>
        <h1 className="text-[32px] md:text-[42px] leading-[1.15] font-bold text-[#1B1E2B] dark:text-[#F0F2FA] mt-2">
          Find Your <span style={{ color: BLUE }}>English Level</span>
        </h1>
        <p className="text-[15px] md:text-[16px] text-[#6B7190] dark:text-[#9AA3C4] mt-3 leading-relaxed md:max-w-[560px]">
          Take a personalized test and improve your skills. New questions every time you play.
        </p>
      </div>

      <div className="px-5 md:px-8 mt-5">
        <div
          className="rounded-3xl p-5 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DARK} 100%)` }}
        >
          <div className="absolute -right-6 -top-10 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -right-2 bottom-0 w-20 h-20 rounded-full bg-white/10" />
          <Sparkles className="text-white/80" size={22} />
          <p className="text-white font-semibold mt-3 text-[15px]">
            {historyCount > 0
              ? `You've completed ${historyCount} test${historyCount > 1 ? "s" : ""} so far.`
              : "Ready for your first test?"}
          </p>
          <p className="text-white/75 text-[13px] mt-1">
            Choose grammar, vocabulary, reading, or mix them all.
          </p>
        </div>
      </div>

      <div className="px-5 md:px-8 mt-6 flex flex-col gap-2.5">
        {CATEGORIES.map(({ id, icon: Icon, label, desc }) => (
          <div key={id} className="flex items-start gap-3.5 rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] p-4 bg-white dark:bg-[#161B2E]">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#EEF1FE] dark:bg-[#20264A]"
            >
              <Icon size={16} style={{ color: BLUE }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[14.5px] text-[#1B1E2B] dark:text-[#F0F2FA]">{label}</p>
              <p className="text-[12.5px] text-[#8890AE] dark:text-[#8A93B8] mt-0.5">{desc}</p>
            </div>
            <span className="text-[11.5px] text-[#8890AE] dark:text-[#8A93B8] whitespace-nowrap pl-2">{counts[id]} questions</span>
          </div>
        ))}
      </div>

      <div className="mt-auto px-5 md:px-8 pb-6 pt-6">
        <GradientButton onClick={onStart}>
          Start a Test <ArrowRight size={18} />
        </GradientButton>
        <p className="text-center text-[12px] text-[#A6ACC6] mt-3">
          Small steps make big progress
        </p>
      </div>

      {dashOpen && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setDashOpen(false)}>
          <div
            className="absolute top-0 right-0 h-full w-[85%] max-w-[340px] bg-[#F7F9FF] dark:bg-[#10142A] p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[16px] text-[#1B1E2B] dark:text-[#F0F2FA]">Your Dashboard</h3>
              <button
                onClick={() => setDashOpen(false)}
                className="w-7 h-7 rounded-lg border border-[#EAEDF9] dark:border-[#2A3050] bg-white dark:bg-[#161B2E] flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>

            <AccordionRow
              icon={<TrendingUp size={16} style={{ color: BLUE }} />}
              title="Progress Level"
              summary={
                currentLevel
                  ? `Current: ${currentLevel} · ${levelName(currentLevel)}`
                  : "Take a test to see your estimated level here."
              }
              onSeeMore={history.length ? () => { setDashOpen(false); onOpenProgress(); } : null}
            />
            <AccordionRow
              icon={<BarChart3 size={16} style={{ color: BLUE }} />}
              title="History"
              summary={
                last
                  ? `Last test: ${formatDate(last.date)} · ${last.level} · ${last.pct}%`
                  : "No tests taken yet."
              }
              onSeeMore={history.length ? () => { setDashOpen(false); onOpenHistory(); } : null}
            />
            <AccordionRow
              icon={<GraduationCap size={16} style={{ color: BLUE }} />}
              title="Lessons"
              soon
              summary="This section will hold guided lessons and video content."
            />

            <div className="rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] bg-white dark:bg-[#161B2E] flex items-center gap-2.5 p-3.5 mt-1">
              <Moon size={16} style={{ color: BLUE }} />
              <span className="font-semibold text-[14px] text-[#1B1E2B] dark:text-[#F0F2FA] flex-1">Dark Mode</span>
              <button
                onClick={onToggleDark}
                className="w-11 h-6 rounded-full relative transition-colors shrink-0"
                style={{ background: darkMode ? BLUE : "#E2E6F0" }}
              >
                <div
                  className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all"
                  style={{ left: darkMode ? "22px" : "2px" }}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SCREEN: SETUP                                                      */
/* ------------------------------------------------------------------ */

function SetupScreen({ onBack, onStartTest }) {
  const [level, setLevel] = useState("B1");
  const [count, setCount] = useState(10);
  const [timerOn, setTimerOn] = useState(true);
  const [minutes, setMinutes] = useState(20);
  const [categories, setCategories] = useState(CATEGORIES.map((c) => c.id));

  function toggleCategory(id) {
    setCategories((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((c) => c !== id);
        return next.length ? next : prev; // keep at least one selected
      }
      return [...prev, id];
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 md:px-8 pt-5 pb-1">
        <button onClick={onBack} className="text-[#1B1E2B] dark:text-[#F0F2FA]">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h2 className="text-[19px] font-bold text-[#1B1E2B] dark:text-[#F0F2FA]">Test Settings</h2>
          <p className="text-[12px] text-[#8890AE] dark:text-[#8A93B8]">Customize your test experience</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 md:px-8 pb-4">
        <p className="text-[13px] font-semibold text-[#1B1E2B] dark:text-[#F0F2FA] mt-5 mb-3">Choose your level</p>
        <div className="flex flex-col gap-2">
          {LEVELS.map((l) => {
            const active = level === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setLevel(l.id)}
                className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                  active
                    ? "border-[#3F66F5] bg-[#F2F5FF] dark:bg-[#1E2440]"
                    : "border-[#EAEDF9] dark:border-[#2A3050] bg-white dark:bg-[#161B2E]"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    active ? "bg-[#3F66F5]" : "bg-[#F1F3FA] dark:bg-[#20264A]"
                  }`}
                >
                  <span className={"text-[12px] font-bold " + (active ? "text-white" : "text-[#8890AE] dark:text-[#8A93B8]")}>
                    {l.id}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#1B1E2B] dark:text-[#F0F2FA]">{l.name}</p>
                  <p className="text-[12px] text-[#8890AE] dark:text-[#8A93B8] truncate">{l.desc}</p>
                </div>
                <DifficultyBars count={l.bars} />
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    active ? "border-[#3F66F5]" : "border-[#D8DCEE] dark:border-[#3A4060]"
                  }`}
                >
                  {active && <div className="w-2.5 h-2.5 rounded-full bg-[#3F66F5]" />}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[13px] font-semibold text-[#1B1E2B] dark:text-[#F0F2FA] mt-6 mb-1">Focus on</p>
        <p className="text-[12px] text-[#8890AE] dark:text-[#8A93B8] mb-3">
          Pick the areas you want to practice — great for targeting your weak points
        </p>
        <div className="flex flex-col gap-2">
          {CATEGORIES.map((cat) => {
            const active = categories.includes(cat.id);
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                  active
                    ? "border-[#3F66F5] bg-[#F2F5FF] dark:bg-[#1E2440]"
                    : "border-[#EAEDF9] dark:border-[#2A3050] bg-white dark:bg-[#161B2E]"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    active ? "bg-[#3F66F5]" : "bg-[#F1F3FA] dark:bg-[#20264A]"
                  }`}
                >
                  <Icon size={16} className={active ? "text-white" : "text-[#8890AE] dark:text-[#8A93B8]"} />
                </div>
                <span className="flex-1 text-[14px] font-medium text-[#1B1E2B] dark:text-[#F0F2FA]">{cat.label}</span>
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                    active
                      ? "border-[#3F66F5] bg-[#3F66F5]"
                      : "border-[#D8DCEE] dark:border-[#3A4060] bg-white dark:bg-[#161B2E]"
                  }`}
                >
                  {active && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[13px] font-semibold text-[#1B1E2B] dark:text-[#F0F2FA] mt-6 mb-3">Test options</p>

        <div className="rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] p-4">
          <p className="text-[13px] font-medium text-[#1B1E2B] dark:text-[#F0F2FA] mb-2">Number of questions</p>
          <div className="grid grid-cols-3 gap-2">
            {[10, 20, 30].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`rounded-xl py-2.5 text-[13px] font-semibold border ${
                  count === n
                    ? "border-[#3F66F5] bg-[#3F66F5] text-white"
                    : "border-[#EAEDF9] dark:border-[#2A3050] bg-white dark:bg-[#161B2E] text-[#6B7190] dark:text-[#9AA3C4]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] p-4 mt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock size={18} style={{ color: BLUE }} />
              <div>
                <p className="text-[13px] font-medium text-[#1B1E2B] dark:text-[#F0F2FA]">Time limit</p>
                <p className="text-[11px] text-[#8890AE] dark:text-[#8A93B8]">Set a time for your test</p>
              </div>
            </div>
            <button
              onClick={() => setTimerOn((v) => !v)}
              className={`w-11 h-6 rounded-full relative transition-colors ${
                timerOn ? "bg-[#3F66F5]" : "bg-[#E2E6F0] dark:bg-[#2A3050]"
              }`}
            >
              <div
                className="w-5 h-5 bg-white dark:bg-[#0B0E1C] rounded-full absolute top-0.5 transition-all"
                style={{ left: timerOn ? "22px" : "2px" }}
              />
            </button>
          </div>
          {timerOn && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[10, 20, 30].map((m) => (
                <button
                  key={m}
                  onClick={() => setMinutes(m)}
                  className={`rounded-xl py-2 text-[13px] font-semibold border ${
                    minutes === m
                      ? "border-[#3F66F5] bg-[#F2F5FF] dark:bg-[#1E2440] text-[#3F66F5]"
                      : "border-[#EAEDF9] dark:border-[#2A3050] bg-white dark:bg-[#161B2E] text-[#6B7190] dark:text-[#9AA3C4]"
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 md:px-8 pb-6 pt-3">
        <GradientButton
          onClick={() => onStartTest({ level, count, timerOn, minutes, categories })}
        >
          Start Test <ArrowRight size={18} />
        </GradientButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SCREEN: QUIZ                                                       */
/* ------------------------------------------------------------------ */

function formatDate(iso) {
  // Force en-US + explicit Gregorian calendar so this never renders in a
  // Hijri or other non-Gregorian calendar based on the visitor's locale.
  return new Date(iso).toLocaleDateString("en-US-u-ca-gregory", { month: "short", day: "numeric" });
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function QuizScreen({ config, onExit, onFinish }) {
  const [questions, setQuestions] = useState(null);
  const [source, setSource] = useState(null); // "ai" | "bank"
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(config.timerOn ? config.minutes * 60 : null);
  const finishedRef = useRef(false);

  // Load the question set once: try AI generation first, fall back to the
  // local bank (excluding recently-seen questions for this level).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ai = await fetchAIQuestions(config.level, config.count, config.categories);
      if (cancelled) return;
      if (ai) {
        setQuestions(ai);
        setSource("ai");
      } else {
        const seen = getSeenUids(config.level);
        const picked = pickQuestions(config.level, config.count, config.categories, seen);
        setQuestions(picked);
        setSource("bank");
        addSeenUids(config.level, picked.map((q) => q.uid));
      }
      setAnswers((prev) => (prev.length ? prev : Array(config.count).fill(null)));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!config.timerOn || !questions) return;
    if (secondsLeft <= 0) {
      if (!finishedRef.current) {
        finishedRef.current = true;
        onFinish(questions, answers);
      }
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, config.timerOn, questions]);

  if (!questions) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8 text-center">
        <Loader2 size={28} className="animate-spin" style={{ color: BLUE }} />
        <p className="text-[14px] font-medium text-[#1B1E2B] dark:text-[#F0F2FA] mt-4">Preparing your test…</p>
        <p className="text-[12.5px] text-[#8890AE] dark:text-[#8A93B8] mt-1">Generating a fresh set of questions</p>
      </div>
    );
  }

  const current = questions[index];
  const catMeta = CATEGORIES.find((c) => c.id === current.category) || CATEGORIES[0];
  const selected = answers[index] ?? null;

  function selectOption(optIdx) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = optIdx;
      return next;
    });
  }

  function goNext() {
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
    } else {
      finishedRef.current = true;
      onFinish(questions, answers);
    }
  }

  function goPrev() {
    if (index > 0) setIndex((i) => i - 1);
  }

  const progressPct = ((index + 1) / questions.length) * 100;
  const lowTime = config.timerOn && secondsLeft <= 30;

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 md:px-8 pt-5">
        <div className="flex items-center justify-between">
          <button onClick={onExit} className="text-[#1B1E2B] dark:text-[#F0F2FA]">
            <X size={22} />
          </button>
          <div className="flex items-center gap-1.5">
            <catMeta.icon size={15} style={{ color: BLUE }} />
            <span className="text-[15px] font-bold text-[#1B1E2B] dark:text-[#F0F2FA]">
              {catMeta.label} {index + 1}/{questions.length}
            </span>
          </div>
          <div className="w-[22px]" />
        </div>
        <div className="w-full h-1.5 bg-[#EEF1FA] dark:bg-[#232A47] rounded-full mt-4 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%`, background: BLUE }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          {source === "bank" ? (
            <div className="flex items-center gap-1 text-[11px] text-[#A6ACC6]">
              <WifiOff size={12} /> Practice bank
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px]" style={{ color: BLUE }}>
              <Sparkles size={12} /> AI-generated
            </div>
          )}
          {config.timerOn && (
            <div
              className="flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1 rounded-lg"
              style={{
                color: lowTime ? "#E0483E" : "#6B7190",
                background: lowTime ? "#FDECEB" : "#F5F6FB",
              }}
            >
              <TimerIcon size={14} />
              {formatTime(secondsLeft)}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 md:px-8 pt-5">
        {current.passage && (
          <div className="rounded-2xl p-4 md:p-5 mb-4 text-[14px] md:text-[15px] leading-relaxed text-[#3F4460] dark:text-[#C5CBE8] bg-[#F5F6FB] dark:bg-[#1B2140]">
            {current.passage}
          </div>
        )}
        <p className="text-[17px] md:text-[20px] font-semibold text-[#1B1E2B] dark:text-[#F0F2FA] leading-snug mb-5">
          {current.q}
        </p>

        <div className="flex flex-col gap-3">
          {current.options.map((opt, i) => {
            const isSelected = selected === i;
            const letter = String.fromCharCode(65 + i);
            return (
              <button
                key={i}
                onClick={() => selectOption(i)}
                className="flex items-center gap-3 rounded-2xl border p-3.5 md:p-4 text-left transition-colors hover:border-[#C3CFFB]"
                style={{
                  borderColor: isSelected ? BLUE : "#EAEDF9",
                  background: isSelected ? "#F2F5FF" : "#fff",
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold"
                  style={{
                    background: isSelected ? BLUE : "#F1F3FA",
                    color: isSelected ? "#fff" : "#8890AE",
                  }}
                >
                  {letter}
                </div>
                <span className="text-[14px] md:text-[15px] text-[#292D42] dark:text-[#E5E8F5]">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 md:px-8 pb-6 pt-3 flex gap-3">
        <SecondaryButton onClick={goPrev} disabled={index === 0} className="flex-1">
          <ArrowLeft size={16} /> Previous
        </SecondaryButton>
        <GradientButton onClick={goNext} disabled={selected === null} className="flex-1">
          {index === questions.length - 1 ? "Finish" : "Next"} <ArrowRight size={16} />
        </GradientButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SCREEN: RESULTS                                                     */
/* ------------------------------------------------------------------ */

function buildShareText(session, pct, correctCount, total, estLevel, byCategory) {
  const lines = [
    "🎯 English Test Result",
    `Level tested: ${session.config.level} (${levelName(session.config.level)})`,
    `Score: ${correctCount}/${total} (${pct}%)`,
    `Estimated level: ${estLevel} (${levelName(estLevel)})`,
    "",
    ...byCategory.filter((c) => c.of > 0).map((c) => `${c.label}: ${c.pct}%`),
    "",
    "Taken on English Test",
  ];
  return lines.join("\n");
}

function drawShareCard(canvas, { pct, correctCount, total, level, estLevel, byCategory }) {
  const W = 1080;
  const H = 1350;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, BLUE);
  grad.addColorStop(1, BLUE_DARK);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.arc(W - 80, 120, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(60, H - 100, 160, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "600 34px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("English Test", 70, 110);

  const cardX = 60, cardY = 200, cardW = W - 120, cardH = H - 380, radius = 40;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  ctx.fill();

  let y = cardY + 100;
  ctx.fillStyle = "#8890AE";
  ctx.font = "500 30px system-ui, sans-serif";
  ctx.fillText("MY SCORE", cardX + 60, y);

  y += 110;
  ctx.fillStyle = "#1B1E2B";
  ctx.font = "800 130px system-ui, sans-serif";
  ctx.fillText(`${correctCount}/${total}`, cardX + 60, y);

  ctx.fillStyle = BLUE;
  ctx.font = "800 70px system-ui, sans-serif";
  ctx.fillText(`${pct}%`, cardX + cardW - 220, y - 30);

  y += 70;
  ctx.strokeStyle = "#EEF1FA";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cardX + 60, y);
  ctx.lineTo(cardX + cardW - 60, y);
  ctx.stroke();

  y += 80;
  ctx.fillStyle = "#8890AE";
  ctx.font = "500 28px system-ui, sans-serif";
  ctx.fillText(`LEVEL TESTED: ${level}   ·   ESTIMATED LEVEL: ${estLevel}`, cardX + 60, y);

  y += 70;
  const catsToShow = byCategory.filter((c) => c.of > 0);
  const barW = cardW - 120;
  for (const c of catsToShow) {
    y += 20;
    ctx.fillStyle = "#3F4460";
    ctx.font = "600 30px system-ui, sans-serif";
    ctx.fillText(c.label, cardX + 60, y);
    ctx.textAlign = "right";
    ctx.fillText(`${c.pct}%`, cardX + 60 + barW, y);
    ctx.textAlign = "left";
    y += 22;
    ctx.fillStyle = "#EEF1FA";
    ctx.beginPath();
    ctx.roundRect(cardX + 60, y, barW, 20, 10);
    ctx.fill();
    ctx.fillStyle = BLUE;
    ctx.beginPath();
    ctx.roundRect(cardX + 60, y, barW * (c.pct / 100), 20, 10);
    ctx.fill();
    y += 60;
  }

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "500 26px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Find your English level — take the test yourself", W / 2, H - 70);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}

const CONFETTI_COLORS = [BLUE, "#7C97FF", "#FFC24B", "#2FAE6B", "#FF7A7A"];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: 5 + Math.random() * 90,
        delay: Math.random() * 0.4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.random() * 360,
      })),
    []
  );
  return (
    <div className="absolute inset-x-0 top-0 h-0 overflow-visible pointer-events-none">
      {pieces.map((p, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function ResultsScreen({ session, onReview, onNewTest, onChooseLevel, onHome }) {
  const { questions, answers, config } = session;
  const total = questions.length;
  const { correctCount, pct } = computeScore(questions, answers);
  const estLevel = estimateLevel(config.level, pct);

  const byCategory = CATEGORIES.map((cat) => {
    const qs = questions
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => q.category === cat.id);
    const catCorrect = qs.reduce((sum, { q, i }) => {
      if (answers[i] !== q.correct) return sum;
      return sum + 1;
    }, 0);
    const p = qs.length ? Math.round((catCorrect / qs.length) * 100) : 0;
    return { ...cat, correct: catCorrect, of: qs.length, pct: p };
  });

  const canvasRef = useRef(null);
  const [shareState, setShareState] = useState("idle"); // idle | working | done
  const [showExplain, setShowExplain] = useState(false);

  async function handleShare() {
    setShareState("working");
    try {
      const dataUrl = drawShareCard(canvasRef.current, {
        pct,
        correctCount,
        total,
        level: config.level,
        estLevel,
        byCategory,
      });
      const text = buildShareText(session, pct, correctCount, total, estLevel, byCategory);

      let sharedAsFile = false;
      if (navigator.canShare) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], "english-test-result.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "English Test Result", text });
            sharedAsFile = true;
          }
        } catch {
          // user cancelled or file share unsupported — fall through to fallback below
        }
      }

      if (!sharedAsFile) {
        if (navigator.share) {
          try {
            await navigator.share({ title: "English Test Result", text });
          } catch {
            // cancelled — still offer the image download below
          }
        }
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "english-test-result.png";
        link.click();
        if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(text);
          } catch {
            /* clipboard not available, image download still happened */
          }
        }
      }
      setShareState("done");
      setTimeout(() => setShareState("idle"), 2200);
    } catch {
      setShareState("idle");
    }
  }

  return (
    <div className="flex flex-col h-full">
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex-1 overflow-y-auto px-5 md:px-8 pt-8 pb-4 md:max-w-[640px] md:mx-auto md:w-full">
        <div className="flex flex-col items-center text-center relative">
          <Confetti />
          <div
            className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${BLUE}, ${BLUE_LIGHT})` }}
          >
            <Trophy className="text-white" size={28} />
          </div>
          <h2 className="text-[20px] md:text-[24px] font-bold text-[#1B1E2B] dark:text-[#F0F2FA] mt-4">Test Completed!</h2>
          <p className="text-[13px] md:text-[14px] text-[#8890AE] dark:text-[#8A93B8] mt-1">Here are your results</p>
          <button
            onClick={handleShare}
            disabled={shareState === "working"}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold mt-3 px-3.5 py-1.5 rounded-full disabled:opacity-60 bg-[#EEF1FE] dark:bg-[#20264A]"
            style={{ color: BLUE }}
          >
            {shareState === "done" ? (
              <>
                <Check size={14} /> Shared
              </>
            ) : (
              <>
                <Share2 size={14} /> {shareState === "working" ? "Preparing..." : "Share Result"}
              </>
            )}
          </button>
        </div>

        <div className="rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] p-4 md:p-6 mt-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[12px] text-[#8890AE] dark:text-[#8A93B8]">Your score</p>
              <p className="text-[28px] md:text-[34px] font-bold text-[#1B1E2B] dark:text-[#F0F2FA] mt-0.5">
                {correctCount}
                <span className="text-[16px] text-[#8890AE] dark:text-[#8A93B8] font-medium"> / {total}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-[#8890AE] dark:text-[#8A93B8]">
                Level Tested : <span className="font-bold text-[#1B1E2B] dark:text-[#F0F2FA]">{config.level}</span>
              </p>
              <p className="text-[26px] md:text-[32px] font-bold mt-0.5" style={{ color: BLUE }}>
                {pct}%
              </p>
            </div>
          </div>
          <div className="w-full h-2 bg-[#EEF1FA] dark:bg-[#232A47] rounded-full mt-3 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: BLUE }} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] p-4 md:p-5 mt-3 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#EEF1FE] dark:bg-[#20264A]">
            <Sparkles size={18} style={{ color: BLUE }} />
          </div>
          <div>
            <p className="text-[12px] text-[#8890AE] dark:text-[#8A93B8]">Your estimated level</p>
            <p className="text-[15px] md:text-[17px] font-bold text-[#1B1E2B] dark:text-[#F0F2FA]">
              {estLevel} · {levelName(estLevel)}
            </p>
            <button
              onClick={() => setShowExplain((v) => !v)}
              className="text-[12.5px] underline mt-1"
              style={{ color: BLUE }}
            >
              {showExplain ? "Read Less" : "Read More"}
            </button>
            {showExplain && (
              <p className="text-[12.5px] text-[#6B7190] dark:text-[#9AA3C4] leading-relaxed mt-2">
                {estimateExplanation(config.level, pct, estLevel)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[13px] font-semibold text-[#1B1E2B] dark:text-[#F0F2FA] mb-3">Breakdown by category</p>
          <div className="flex flex-col gap-2.5">
            {byCategory.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] p-3">
                <c.icon size={16} style={{ color: BLUE }} className="shrink-0" />
                <span className="text-[13px] text-[#3F4460] dark:text-[#C5CBE8] w-20 shrink-0">{c.label}</span>
                <div className="flex-1 h-2 bg-[#EEF1FA] dark:bg-[#232A47] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: BLUE }} />
                </div>
                <span className="text-[12px] font-semibold text-[#6B7190] dark:text-[#9AA3C4] w-14 text-right">
                  {c.of ? `${c.pct}%` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 md:px-8 pb-6 pt-3 flex flex-col gap-2.5">
        <SecondaryButton onClick={onReview}>
          Review Answers <ChevronRight size={16} />
        </SecondaryButton>
        <GradientButton onClick={onNewTest}>
          New Test <RotateCcw size={16} />
        </GradientButton>
        <button
          onClick={onHome}
          className="flex items-center justify-center gap-1.5 text-[13px] font-semibold mt-1 text-[#6B7190] dark:text-[#9AA3C4]"
        >
          <Home size={14} /> Back to Home
        </button>
        <button onClick={onChooseLevel} className="text-[13px] font-medium" style={{ color: BLUE }}>
          Try a different level
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SCREEN: REVIEW                                                      */
/* ------------------------------------------------------------------ */

function ReviewScreen({ session, onBack, onTryAgain, onChooseLevel }) {
  const { questions, answers } = session;
  const [tab, setTab] = useState("all");
  const [openIdx, setOpenIdx] = useState(null);

  const items = questions.map((q, i) => ({
    q,
    i,
    isCorrect: answers[i] === q.correct,
  }));
  const filtered =
    tab === "all" ? items : tab === "correct" ? items.filter((x) => x.isCorrect) : items.filter((x) => !x.isCorrect);

  const correctTotal = items.filter((x) => x.isCorrect).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 md:px-8 pt-5 pb-3">
        <button onClick={onBack} className="text-[#1B1E2B] dark:text-[#F0F2FA]">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-[18px] font-bold text-[#1B1E2B] dark:text-[#F0F2FA]">Review Answers</h2>
      </div>

      <div className="px-5 md:px-8 flex gap-2">
        {[
          { id: "all", label: `All (${items.length})` },
          { id: "correct", label: `Correct (${correctTotal})` },
          { id: "incorrect", label: `Incorrect (${items.length - correctTotal})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-full border"
            style={{
              borderColor: tab === t.id ? BLUE : "#EAEDF9",
              background: tab === t.id ? BLUE : "#fff",
              color: tab === t.id ? "#fff" : "#6B7190",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 md:px-8 mt-4 flex flex-col gap-2.5">
        {filtered.map(({ q, i, isCorrect }) => {
          const open = openIdx === i;
          return (
            <div
              key={q.uid}
              className="rounded-2xl border overflow-hidden"
              style={{
                borderColor: isCorrect ? "#BFEBD2" : "#F7C6C1",
                background: isCorrect ? "#F3FBF6" : "#FDF3F2",
              }}
            >
              <button
                onClick={() => setOpenIdx(open ? null : i)}
                className="w-full flex items-start gap-3 p-3.5 text-left"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: isCorrect ? "#2FAE6B" : "#E0483E" }}
                >
                  {isCorrect ? (
                    <CheckCircle2 size={16} className="text-white" />
                  ) : (
                    <XCircle size={16} className="text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium text-[#1B1E2B] dark:text-[#F0F2FA] leading-snug">
                    {q.q}
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: isCorrect ? "#1E8F55" : "#C43A31" }}>
                    Your answer:{" "}
                    <span className="font-semibold">
                      {answers[i] !== null
                        ? `${String.fromCharCode(65 + answers[i])}) ${q.options[answers[i]]}`
                        : "No answer"}
                    </span>
                  </p>
                  {!isCorrect && (
                    <p className="text-[12px] mt-0.5 font-semibold" style={{ color: "#1E8F55" }}>
                      Correct answer: {String.fromCharCode(65 + q.correct)}) {q.options[q.correct]}
                    </p>
                  )}
                </div>
                <ChevronRight
                  size={16}
                  className="text-[#C3C8DE] mt-1 shrink-0 transition-transform"
                  style={{ transform: open ? "rotate(90deg)" : "none" }}
                />
              </button>
              {open && (
                <div className="px-3.5 pb-3.5 -mt-1">
                  <div className="rounded-xl p-3 text-[12.5px] text-[#5B6180] leading-relaxed bg-white dark:bg-[#161B2E]/70">
                    {q.explanation}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div className="h-2" />
      </div>

      <div className="px-5 md:px-8 pb-6 pt-3 flex flex-col gap-2.5">
        <GradientButton onClick={onTryAgain}>
          Try Again <RotateCcw size={16} />
        </GradientButton>
        <button onClick={onChooseLevel} className="text-[13px] font-medium" style={{ color: BLUE }}>
          Choose a different level
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SCREEN: ADMIN (add questions in bulk from a JSON file)             */
/* ------------------------------------------------------------------ */

const ADMIN_TEMPLATE = `[
  {
    "level": "A1",
    "category": "grammar",
    "q": "He ___ a teacher.",
    "options": ["is", "am", "are", "be"],
    "correct": 0,
    "explanation": "'He' takes 'is' with the verb to be."
  },
  {
    "level": "B2",
    "category": "reading",
    "passage": "A short 2-4 sentence passage goes here.",
    "q": "A question about the passage.",
    "options": ["A", "B", "C", "D"],
    "correct": 2,
    "explanation": "Why the correct option is right."
  }
]`;

function validateQuestionClientSide(item, index) {
  const validLevels = LEVELS.map((l) => l.id);
  const validCategories = CATEGORY_META.map((c) => c.id);
  if (!item || typeof item !== "object") return `Item ${index + 1}: not an object`;
  if (!validLevels.includes(item.level)) return `Item ${index + 1}: invalid level "${item.level}"`;
  if (!validCategories.includes(item.category)) return `Item ${index + 1}: invalid category "${item.category}"`;
  if (typeof item.q !== "string" || !item.q.trim()) return `Item ${index + 1}: missing question text`;
  if (!Array.isArray(item.options) || item.options.length !== 4)
    return `Item ${index + 1}: needs exactly 4 options`;
  if (item.options.some((o) => typeof o !== "string" || !o.trim()))
    return `Item ${index + 1}: all 4 options must be non-empty text`;
  if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct > 3)
    return `Item ${index + 1}: "correct" must be a number 0-3`;
  if (typeof item.explanation !== "string" || !item.explanation.trim())
    return `Item ${index + 1}: missing explanation`;
  if (item.category === "reading" && (typeof item.passage !== "string" || !item.passage.trim()))
    return `Item ${index + 1}: reading questions need a "passage"`;
  return null;
}

function AdminScreen({ onBack }) {
  const [password, setPassword] = useState("");
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null); // { valid: [], errors: [] }
  const [status, setStatus] = useState("idle"); // idle | uploading | done | error
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const ADMIN_SECTIONS_KEY = "englishTest.adminSections.v1";
  const DEFAULT_SECTIONS = [
    { id: "bank", name: "Question Bank", builtin: true, enabled: true },
    { id: "updates", name: "Updates", builtin: true, enabled: true },
  ];
  const [sections, setSections] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_SECTIONS;
    try {
      const saved = JSON.parse(localStorage.getItem(ADMIN_SECTIONS_KEY));
      if (Array.isArray(saved) && saved.some((s) => s.id === "bank")) {
        // Make sure the built-in Updates section exists even for admins
        // who saved their sidebar before this feature was added.
        if (!saved.some((s) => s.id === "updates")) {
          const bankIdx = saved.findIndex((s) => s.id === "bank");
          saved.splice(bankIdx + 1, 0, { id: "updates", name: "Updates", builtin: true, enabled: true });
        }
        return saved;
      }
    } catch {
      /* fall through to default */
    }
    return DEFAULT_SECTIONS;
  });
  const [activeSection, setActiveSection] = useState("bank");
  const [newSectionName, setNewSectionName] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ADMIN_SECTIONS_KEY, JSON.stringify(sections));
  }, [sections]);

  // ---- Login gate ----
  const [authed, setAuthed] = useState(false);
  const [loginPw, setLoginPw] = useState("");
  const [loginState, setLoginState] = useState("idle"); // idle | checking | error
  const [loginError, setLoginError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    if (!loginPw.trim()) return;
    setLoginState("checking");
    setLoginError("");
    try {
      const res = await fetch("/api/add-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPw, questions: [] }),
      });
      if (res.status === 401) {
        setLoginState("error");
        setLoginError("Wrong password");
        return;
      }
      // Any other response (400 "no questions", 200, etc.) means the
      // password itself was accepted by the server.
      setPassword(loginPw);
      setAuthed(true);
    } catch (err) {
      setLoginState("error");
      setLoginError("Couldn't reach the server — check your connection and try again.");
    }
  }

  function addSection() {
    const name = newSectionName.trim();
    if (!name) return;
    const id = `custom-${Date.now()}`;
    setSections((prev) => [...prev, { id, name, builtin: false, enabled: true }]);
    setNewSectionName("");
    setActiveSection(id);
  }

  function toggleSectionEnabled(id) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }

  // ---- Question Bank file manager (view / edit / download / clear) ----
  const [bankInfo, setBankInfo] = useState(null); // { total, counts, sizeBytes }
  const [bankContent, setBankContent] = useState("");
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState("");
  const [bankEditing, setBankEditing] = useState(false);
  const [bankEditText, setBankEditText] = useState("");
  const [bankSaveState, setBankSaveState] = useState("idle"); // idle | saving | error
  const [bankSaveMsg, setBankSaveMsg] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  async function fetchBankInfo() {
    setBankLoading(true);
    setBankError("");
    try {
      const res = await fetch("/api/bank-file");
      const data = await res.json();
      if (!res.ok) {
        setBankError(data.error || "Couldn't load the question bank file.");
        return;
      }
      setBankInfo({ total: data.total, counts: data.counts, sizeBytes: data.sizeBytes });
      setBankContent(data.content);
    } catch (e) {
      setBankError("Couldn't reach the server.");
    } finally {
      setBankLoading(false);
    }
  }

  useEffect(() => {
    if (authed && activeSection === "bank" && !bankInfo && !bankLoading) fetchBankInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, activeSection]);

  function handleDownloadBank() {
    const blob = new Blob([bankContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "questions.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function openBankEditor() {
    setBankEditText(bankContent);
    setBankEditing(true);
    setBankSaveState("idle");
    setBankSaveMsg("");
  }

  async function saveBankEdit(newContentString) {
    setBankSaveState("saving");
    setBankSaveMsg("");
    try {
      const res = await fetch("/api/bank-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, content: newContentString }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBankSaveState("error");
        setBankSaveMsg(data.error || "Save failed");
        return;
      }
      setBankInfo({ total: data.total, counts: data.counts, sizeBytes: bankInfo?.sizeBytes });
      setBankContent(newContentString);
      setBankEditing(false);
      setConfirmClear(false);
      setBankSaveState("idle");
    } catch (e) {
      setBankSaveState("error");
      setBankSaveMsg(String(e));
    }
  }

  // ---- Updates panel (push a new file straight to GitHub, no terminal) ----
  const [updatePath, setUpdatePath] = useState("src/App.jsx");
  const [updateContent, setUpdateContent] = useState("");
  const [updateState, setUpdateState] = useState("idle"); // idle | publishing | done | error
  const [updateResult, setUpdateResult] = useState(null);
  const updateFileInputRef = useRef(null);

  function handleUpdateFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUpdateContent(String(reader.result));
    reader.readAsText(file);
  }

  async function publishUpdate() {
    if (!updatePath.trim() || !updateContent.trim()) return;
    setUpdateState("publishing");
    setUpdateResult(null);
    try {
      const res = await fetch("/api/deploy-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, path: updatePath.trim(), content: updateContent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUpdateState("error");
        setUpdateResult({ error: data.error || "Publish failed" });
        return;
      }
      setUpdateState("done");
      setUpdateResult(data);
    } catch (e) {
      setUpdateState("error");
      setUpdateResult({ error: String(e) });
    }
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result));
    reader.readAsText(file);
  }

  function handleValidate() {
    setResult(null);
    setStatus("idle");
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      setParsed({ valid: [], errors: [`Couldn't parse JSON: ${e.message}`] });
      return;
    }
    if (!Array.isArray(json)) {
      setParsed({ valid: [], errors: ["The file must contain a JSON array of question objects."] });
      return;
    }
    const errors = [];
    const valid = [];
    json.forEach((item, i) => {
      const err = validateQuestionClientSide(item, i);
      if (err) errors.push(err);
      else valid.push(item);
    });
    setParsed({ valid, errors });
  }

  async function handleUpload() {
    if (!parsed || parsed.valid.length === 0) return;
    setStatus("uploading");
    setResult(null);
    try {
      const res = await fetch("/api/add-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, questions: parsed.valid }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setResult({ error: data.error || "Upload failed", detail: data.detail || data.details });
        return;
      }
      setStatus("done");
      setResult(data);
    } catch (e) {
      setStatus("error");
      setResult({ error: String(e) });
    }
  }

  if (!authed) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-6">
        <div className="w-full max-w-[340px]">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 bg-[#EEF1FE] dark:bg-[#20264A]">
              <Lock size={22} style={{ color: BLUE }} />
            </div>
            <h2 className="text-[18px] font-bold text-[#1B1E2B] dark:text-[#F0F2FA]">Admin Login</h2>
            <p className="text-[12.5px] text-[#8890AE] dark:text-[#8A93B8] mt-1">Enter the admin password to continue</p>
          </div>
          <form onSubmit={handleLogin}>
            <div className="flex items-center gap-2 rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] px-3.5 py-3 mb-3">
              <Lock size={16} className="text-[#8890AE] dark:text-[#8A93B8]" />
              <input
                type="password"
                autoFocus
                value={loginPw}
                onChange={(e) => setLoginPw(e.target.value)}
                placeholder="Admin password"
                className="flex-1 outline-none text-[14px] bg-transparent"
              />
            </div>
            {loginState === "error" && (
              <p className="text-[12px] text-[#C43A31] mb-3 flex items-center gap-1.5">
                <AlertTriangle size={13} /> {loginError}
              </p>
            )}
            <GradientButton type="submit" disabled={loginState === "checking" || !loginPw.trim()}>
              {loginState === "checking" ? "Checking..." : "Continue"}
            </GradientButton>
          </form>
          <button onClick={onBack} className="text-[13px] font-medium mt-4 w-full text-center" style={{ color: BLUE }}>
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 md:px-8 pt-5 pb-3">
        <button onClick={onBack} className="text-[#1B1E2B] dark:text-[#F0F2FA]">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-[18px] font-bold text-[#1B1E2B] dark:text-[#F0F2FA]">Admin</h2>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible px-5 md:px-3 md:w-[220px] md:border-r border-b md:border-b-0 border-[#EAEDF9] dark:border-[#2A3050] py-3 shrink-0">
          {sections.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => s.enabled !== false && setActiveSection(s.id)}
                disabled={s.enabled === false}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-semibold whitespace-nowrap disabled:opacity-40"
                style={{
                  background: activeSection === s.id && s.enabled !== false ? BLUE : "transparent",
                  color: activeSection === s.id && s.enabled !== false ? "#fff" : "#6B7190",
                }}
              >
                {s.id === "bank" ? "📦" : s.id === "updates" ? "🚀" : "📄"} {s.name}
              </button>
              {!s.builtin && (
                <button
                  onClick={() => toggleSectionEnabled(s.id)}
                  title={s.enabled === false ? "Turn on" : "Turn off"}
                  className="w-8 h-5 rounded-full relative shrink-0"
                  style={{ background: s.enabled === false ? "#E2E6F0" : BLUE }}
                >
                  <div
                    className="w-3.5 h-3.5 bg-white dark:bg-[#161B2E] rounded-full absolute top-[3px] transition-all"
                    style={{ left: s.enabled === false ? "3px" : "16px" }}
                  />
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-1.5 md:mt-2 md:pt-2 md:border-t border-[#EAEDF9] dark:border-[#2A3050] shrink-0">
            <input
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="e.g. Lessons"
              className="w-28 md:w-auto md:flex-1 border border-[#EAEDF9] dark:border-[#2A3050] rounded-lg px-2 py-1.5 text-[12px] outline-none"
            />
            <button
              onClick={addSection}
              className="w-7 h-7 rounded-lg text-white flex items-center justify-center shrink-0"
              style={{ background: BLUE }}
            >
              +
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 md:px-8 py-4">
          {activeSection === "updates" ? (
            <>
              <div className="rounded-2xl p-3.5 mb-4 flex gap-2.5 bg-[#F5F6FB] dark:bg-[#1B2140]">
                <ShieldCheck size={18} style={{ color: BLUE }} className="shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#5B6180] dark:text-[#C5CBE8] leading-relaxed">
                  Paste or upload a full file's content (like an updated App.jsx from Claude) and the
                  exact path it belongs at. Publishing commits it straight to your GitHub repo — no
                  terminal needed. Allowed paths start with <code>src/</code>, <code>api/</code>, or{" "}
                  <code>netlify/functions/</code>.
                </p>
              </div>

              <p className="text-[13px] font-semibold text-[#1B1E2B] dark:text-[#F0F2FA] mb-2">File path</p>
              <input
                value={updatePath}
                onChange={(e) => setUpdatePath(e.target.value)}
                placeholder="src/App.jsx"
                className="w-full rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] bg-white dark:bg-[#161B2E] px-3.5 py-3 text-[13px] font-mono outline-none focus:border-[#3F66F5] mb-4"
              />

              <p className="text-[13px] font-semibold text-[#1B1E2B] dark:text-[#F0F2FA] mb-2">File content</p>
              <div className="flex gap-2 mb-2">
                <SecondaryButton onClick={() => updateFileInputRef.current?.click()} className="!py-2.5">
                  <Upload size={15} /> Upload file
                </SecondaryButton>
                <input
                  ref={updateFileInputRef}
                  type="file"
                  onChange={handleUpdateFile}
                  className="hidden"
                />
              </div>
              <textarea
                value={updateContent}
                onChange={(e) => setUpdateContent(e.target.value)}
                placeholder="Paste the full new file content here…"
                rows={12}
                className="w-full rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] bg-white dark:bg-[#161B2E] p-3.5 text-[12px] font-mono outline-none focus:border-[#3F66F5]"
              />

              {updateResult && (
                <div
                  className="mt-4 rounded-2xl p-3.5 text-[12.5px] leading-relaxed"
                  style={{
                    background: updateState === "error" ? "#FDF3F2" : "#F3FBF6",
                    color: updateState === "error" ? "#C43A31" : "#1E8F55",
                  }}
                >
                  {updateState === "error" ? (
                    <p className="font-semibold">{updateResult.error}</p>
                  ) : (
                    <>
                      <p className="font-semibold">
                        {updateResult.created ? "Created" : "Updated"} {updateResult.path}
                      </p>
                      <p className="mt-1 opacity-80">{updateResult.note}</p>
                    </>
                  )}
                </div>
              )}

              <div className="mt-5">
                <GradientButton
                  onClick={publishUpdate}
                  disabled={!updatePath.trim() || !updateContent.trim() || updateState === "publishing"}
                >
                  {updateState === "publishing" ? "Publishing..." : "Publish Update"}
                </GradientButton>
              </div>
            </>
          ) : activeSection !== "bank" ? (
            <div className="text-center py-16 text-[13.5px] text-[#8890AE] dark:text-[#8A93B8]">
              📄 Content management for "{sections.find((s) => s.id === activeSection)?.name}" isn't built
              yet — this just reserves its spot in the sidebar for later.
            </div>
          ) : (
            <>
              <p className="text-[13px] font-semibold text-[#1B1E2B] dark:text-[#F0F2FA] mb-2">Current file</p>
              {bankLoading && !bankInfo && (
                <div className="flex items-center gap-2 text-[12.5px] text-[#8890AE] dark:text-[#8A93B8] rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] p-4 mb-4">
                  <Loader2 size={14} className="animate-spin" /> Loading questions.json…
                </div>
              )}
              {bankError && (
                <div className="rounded-2xl border border-[#F7C6C1] bg-[#FDF3F2] p-3.5 mb-4 text-[12.5px] text-[#C43A31] flex items-center gap-2">
                  <AlertTriangle size={14} /> {bankError}
                  <button onClick={fetchBankInfo} className="ml-auto underline font-semibold">Retry</button>
                </div>
              )}
              {bankInfo && (
                <div className="rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] p-4 mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#EEF1FE] dark:bg-[#20264A]">
                      🗂️
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <p className="text-[13.5px] font-bold text-[#1B1E2B] dark:text-[#F0F2FA]">questions.json</p>
                      <p className="text-[11.5px] text-[#8890AE] dark:text-[#8A93B8]">
                        {bankInfo.total} questions · {Math.round((bankInfo.sizeBytes || 0) / 1024)} KB
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <SecondaryButton onClick={handleDownloadBank} className="!py-2 !px-3 text-[12px]">
                        <Download size={13} /> Download
                      </SecondaryButton>
                      <SecondaryButton onClick={openBankEditor} className="!py-2 !px-3 text-[12px]">
                        <ClipboardList size={13} /> Edit inline
                      </SecondaryButton>
                      <button
                        onClick={() => setConfirmClear(true)}
                        className="flex items-center gap-1 text-[12px] font-semibold px-3 py-2 rounded-2xl border"
                        style={{ color: "#C43A31", borderColor: "#F7C6C1" }}
                      >
                        <Trash2 size={13} /> Clear all
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8890AE] dark:text-[#8A93B8] mt-3">
                    {Object.entries(bankInfo.counts || {}).map(([lvl, n]) => `${lvl}: ${n}`).join(" · ")}
                  </p>
                </div>
              )}

              {confirmClear && (
                <div className="rounded-2xl border border-[#F7C6C1] bg-[#FDF3F2] p-4 mb-4">
                  <p className="text-[13px] font-semibold text-[#C43A31]">
                    This deletes every question in the live bank. This can't be undone from here — download
                    a backup first if you're not sure.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => saveBankEdit("{}")}
                      disabled={bankSaveState === "saving"}
                      className="text-[12.5px] font-bold px-4 py-2 rounded-xl text-white disabled:opacity-60"
                      style={{ background: "#E0483E" }}
                    >
                      {bankSaveState === "saving" ? "Clearing..." : "Yes, clear everything"}
                    </button>
                    <SecondaryButton onClick={() => setConfirmClear(false)} className="!py-2 !px-4 text-[12.5px]">
                      Cancel
                    </SecondaryButton>
                  </div>
                  {bankSaveState === "error" && (
                    <p className="text-[12px] text-[#C43A31] mt-2">{bankSaveMsg}</p>
                  )}
                </div>
              )}

              {bankEditing && (
                <div className="rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] p-4 mb-5">
                  <p className="text-[12.5px] font-semibold text-[#1B1E2B] dark:text-[#F0F2FA] mb-2">
                    Editing questions.json directly — must stay valid JSON in the same shape.
                  </p>
                  <textarea
                    value={bankEditText}
                    onChange={(e) => setBankEditText(e.target.value)}
                    rows={14}
                    className="w-full rounded-xl border border-[#EAEDF9] dark:border-[#2A3050] p-3 text-[11.5px] font-mono outline-none focus:border-[#3F66F5]"
                  />
                  {bankSaveState === "error" && (
                    <p className="text-[12px] text-[#C43A31] mt-2 flex items-center gap-1.5">
                      <AlertTriangle size={13} /> {bankSaveMsg}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <GradientButton
                      onClick={() => saveBankEdit(bankEditText)}
                      disabled={bankSaveState === "saving"}
                      className="!py-2.5 flex-none px-6"
                    >
                      {bankSaveState === "saving" ? "Saving..." : "Save changes"}
                    </GradientButton>
                    <SecondaryButton onClick={() => setBankEditing(false)} className="!py-2.5 px-6 flex-none">
                      Cancel
                    </SecondaryButton>
                  </div>
                </div>
              )}

              <div className="border-t border-[#EAEDF9] dark:border-[#2A3050] my-5" />

              <p className="text-[13px] font-semibold text-[#1B1E2B] dark:text-[#F0F2FA] mb-2">Add new questions</p>
              <div className="rounded-2xl p-3.5 mb-4 flex gap-2.5 bg-[#F5F6FB] dark:bg-[#1B2140]">
                <ShieldCheck size={18} style={{ color: BLUE }} className="shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#5B6180] leading-relaxed">
                  Upload a JSON file of new questions to merge into the bank above. They go live for
                  every visitor after the next auto-deploy (usually under a minute).
                </p>
              </div>

              <p className="text-[13px] font-semibold text-[#1B1E2B] dark:text-[#F0F2FA] mb-2">Questions JSON</p>
              <div className="flex gap-2 mb-2">
                <SecondaryButton onClick={() => fileInputRef.current?.click()} className="!py-2.5">
                  <Upload size={15} /> Upload .json file
                </SecondaryButton>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFile}
                  className="hidden"
                />
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={ADMIN_TEMPLATE}
                rows={10}
                className="w-full rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] p-3.5 text-[12px] font-mono outline-none focus:border-[#3F66F5]"
              />
              <button
                onClick={() => setText(ADMIN_TEMPLATE)}
                className="text-[12px] font-medium mt-1.5"
                style={{ color: BLUE }}
              >
                Fill in an example template
              </button>

              <div className="mt-4">
                <SecondaryButton onClick={handleValidate} disabled={!text.trim()}>
                  Validate
                </SecondaryButton>
              </div>

              {parsed && (
                <div className="mt-4 rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] p-3.5">
                  <p className="text-[13px] font-semibold text-[#1B1E2B] dark:text-[#F0F2FA]">
                    {parsed.valid.length} valid · {parsed.errors.length} invalid
                  </p>
                  {parsed.errors.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1 max-h-40 overflow-y-auto">
                      {parsed.errors.map((e, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11.5px] text-[#C43A31]">
                          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                          <span>{e}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {result && (
                <div
                  className="mt-4 rounded-2xl p-3.5 text-[12.5px] leading-relaxed"
                  style={{
                    background: status === "error" ? "#FDF3F2" : "#F3FBF6",
                    color: status === "error" ? "#C43A31" : "#1E8F55",
                  }}
                >
                  {status === "error" ? (
                    <>
                      <p className="font-semibold">{result.error}</p>
                      {result.detail && <p className="mt-1 opacity-80">{JSON.stringify(result.detail)}</p>}
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">
                        Added {result.added} question{result.added === 1 ? "" : "s"}
                        {result.skippedDuplicates ? ` (skipped ${result.skippedDuplicates} duplicates)` : ""}.
                      </p>
                      {result.totals && (
                        <p className="mt-1 opacity-80">
                          New totals — {Object.entries(result.totals).map(([lvl, n]) => `${lvl}: ${n}`).join(" · ")}
                        </p>
                      )}
                      <p className="mt-1 opacity-80">{result.note}</p>
                    </>
                  )}
                </div>
              )}

              <div className="mt-5">
                <GradientButton
                  onClick={handleUpload}
                  disabled={!parsed || parsed.valid.length === 0 || !password || status === "uploading"}
                >
                  {status === "uploading" ? "Uploading..." : `Add ${parsed?.valid.length || 0} Question(s)`}
                </GradientButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SCREEN: HISTORY (full)                                             */
/* ------------------------------------------------------------------ */

function HistoryScreen({ history, onBack }) {
  const reversed = [...history].reverse();
  const avg = history.length ? Math.round(history.reduce((s, h) => s + h.pct, 0) / history.length) : 0;
  const best = history.length ? Math.max(...history.map((h) => h.pct)) : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 md:px-8 pt-5 pb-3">
        <button onClick={onBack} className="text-[#1B1E2B] dark:text-[#F0F2FA]">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h2 className="text-[18px] font-bold text-[#1B1E2B] dark:text-[#F0F2FA]">Test History</h2>
          <p className="text-[12px] text-[#8890AE] dark:text-[#8A93B8]">Every test you've taken, most recent first</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 md:px-8 pb-6">
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <div className="rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] p-3 text-center">
            <p className="text-[20px] font-bold text-[#1B1E2B] dark:text-[#F0F2FA]">{history.length}</p>
            <p className="text-[11px] text-[#8890AE] dark:text-[#8A93B8]">Tests taken</p>
          </div>
          <div className="rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] p-3 text-center">
            <p className="text-[20px] font-bold text-[#1B1E2B] dark:text-[#F0F2FA]">{avg}%</p>
            <p className="text-[11px] text-[#8890AE] dark:text-[#8A93B8]">Average score</p>
          </div>
          <div className="rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] p-3 text-center">
            <p className="text-[20px] font-bold text-[#1B1E2B] dark:text-[#F0F2FA]">{best}%</p>
            <p className="text-[11px] text-[#8890AE] dark:text-[#8A93B8]">Best score</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {reversed.map((h, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] p-3">
              <span className="text-[12.5px] text-[#6B7190] dark:text-[#9AA3C4] w-28 shrink-0">
                {formatDate(h.date)} · {h.level}
              </span>
              <div className="flex-1 h-2 bg-[#EEF1FA] dark:bg-[#232A47] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${h.pct}%`, background: BLUE }} />
              </div>
              <span className="text-[13px] font-semibold w-10 text-right">{h.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SCREEN: PROGRESS (full)                                             */
/* ------------------------------------------------------------------ */

function ProgressScreen({ history, onBack }) {
  const order = ["A1", "A2", "B1", "B2", "C1"];
  const last = history[history.length - 1];
  const currentLevel = last?.estLevel || "A1";
  const first = history[0];
  const recent = history.slice(-10);
  const maxPct = Math.max(100, ...recent.map((h) => h.pct));

  let trend = "same";
  if (first && last && first.estLevel) {
    const diff = order.indexOf(currentLevel) - order.indexOf(first.estLevel);
    trend = diff > 0 ? "up" : diff < 0 ? "down" : "same";
  }
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "#2FAE6B" : trend === "down" ? "#E0483E" : "#8890AE";
  const trendBg = trend === "up" ? "#F3FBF6" : trend === "down" ? "#FDF3F2" : "#F5F6FB";
  const trendText =
    trend === "up"
      ? `Improved from ${first.estLevel} to ${currentLevel} over your last ${history.length} test${history.length > 1 ? "s" : ""}.`
      : trend === "down"
      ? `Dropped from ${first.estLevel} to ${currentLevel} — a bit more practice should help you climb back up.`
      : first
      ? `Holding steady at ${currentLevel} across your tests so far.`
      : "Take a test to start tracking your progress.";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 md:px-8 pt-5 pb-3">
        <button onClick={onBack} className="text-[#1B1E2B] dark:text-[#F0F2FA]">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h2 className="text-[18px] font-bold text-[#1B1E2B] dark:text-[#F0F2FA]">Your Progress</h2>
          <p className="text-[12px] text-[#8890AE] dark:text-[#8A93B8]">Where you stand across the CEFR scale</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 md:px-8 pb-6 md:max-w-[720px] md:mx-auto md:w-full">
        <div className="flex gap-1.5 mb-4">
          {order.map((lvl) => (
            <div
              key={lvl}
              className="flex-1 text-center py-3 rounded-xl font-bold text-[13px]"
              style={{
                background: lvl === currentLevel ? BLUE : "#F5F6FB",
                color: lvl === currentLevel ? "#fff" : "#8890AE",
              }}
            >
              {lvl}
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-4 mb-5 flex items-center gap-3" style={{ background: trendBg }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white dark:bg-[#161B2E]">
            <TrendIcon size={18} style={{ color: trendColor }} />
          </div>
          <p className="text-[12.5px] leading-relaxed" style={{ color: trendColor }}>
            {trendText}
          </p>
        </div>

        {recent.length > 0 && (
          <>
            <p className="text-[13px] font-semibold text-[#1B1E2B] dark:text-[#F0F2FA] mb-3">Score trend</p>
            <div className="flex items-end gap-2 h-32 mb-2 px-1">
              {recent.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                  <span className="text-[10px] text-[#8890AE] dark:text-[#8A93B8]">{h.pct}%</span>
                  <div
                    className="w-full rounded-t-md"
                    style={{ height: `${Math.max(4, (h.pct / maxPct) * 100)}%`, background: BLUE }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 px-1 mb-6">
              {recent.map((h, i) => (
                <span key={i} className="flex-1 text-center text-[10px] text-[#8890AE] dark:text-[#8A93B8]">
                  {formatDate(h.date)}
                </span>
              ))}
            </div>
          </>
        )}

        <p className="text-[13px] font-semibold text-[#1B1E2B] dark:text-[#F0F2FA] mb-2">Score history</p>
        <div className="flex flex-col gap-2">
          {[...history].reverse().map((h, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-[#EAEDF9] dark:border-[#2A3050] p-3">
              <span className="text-[12.5px] text-[#6B7190] dark:text-[#9AA3C4] w-24 shrink-0">
                {formatDate(h.date)}
              </span>
              <div className="flex-1 h-2 bg-[#EEF1FA] dark:bg-[#232A47] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${h.pct}%`, background: BLUE }} />
              </div>
              <span className="text-[13px] font-semibold w-10 text-right">{h.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  APP ROOT                                                            */
/* ------------------------------------------------------------------ */

export default function App() {
  const [screen, setScreen] = useState("home"); // home | setup | quiz | results | review | history | progress | admin
  const [quizConfig, setQuizConfig] = useState(null);
  const [session, setSession] = useState(null); // { questions, answers, config }
  const [history, setHistory] = useState([]);

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    setHistory(getHistory());
    if (typeof window !== "undefined") {
      if (new URLSearchParams(window.location.search).get("admin") === "1") {
        setScreen("admin");
      }
      const savedDark = localStorage.getItem("englishTest.darkMode") === "1";
      setDarkMode(savedDark);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("englishTest.darkMode", darkMode ? "1" : "0");
  }, [darkMode]);

  function handleStartTest(config) {
    setQuizConfig(config);
    setScreen("quiz");
  }

  function handleFinishQuiz(questions, answers) {
    const s = { questions, answers, config: quizConfig };
    setSession(s);
    const { correctCount, pct } = computeScore(questions, answers);
    const estLevel = estimateLevel(quizConfig.level, pct);
    addHistoryEntry({
      level: quizConfig.level,
      categories: quizConfig.categories,
      score: correctCount,
      total: questions.length,
      pct,
      estLevel,
    });
    setHistory(getHistory());
    setScreen("results");
  }

  return (
    <div
      className="w-full flex justify-center md:items-start relative overflow-hidden"
      style={{
        background: darkMode
          ? "linear-gradient(180deg, #0B0E1C 0%, #10142A 30%)"
          : "linear-gradient(180deg, #F7F9FF 0%, #FFFFFF 30%)",
        minHeight: "100vh",
      }}
    >
      <div className="hidden md:block pointer-events-none fixed -left-32 top-20 w-96 h-96 rounded-full opacity-30 blur-3xl animate-blob" style={{ background: darkMode ? "#3F66F5" : "#7C97FF" }} />
      <div className="hidden md:block pointer-events-none fixed -right-24 bottom-10 w-80 h-80 rounded-full opacity-20 blur-3xl animate-blob-slow" style={{ background: darkMode ? "#2E4FD1" : "#B7C2F5" }} />
      <div
        className="w-full bg-white dark:bg-[#161B2E] flex flex-col min-h-screen max-w-[430px] md:max-w-[760px] lg:max-w-[960px] md:my-8 md:rounded-3xl md:min-h-[88vh] relative z-10"
        style={{ boxShadow: "0 0 60px rgba(63,102,245,0.06)" }}
      >
        {screen === "home" && (
          <HomeScreen
            onStart={() => setScreen("setup")}
            historyCount={history.length}
            history={history}
            onOpenHistory={() => setScreen("history")}
            onOpenProgress={() => setScreen("progress")}
            darkMode={darkMode}
            onToggleDark={() => setDarkMode((v) => !v)}
          />
        )}
        {screen === "setup" && (
          <SetupScreen onBack={() => setScreen("home")} onStartTest={handleStartTest} />
        )}
        {screen === "quiz" && quizConfig && (
          <QuizScreen
            key={JSON.stringify(quizConfig) + history.length}
            config={quizConfig}
            onExit={() => setScreen("home")}
            onFinish={handleFinishQuiz}
          />
        )}
        {screen === "results" && session && (
          <ResultsScreen
            session={session}
            onReview={() => setScreen("review")}
            onNewTest={() => setScreen("setup")}
            onChooseLevel={() => setScreen("setup")}
            onHome={() => setScreen("home")}
          />
        )}
        {screen === "review" && session && (
          <ReviewScreen
            session={session}
            onBack={() => setScreen("results")}
            onTryAgain={() => setScreen("setup")}
            onChooseLevel={() => setScreen("setup")}
          />
        )}
        {screen === "admin" && <AdminScreen onBack={() => setScreen("home")} />}
        {screen === "history" && <HistoryScreen history={history} onBack={() => setScreen("home")} />}
        {screen === "progress" && <ProgressScreen history={history} onBack={() => setScreen("home")} />}
      </div>
    </div>
  );
}
