// Runs on Netlify's schedule (every 3 days) and pings the app's own keep-alive
// route, which makes one small database read so Supabase's free tier never
// sees a week of inactivity. Only runs on the published production deploy.
export default async function handler() {
  const base = process.env.URL;
  if (!base) {
    console.error("keepalive: URL env var missing");
    return;
  }
  const res = await fetch(`${base}/api/keepalive`);
  console.log("keepalive:", res.status);
}

export const config = { schedule: "0 3 */3 * *" };
