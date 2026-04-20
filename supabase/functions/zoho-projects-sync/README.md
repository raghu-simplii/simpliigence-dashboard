# `zoho-projects-sync` — Supabase Edge Function

Real-time proxy for the "Sync from Zoho" button on the Project Pipeline page.
Calls Zoho Projects v3 API with a server-side refresh token, filters to active
projects only (excludes Completed / On Hold), enriches with milestones, and
returns JSON the dashboard can drop straight into `usePipelineStore`.

## One-time setup

### 1. Register a Zoho OAuth self-client

Self-clients skip the usual redirect-URI dance — perfect for a scheduled
backend call.

1. Go to <https://api-console.zoho.in/> *(note: `.in` because the Simpliigence
   portal is on `projects.zoho.in`. If you ever move to `.com`, swap the DC in
   step 3.)*
2. **Add Client** → **Self Client** → **CREATE**.
3. Copy the **Client ID** and **Client Secret**.
4. Under the self-client, go to the **Generate Code** tab.
   - Scope: `ZohoProjects.portals.READ,ZohoProjects.projects.READ,ZohoProjects.milestones.READ`
   - Time Duration: 10 minutes (you only need it for one curl)
   - Scope Description: anything (e.g. `simpliigence-dashboard-sync`)
   - Click **CREATE**. Copy the `code` that appears.

### 2. Swap the code for a refresh token

Run this curl within the 10-minute window (replace the three values):

```bash
curl -X POST "https://accounts.zoho.in/oauth/v2/token" \
  -d "grant_type=authorization_code" \
  -d "client_id=<CLIENT_ID>" \
  -d "client_secret=<CLIENT_SECRET>" \
  -d "code=<CODE_FROM_STEP_1>"
```

The JSON response contains `refresh_token` — **save it**. It doesn't expire
unless revoked.

### 3. Set Supabase secrets

```bash
cd ~/repos/simpliigence-dashboard

# one-time: link the local repo to your Supabase project
supabase link --project-ref mhmxlubithnidopmkwgt

supabase secrets set \
  ZOHO_DC=in \
  ZOHO_CLIENT_ID=<CLIENT_ID> \
  ZOHO_CLIENT_SECRET=<CLIENT_SECRET> \
  ZOHO_REFRESH_TOKEN=<REFRESH_TOKEN_FROM_STEP_2> \
  ZOHO_PORTAL_ID=60025924266
```

*(`60025924266` is the Simpliigence portal id — from `GET /api/v3/portals`. Change if you ever add more portals.)*

### 4. Deploy the function

```bash
supabase functions deploy zoho-projects-sync
```

That's it. The dashboard's **Sync from Zoho** button now calls the live
function. If the function isn't deployed yet or any secret is missing, the
button falls back to loading `src/data/zohoSeed.ts` so nothing breaks.

## Test it

```bash
# Anon-key call (what the browser does):
curl -i "https://mhmxlubithnidopmkwgt.supabase.co/functions/v1/zoho-projects-sync" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>"
```

Expected: HTTP 200 with `{ projects: [...], syncedAt: "...", counts: {...} }`.

## Logs / debugging

```bash
supabase functions logs zoho-projects-sync --follow
```

Common errors:

| Symptom | Cause | Fix |
|---|---|---|
| `Missing Zoho OAuth secrets` | You haven't run `supabase secrets set` | Run step 3 above |
| `Zoho OAuth failed (400): invalid_code` | Code expired (10 min window) | Regenerate it in step 1 |
| `Zoho GET /api/v3/… failed (401)` | Refresh token revoked or wrong DC | Regenerate, verify `ZOHO_DC=in` |
| Button shows "Live sync unavailable — loaded N from cached snapshot" | Function isn't deployed or an uncaught error | Check `supabase functions logs` |

## How the scope maps to calls

- `ZohoProjects.portals.READ` — *not actually used at runtime* (we hard-code the
  portal id as a secret), but convenient for one-off verification.
- `ZohoProjects.projects.READ` — `GET /api/v3/portal/{pid}/projects`
- `ZohoProjects.milestones.READ` — `GET /api/v3/portal/{pid}/projects/{pjid}/milestones`

## Rotating the refresh token

If the token is ever leaked or you want to rotate proactively:

1. In <https://api-console.zoho.in/>, open the self-client → **Revoke** old token.
2. Repeat steps 1 and 2 above to mint a fresh one.
3. `supabase secrets set ZOHO_REFRESH_TOKEN=<new>`.
4. No redeploy needed — edge functions read secrets at cold-start.
