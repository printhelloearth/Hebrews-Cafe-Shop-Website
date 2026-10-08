create extension if not exists pgcrypto; 

create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    icon text not null default '',
    sort_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists public.menu_items (
    id uuid primary key default gen_random_uuid(),
    category_id uuid references public.categories(id) on delete set null,
    name text not null,
    description text not null default '',
    image_url text,
    price numeric(10, 2) not null check (price >= 0),
    is_available boolean not null default true,
    is_active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

create table if not exists public.staff_members (
    user_id uuid primary key references auth.users(id) on delete cascade,
    role text not null check (role in ('owner', 'manager', 'cashier', 'barista')),
    created_at timestamptz not null default now()
);

create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    order_number bigint generated always as identity unique,
    tracking_token uuid not null default gen_random_uuid(),
    customer_name text not null,
    customer_phone text not null,
    fulfillment_type text not null check (fulfillment_type in ('pickup', 'dine_in')),
    requested_at timestamptz,
    payment_method text not null default 'cash' check (payment_method = 'cash'),
    payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'refunded')),
    status text not null default 'received' check (status in ('received', 'preparing', 'ready', 'completed', 'cancelled')),
    total numeric(10, 2) not null check (total >= 0),
    created_at timestamptz not null default now()
);

alter table public.orders
    add column if not exists tracking_token uuid not null default gen_random_uuid();
create unique index if not exists orders_tracking_token_idx
    on public.orders (tracking_token);

create table if not exists public.order_items (
    id uuid primary key default gen_random_uuid(),
    order_id uuid not null references public.orders(id) on delete cascade,
    menu_item_id uuid,
    item_name text not null,
    category_name text not null default 'Other',
    unit_price numeric(10, 2) not null check (unit_price >= 0),
    quantity integer not null check (quantity > 0),
    created_at timestamptz not null default now()
);

alter table public.order_items
    add column if not exists category_name text not null default 'Other';

create index if not exists menu_items_category_sort_idx
    on public.menu_items (category_id, sort_order);
create index if not exists orders_created_at_idx
    on public.orders (created_at desc);
create index if not exists orders_status_created_at_idx
    on public.orders (status, created_at desc);
create index if not exists order_items_order_idx
    on public.order_items (order_id);

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.staff_members
        where user_id = (select auth.uid())
    );
$$;

create or replace function public.can_manage_menu()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.staff_members
        where user_id = (select auth.uid())
          and role in ('owner', 'manager')
    );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;
revoke all on function public.can_manage_menu() from public;
grant execute on function public.can_manage_menu() to authenticated;

alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.staff_members enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Public can read active categories" on public.categories;
create policy "Public can read active categories"
    on public.categories for select to anon, authenticated
    using (is_active);

drop policy if exists "Staff can manage categories" on public.categories;
create policy "Staff can manage categories"
    on public.categories for all to authenticated
    using (public.can_manage_menu()) with check (public.can_manage_menu());

drop policy if exists "Public can read active menu items" on public.menu_items;
create policy "Public can read active menu items"
    on public.menu_items for select to anon, authenticated
    using (is_active);

drop policy if exists "Staff can manage menu items" on public.menu_items;
create policy "Staff can manage menu items"
    on public.menu_items for all to authenticated
    using (public.can_manage_menu()) with check (public.can_manage_menu());

drop policy if exists "Staff can read staff directory" on public.staff_members;
create policy "Staff can read staff directory"
    on public.staff_members for select to authenticated
    using (public.is_staff());

drop policy if exists "Staff can read orders" on public.orders;
create policy "Staff can read orders"
    on public.orders for select to authenticated
    using (public.is_staff());

drop policy if exists "Staff can update orders" on public.orders;
create policy "Staff can update orders"
    on public.orders for update to authenticated
    using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Staff can read order items" on public.order_items;
create policy "Staff can read order items"
    on public.order_items for select to authenticated
    using (public.is_staff());

