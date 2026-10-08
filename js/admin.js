import { isSupabaseConfigured, supabase } from './supabase.js';

const money = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2
});
const loginPanel = document.getElementById('loginPanel');
const dashboard = document.getElementById('dashboard');
const loginMessage = document.getElementById('loginMessage');
const categoriesTable = document.getElementById('categoriesTable');
const itemsTable = document.getElementById('itemsTable');
const ordersTable = document.getElementById('ordersTable');
const categoryForm = document.getElementById('categoryForm');
const itemForm = document.getElementById('itemForm');
const categoryMessage = document.getElementById('categoryMessage');
const itemMessage = document.getElementById('itemMessage');
let staff = null;
let categories = [];
let items = [];
let refreshTimer = null;

if (!isSupabaseConfigured) {
    document.getElementById('loginButton').disabled = true;
    setMessage(loginMessage, 'Set the Supabase URL and public anon key in js/config.js to enable staff sign in.', 'error');
} else {
    restoreSession();
}

function setMessage(element, message, state = '') {
    element.textContent = message;
    element.dataset.state = state;
}

async function restoreSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        setMessage(loginMessage, error.message, 'error');
        return;
    }
    if (data.session) await enterDashboard(data.session.user);
}

document.getElementById('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!isSupabaseConfigured) return;
    const button = document.getElementById('loginButton');
    const values = new FormData(event.currentTarget);
    button.disabled = true;
    setMessage(loginMessage, 'Signing in…');
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: values.get('email'),
            password: values.get('password')
        });
        if (error) throw error;
        await enterDashboard(data.user);
    } catch (error) {
        console.error('Staff sign-in failed:', error);
        setMessage(loginMessage, error.message || 'Unable to sign in.', 'error');
    } finally {
        button.disabled = false;
    }
});

async function enterDashboard(user) {
    const { data: staffRecord, error } = await supabase
        .from('staff_members')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
    if (error || !staffRecord) {
        await supabase.auth.signOut();
        if (error) console.error('Unable to verify staff access:', error);
        loginPanel.hidden = false;
        dashboard.hidden = true;
        document.getElementById('sessionBar').hidden = true;
        setMessage(loginMessage, error?.message || 'This account has no café staff access.', 'error');
        return;
    }

    staff = { user, role: staffRecord.role };
    loginPanel.hidden = true;
    dashboard.hidden = false;
    document.getElementById('sessionBar').hidden = false;
    document.getElementById('staffLabel').textContent = `${user.email} · ${staff.role}`;
    const canManageMenu = ['owner', 'manager'].includes(staff.role);
    document.querySelector('[aria-labelledby="categoryHeading"]').hidden = !canManageMenu;
    document.querySelector('[aria-labelledby="itemHeading"]').hidden = !canManageMenu;
    await refreshDashboard();
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => refreshDashboard(), 20_000);
}

document.getElementById('signOutButton').addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Sign-out failed:', error);
        window.alert(`Could not sign out: ${error.message}`);
        return;
    }
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
    staff = null;
    dashboard.hidden = true;
    loginPanel.hidden = false;
    document.getElementById('sessionBar').hidden = true;
});

document.getElementById('refreshButton').addEventListener('click', refreshDashboard);

async function refreshDashboard() {
    if (!staff) return;
    await Promise.all([
        loadOrders(),
        loadSales()
    ]);
    if (['owner', 'manager'].includes(staff.role)) await loadMenu();
}

async function loadMenu() {
    try {
        const [categoryResult, itemResult] = await Promise.all([
            supabase.from('categories').select('*').order('sort_order').order('name'),
            supabase.from('menu_items').select('*').order('sort_order').order('name')
        ]);
        if (categoryResult.error) throw categoryResult.error;
        if (itemResult.error) throw itemResult.error;
        categories = categoryResult.data;
        items = itemResult.data;
        renderCategories();
        renderItems();
        populateCategorySelect();
    } catch (error) {
        console.error('Unable to load menu administration:', error);
        setMessage(itemMessage, `Could not load menu data: ${error.message}`, 'error');
    }
}

function populateCategorySelect() {
    const select = itemForm.elements.category_id;
    const previousValue = select.value;
    select.replaceChildren();
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.append(option);
    });
    if (categories.some(category => category.id === previousValue)) select.value = previousValue;
}

function renderCategories() {
    categoriesTable.replaceChildren();
    categories.forEach(category => {
        const row = document.createElement('tr');
        appendCell(row, `${category.icon ? `${category.icon} ` : ''}${category.name}`);
        appendCell(row, category.slug);
        appendCell(row, String(category.sort_order));
        appendCell(row, category.is_active ? 'Yes' : 'No');
        const actions = document.createElement('td');
        const buttons = document.createElement('div');
        buttons.className = 'table-actions';
        buttons.append(
            makeButton('Edit', () => editCategory(category)),
            makeButton('Delete', () => deleteCategory(category))
        );
        actions.append(buttons);
        row.append(actions);
        categoriesTable.append(row);
    });
}

