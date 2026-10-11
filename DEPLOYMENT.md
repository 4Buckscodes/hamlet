# Deployment checklist

## Vercel

1. Push the repo to GitHub.
2. Open Vercel and import the project repository.
3. Set framework to Vite.
4. Keep the build command as:
   ```bash
   npm run build
   ```
5. Set the output directory to:
   ```bash
   dist
   ```
6. Add environment variables in Vercel:
   ```bash
   VITE_WHATSAPP_NUMBER=2348000000000
   ```
7. Deploy.

## Netlify

1. Push the repo to GitHub.
2. Import the project in Netlify.
3. Set the build command to:
   ```bash
   npm run build
   ```
4. Set the publish directory to:
   ```bash
   dist
   ```
5. Add environment variables:
   ```bash
   VITE_WHATSAPP_NUMBER=2348000000000
   ```
6. Deploy.

## Launch sanity check

- Confirm the homepage loads without errors.
- Check the hero, CTAs, and forms render correctly.
- Confirm the WhatsApp links open correctly.
- Validate the social preview image loads.
- Ensure the favicon appears in the browser tab.
- Test on mobile and desktop.
- Confirm env variables are not committed to the repo.

## Useful note

The project includes a Vercel config file and a public social image file so deployment is simpler and the project is easier to share publicly.


## Supabase: public property intake

The founding property intake form requires the Supabase project to have both migrations applied:

- `supabase/migrations/202610090001_agent_experience.sql`
- `supabase/migrations/202610110001_property_intake.sql`
- `supabase/migrations/202610110002_property_intake_admin.sql`

Apply migrations in order using the Supabase CLI linked to the correct project, then redeploy the Vercel preview. The public intake form can insert submissions only; it cannot read, edit, approve, or publish them. Only a signed-in HAMLET admin can view the intake queue in the owner/agent workspace and convert a suitable submission into the existing listing review queue.

Before relying on the public intake in production, verify that RLS is enabled, the three migrations applied successfully, and the admin account is provisioned through a trusted process. Do not put a Supabase service-role key in Vercel client-side variables or commit secrets to GitHub. Use only `VITE_SUPABASE_URL` and the public `VITE_SUPABASE_ANON_KEY` in the browser.
