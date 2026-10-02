// ================== R2 BASE URL ==================
const R2_BASE = "https://pub-ce8938dd87f442ef8827efc2a61b6976.r2.dev/";

function resolveMediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return R2_BASE.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
}