function renderItems() {
    itemsTable.replaceChildren();
    const categoryById = new Map(categories.map(category => [category.id, category.name]));
    items.forEach(item => {
        const row = document.createElement('tr');
        appendCell(row, item.name);
        appendCell(row, categoryById.get(item.category_id) || '—');
        appendCell(row, money.format(item.price));
        appendCell(row, String(item.sort_order));
        appendCell(row, `${item.is_available ? 'Available' : 'Sold out'} · ${item.is_active ? 'Visible' : 'Hidden'}`);
        const actions = document.createElement('td');
        const buttons = document.createElement('div');
        buttons.className = 'table-actions';
        buttons.append(
            makeButton('Edit', () => editItem(item)),
            makeButton(item.is_available ? 'Mark sold out' : 'Mark available', () => toggleAvailability(item)),
            makeButton('Delete', () => deleteItem(item))
        );
        actions.append(buttons);
        row.append(actions);
        itemsTable.append(row);
    });
}

function appendCell(row, text) {
    const cell = document.createElement('td');
    cell.textContent = text;
    row.append(cell);
}

function makeButton(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
}

function editCategory(category) {
    categoryForm.elements.id.value = category.id;
    categoryForm.elements.name.value = category.name;
    categoryForm.elements.slug.value = category.slug;
    categoryForm.elements.icon.value = category.icon;
    categoryForm.elements.sort_order.value = category.sort_order;
    categoryForm.elements.is_active.checked = category.is_active;
    document.getElementById('cancelCategoryEdit').hidden = false;
    categoryForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.getElementById('cancelCategoryEdit').addEventListener('click', () => {
    categoryForm.reset();
    categoryForm.elements.id.value = '';
    categoryForm.elements.sort_order.value = '0';
    document.getElementById('cancelCategoryEdit').hidden = true;
});

categoryForm.addEventListener('submit', async event => {
    event.preventDefault();
    const values = new FormData(categoryForm);
    const id = values.get('id');
    const record = {
        name: String(values.get('name')).trim(),
        slug: String(values.get('slug')).trim(),
        icon: String(values.get('icon')).trim(),
        sort_order: Number(values.get('sort_order')),
        is_active: categoryForm.elements.is_active.checked
    };
    try {
        const result = id
            ? await supabase.from('categories').update(record).eq('id', id)
            : await supabase.from('categories').insert(record);
        if (result.error) throw result.error;
        categoryForm.reset();
        categoryForm.elements.id.value = '';
        categoryForm.elements.sort_order.value = '0';
        document.getElementById('cancelCategoryEdit').hidden = true;
        setMessage(categoryMessage, 'Category saved.', 'success');
        await loadMenu();
    } catch (error) {
        console.error('Unable to save category:', error);
        setMessage(categoryMessage, error.message || 'Could not save category.', 'error');
    }
});

async function deleteCategory(category) {
    if (!window.confirm(`Delete "${category.name}"? Reassign its menu items first.`)) return;
    try {
        const { count, error: countError } = await supabase
            .from('menu_items')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', category.id);
        if (countError) throw countError;
        if (count > 0) throw new Error('This category still has menu items. Reassign or delete them first.');
        const { error } = await supabase.from('categories').delete().eq('id', category.id);
        if (error) throw error;
        setMessage(categoryMessage, 'Category deleted.', 'success');
        await loadMenu();
    } catch (error) {
        console.error('Unable to delete category:', error);
        setMessage(categoryMessage, error.message || 'Could not delete category.', 'error');
    }
}

function editItem(item) {
    itemForm.elements.id.value = item.id;
    itemForm.elements.name.value = item.name;
    itemForm.elements.category_id.value = item.category_id || '';
    itemForm.elements.price.value = item.price;
    itemForm.elements.sort_order.value = item.sort_order;
    itemForm.elements.description.value = item.description;
    itemForm.elements.image_url.value = item.image_url || '';
    itemForm.elements.is_available.checked = item.is_available;
    itemForm.elements.is_active.checked = item.is_active;
    itemForm.elements.photo.value = '';
    document.getElementById('cancelItemEdit').hidden = false;
    itemForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.getElementById('cancelItemEdit').addEventListener('click', () => {
    itemForm.reset();
    itemForm.elements.id.value = '';
    itemForm.elements.sort_order.value = '0';
    document.getElementById('cancelItemEdit').hidden = true;
});

itemForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = document.getElementById('saveItemButton');
    const values = new FormData(itemForm);
    const id = values.get('id');
    const record = {
        name: String(values.get('name')).trim(),
        category_id: values.get('category_id'),
        price: Number(values.get('price')),
        sort_order: Number(values.get('sort_order')),
        description: String(values.get('description')).trim(),
        image_url: String(values.get('image_url')).trim() || null,
        is_available: itemForm.elements.is_available.checked,
        is_active: itemForm.elements.is_active.checked
    };
    const photo = values.get('photo');
    button.disabled = true;
    setMessage(itemMessage, 'Saving item…');
    try {
        if (photo instanceof File && photo.size > 0) {
            if (!photo.type.startsWith('image/')) throw new Error('Choose an image file.');
            if (photo.size > 8 * 1024 * 1024) throw new Error('Image files must be 8 MB or smaller.');
            const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `${staff.user.id}/${crypto.randomUUID()}-${safeName}`;
            const { error: uploadError } = await supabase.storage
                .from('menu-photos')
                .upload(path, photo, { contentType: photo.type, upsert: false });
            if (uploadError) throw uploadError;
            record.image_url = supabase.storage.from('menu-photos').getPublicUrl(path).data.publicUrl;
        }

        const result = id
            ? await supabase.from('menu_items').update(record).eq('id', id)
            : await supabase.from('menu_items').insert(record);
        if (result.error) throw result.error;
        itemForm.reset();
        itemForm.elements.id.value = '';
        itemForm.elements.sort_order.value = '0';
        document.getElementById('cancelItemEdit').hidden = true;
        setMessage(itemMessage, 'Menu item saved.', 'success');
        await loadMenu();
    } catch (error) {
        console.error('Unable to save menu item:', error);
        setMessage(itemMessage, error.message || 'Could not save menu item.', 'error');
    } finally {
        button.disabled = false;
    }
});

