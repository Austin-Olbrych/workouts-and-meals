// Workouts & Meals — iPhone widget (Scriptable)
// Home Screen: small · medium · large      Lock Screen: rectangular · circular · inline
// Circular widget: set the widget's Parameter to  water  (default),  protein  or  calories.
// Tapping any widget opens the dashboard.

const SUPABASE_URL = "https://gvsvljaygdfxjpnahyzi.supabase.co";
const SUPABASE_KEY = "sb_publishable_mxolwm4Z_ig75FV4XNb_rw_30ys5eZr";
const SITE = "https://austin-olbrych.github.io/workouts-and-meals/#today";

const C = {
  bg1: "#26262b", bg2: "#0b0b0d", text: "#ffffff", muted: "#a1a1aa",
  violet: "#a78bfa", purple: "#c084fc", indigo: "#818cf8", track: "#3f3f46", amber: "#fbbf24",
};
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ---------- data ----------
async function get(path) {
  const req = new Request(`${SUPABASE_URL}/rest/v1/${path}`);
  req.headers = { apikey: SUPABASE_KEY, Accept: "application/json" };
  req.timeoutInterval = 15;
  const json = await req.loadJSON();
  if (!Array.isArray(json)) throw new Error((json && json.message) || "Unexpected response");
  return json;
}

function todayKey() {
  const df = new DateFormatter();
  df.dateFormat = "yyyy-MM-dd";
  return df.string(new Date());
}

async function loadData() {
  const day = todayKey();
  const [settingsRows, dayRows] = await Promise.all([
    get("app_settings?id=eq.main&select=data"),
    get(`daily_logs?day=eq.${day}&select=*`),
  ]);
  const s = (settingsRows[0] && settingsRows[0].data) || {};
  const row = dayRows[0] || {};
  const prof = s.profile || {};
  const t = prof.customTargets && prof.custom ? prof.custom : { cal: 3200, p: 185, c: 400, f: 95 };
  const programs = s.programs || [];
  const prog = programs.find((p) => p.id === s.activeProgramId) || programs[0] || { days: {} };
  const log = row.workout || null;
  const dk = (log && log.dayKey) || DAYS[new Date().getDay()];
  const plan = prog.days[dk] || {};

  const exercises = (log ? log.exercises : plan.exercises) || [];
  let totalSets = 0, doneSets = 0;
  exercises.forEach((e) => {
    if (e.skipped) return;
    if (Array.isArray(e.sets)) { totalSets += e.sets.length; doneSets += e.sets.filter((x) => x.done).length; }
    else totalSets += Number(e.sets) || 0;
  });

  const supps = s.supplements || [];
  const taken = supps.filter((x) => row.supplements && row.supplements[x.id]).length;

  return {
    workout: {
      title: (log && log.title) || plan.title || "Workout",
      rest: plan.type === "rest",
      completed: !!(log && log.completed),
      doneSets, totalSets,
      walk: !!(log && log.walk && log.walk.done),
    },
    water: { v: row.water_oz || 0, goal: Number(prof.waterGoal) || 100 },
    cal: { v: row.calories || 0, goal: Number(t.cal) || 3200 },
    p: { v: row.protein_g || 0, goal: Number(t.p) || 185 },
    c: { v: row.carbs_g || 0, goal: Number(t.c) || 400 },
    f: { v: row.fat_g || 0, goal: Number(t.f) || 95 },
    supps: { v: taken, goal: supps.length },
    steps: row.steps == null ? null : row.steps,
    stepGoal: Number(prof.stepGoal) || 8000,
    sleep: row.sleep_hours == null ? null : row.sleep_hours,
  };
}

// ---------- helpers ----------
const fmt = (n) => Math.round(n).toLocaleString();
const hit = (m) => m.goal > 0 && m.v >= m.goal * 0.95;

function workoutStatus(w) {
  if (w.completed) return "Done ✓";
  if (w.doneSets > 0) return `${w.doneSets}/${w.totalSets} sets`;
  if (w.rest) return w.walk ? "Rest · walked ✓" : "Rest day";
  return "Planned";
}

