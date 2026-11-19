// Workouts & Meals — iPhone widget (Scriptable)
// Home Screen: small · medium · large      Lock Screen: rectangular · circular · inline
// Rectangular lock widget: calories, protein and water with mini bars.
// Circular widget: set the widget's Parameter to  water  (default),  protein  or  calories.
// Tapping any widget opens the dashboard. On medium/large, tapping a supplement opens the
// dashboard and marks it taken (link: #take-<supplement id>).

const SUPABASE_URL = "https://gvsvljaygdfxjpnahyzi.supabase.co";
const SUPABASE_KEY = "sb_publishable_mxolwm4Z_ig75FV4XNb_rw_30ys5eZr";
const SITE_BASE = "https://austin-olbrych.github.io/workouts-and-meals/";
const SITE = SITE_BASE + "#today";

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
  const suppList = supps.map((x) => ({ id: x.id, name: x.name, taken: !!(row.supplements && row.supplements[x.id]) }));
  const taken = suppList.filter((x) => x.taken).length;

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
    suppList,
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

function bar(pct, w, h, color, trackColor) {
  const ctx = new DrawContext();
  ctx.size = new Size(w, h);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const r = h / 2;
  const track = new Path();
  track.addRoundedRect(new Rect(0, 0, w, h), r, r);
  ctx.addPath(track);
  ctx.setFillColor(trackColor || new Color(C.track));
  ctx.fillPath();
  if (pct > 0) {
    const fill = new Path();
    fill.addRoundedRect(new Rect(0, 0, Math.max(h, Math.min(1, pct) * w), h), r, r);
    ctx.addPath(fill);
    ctx.setFillColor(typeof color === "string" ? new Color(pct > 1.1 ? C.amber : color) : color);
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

const shortName = (n = "") => (n.length > 9 ? n.split(/[\s-]/)[0] : n);
const takeUrl = (id) => `${SITE_BASE}#take-${encodeURIComponent(id)}`;

function pill(parent, sp, label, width) {
  const p = parent.addStack();
  p.setPadding(width ? 5 : 3, 8, width ? 5 : 3, 8);
  p.cornerRadius = 10;
  p.centerAlignContent();
  if (width) { p.size = new Size(width, 0); p.addSpacer(); }
  if (sp.taken) p.backgroundColor = new Color(C.violet);
  else { p.borderColor = new Color("#52525b"); p.borderWidth = 1; }
  text(p, (sp.taken ? "✓ " : "") + label, 11, sp.taken ? "#1e1240" : C.muted, "semibold");
  if (width) p.addSpacer();
  p.url = takeUrl(sp.id);
  return p;
}

// One centered row of compact pills (medium widget).
function pillRow(w, list) {
  const row = w.addStack();
  row.addSpacer();
  list.forEach((sp, i) => { if (i) row.addSpacer(5); pill(row, sp, shortName(sp.name)); });
  row.addSpacer();
}

// Centered 2×2 grid of full-name pills (large widget).
function pillGrid(w, list, cellWidth) {
  for (let i = 0; i < list.length; i += 2) {
    if (i) w.addSpacer(6);
    const row = w.addStack();
    row.addSpacer();
    list.slice(i, i + 2).forEach((sp, j) => { if (j) row.addSpacer(6); pill(row, sp, sp.name || "", cellWidth); });
    row.addSpacer();
  }
}

// Two centered columns of progress bars.
function barGrid(w, left, right, width) {
  const cols = w.addStack();
  cols.addSpacer();
  [left, right].forEach((items, ci) => {
    if (ci) cols.addSpacer(14);
    const col = cols.addStack();
    col.layoutVertically();
    items.forEach(([l, m, u, color], i) => { if (i) col.addSpacer(6); metric(col, l, m, u, color, width); });
  });
  cols.addSpacer();
}

function header(w, d, small) {
  const top = w.addStack();
  top.centerAlignContent();
  const left = top.addStack();
  left.layoutVertically();
  text(left, d.workout.title, small ? 13 : 15, C.text, "bold");
  text(left, workoutStatus(d.workout) + (small ? "" : d.workout.walk ? " · walk ✓" : " · walk —"), 11, d.workout.completed ? C.violet : C.muted, "medium");
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
  const steps = { v: d.steps || 0, goal: d.stepGoal };

  if (family === "medium") {
    w.addSpacer(8);
    barGrid(w,
      [["Water", d.water, " oz", C.purple], ["Protein", d.p, " g", C.violet]],
      [["Calories", d.cal, "", C.indigo], ["Steps", steps, "", C.purple]], 136);
    w.addSpacer(8);
    pillRow(w, d.suppList);
    return w;
  }

  // large
  w.addSpacer(12);
  barGrid(w,
    [["Water", d.water, " oz", C.purple], ["Protein", d.p, " g", C.violet], ["Calories", d.cal, "", C.indigo]],
    [["Carbs", d.c, " g", C.purple], ["Fat", d.f, " g", C.indigo], ["Steps", steps, "", C.purple]], 136);
  w.addSpacer(10);
  pillGrid(w, d.suppList, 128);
  w.addSpacer();
  const foot = w.addStack();
  text(foot, `Supplements ${d.supps.v}/${d.supps.goal}`, 11, C.muted);
  foot.addSpacer();
  text(foot, d.sleep != null ? `Sleep ${d.sleep} h` : "Sleep not logged", 11, C.muted);
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
  // accessoryRectangular: calories, protein, water — label · bar · value
  w.addAccessoryWidgetBackground = true;
  w.setPadding(4, 8, 4, 8);
  const rows = [["Calories", d.cal, ""], ["Protein", d.p, "g"], ["Water", d.water, "oz"]];
  rows.forEach(([label, m, unit], i) => {
    if (i) w.addSpacer(3);
    const r = w.addStack();
    r.centerAlignContent();
    const l = r.addStack();
    l.size = new Size(50, 0);
    text(l, label, 11, C.text, "semibold");
    const img = r.addImage(bar(m.goal ? m.v / m.goal : 0, 40, 5, Color.white(), new Color("#ffffff", 0.3)));
    img.imageSize = new Size(40, 5);
    r.addSpacer(6);
    const v = text(r, `${fmt(m.v)}/${fmt(m.goal)}${unit}`, 11, C.text, hit(m) ? "bold" : "medium");
    v.minimumScaleFactor = 0.6;
  });
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
