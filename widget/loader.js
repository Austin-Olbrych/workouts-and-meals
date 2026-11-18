// Workouts & Meals widget — loader
// Paste this once into Scriptable. It runs the latest widget from GitHub,
// so future changes show up without re-pasting. Works offline from the last copy.
const SRC = "https://raw.githubusercontent.com/Austin-Olbrych/workouts-and-meals/main/widget/workouts-widget.js";
const fm = FileManager.local();
const cache = fm.joinPath(fm.documentsDirectory(), "workouts-widget-latest.js");
let code = null;
try {
  const req = new Request(SRC);
  req.timeoutInterval = 10;
  code = await req.loadString();
  if (!code.includes("ListWidget")) throw new Error("bad download");
  fm.writeString(cache, code);
} catch (e) {
  if (fm.fileExists(cache)) code = fm.readString(cache);
}
if (!code) throw new Error("Couldn't download the widget — check your connection and run again.");
await eval(`(async () => {\n${code}\n})()`);