function bar(pct, w, h, color) {
  const ctx = new DrawContext();
  ctx.size = new Size(w, h);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const r = h / 2;
  const track = new Path();
  track.addRoundedRect(new Rect(0, 0, w, h), r, r);
  ctx.addPath(track);
  ctx.setFillColor(new Color(C.track));
  ctx.fillPath();
  if (pct > 0) {
    const fill = new Path();
    fill.addRoundedRect(new Rect(0, 0, Math.max(h, Math.min(1, pct) * w), h), r, r);
    ctx.addPath(fill);
    ctx.setFillColor(new Color(pct > 1.1 ? C.amber : color));
    ctx.fillPath();
  }
  return ctx.getImage();
}

function ring(pct, size, lw, color, trackColor) {
  const ctx = new DrawContext();
  ctx.size = new Size(size, size);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const c = size / 2, r = c - lw / 2;
  const arc = (from, to, col) => {
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const a = from + ((to - from) * i) / 120;
      pts.push(new Point(c + r * Math.cos(a), c + r * Math.sin(a)));
    }
    const p = new Path();
    p.addLines(pts);
    ctx.addPath(p);
    ctx.setStrokeColor(col);
    ctx.setLineWidth(lw);
    ctx.strokePath();
  };
  arc(0, Math.PI * 2, trackColor);
  if (pct > 0) arc(-Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, pct), color);
  return ctx.getImage();
}

function text(stack, str, size, color, weight = "regular") {
  const t = stack.addText(str);
  t.font = weight === "bold" ? Font.boldSystemFont(size) : weight === "semibold" ? Font.semiboldSystemFont(size) : weight === "medium" ? Font.mediumSystemFont(size) : Font.systemFont(size);
  t.textColor = new Color(color);
  t.lineLimit = 1;
  t.minimumScaleFactor = 0.7;
  return t;
}

function metric(stack, label, m, unit, color, width) {
  const row = stack.addStack();
  row.layoutVertically();
  const top = row.addStack();
  top.centerAlignContent();
  top.size = new Size(width, 0);
  text(top, label, 11, C.muted, "medium");
  top.addSpacer();
  text(top, `${fmt(m.v)} / ${fmt(m.goal)}${unit}`, 11, hit(m) ? C.violet : C.text, "semibold");
  row.addSpacer(3);
  const img = row.addImage(bar(m.goal ? m.v / m.goal : 0, width, 6, color));
  img.imageSize = new Size(width, 6);
}

function header(w, d, small) {
  const top = w.addStack();
  top.centerAlignContent();
  const left = top.addStack();
  left.layoutVertically();
  text(left, d.workout.title, small ? 13 : 15, C.text, "bold");
  text(left, workoutStatus(d.workout), 11, d.workout.completed ? C.violet : C.muted, "medium");
  if (!small) {
    top.addSpacer();
    const df = new DateFormatter();
    df.dateFormat = "EEE MMM d";
    text(top, df.string(new Date()), 11, C.muted);
  }
}

