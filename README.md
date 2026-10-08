Hebrew Café Website

Hebrew Café is a responsive coffee shop website with a Supabase-backed menu, customer ordering, and a staff dashboard. The app is deployed on Netlify.


1. Pages

- `index.html` — customer-facing café site, live menu, cart, cash orders, and order tracking.
- `admin.html` — staff login, menu and category management, order queue, and sales summaries.

The Admin Login link on the main page opens the dashboard on the same website.


2. Features

- Menu categories and items loaded from Supabase, with availability and photo support.
- Staff sign-in and role-protected menu and order management.
- Pickup or dine-in orders, optional requested time, and cash-at-store payment.
- Order status tracking using an order reference and the phone number used at checkout.
- Sales totals for paid orders, best sellers, revenue by category, and peak order hours.

Online card, GCash, and Maya payments, ingredient-level inventory, loyalty, reservations, and several other planned features are not implemented yet. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for the current scope and setup details.


3. Supabase setup

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor.
3. Add the project URL and public anon/publishable key to [`js/config.js`](./js/config.js).
4. Invite staff through Supabase Authentication and assign their roles in `public.staff_members` as described in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

Only the public anon/publishable key belongs in the browser configuration. **Never expose a Supabase service-role key, database password, or payment secret.**

4. Deployment through Netlify

This static website is deployed on Netlify. To publish changes, connect the GitHub repository to a Netlify site or push changes to the branch that Netlify watches.

5. Netlify deployment

This static website is deployed on Netlify. To publish changes, connect the GitHub repository to a Netlify site or push changes to the branch that Netlify watches. Use these build settings:

---Local Preview---

Deploy the complete site folder so `admin.html`, `css/`, `js/`, and `supabase/` are included with `index.html`. After deployment, the customer site is served at the Netlify site URL and the staff dashboard is available at `/admin.html` on that same domain.

Set the deployed HTTPS URL as the Supabase Authentication Site URL and add it to the allowed redirect URLs. Review the [Supabase setup guide](./SUPABASE_SETUP.md) before accepting public orders.



