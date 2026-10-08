<<<<<<< HEAD
# Hebrew Café Website

Hebrew Café is a responsive coffee shop website with a Supabase-backed menu, customer ordering, and a staff dashboard. The app is deployed on **Netlify**.

## Pages
=======
Hebrew Café Website

Hebrew Café is a responsive coffee shop website with a Supabase-backed menu, customer ordering, and a staff dashboard. The app is deployed on Netlify.

Pages
>>>>>>> fa19acddcd97b47163ba0fd596c0e436ee924fa7

- `index.html` — customer-facing café site, live menu, cart, cash orders, and order tracking.
- `admin.html` — staff login, menu and category management, order queue, and sales summaries.

The Admin Login link on the main page opens the dashboard on the same website.

<<<<<<< HEAD
## Features
=======
Features
>>>>>>> fa19acddcd97b47163ba0fd596c0e436ee924fa7

- Menu categories and items loaded from Supabase, with availability and photo support.
- Staff sign-in and role-protected menu and order management.
- Pickup or dine-in orders, optional requested time, and cash-at-store payment.
- Order status tracking using an order reference and the phone number used at checkout.
- Sales totals for paid orders, best sellers, revenue by category, and peak order hours.

Online card, GCash, and Maya payments, ingredient-level inventory, loyalty, reservations, and several other planned features are not implemented yet. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for the current scope and setup details.

<<<<<<< HEAD
## Supabase setup
=======
Supabase setup
>>>>>>> fa19acddcd97b47163ba0fd596c0e436ee924fa7

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor.
3. Add the project URL and public anon/publishable key to [`js/config.js`](./js/config.js).
4. Invite staff through Supabase Authentication and assign their roles in `public.staff_members` as described in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

Only the public anon/publishable key belongs in the browser configuration. **Never expose a Supabase service-role key, database password, or payment secret.**

<<<<<<< HEAD
## Netlify deployment

This static website is deployed on Netlify. To publish changes, connect the GitHub repository to a Netlify site or push changes to the branch that Netlify watches. Use these build settings:

- **Build command:** leave blank
- **Publish directory:** `.`
=======
Netlify deployment

This static website is deployed on Netlify. To publish changes, connect the GitHub repository to a Netlify site or push changes to the branch that Netlify watches. Use these build settings:

- Build command: leave blank
- Publish directory:`.`
>>>>>>> fa19acddcd97b47163ba0fd596c0e436ee924fa7

Deploy the complete site folder so `admin.html`, `css/`, `js/`, and `supabase/` are included with `index.html`. After deployment, the customer site is served at the Netlify site URL and the staff dashboard is available at `/admin.html` on that same domain.

Set the deployed HTTPS URL as the Supabase Authentication Site URL and add it to the allowed redirect URLs. Review the [Supabase setup guide](./SUPABASE_SETUP.md) before accepting public orders.

<<<<<<< HEAD
## Local preview
=======
Local preview
>>>>>>> fa19acddcd97b47163ba0fd596c0e436ee924fa7

Serve the project folder with a static development server such as VS Code Live Server, then open its `index.html` URL. ES modules and Supabase requests require HTTP(S); opening the page directly with `file://` is not supported.
