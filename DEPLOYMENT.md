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
