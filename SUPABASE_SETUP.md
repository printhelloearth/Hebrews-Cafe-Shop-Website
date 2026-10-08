# Supabase setup

This first online version uses Supabase for menu data, staff authentication, photo storage, customer orders, order tracking, and the staff dashboard. The browser key is the **public anon/publishable key**, not a service-role key.

## 1. Create and initialize the project

1. Create a Supabase project and open its SQL Editor.
2. Run [`supabase/schema.sql`](./supabase/schema.sql). It creates the tables, row-level security policies, RPCs, public photo bucket, and the existing 48 menu items as initial seed data. Re-running the script does not overwrite menu items that staff have changed.
3. In Supabase project settings, copy the project URL and the public anon/publishable key into [`js/config.js`](./js/config.js):

   ```js
   export const SUPABASE_URL = 'https://your-project.supabase.co';
   export const SUPABASE_ANON_KEY = 'your-public-anon-key';
   ```

   This file is loaded by the public website. Never put a service-role key, database password, or payment secret in it.

## 2. Create the first staff account

1. In Supabase Authentication, invite the owner using the real owner email. Do not enable public sign-up for this admin-only workflow.
2. Find that user's UUID in Authentication → Users.
3. Run this statement in the SQL Editor, replacing the UUID:

   ```sql
   insert into public.staff_members (user_id, role)
   values ('00000000-0000-0000-0000-000000000000', 'owner');
   ```

   Add other invited users the same way, using `manager`, `cashier`, or `barista`. Owners and managers can edit categories, items, and photos. All staff can view orders and update order/payment statuses. Staff records must be provisioned through the SQL Editor; users cannot grant themselves a role.

## 3. Run the static site

Serve the project directory with any static web server (for example, VS Code Live Server) and open `index.html`. ES modules and Supabase requests should not be run by opening the file directly as `file://`. The staff console is at `admin.html`.

## Included in this slice

- Public menu and sold-out state loaded from Supabase.
- Category and menu-item create/edit/delete, visibility, ordering, pricing, and photo upload.
- Customer cart, pickup or dine-in, optional requested time, and cash-at-store orders.
- Server-calculated prices, order snapshots, status tracking by random order reference plus phone number, and an order queue.
- Paid-order totals for today, this week, and this month; best sellers, category revenue, and peak order hours.
- Row-level security for public menu reads, public order RPC calls, and staff-only management.

## Not included yet

Online card/GCash/Maya payments, payment gateway webhooks, ingredient recipes and automatic stock deduction, reservations, discounts/VAT/receipts, loyalty, reviews, contact form, and staff scheduling are not implemented. Order submissions are public; before promoting this endpoint to production, add CAPTCHA and/or server-side abuse/rate controls. The anon key is intended to be public, and database access must remain governed by the supplied row-level security policies.

Photo uploads are limited in the admin UI to image files up to 8 MB. Replacing or deleting menu items does not currently remove old files from the public photo bucket.