function homeWidget(d, family) {
  const w = new ListWidget();
  const g = new LinearGradient();
  g.colors = [new Color(C.bg1), new Color(C.bg2)];
  g.locations = [0, 1];
  w.backgroundGradient = g;
  w.setPadding(14, 14, 14, 14);

  if (family === "small") {
    header(w, d, true);
    w.addSpacer();
    metric(w, "Water", d.water, " oz", C.purple, 128);
    w.addSpacer(6);
    metric(w, "Protein", d.p, " g", C.violet, 128);
    w.addSpacer(6);
    metric(w, "Calories", d.cal, "", C.indigo, 128);
    return w;
  }

  header(w, d, false);
  w.addSpacer(family === "large" ? 14 : 10);

  if (family === "medium") {
    const cols = w.addStack();
    const a = cols.addStack(); a.layoutVertically();
    cols.addSpacer(14);
    const b = cols.addStack(); b.layoutVertically();
    metric(a, "Water", d.water, " oz", C.purple, 136); a.addSpacer(7);
    metric(a, "Protein", d.p, " g", C.violet, 136); a.addSpacer(7);
    metric(a, "Calories", d.cal, "", C.indigo, 136);
    metric(b, "Carbs", d.c, " g", C.purple, 136); b.addSpacer(7);
    metric(b, "Fat", d.f, " g", C.indigo, 136); b.addSpacer(7);
    metric(b, "Supplements", d.supps, "", C.violet, 136);
    return w;
  }

  // large
  const W = 290;
  [["Water", d.water, " oz", C.purple], ["Protein", d.p, " g", C.violet], ["Calories", d.cal, "", C.indigo],
   ["Carbs", d.c, " g", C.purple], ["Fat", d.f, " g", C.indigo], ["Supplements", d.supps, "", C.violet]]
    .forEach(([l, m, u, col], i) => { if (i) w.addSpacer(9); metric(w, l, m, u, col, W); });
  if (d.steps != null) { w.addSpacer(9); metric(w, "Steps", { v: d.steps, goal: d.stepGoal }, "", C.purple, W); }
  w.addSpacer();
  const foot = w.addStack();
  text(foot, d.sleep != null ? `Sleep ${d.sleep} h` : "Sleep not logged", 11, C.muted);
  foot.addSpacer();
  text(foot, d.workout.walk ? "Walk ✓" : "Walk —", 11, d.workout.walk ? C.violet : C.muted);
  return w;
}

function lockWidget(d, family, param) {
  const w = new ListWidget();
  if (family === "accessoryInline") {
    text(w, `💧${fmt(d.water.v)}/${d.water.goal} · P ${fmt(d.p.v)}/${d.p.goal} · ${fmt(d.cal.v)} kcal`, 12, C.text);
    return w;
  }
  if (family === "accessoryCircular") {
    const key = (param || "water").toLowerCase();
    const m = key.startsWith("p") ? d.p : key.startsWith("c") ? d.cal : d.water;
    const unit = key.startsWith("p") ? "g P" : key.startsWith("c") ? "kcal" : "oz";
    w.addAccessoryWidgetBackground = true;
    w.backgroundImage = ring(m.goal ? m.v / m.goal : 0, 60, 6, Color.white(), new Color("#ffffff", 0.25));
    const s = w.addStack();
    s.layoutVertically();
    s.centerAlignContent();
    const v = text(s, m.v >= 1000 ? `${(m.v / 1000).toFixed(1)}k` : fmt(m.v), 15, C.text, "bold");
    v.centerAlignText();
    const u = text(s, unit, 9, C.text, "medium");
    u.centerAlignText();
    return w;
  }
  // accessoryRectangular
  w.addAccessoryWidgetBackground = true;
  w.setPadding(2, 6, 2, 6);
  text(w, `${d.workout.title} · ${workoutStatus(d.workout)}`, 13, C.text, "bold");
  text(w, `💧 ${fmt(d.water.v)}/${d.water.goal} oz   P ${fmt(d.p.v)}/${d.p.goal} g`, 12, C.text, "medium");
  text(w, `🔥 ${fmt(d.cal.v)} / ${fmt(d.cal.goal)} kcal · 💊 ${d.supps.v}/${d.supps.goal}`, 12, C.text, "medium");
  return w;
}

function errorWidget(msg, family) {
  const w = new ListWidget();
  if (!String(family).startsWith("accessory")) {
    const g = new LinearGradient();
    g.colors = [new Color(C.bg1), new Color(C.bg2)];
    g.locations = [0, 1];
    w.backgroundGradient = g;
  }
  text(w, "Workouts & Meals", 13, C.text, "bold");
  text(w, "Couldn’t load — tap to open", 11, C.muted);
  if (!String(family).startsWith("accessory")) text(w, msg, 9, C.muted);
  return w;
}

// ---------- run ----------
const family = config.widgetFamily || "medium";
const param = (typeof args !== "undefined" && args.widgetParameter) || "";
let widget;
try {
  const data = await loadData();
  widget = family.startsWith("accessory") ? lockWidget(data, family, param) : homeWidget(data, family);
} catch (e) {
  widget = errorWidget(String(e.message || e), family);
}
widget.url = SITE;
widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);

if (config.runsInWidget || config.runsInAccessoryWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