async function toggleAvailability(item) {
    const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !item.is_available })
        .eq('id', item.id);
    if (error) {
        console.error('Unable to update availability:', error);
        setMessage(itemMessage, error.message || 'Could not update availability.', 'error');
        return;
    }
    setMessage(itemMessage, 'Availability updated.', 'success');
    await loadMenu();
}

async function deleteItem(item) {
    if (!window.confirm(`Permanently delete "${item.name}" from the menu? Past order receipts retain the item name and price.`)) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', item.id);
    if (error) {
        console.error('Unable to delete menu item:', error);
        setMessage(itemMessage, error.message || 'Could not delete menu item.', 'error');
        return;
    }
    setMessage(itemMessage, 'Menu item deleted.', 'success');
    await loadMenu();
}

async function loadOrders() {
    const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, customer_phone, fulfillment_type, requested_at, payment_status, status, total, created_at, order_items(item_name, quantity, unit_price)')
        .order('created_at', { ascending: false })
        .limit(100);
    if (error) {
        console.error('Unable to load orders:', error);
        ordersTable.replaceChildren();
        const row = document.createElement('tr');
        appendCell(row, `Could not load orders: ${error.message}`);
        ordersTable.append(row);
        return;
    }
    renderOrders(data);
}

function renderOrders(orders) {
    ordersTable.replaceChildren();
    if (orders.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 7;
        cell.textContent = 'No active orders.';
        row.append(cell);
        ordersTable.append(row);
        return;
    }

    orders.forEach(order => {
        const row = document.createElement('tr');
        appendCell(row, `#${order.order_number}`);
        appendCell(row, `${order.customer_name}\n${order.customer_phone}`);
        const itemCell = document.createElement('td');
        itemCell.className = 'order-items';
        itemCell.textContent = order.order_items
            .map(line => `${line.quantity} × ${line.item_name}`)
            .join(', ');
        row.append(itemCell);
        appendCell(row, money.format(order.total));
        const requested = order.requested_at ? new Date(order.requested_at).toLocaleString() : 'ASAP';
        appendCell(row, `${order.fulfillment_type === 'pickup' ? 'Pickup' : 'Dine-in'} · ${requested}`);

        const paymentCell = document.createElement('td');
        const paymentSelect = document.createElement('select');
        ['pending', 'paid', 'refunded'].forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status[0].toUpperCase() + status.slice(1);
            paymentSelect.append(option);
        });
        paymentSelect.value = order.payment_status;
        paymentSelect.setAttribute('aria-label', `Payment status for order ${order.order_number}`);
        paymentSelect.addEventListener('change', () => updateOrderField(order.id, 'payment_status', paymentSelect.value, paymentSelect));
        paymentCell.append(paymentSelect);
        row.append(paymentCell);

        const statusCell = document.createElement('td');
        const select = document.createElement('select');
        ['received', 'preparing', 'ready', 'completed', 'cancelled'].forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status[0].toUpperCase() + status.slice(1);
            select.append(option);
        });
        select.value = order.status;
        select.setAttribute('aria-label', `Order status for order ${order.order_number}`);
        select.addEventListener('change', () => updateOrderField(order.id, 'status', select.value, select));
        statusCell.append(select);
        row.append(statusCell);
        ordersTable.append(row);
    });
}

