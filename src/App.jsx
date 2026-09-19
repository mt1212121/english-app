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
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { LEVELS, CATEGORY_META, pickQuestions, estimateLevel, levelName } from "./data/bank";
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
        "w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 " +
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
        "w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold border transition-colors disabled:opacity-40 " +
        className
      }
      style={{ borderColor: "#DCE2F7", color: "#2B2F45", background: "#fff" }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  SCREEN: HOME                                                       */
/* ------------------------------------------------------------------ */

function HomeScreen({ onStart, historyCount }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${BLUE}, ${BLUE_LIGHT})` }}
          >
            <BookOpen size={16} className="text-white" />
          </div>
          <span className="font-semibold text-[17px] text-[#1B1E2B]">English Test</span>
        </div>
        <Menu size={20} className="text-[#8890AE]" />
      </div>

      <div className="px-5 pt-2">
        <p className="text-[13px] tracking-wide text-[#8890AE]">
          Practice, improve, and track your progress
        </p>
        <h1 className="text-[32px] leading-[1.15] font-bold text-[#1B1E2B] mt-2">
          Find Your <span style={{ color: BLUE }}>English Level</span>
        </h1>
        <p className="text-[15px] text-[#6B7190] mt-3 leading-relaxed">
          Take a personalized test and improve your skills. New questions every time you play.
        </p>
      </div>

      <div className="px-5 mt-5">
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

      <div className="px-5 mt-6 grid grid-cols-3 gap-2.5">
        {CATEGORIES.map(({ icon: Icon, label }) => (
          <div key={label} className="rounded-2xl border border-[#EAEDF9] p-3.5 bg-white">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5"
              style={{ background: "#EEF1FE" }}
            >
              <Icon size={15} style={{ color: BLUE }} />
            </div>
            <p className="font-semibold text-[13px] text-[#1B1E2B]">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-auto px-5 pb-6 pt-6">
        <GradientButton onClick={onStart}>
          Start a Test <ArrowRight size={18} />
        </GradientButton>
        <p className="text-center text-[12px] text-[#A6ACC6] mt-3">
          Small steps make big progress
        </p>
      </div>
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
      <div className="flex items-center gap-3 px-5 pt-5 pb-1">
        <button onClick={onBack} className="text-[#1B1E2B]">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h2 className="text-[19px] font-bold text-[#1B1E2B]">Test Settings</h2>
          <p className="text-[12px] text-[#8890AE]">Customize your test experience</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <p className="text-[13px] font-semibold text-[#1B1E2B] mt-5 mb-3">Choose your level</p>
        <div className="flex flex-col gap-2">
          {LEVELS.map((l) => {
            const active = level === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setLevel(l.id)}
                className="flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors"
                style={{
                  borderColor: active ? BLUE : "#EAEDF9",
                  background: active ? "#F2F5FF" : "#fff",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: active ? BLUE : "#F1F3FA" }}
                >
                  <span className={"text-[12px] font-bold " + (active ? "text-white" : "text-[#8890AE]")}>
                    {l.id}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#1B1E2B]">{l.name}</p>
                  <p className="text-[12px] text-[#8890AE] truncate">{l.desc}</p>
                </div>
                <DifficultyBars count={l.bars} />
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: active ? BLUE : "#D8DCEE" }}
                >
                  {active && <div className="w-2.5 h-2.5 rounded-full" style={{ background: BLUE }} />}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[13px] font-semibold text-[#1B1E2B] mt-6 mb-1">Focus on</p>
        <p className="text-[12px] text-[#8890AE] mb-3">
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
                className="flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors"
                style={{
                  borderColor: active ? BLUE : "#EAEDF9",
                  background: active ? "#F2F5FF" : "#fff",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: active ? BLUE : "#F1F3FA" }}
                >
                  <Icon size={16} style={{ color: active ? "#fff" : "#8890AE" }} />
                </div>
                <span className="flex-1 text-[14px] font-medium text-[#1B1E2B]">{cat.label}</span>
                <div
                  className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: active ? BLUE : "#D8DCEE", background: active ? BLUE : "#fff" }}
                >
                  {active && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[13px] font-semibold text-[#1B1E2B] mt-6 mb-3">Test options</p>

        <div className="rounded-2xl border border-[#EAEDF9] p-4">
          <p className="text-[13px] font-medium text-[#1B1E2B] mb-2">Number of questions</p>
          <div className="grid grid-cols-3 gap-2">
            {[10, 20, 30].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className="rounded-xl py-2.5 text-[13px] font-semibold border"
                style={{
                  borderColor: count === n ? BLUE : "#EAEDF9",
                  background: count === n ? BLUE : "#fff",
                  color: count === n ? "#fff" : "#6B7190",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#EAEDF9] p-4 mt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock size={18} style={{ color: BLUE }} />
              <div>
                <p className="text-[13px] font-medium text-[#1B1E2B]">Time limit</p>
                <p className="text-[11px] text-[#8890AE]">Set a time for your test</p>
              </div>
            </div>
            <button
              onClick={() => setTimerOn((v) => !v)}
              className="w-11 h-6 rounded-full relative transition-colors"
              style={{ background: timerOn ? BLUE : "#E2E6F0" }}
            >
              <div
                className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all"
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
                  className="rounded-xl py-2 text-[13px] font-semibold border"
                  style={{
                    borderColor: minutes === m ? BLUE : "#EAEDF9",
                    background: minutes === m ? "#F2F5FF" : "#fff",
                    color: minutes === m ? BLUE : "#6B7190",
                  }}
                >
                  {m} min
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pb-6 pt-3">
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
        <p className="text-[14px] font-medium text-[#1B1E2B] mt-4">Preparing your test…</p>
        <p className="text-[12.5px] text-[#8890AE] mt-1">Generating a fresh set of questions</p>
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
      <div className="px-5 pt-5">
        <div className="flex items-center justify-between">
          <button onClick={onExit} className="text-[#1B1E2B]">
            <X size={22} />
          </button>
          <div className="flex items-center gap-1.5">
            <catMeta.icon size={15} style={{ color: BLUE }} />
            <span className="text-[15px] font-bold text-[#1B1E2B]">
              {catMeta.label} {index + 1}/{questions.length}
            </span>
          </div>
          <div className="w-[22px]" />
        </div>
        <div className="w-full h-1.5 bg-[#EEF1FA] rounded-full mt-4 overflow-hidden">
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

      <div className="flex-1 overflow-y-auto px-5 pt-5">
        {current.passage && (
          <div className="rounded-2xl p-4 mb-4 text-[14px] leading-relaxed text-[#3F4460]" style={{ background: "#F5F6FB" }}>
            {current.passage}
          </div>
        )}
        <p className="text-[17px] font-semibold text-[#1B1E2B] leading-snug mb-5">
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
                className="flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors"
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
                <span className="text-[14px] text-[#292D42]">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 pb-6 pt-3 flex gap-3">
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

function ResultsScreen({ session, onReview, onNewTest, onChooseLevel }) {
  const { questions, answers, config } = session;
  const total = questions.length;
  const correctCount = questions.filter((q, i) => answers[i] === q.correct).length;
  const pct = Math.round((correctCount / total) * 100);
  const estLevel = estimateLevel(config.level, pct);

  const byCategory = CATEGORIES.map((cat) => {
    const qs = questions
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => q.category === cat.id);
    const correct = qs.filter(({ q, i }) => answers[i] === q.correct).length;
    const p = qs.length ? Math.round((correct / qs.length) * 100) : 0;
    return { ...cat, correct, of: qs.length, pct: p };
  });

  const canvasRef = useRef(null);
  const [shareState, setShareState] = useState("idle"); // idle | working | done

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
      <div className="flex-1 overflow-y-auto px-5 pt-8 pb-4">
        <div className="flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${BLUE}, ${BLUE_LIGHT})` }}
          >
            <Trophy className="text-white" size={28} />
          </div>
          <h2 className="text-[20px] font-bold text-[#1B1E2B] mt-4">Test Completed!</h2>
          <p className="text-[13px] text-[#8890AE] mt-1">Here are your results</p>
          <button
            onClick={handleShare}
            disabled={shareState === "working"}
            className="flex items-center gap-1.5 text-[12.5px] font-semibold mt-3 px-3.5 py-1.5 rounded-full disabled:opacity-60"
            style={{ background: "#EEF1FE", color: BLUE }}
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

        <div className="rounded-2xl border border-[#EAEDF9] p-4 mt-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[12px] text-[#8890AE]">Your score</p>
              <p className="text-[28px] font-bold text-[#1B1E2B] mt-0.5">
                {correctCount}
                <span className="text-[16px] text-[#8890AE] font-medium"> / {total}</span>
              </p>
            </div>
            <p className="text-[26px] font-bold" style={{ color: BLUE }}>
              {pct}%
            </p>
          </div>
          <div className="w-full h-2 bg-[#EEF1FA] rounded-full mt-3 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: BLUE }} />
          </div>
        </div>

        <div className="rounded-2xl border border-[#EAEDF9] p-4 mt-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EEF1FE" }}>
            <Sparkles size={18} style={{ color: BLUE }} />
          </div>
          <div>
            <p className="text-[12px] text-[#8890AE]">Your estimated level</p>
            <p className="text-[15px] font-bold text-[#1B1E2B]">
              {estLevel} · {levelName(estLevel)}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[13px] font-semibold text-[#1B1E2B] mb-3">Breakdown by category</p>
          <div className="flex flex-col gap-2.5">
            {byCategory.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <c.icon size={16} style={{ color: BLUE }} className="shrink-0" />
                <span className="text-[13px] text-[#3F4460] w-20 shrink-0">{c.label}</span>
                <div className="flex-1 h-2 bg-[#EEF1FA] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: BLUE }} />
                </div>
                <span className="text-[12px] font-semibold text-[#6B7190] w-14 text-right">
                  {c.of ? `${c.pct}%` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pb-6 pt-3 flex flex-col gap-2.5">
        <SecondaryButton onClick={onReview}>
          Review Answers <ChevronRight size={16} />
        </SecondaryButton>
        <GradientButton onClick={onNewTest}>
          New Test <RotateCcw size={16} />
        </GradientButton>
        <button onClick={onChooseLevel} className="text-[13px] font-medium mt-1" style={{ color: BLUE }}>
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
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <button onClick={onBack} className="text-[#1B1E2B]">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-[18px] font-bold text-[#1B1E2B]">Review Answers</h2>
      </div>

      <div className="px-5 flex gap-2">
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

      <div className="flex-1 overflow-y-auto px-5 mt-4 flex flex-col gap-2.5">
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
                  <p className="text-[13.5px] font-medium text-[#1B1E2B] leading-snug">{q.q}</p>
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
                  <div className="rounded-xl p-3 text-[12.5px] text-[#5B6180] leading-relaxed bg-white/70">
                    {q.explanation}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div className="h-2" />
      </div>

      <div className="px-5 pb-6 pt-3 flex flex-col gap-2.5">
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        <button onClick={onBack} className="text-[#1B1E2B]">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-[18px] font-bold text-[#1B1E2B]">Admin — Add Questions</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <div className="rounded-2xl p-3.5 mb-4 flex gap-2.5" style={{ background: "#F5F6FB" }}>
          <ShieldCheck size={18} style={{ color: BLUE }} className="shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#5B6180] leading-relaxed">
            Upload a JSON file of new questions. Once you enter the admin password and confirm,
            they're committed straight to your GitHub repo and go live for every visitor after
            the next auto-deploy (usually under a minute).
          </p>
        </div>

        <p className="text-[13px] font-semibold text-[#1B1E2B] mb-2">Admin password</p>
        <div className="flex items-center gap-2 rounded-2xl border border-[#EAEDF9] px-3.5 py-3 mb-4">
          <Lock size={16} className="text-[#8890AE]" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            className="flex-1 outline-none text-[14px] bg-transparent"
          />
        </div>

        <p className="text-[13px] font-semibold text-[#1B1E2B] mb-2">Questions JSON</p>
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
          className="w-full rounded-2xl border border-[#EAEDF9] p-3.5 text-[12px] font-mono outline-none focus:border-[#3F66F5]"
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
          <div className="mt-4 rounded-2xl border border-[#EAEDF9] p-3.5">
            <p className="text-[13px] font-semibold text-[#1B1E2B]">
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
      </div>

      <div className="px-5 pb-6 pt-3">
        <GradientButton
          onClick={handleUpload}
          disabled={!parsed || parsed.valid.length === 0 || !password || status === "uploading"}
        >
          {status === "uploading" ? "Uploading..." : `Add ${parsed?.valid.length || 0} Question(s)`}
        </GradientButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  APP ROOT                                                            */
/* ------------------------------------------------------------------ */

export default function App() {
  const [screen, setScreen] = useState("home"); // home | setup | quiz | results | review
  const [quizConfig, setQuizConfig] = useState(null);
  const [session, setSession] = useState(null); // { questions, answers, config }
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    setHistoryCount(getHistory().length);
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("admin") === "1") {
      setScreen("admin");
    }
  }, []);

  function handleStartTest(config) {
    setQuizConfig(config);
    setScreen("quiz");
  }

  function handleFinishQuiz(questions, answers) {
    const s = { questions, answers, config: quizConfig };
    setSession(s);
    const score = questions.filter((q, i) => answers[i] === q.correct).length;
    addHistoryEntry({
      level: quizConfig.level,
      categories: quizConfig.categories,
      score,
      total: questions.length,
      pct: Math.round((score / questions.length) * 100),
    });
    setHistoryCount((c) => c + 1);
    setScreen("results");
  }

  return (
    <div
      className="w-full flex justify-center"
      style={{ background: "linear-gradient(180deg, #F7F9FF 0%, #FFFFFF 30%)", minHeight: "100vh" }}
    >
      <div
        className="w-full bg-white flex flex-col"
        style={{ maxWidth: 430, minHeight: "100vh", boxShadow: "0 0 60px rgba(63,102,245,0.06)" }}
      >
        {screen === "home" && (
          <HomeScreen onStart={() => setScreen("setup")} historyCount={historyCount} />
        )}
        {screen === "setup" && (
          <SetupScreen onBack={() => setScreen("home")} onStartTest={handleStartTest} />
        )}
        {screen === "quiz" && quizConfig && (
          <QuizScreen
            key={JSON.stringify(quizConfig) + historyCount}
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
      </div>
    </div>
  );
}
