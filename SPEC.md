# Hebrew Coffee Shop Website Specification

## 1. Project Overview

- **Project Name**: Hebrew Coffee Shop Website
- **Type**: Single-page responsive website
- **Core Functionality**: Showcase a premium coffee shop brand with full menu display, about section, and contact information
- **Target Users**: Coffee enthusiasts, local customers, potential patrons seeking a cozy café atmosphere

---

## 2. UI/UX Specification

### Layout Structure

**Page Sections (in order):**
1. Navigation Bar (sticky)
2. Hero Section
3. About Section
4. Menu Section (with categorized subsections)
5. Gallery Section
6. Contact Section
7. Footer

**Responsive Breakpoints:**
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Visual Design

**Color Palette:**
- Primary Dark Brown: `#3E2723`
- Secondary Brown: `#5D4037`
- Warm Cream: `#F5F0E8`
- Soft Beige: `#D7CCC8`
- Accent Gold: `#C4A77D`
- Text Dark: `#2C1810`
- Text Light: `#6D4C41`
- White: `#FFFFFF`
- Accent Coral: `#A1887F`

**Typography:**
- Headings: "Playfair Display", serif (elegant, premium feel)
- Body: "Lato", sans-serif (clean, readable)
- Logo/Brand: "Playfair Display", serif
- Font Sizes:
  - H1 (Hero): 4rem (desktop), 2.5rem (mobile)
  - H2 (Section Titles): 2.5rem (desktop), 1.8rem (mobile)
  - H3 (Menu Categories): 1.5rem
  - Body: 1rem
  - Small: 0.875rem

**Spacing System:**
- Section Padding: 80px vertical (desktop), 50px (mobile)
- Container Max Width: 1200px
- Grid Gap: 30px
- Card Padding: 25px

**Visual Effects:**
- Box shadows: `0 4px 20px rgba(62, 39, 35, 0.1)`
- Border radius: 12px for cards, 8px for buttons
- Smooth transitions: 0.3s ease for all interactive elements
- Subtle hover lift effect on cards

### Components

**Navigation Bar:**
- Fixed/sticky at top
- Logo on left ("Hebrew")
- Nav links: Home, About, Menu, Contact
- Background: semi-transparent cream with blur
- Mobile: hamburger menu

**Hero Section:**
- Full viewport height (100vh)
- Background: coffee imagery with dark overlay
- Centered content: Logo + tagline
- CTA button: "Visit Us"

**About Section:**
- Two-column layout (text + image)
- Warm background
- Icon highlights for quality, community, vibe

**Menu Section:**
- Category tabs or scrollable sections
- Grid layout for menu items
- Each item: name + price
- Category headers with icons

**Gallery Section:**
- 3-column grid (desktop), 2-column (tablet), 1-column (mobile)
- Hover zoom effect
- Placeholder coffee images

**Contact Section:**
- Three columns: Location, Contact, Social Media
- Map placeholder or address
- Phone number
- Social media icons

**Footer:**
- Simple centered design
- Copyright text

---

## 3. Functionality Specification

### Core Features

1. **Smooth Scrolling**: Clicking nav links scrolls smoothly to sections
2. **Sticky Navigation**: Nav stays visible on scroll with background change
3. **Menu Display**: All menu categories with items and prices in ₱
4. **Responsive Design**: Works on all device sizes
5. **Interactive Elements**: Hover effects on buttons and cards
6. **Mobile Menu**: Toggle hamburger menu on mobile

### User Interactions

- Nav link click → smooth scroll to section
- CTA button click → scroll to contact section
- Mobile menu toggle → slide-in menu
- Menu item hover → subtle lift effect

### Animations

- Fade-in on scroll for sections
- Button hover: scale + color change
- Card hover: translateY(-5px) + shadow increase
- Nav background: opacity change on scroll

---

## 4. Acceptance Criteria

### Visual Checkpoints
- [ ] Hero displays "Hebrew" with "Brewed with Purpose" tagline
- [ ] Color scheme uses brown, cream, beige earthy tones
- [ ] Typography is elegant (Playfair Display for headings)
- [ ] Navigation is sticky and changes on scroll
- [ ] Menu displays all categories with ₱ prices
- [ ] All sections are responsive
- [ ] Smooth scrolling works
- [ ] Mobile hamburger menu functions

### Content Checkpoints
- [ ] All menu items from spec are included
- [ ] About section mentions quality, community, relaxing vibe
- [ ] Contact section has location, phone, social icons
- [ ] Footer displays copyright

---

## 5. Menu Data

### ☕ Coffee (8 items)
- Espresso — ₱70
- Americano — ₱90
- Cappuccino — ₱110
- Latte — ₱120
- Flat White — ₱120
- Mocha — ₱130
- Macchiato — ₱110
- Cortado — ₱110

### 🧊 Iced Coffee (5 items)
- Iced Americano — ₱100
- Iced Latte — ₱130
- Iced Mocha — ₱140
- Cold Brew — ₱150
- Iced Caramel Macchiato — ₱150

### 🍫 Non-Coffee Drinks (5 items)
- Hot Chocolate — ₱110
- Matcha Latte — ₱130
- Chai Latte — ₱120
- Milk Tea — ₱120
- Vanilla Steamer — ₱100

### 🥤 Blended / Frappes (5 items)
- Coffee Frappe — ₱140
- Mocha Frappe — ₱150
- Caramel Frappe — ₱150
- Java Chip Frappe — ₱160
- Matcha Frappe — ₱150

### 🍵 Tea (5 items)
- Green Tea — ₱80
- Black Tea — ₱80
- Herbal Tea — ₱90
- Chamomile Tea — ₱90
- Peppermint Tea — ₱90

### 🥐 Pastries (6 items)
- Croissant — ₱90
- Chocolate Croissant — ₱110
- Muffins — ₱80
- Danish — ₱100
- Cinnamon Roll — ₱110
- Banana Bread — ₱90

### 🍞 Sandwiches & Light Meals (5 items)
- Ham & Cheese Sandwich — ₱130
- Tuna Sandwich — ₱140
- Chicken Sandwich — ₱150
- Grilled Cheese — ₱120
- Clubhouse Sandwich — ₱180

### 🍰 Desserts (5 items)
- Cheesecake — ₱140
- Chocolate Cake — ₱130
- Brownies — ₱90
- Cookies — ₱60
- Tiramisu — ₱150

### 🧃 Extras (4 items)
- Extra Shot of Espresso — ₱30
- Flavored Syrups — ₱20
- Whipped Cream — ₱20
- Plant-Based Milk — ₱30