create or replace function public.submit_order(
    p_customer_name text,
    p_customer_phone text,
    p_fulfillment_type text,
    p_requested_at timestamptz,
    p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_order_id uuid;
    v_order_number bigint;
    v_tracking_token uuid;
    v_total numeric(10, 2) := 0;
    v_line record;
    v_item record;
    v_quantity integer;
    v_lines jsonb := '[]'::jsonb;
begin
    if length(trim(coalesce(p_customer_name, ''))) not between 1 and 100 then
        raise exception 'Enter a name of 1 to 100 characters.';
    end if;
    if length(trim(coalesce(p_customer_phone, ''))) not between 7 and 32 then
        raise exception 'Enter a valid phone number.';
    end if;
    if coalesce(p_fulfillment_type, '') not in ('pickup', 'dine_in') then
        raise exception 'Choose pickup or dine-in.';
    end if;
    if p_requested_at is not null and p_requested_at < now() then
        raise exception 'The requested time must be in the future.';
    end if;
    if p_items is null
       or jsonb_typeof(p_items) <> 'array'
       or jsonb_array_length(p_items) = 0
       or jsonb_array_length(p_items) > 50 then
        raise exception 'The cart must contain between 1 and 50 lines.';
    end if;

    for v_line in select value from jsonb_array_elements(p_items)
    loop
        if coalesce(v_line.value->>'quantity', '') !~ '^[1-9][0-9]{0,2}$' then
            raise exception 'Each item quantity must be between 1 and 999.';
        end if;
        v_quantity := (v_line.value->>'quantity')::integer;

        select mi.id, mi.name, mi.price, coalesce(c.name, 'Other') as category_name
          into v_item
          from public.menu_items mi
          left join public.categories c on c.id = mi.category_id
         where mi.id = (v_line.value->>'item_id')::uuid
           and mi.is_active
           and mi.is_available;
        if not found then
            raise exception 'An item in your cart is no longer available. Refresh the menu and try again.';
        end if;

        v_total := v_total + v_item.price * v_quantity;
        v_lines := v_lines || jsonb_build_array(jsonb_build_object(
            'menu_item_id', v_item.id,
            'item_name', v_item.name,
            'category_name', v_item.category_name,
            'unit_price', v_item.price,
            'quantity', v_quantity
        ));
    end loop;

    insert into public.orders (
        customer_name, customer_phone, fulfillment_type, requested_at, total
    ) values (
        trim(p_customer_name), trim(p_customer_phone), p_fulfillment_type, p_requested_at, v_total
    )
    returning id, order_number, tracking_token
         into v_order_id, v_order_number, v_tracking_token;

    insert into public.order_items (order_id, menu_item_id, item_name, category_name, unit_price, quantity)
    select v_order_id, lines.menu_item_id, lines.item_name, lines.category_name, lines.unit_price, lines.quantity
      from jsonb_to_recordset(v_lines) as lines(
          menu_item_id uuid,
          item_name text,
          category_name text,
          unit_price numeric,
          quantity integer
      );

    return jsonb_build_object(
        'id', v_order_id,
        'order_number', v_order_number,
        'tracking_token', v_tracking_token,
        'status', 'received',
        'total', v_total
    );
end;
$$;

revoke all on function public.submit_order(text, text, text, timestamptz, jsonb) from public;
grant execute on function public.submit_order(text, text, text, timestamptz, jsonb) to anon, authenticated;

create or replace function public.get_order_status(
    p_tracking_token uuid,
    p_customer_phone text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
    select jsonb_build_object(
        'order_number', o.order_number,
        'status', o.status,
        'fulfillment_type', o.fulfillment_type,
        'created_at', o.created_at
    )
    from public.orders o
    where o.tracking_token = p_tracking_token
      and o.customer_phone = trim(p_customer_phone)
    limit 1;
$$;

revoke all on function public.get_order_status(uuid, text) from public;
grant execute on function public.get_order_status(uuid, text) to anon, authenticated;

insert into public.categories (name, slug, icon, sort_order)
values
    ('Coffee', 'coffee', '☕', 1),
    ('Iced Coffee', 'iced', '🧊', 2),
    ('Non-Coffee Drinks', 'non-coffee', '🍫', 3),
    ('Frappes', 'frappes', '🥤', 4),
    ('Tea', 'tea', '🍵', 5),
    ('Pastries', 'pastries', '🥐', 6),
    ('Sandwiches', 'sandwiches', '🍞', 7),
    ('Desserts', 'desserts', '🍰', 8),
    ('Extras', 'extras', '🧃', 9)
on conflict (slug) do update
set name = excluded.name,
    icon = excluded.icon,
    sort_order = excluded.sort_order;

insert into public.menu_items (category_id, name, price, sort_order)
select c.id, seed.name, seed.price, seed.sort_order
from (values
    ('coffee', 'Espresso', 70, 1),
    ('coffee', 'Americano', 90, 2),
    ('coffee', 'Cappuccino', 110, 3),
    ('coffee', 'Latte', 120, 4),
    ('coffee', 'Flat White', 120, 5),
    ('coffee', 'Mocha', 130, 6),
    ('coffee', 'Macchiato', 110, 7),
    ('coffee', 'Cortado', 110, 8),
    ('iced', 'Iced Americano', 100, 1),
    ('iced', 'Iced Latte', 130, 2),
    ('iced', 'Iced Mocha', 140, 3),
    ('iced', 'Cold Brew', 150, 4),
    ('iced', 'Iced Caramel Macchiato', 150, 5),
    ('non-coffee', 'Hot Chocolate', 110, 1),
    ('non-coffee', 'Matcha Latte', 130, 2),
    ('non-coffee', 'Chai Latte', 120, 3),
    ('non-coffee', 'Milk Tea', 120, 4),
    ('non-coffee', 'Vanilla Steamer', 100, 5),
    ('frappes', 'Coffee Frappe', 140, 1),
    ('frappes', 'Mocha Frappe', 150, 2),
    ('frappes', 'Caramel Frappe', 150, 3),
    ('frappes', 'Java Chip Frappe', 160, 4),
    ('frappes', 'Matcha Frappe', 150, 5),
    ('tea', 'Green Tea', 80, 1),
    ('tea', 'Black Tea', 80, 2),
    ('tea', 'Herbal Tea', 90, 3),
    ('tea', 'Chamomile Tea', 90, 4),
    ('tea', 'Peppermint Tea', 90, 5),
    ('pastries', 'Croissant', 90, 1),
    ('pastries', 'Chocolate Croissant', 110, 2),
    ('pastries', 'Muffins', 80, 3),
    ('pastries', 'Danish', 100, 4),
    ('pastries', 'Cinnamon Roll', 110, 5),
    ('pastries', 'Banana Bread', 90, 6),
    ('sandwiches', 'Ham & Cheese Sandwich', 130, 1),
    ('sandwiches', 'Tuna Sandwich', 140, 2),
    ('sandwiches', 'Chicken Sandwich', 150, 3),
    ('sandwiches', 'Grilled Cheese', 120, 4),
    ('sandwiches', 'Clubhouse Sandwich', 180, 5),
    ('desserts', 'Cheesecake', 140, 1),
    ('desserts', 'Chocolate Cake', 130, 2),
    ('desserts', 'Brownies', 90, 3),
    ('desserts', 'Cookies', 60, 4),
    ('desserts', 'Tiramisu', 150, 5),
    ('extras', 'Extra Shot of Espresso', 30, 1),
    ('extras', 'Flavored Syrups', 20, 2),
    ('extras', 'Whipped Cream', 20, 3),
    ('extras', 'Plant-Based Milk', 30, 4)
) as seed(category_slug, name, price, sort_order)
join public.categories c on c.slug = seed.category_slug
where not exists (
    select 1 from public.menu_items existing
    where existing.category_id = c.id and existing.name = seed.name
);

insert into storage.buckets (id, name, public)
values ('menu-photos', 'menu-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view menu photos" on storage.objects;
create policy "Public can view menu photos"
    on storage.objects for select to anon, authenticated
    using (bucket_id = 'menu-photos');

drop policy if exists "Staff can upload menu photos" on storage.objects;
create policy "Staff can upload menu photos"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'menu-photos' and public.can_manage_menu());

drop policy if exists "Staff can update menu photos" on storage.objects;
create policy "Staff can update menu photos"
    on storage.objects for update to authenticated
    using (bucket_id = 'menu-photos' and public.can_manage_menu())
    with check (bucket_id = 'menu-photos' and public.can_manage_menu());

drop policy if exists "Staff can delete menu photos" on storage.objects;
create policy "Staff can delete menu photos"
    on storage.objects for delete to authenticated
    using (bucket_id = 'menu-photos' and public.can_manage_menu());

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.menu_items to anon, authenticated;
grant insert, update, delete on public.categories, public.menu_items to authenticated;
grant select on public.staff_members, public.orders, public.order_items to authenticated;
grant update on public.orders to authenticated;
