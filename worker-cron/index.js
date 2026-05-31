// Scheduled Worker that triggers a daily production rebuild of the blog.
//
// A static build is a point-in-time snapshot, so future-dated posts (see
// src/utils/collections.ts `isPublished`) only appear once a build runs on or
// after their pubDate. This Worker's cron trigger (configured in
// wrangler.jsonc) fires once a day and POSTs to the Cloudflare Workers Builds
// deploy hook, which kicks off `npm run build` + deploy for the main site.
//
// Setup:
//   1. In the main Worker (ghidello) dashboard: Settings → Builds → Deploy
//      hooks → create a hook. Copy its URL.
//   2. Store it as a secret on THIS worker:
//        cd worker-cron
//        npx wrangler secret put DEPLOY_HOOK_URL
//   3. Deploy this worker:
//        npx wrangler deploy
//
// The deploy hook URL is a secret (anyone with it can trigger builds), so it is
// never committed — it lives only in the Worker's encrypted secret store.

export default {
  async scheduled(_event, env, _ctx) {
    if (!env.DEPLOY_HOOK_URL) {
      console.error('DEPLOY_HOOK_URL secret is not set; skipping rebuild trigger.');
      return;
    }

    const response = await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
    console.log(`Triggered daily rebuild: ${response.status} ${response.statusText}`);
  },
};
