import { isSupabaseConfigured, supabase } from './supabase.js';

const currency = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2
});
const menuStatus = document.getElementById('menuStatus');
const tabs = document.getElementById('menuTabs');
const categoriesContainer = document.getElementById('menuCategories');
const cartList = document.getElementById('cartList');
const cartTotal = document.getElementById('cartTotal');
const emptyCart = document.getElementById('emptyCart');
const placeOrderButton = document.getElementById('placeOrderButton');
const orderMessage = document.getElementById('orderMessage');
const trackingMessage = document.getElementById('trackingMessage');
const cart = new Map();

if (!isSupabaseConfigured) {
    menuStatus.textContent = 'The online menu is not configured yet. Please contact the café.';
    menuStatus.classList.add('menu-error');
} else {
    loadMenu();
}

function showMessage(element, message, state = '') {
    element.textContent = message;
    element.dataset.state = state;
}

function setActiveCategory(slug) {
    tabs.querySelectorAll('.menu-tab').forEach(tab => {
        const selected = tab.dataset.category === slug;
        tab.classList.toggle('active', selected);
        tab.setAttribute('aria-selected', String(selected));
    });
    categoriesContainer.querySelectorAll('.menu-category').forEach(category => {
        category.classList.toggle('active', category.dataset.category === slug);
    });
}

async function loadMenu() {
    menuStatus.textContent = 'Loading today’s menu…';
    try {
        const { data: categories, error: categoryError } = await supabase
            .from('categories')
            .select('id, name, slug, icon, sort_order')
            .eq('is_active', true)
            .order('sort_order')
            .order('name');
        if (categoryError) throw categoryError;

        const { data: items, error: itemError } = await supabase
            .from('menu_items')
            .select('id, category_id, name, description, image_url, price, is_available, sort_order')
            .eq('is_active', true)
            .order('sort_order')
            .order('name');
        if (itemError) throw itemError;

        renderMenu(categories, items);
    } catch (error) {
        console.error('Unable to load the menu:', error);
        menuStatus.hidden = false;
        menuStatus.classList.add('menu-error');
        menuStatus.textContent = 'We could not load the menu right now. Please try again later.';
    }
}

function renderMenu(categories, items) {
    tabs.replaceChildren();
    categoriesContainer.replaceChildren();
    let firstCategory = null;

    categories.forEach(category => {
        const categoryItems = items.filter(item => item.category_id === category.id);
        if (categoryItems.length === 0) return;
        if (firstCategory === null) firstCategory = category.slug;

        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'menu-tab';
        tab.dataset.category = category.slug;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', 'false');
        tab.textContent = `${category.icon ? `${category.icon} ` : ''}${category.name}`;
        tab.addEventListener('click', () => setActiveCategory(category.slug));
        tabs.append(tab);

        const panel = document.createElement('div');
        panel.className = 'menu-category';
        panel.dataset.category = category.slug;
        panel.setAttribute('role', 'tabpanel');
        const grid = document.createElement('div');
        grid.className = 'menu-grid';
        categoryItems.forEach(item => grid.append(createMenuItem(item)));
        panel.append(grid);
        categoriesContainer.append(panel);
    });

    if (firstCategory) setActiveCategory(firstCategory);
    if (categoriesContainer.childElementCount === 0) {
        menuStatus.hidden = false;
        menuStatus.classList.remove('menu-error');
        menuStatus.textContent = 'The menu is being updated. Please check back soon.';
    } else {
        menuStatus.hidden = true;
    }
    renderCart();
}

function createMenuItem(item) {
    const card = document.createElement('article');
    card.className = 'menu-item';

    if (item.image_url) {
        const image = document.createElement('img');
        image.className = 'menu-item-photo';
        image.src = item.image_url;
        image.alt = '';
        image.loading = 'lazy';
        card.append(image);
    }

    const copy = document.createElement('div');
    copy.className = 'menu-item-copy';
    const name = document.createElement('span');
    name.className = 'menu-item-name';
    name.textContent = item.name;
    copy.append(name);
    if (item.description) {
        const description = document.createElement('p');
        description.className = 'menu-item-description';
        description.textContent = item.description;
        copy.append(description);
    }

    const action = document.createElement('div');
    action.className = 'menu-item-action';
    const price = document.createElement('span');
    price.className = 'menu-item-price';
    price.textContent = currency.format(item.price);
    action.append(price);
    if (item.is_available) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'shop-button';
        button.textContent = 'Add';
        button.setAttribute('aria-label', `Add ${item.name} to your order`);
        button.addEventListener('click', () => addToCart(item));
        action.append(button);
    } else {
        const soldOut = document.createElement('span');
        soldOut.className = 'sold-out';
        soldOut.textContent = 'Sold out';
        action.append(soldOut);
    }
    card.append(copy, action);
    return card;
}