async function updateOrderField(id, field, value, select) {
    select.disabled = true;
    const { error } = await supabase.from('orders').update({ [field]: value }).eq('id', id);
    if (error) {
        console.error(`Unable to update order ${field}:`, error);
        window.alert(`Could not update order ${field}: ${error.message}`);
        await loadOrders();
        return;
    }
    await Promise.all([loadOrders(), loadSales()]);
}

async function loadSales() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const orders = [];
    for (let page = 0; ; page += 1) {
        const { data, error } = await supabase
            .from('orders')
            .select('total, status, created_at, order_items(item_name, category_name, quantity, unit_price)')
            .eq('payment_status', 'paid')
            .neq('status', 'cancelled')
            .gte('created_at', startOfMonth.toISOString())
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .range(page * 1000, page * 1000 + 999);
        if (error) {
            console.error('Unable to load sales summary:', error);
            setMetricError(error.message);
            return;
        }
        orders.push(...data);
        if (data.length < 1000) break;
    }

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    const daysSinceMonday = (startOfWeek.getDay() + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);
    const sumSince = start => orders.reduce(
        (sum, order) => new Date(order.created_at) >= start ? sum + Number(order.total) : sum,
        0
    );
    document.getElementById('salesToday').textContent = money.format(sumSince(startOfDay));
    document.getElementById('salesWeek').textContent = money.format(sumSince(startOfWeek));
    document.getElementById('salesMonth').textContent = money.format(
        orders.reduce((sum, order) => sum + Number(order.total), 0)
    );
    document.getElementById('ordersToday').textContent = String(
        orders.filter(order => new Date(order.created_at) >= startOfDay).length
    );

    renderBestSellers(orders);
    renderCategorySales(orders);
    renderPeakHours(orders);
}

function setMetricError(message) {
    ['salesToday', 'salesWeek', 'salesMonth', 'ordersToday'].forEach(id => {
        document.getElementById(id).textContent = 'Unavailable';
    });
    console.error(message);
}

function renderBarList(containerId, entries, valueLabel) {
    const container = document.getElementById(containerId);
    container.replaceChildren();
    if (entries.length === 0) {
        container.textContent = 'No sales yet this month.';
        return;
    }
    const max = Math.max(...entries.map(entry => entry.value), 1);
    entries.forEach(entry => {
        const row = document.createElement('div');
        row.className = 'bar-row';
        const label = document.createElement('div');
        label.className = 'bar-label';
        const name = document.createElement('span');
        name.textContent = entry.label;
        const value = document.createElement('span');
        value.textContent = valueLabel(entry.value);
        label.append(name, value);
        const track = document.createElement('div');
        track.className = 'bar-track';
        const fill = document.createElement('div');
        fill.className = 'bar-fill';
        fill.style.width = `${Math.max((entry.value / max) * 100, 1)}%`;
        track.append(fill);
        row.append(label, track);
        container.append(row);
    });
}

function renderBestSellers(orders) {
    const quantities = new Map();
    orders.forEach(order => order.order_items.forEach(item => {
        quantities.set(item.item_name, (quantities.get(item.item_name) || 0) + item.quantity);
    }));
    const bestSellers = Array.from(quantities, ([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    renderBarList('bestSellers', bestSellers, count => `${count} sold`);
}

function renderCategorySales(orders) {
    const totals = new Map();
    orders.forEach(order => order.order_items.forEach(item => {
        totals.set(item.category_name, (totals.get(item.category_name) || 0) + Number(item.unit_price) * item.quantity);
    }));
    const categoryTotals = Array.from(totals, ([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
    renderBarList('categorySales', categoryTotals, value => money.format(value));
}

function renderPeakHours(orders) {
    const counts = new Map();
    orders.forEach(order => {
        const hour = new Date(order.created_at).getHours();
        counts.set(hour, (counts.get(hour) || 0) + 1);
    });
    const hours = Array.from(counts, ([hour, value]) => ({
        label: new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: 'numeric' }),
        value
    })).sort((a, b) => b.value - a.value).slice(0, 6);
    renderBarList('peakHours', hours, count => `${count} orders`);
}