function addToCart(item) {
    const current = cart.get(item.id);
    cart.set(item.id, { item, quantity: (current?.quantity ?? 0) + 1 });
    renderCart();
}

function renderCart() {
    cartList.replaceChildren();
    let total = 0;
    cart.forEach(({ item, quantity }) => {
        total += Number(item.price) * quantity;
        const line = document.createElement('li');
        line.className = 'cart-line';
        const info = document.createElement('div');
        info.className = 'cart-line-info';
        const name = document.createElement('strong');
        name.textContent = item.name;
        const linePrice = document.createElement('div');
        linePrice.textContent = `${quantity} × ${currency.format(item.price)}`;
        info.append(name, linePrice);

        const controls = document.createElement('div');
        controls.className = 'cart-controls';
        const decrement = document.createElement('button');
        decrement.type = 'button';
        decrement.textContent = '−';
        decrement.setAttribute('aria-label', `Remove one ${item.name}`);
        decrement.addEventListener('click', () => changeQuantity(item.id, -1));
        const count = document.createElement('span');
        count.textContent = String(quantity);
        const increment = document.createElement('button');
        increment.type = 'button';
        increment.textContent = '+';
        increment.setAttribute('aria-label', `Add one ${item.name}`);
        increment.addEventListener('click', () => changeQuantity(item.id, 1));
        controls.append(decrement, count, increment);
        line.append(info, controls);
        cartList.append(line);
    });

    const hasItems = cart.size > 0;
    emptyCart.hidden = hasItems;
    cartTotal.textContent = hasItems ? `Total: ${currency.format(total)}` : '';
    placeOrderButton.disabled = !hasItems;
}

function changeQuantity(id, delta) {
    const current = cart.get(id);
    if (!current) return;
    const quantity = current.quantity + delta;
    if (quantity < 1) cart.delete(id);
    else cart.set(id, { ...current, quantity });
    renderCart();
}

document.getElementById('checkoutForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!isSupabaseConfigured || cart.size === 0) return;

    const form = event.currentTarget;
    const values = new FormData(form);
    const requestedAt = values.get('requested_at');
    const requestedDate = requestedAt ? new Date(requestedAt) : null;
    const requestedIso = requestedDate && !Number.isNaN(requestedDate.getTime())
        ? requestedDate.toISOString()
        : null;
    placeOrderButton.disabled = true;
    showMessage(orderMessage, 'Submitting your order…');

    try {
        const { data, error } = await supabase.rpc('submit_order', {
            p_customer_name: values.get('customer_name'),
            p_customer_phone: values.get('customer_phone'),
            p_fulfillment_type: values.get('fulfillment_type'),
            p_requested_at: requestedIso,
            p_items: Array.from(cart.values(), ({ item, quantity }) => ({
                item_id: item.id,
                quantity
            }))
        });
        if (error) throw error;

        cart.clear();
        renderCart();
        form.reset();
        const tokenInput = document.querySelector('#trackOrderForm [name="tracking_token"]');
        tokenInput.value = data.tracking_token;
        showMessage(
            orderMessage,
            `Order #${data.order_number} received. Total ${currency.format(data.total)}. Save your order reference to track it.`,
            'success'
        );
    } catch (error) {
        console.error('Unable to submit order:', error);
        showMessage(orderMessage, error.message || 'We could not submit your order. Please try again.', 'error');
    } finally {
        placeOrderButton.disabled = cart.size === 0;
    }
});

document.getElementById('trackOrderForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!isSupabaseConfigured) return;
    const values = new FormData(event.currentTarget);
    showMessage(trackingMessage, 'Looking up your order…');

    try {
        const { data, error } = await supabase.rpc('get_order_status', {
            p_tracking_token: values.get('tracking_token'),
            p_customer_phone: values.get('customer_phone')
        });
        if (error) throw error;
        if (!data) {
            showMessage(trackingMessage, 'No order matched that reference and phone number.', 'error');
            return;
        }
        const status = data.status.replace('_', ' ');
        showMessage(
            trackingMessage,
            `Order #${data.order_number}: ${status}. ${data.fulfillment_type === 'pickup' ? 'Pickup' : 'Dine-in'}.`,
            'success'
        );
    } catch (error) {
        console.error('Unable to look up order:', error);
        showMessage(trackingMessage, 'We could not check the order status. Verify the reference and try again.', 'error');
    }
});
