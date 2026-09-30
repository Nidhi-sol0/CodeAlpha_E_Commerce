"use strict";

const API_BASE = window.LUMACART_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "lumacart_token";
const CART_KEY = "lumacart_cart";
const WISHLIST_KEY = "lumacart_wishlist";
const CURRENCY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
function cartSetting(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? Math.min(maximum, Math.max(0, parsed)) : fallback;
}
const cartPricing = Object.freeze({
	freeShippingThreshold: cartSetting(window.LUMACART_CART_CONFIG?.freeShippingThreshold, 100),
	shippingFee: cartSetting(window.LUMACART_CART_CONFIG?.shippingFee, 8.95),
	taxRate: cartSetting(window.LUMACART_CART_CONFIG?.taxRate, 0.08, 1)
});
const productCache = new Map();
let currentUser = null;

function readStorage(key, fallback) {
	try {
		const value = JSON.parse(localStorage.getItem(key));
		return value ?? fallback;
	} catch {
		return fallback;
	}
}

function writeStorage(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		showToast("Your browser could not save this change.", "error");
	}
}

function escapeHtml(value = "") {
	return String(value).replace(/[&<>"']/g, (character) => ({
		"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
	})[character]);
}

function price(value) {
	return CURRENCY.format(Number(value) || 0);
}

async function apiRequest(path, options = {}) {
	const headers = new Headers(options.headers || {});
	if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
	const token = localStorage.getItem(TOKEN_KEY);
	if (token) headers.set("Authorization", `Bearer ${token}`);

	let response;
	try {
		response = await fetch(`${API_BASE}${path}`, { ...options, headers });
	} catch {
		throw new Error("We couldn't reach LumaCart. Check that the API is running and try again.");
	}

	const result = await response.json().catch(() => ({}));
	if (!response.ok || result.success === false) {
		if (response.status === 401 && token) localStorage.removeItem(TOKEN_KEY);
		const error = new Error(result.error || "Something went wrong. Please try again.");
		error.status = response.status;
		throw error;
	}
	return result;
}

function showToast(message, kind = "success") {
	const region = document.getElementById("toast-region");
	if (!region) return;
	const toast = document.createElement("div");
	toast.className = `toast toast-${kind}`;
	toast.setAttribute("role", "status");
	toast.textContent = message;
	region.append(toast);
	window.setTimeout(() => {
		toast.classList.add("toast-out");
		window.setTimeout(() => toast.remove(), 220);
	}, 3200);
}

function cartItems() {
	const items = readStorage(CART_KEY, []);
	if (!Array.isArray(items)) return [];
	return items.filter((item) => item && typeof item === "object")
		.map((item) => ({
			...item,
			productId: String(item.productId || item.id || ""),
			quantity: Math.max(1, Math.floor(Number(item.quantity) || 1))
		}))
		.filter((item) => item.productId);
}

function wishlistIds() {
	const ids = readStorage(WISHLIST_KEY, []);
	return Array.isArray(ids) ? [...new Set(ids.filter((id) => typeof id === "string" && id))] : [];
}

function renderHeader() {
	const mount = document.getElementById("site-header");
	if (!mount) return;
	const count = cartItems().reduce((sum, item) => sum + item.quantity, 0);
	const savedCount = wishlistIds().length;
	const currentSearch = new URLSearchParams(window.location.search).get("search") || "";
	mount.innerHTML = `
		<div class="announcement-bar"><span>Thoughtful finds, chosen for everyday</span><a href="./shop.html">Discover the collection <span aria-hidden="true">→</span></a></div>
		<header class="site-header"><div class="header-main wrap">
			<button id="mobile-menu-toggle" class="icon-button mobile-menu-toggle" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="primary-navigation"><span aria-hidden="true">☰</span></button>
			<a class="brand" href="./index.html" aria-label="LumaCart home">luma<span>cart</span><i aria-hidden="true">.</i></a>
			<nav id="primary-navigation" class="primary-navigation" aria-label="Main navigation"><a href="./shop.html">Shop</a><a href="./shop.html?category=Home%20%26%20Living">Home &amp; living</a><a href="./shop.html?sort=newest">New in</a></nav>
			<form id="header-search" class="header-search" role="search"><label class="sr-only" for="header-search-input">Search products</label><input id="header-search-input" name="search" type="search" placeholder="Search products" autocomplete="off"><button type="submit" aria-label="Search"><span aria-hidden="true">⌕</span></button></form>
			<div class="header-actions"><a class="header-action wishlist-link" href="./wishlist.html" aria-label="Wishlist, ${savedCount} saved items"><span aria-hidden="true">♡</span><span class="header-action-label">Saved</span>${savedCount ? `<span class="action-count">${savedCount}</span>` : ""}</a><button class="header-action cart-open" type="button" data-open-cart aria-label="Shopping bag, ${count} items"><span aria-hidden="true">▱</span><span class="header-action-label">Bag</span><span class="action-count cart-count" ${count ? "" : "hidden"}>${count}</span></button>${currentUser ? `<a class="header-action account-link" href="./account.html" aria-label="Account"><span aria-hidden="true">○</span><span class="header-action-label">Account</span></a><button class="header-action logout-link" type="button" data-logout aria-label="Log out"><span class="header-action-label">Log out</span></button>` : `<a class="header-action account-link" href="./login.html" aria-label="Login"><span aria-hidden="true">○</span><span class="header-action-label">Login</span></a><a class="header-register" href="./register.html" aria-label="Register">Register</a>`}</div>
		</div></header>`;
	const searchInput = mount.querySelector("#header-search-input");
	if (searchInput) searchInput.value = currentSearch;

	const footer = document.getElementById("site-footer");
	if (footer) footer.innerHTML = `<footer class="site-footer"><div class="wrap footer-main"><div class="footer-brand"><a class="brand brand-footer" href="./index.html">luma<span>cart</span><i aria-hidden="true">.</i></a><p>Thoughtful finds for the everyday.</p></div><div class="footer-column"><h2>Explore</h2><a href="./shop.html">Shop all</a><a href="./shop.html?sort=newest">New arrivals</a><a href="./shop.html?category=Home%20%26%20Living">Home &amp; living</a></div><div class="footer-column"><h2>Your account</h2><a href="./login.html">Sign in</a><a href="./register.html">Create account</a><a href="./account.html">Profile</a></div><div class="footer-note"><span>GOOD THINGS, WELL CHOSEN</span><p>Made for real life, and the little moments in it.</p></div></div><div class="wrap footer-bottom"><span>© 2026 LumaCart</span><span>Considered goods. Everyday good.</span></div></footer>`;
}

async function syncUser() {
	const token = localStorage.getItem(TOKEN_KEY);
	if (!token) {
		currentUser = null;
		renderHeader();
		return null;
	}
	try {
		const response = await apiRequest("/auth/me");
		currentUser = response.data.user;
	} catch {
		currentUser = null;
		localStorage.removeItem(TOKEN_KEY);
	}
	renderHeader();
	return currentUser;
}

function productCard(product, options = {}) {
	const id = String(product._id || product.id || product.slug);
	productCache.set(id, product);
	const saved = wishlistIds().includes(id);
	const imageUrl = product.images?.[0] || "";
	const discount = Number(product.discount) > 0 ? `<span class="discount-badge">−${product.discount}%</span>` : "";
	const original = Number(product.originalPrice) > Number(product.price)
		? `<span class="price-original">${price(product.originalPrice)}</span>` : "";
	const stars = Number(product.rating) ? `<span class="rating-stars" aria-hidden="true">★★★★★</span><span class="rating-value">${Number(product.rating).toFixed(1)}</span><span class="review-count">(${Number(product.reviewCount) || 0})</span>` : `<span class="review-count">New arrival</span>`;
	return `<article class="product-card${options.wishlistPage ? " wishlist-product-card" : ""}"><div class="product-card-media"><a class="product-image-link" href="./product.html?id=${encodeURIComponent(id)}" aria-label="View ${escapeHtml(product.name)}"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy"></a>${discount}<button class="wishlist-button${saved ? " is-saved" : ""}" type="button" data-wishlist="${escapeHtml(id)}" aria-label="${saved ? "Remove from" : "Add to"} wishlist: ${escapeHtml(product.name)}" aria-pressed="${saved}"><span aria-hidden="true">${saved ? "♥" : "♡"}</span></button></div><div class="product-card-info"><a class="product-title-link" href="./product.html?id=${encodeURIComponent(id)}"><span class="product-category">${escapeHtml(product.category)}</span><h3>${escapeHtml(product.name)}</h3></a><div class="product-rating" aria-label="Rating ${Number(product.rating || 0).toFixed(1)} out of 5">${stars}</div><div class="product-card-bottom"><div class="product-price">${price(product.price)}${original}</div><button class="add-button" type="button" data-add-cart="${escapeHtml(id)}" ${product.stock < 1 ? "disabled" : ""} aria-label="${product.stock < 1 ? "Out of stock" : "Add"} ${escapeHtml(product.name)} to bag">${product.stock < 1 ? "Sold out" : "Add to bag"}</button></div>${options.wishlistPage ? `<button class="wishlist-remove" type="button" data-remove-wishlist="${escapeHtml(id)}">Remove from wishlist</button>` : ""}</div></article>`;
}

function skeletonCards(count = 4) {
	return Array.from({ length: count }, () => `<div class="product-skeleton" aria-hidden="true"><div class="skeleton-image"></div><div class="skeleton-line"></div><div class="skeleton-line skeleton-short"></div><div class="skeleton-line skeleton-price"></div></div>`).join("");
}

function showProductError(container, retry) {
	container.innerHTML = `<div class="empty-state"><span class="empty-mark" aria-hidden="true">!</span><h3>We couldn't load these finds.</h3><p>Check your connection and give it another try.</p><button class="button button-secondary" type="button" data-retry="${retry}">Try again</button></div>`;
}

async function loadProducts(parameters = {}) {
	const query = new URLSearchParams(parameters);
	const response = await apiRequest(`/products?${query}`);
	return response;
}

async function loadProduct(id) {
	const response = await apiRequest(`/products/${encodeURIComponent(id)}`);
	return response.data;
}

async function searchProducts(search) {
	return loadProducts({ search });
}

async function loadHomeShelf(container, parameters) {
	if (!container) return;
	container.innerHTML = skeletonCards(4);
	try {
		const response = await loadProducts({ limit: 4, ...parameters });
		container.innerHTML = response.data.length
			? response.data.map(productCard).join("")
			: `<div class="empty-state"><h3>New discoveries are on the way.</h3><a class="text-link" href="./shop.html">Explore the shop →</a></div>`;
	} catch {
		showProductError(container, "home");
	}
}

function initHome() {
	loadHomeShelf(document.getElementById("featured-products"), { sort: "featured" });
	loadHomeShelf(document.getElementById("new-arrivals"), { sort: "newest" });
}

let shopPage = 1;
let shopBusy = false;

function readShopFilters() {
	return {
		search: new URLSearchParams(window.location.search).get("search") || "",
		category: document.getElementById("category-filter")?.value || "",
		minPrice: document.getElementById("min-price")?.value || "",
		maxPrice: document.getElementById("max-price")?.value || "",
		rating: document.querySelector('input[name="rating"]:checked')?.value || "",
		availability: document.getElementById("stock-filter")?.checked ? "in_stock" : "",
		sort: document.getElementById("sort-products")?.value || "featured",
		page: shopPage,
		limit: 12
	};
}

function updateFilterCount(filters) {
	const count = [filters.category, filters.minPrice, filters.maxPrice, filters.rating, filters.availability].filter(Boolean).length;
	const badge = document.getElementById("active-filter-count");
	if (badge) {
		badge.textContent = String(count);
		badge.hidden = count === 0;
	}
}

async function filterProducts() {
	const grid = document.getElementById("product-grid");
	if (!grid || shopBusy) return;
	const filters = readShopFilters();
	const minimum = filters.minPrice === "" ? null : Number(filters.minPrice);
	const maximum = filters.maxPrice === "" ? null : Number(filters.maxPrice);
	const error = document.getElementById("shop-error");
	if ((minimum !== null && minimum < 0) || (maximum !== null && maximum < 0) || (minimum !== null && maximum !== null && minimum > maximum)) {
		error.hidden = false;
		error.innerHTML = `<p>Enter a valid price range.</p>`;
		return;
	}

	shopBusy = true;
	error.hidden = true;
	grid.setAttribute("aria-busy", "true");
	grid.innerHTML = skeletonCards(8);
	document.getElementById("result-count").textContent = "Finding your next favorite…";
	updateFilterCount(filters);
	const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ""));
	const url = new URL(window.location.href);
	for (const key of ["search", "category", "minPrice", "maxPrice", "rating", "availability", "sort", "page"]) {
		if (query.has(key) && query.get(key)) url.searchParams.set(key, query.get(key));
		else url.searchParams.delete(key);
	}
	history.replaceState(null, "", url);
	try {
		const response = await loadProducts(filters);
		const { data, pagination } = response;
		document.getElementById("result-count").textContent = `${pagination.total} ${pagination.total === 1 ? "find" : "finds"}`;
		grid.innerHTML = data.length
			? data.map(productCard).join("")
			: `<div class="empty-state"><span class="empty-mark" aria-hidden="true">⌕</span><h3>No finds this time.</h3><p>Try another search or clear a filter to see more.</p><button class="button button-secondary" type="button" data-clear-filters>Clear filters</button></div>`;
		renderPagination(pagination);
	} catch (requestError) {
		document.getElementById("result-count").textContent = "Products unavailable";
		grid.innerHTML = "";
		error.hidden = false;
		error.innerHTML = `<div class="empty-state"><span class="empty-mark" aria-hidden="true">!</span><h3>We couldn't load the collection.</h3><p>${escapeHtml(requestError.message)}</p><button class="button button-secondary" type="button" data-retry="shop">Try again</button></div>`;
		document.getElementById("pagination").innerHTML = "";
	} finally {
		shopBusy = false;
		grid.setAttribute("aria-busy", "false");
	}
}

function sortProducts() {
	shopPage = 1;
	filterProducts();
}

function renderPagination(pagination) {
	const nav = document.getElementById("pagination");
	if (!nav || pagination.pages <= 1) {
		if (nav) nav.innerHTML = "";
		return;
	}
	nav.innerHTML = `<button type="button" data-page-number="${pagination.page - 1}" ${pagination.page <= 1 ? "disabled" : ""} aria-label="Previous page">← <span>Previous</span></button><span>Page ${pagination.page} of ${pagination.pages}</span><button type="button" data-page-number="${pagination.page + 1}" ${pagination.page >= pagination.pages ? "disabled" : ""} aria-label="Next page"><span>Next</span> →</button>`;
}

function clearShopFilters() {
	document.getElementById("category-filter").value = "";
	document.getElementById("min-price").value = "";
	document.getElementById("max-price").value = "";
	document.querySelector('input[name="rating"][value=""]').checked = true;
	document.getElementById("stock-filter").checked = false;
	const search = new URL(window.location.href);
	search.searchParams.delete("search");
	history.replaceState(null, "", search);
	shopPage = 1;
	filterProducts();
}

function initShop() {
	const params = new URLSearchParams(window.location.search);
	document.getElementById("category-filter").value = params.get("category") || "";
	document.getElementById("min-price").value = params.get("minPrice") || "";
	document.getElementById("max-price").value = params.get("maxPrice") || "";
	document.getElementById("sort-products").value = params.get("sort") || "featured";
	shopPage = Math.max(1, Number(params.get("page")) || 1);
	const rating = params.get("rating") || "";
	const ratingInput = document.querySelector(`input[name="rating"][value="${CSS.escape(rating)}"]`);
	if (ratingInput) ratingInput.checked = true;
	document.getElementById("stock-filter").checked = ["true", "in_stock"].includes(params.get("availability"));
	document.getElementById("category-filter").addEventListener("change", sortProducts);
	document.getElementById("min-price").addEventListener("change", sortProducts);
	document.getElementById("max-price").addEventListener("change", sortProducts);
	document.querySelectorAll('input[name="rating"]').forEach((input) => input.addEventListener("change", sortProducts));
	document.getElementById("stock-filter").addEventListener("change", sortProducts);
	document.getElementById("sort-products").addEventListener("change", sortProducts);
	document.getElementById("clear-filters").addEventListener("click", clearShopFilters);
	document.getElementById("open-filters").addEventListener("click", () => setFilterDrawer(true));
	document.getElementById("close-filters").addEventListener("click", () => setFilterDrawer(false));
	document.getElementById("filter-scrim").addEventListener("click", () => setFilterDrawer(false));
	filterProducts();
}

function setFilterDrawer(open) {
	const panel = document.getElementById("filter-panel");
	const scrim = document.getElementById("filter-scrim");
	const trigger = document.getElementById("open-filters");
	panel?.classList.toggle("is-open", open);
	if (scrim) scrim.hidden = !open;
	trigger?.setAttribute("aria-expanded", String(open));
	document.body.classList.toggle("drawer-open", open);
	if (open) document.getElementById("close-filters")?.focus();
}

async function refreshCartItems() {
	const savedItems = cartItems();
	const results = await Promise.all(savedItems.map(async (item) => {
		try {
			const product = await loadProduct(item.productId);
			if (Number(product.stock) < 1) return { item: null, unavailable: true };
			const quantity = Math.min(item.quantity, Number(product.stock));
			return {
				item: {
					productId: String(product._id),
					name: product.name,
					image: product.images?.[0] || "",
					quantity,
					price: Number(product.price),
					stock: Number(product.stock)
				},
				capped: quantity < item.quantity
			};
		} catch (error) {
			if (error.status === 404) return { item: null, unavailable: true };
			throw error;
		}
	}));
	const updatedItems = results.map((result) => result.item).filter(Boolean);
	writeStorage(CART_KEY, updatedItems);
	if (results.some((result) => result.unavailable)) showToast("Unavailable items were removed from your bag.", "error");
	if (results.some((result) => result.capped)) showToast("A quantity was adjusted to match current stock.", "error");
	return updatedItems;
}

function cartTotals(items) {
	const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
	const shipping = subtotal === 0 || subtotal >= cartPricing.freeShippingThreshold ? 0 : cartPricing.shippingFee;
	const tax = Math.round(subtotal * cartPricing.taxRate * 100) / 100;
	return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}

function renderCartLoading() {
	const dialog = document.getElementById("cart-dialog");
	if (!dialog) return;
	dialog.innerHTML = `<div class="cart-header"><div><p class="eyebrow">YOUR LUMACART</p><h2 id="cart-title">Shopping bag</h2></div><button class="icon-button" type="button" data-close-cart aria-label="Close shopping bag">×</button></div><div class="cart-loading" role="status"><span class="cart-spinner" aria-hidden="true"></span><p>Checking current stock and prices…</p><div class="cart-skeleton-line"></div><div class="cart-skeleton-line"></div></div>`;
}

function renderCartError(error) {
	const dialog = document.getElementById("cart-dialog");
	if (!dialog) return;
	dialog.innerHTML = `<div class="cart-header"><div><p class="eyebrow">YOUR LUMACART</p><h2 id="cart-title">Shopping bag</h2></div><button class="icon-button" type="button" data-close-cart aria-label="Close shopping bag">×</button></div><div class="empty-state cart-error" role="alert"><span class="empty-mark" aria-hidden="true">!</span><h3>We couldn't refresh your bag.</h3><p>${escapeHtml(error.message)}</p><button class="button button-secondary" type="button" data-retry="cart">Try again</button></div>`;
}

function renderCart(items = cartItems()) {
	const dialog = document.getElementById("cart-dialog");
	const count = items.reduce((sum, item) => sum + item.quantity, 0);
	document.querySelectorAll(".cart-count").forEach((badge) => {
		badge.textContent = String(count);
		badge.hidden = count === 0;
	});
	document.querySelectorAll(".cart-open").forEach((button) => button.setAttribute("aria-label", `Shopping bag, ${count} items`));
	if (!dialog) return;
	if (!items.length) {
		dialog.innerHTML = `<div class="cart-header"><div><p class="eyebrow">YOUR LUMACART</p><h2 id="cart-title">Shopping bag <span>(0)</span></h2></div><button class="icon-button" type="button" data-close-cart aria-label="Close shopping bag">×</button></div><div class="cart-empty"><span aria-hidden="true">▱</span><h3>Your bag is taking a breather.</h3><p>When something feels just right, you can find it here.</p><a class="button button-primary" href="./shop.html">Explore the shop</a></div>`;
		return;
	}
	const totals = cartTotals(items);
	const itemMarkup = items.map((item) => `<article class="cart-item"><a href="./product.html?id=${encodeURIComponent(item.productId)}"><img src="${escapeHtml(item.image)}" alt=""></a><div class="cart-item-info"><a href="./product.html?id=${encodeURIComponent(item.productId)}">${escapeHtml(item.name)}</a><span>${price(item.price)} each</span><strong>${price(item.price * item.quantity)}</strong><div class="cart-quantity-control"><button type="button" data-cart-step="-1" data-cart-product="${escapeHtml(item.productId)}" aria-label="Decrease quantity of ${escapeHtml(item.name)}" ${item.quantity <= 1 ? "disabled" : ""}>−</button><label class="sr-only" for="cart-quantity-${escapeHtml(item.productId)}">Quantity of ${escapeHtml(item.name)}</label><input id="cart-quantity-${escapeHtml(item.productId)}" type="number" min="1" max="${item.stock}" value="${item.quantity}" data-cart-quantity="${escapeHtml(item.productId)}"><button type="button" data-cart-step="1" data-cart-product="${escapeHtml(item.productId)}" aria-label="Increase quantity of ${escapeHtml(item.name)}" ${item.quantity >= item.stock ? "disabled" : ""}>+</button><span class="cart-stock-note">${item.stock} available</span></div></div><button type="button" class="cart-remove" data-remove-cart="${escapeHtml(item.productId)}" aria-label="Remove ${escapeHtml(item.name)} from bag">Remove</button></article>`).join("");
	dialog.innerHTML = `<div class="cart-header"><div><p class="eyebrow">YOUR LUMACART</p><h2 id="cart-title">Shopping bag <span>(${count})</span></h2></div><button class="icon-button" type="button" data-close-cart aria-label="Close shopping bag">×</button></div><div class="cart-items">${itemMarkup}</div><div class="cart-summary"><div class="cart-total-row"><span>Subtotal</span><strong>${price(totals.subtotal)}</strong></div><div class="cart-total-row"><span>Shipping ${totals.shipping === 0 ? "(free)" : ""}</span><strong>${totals.shipping === 0 ? "Free" : price(totals.shipping)}</strong></div><div class="cart-total-row"><span>Estimated tax (${(cartPricing.taxRate * 100).toFixed(1)}%)</span><strong>${price(totals.tax)}</strong></div><div class="cart-grand-total"><span>Estimated total</span><strong>${price(totals.total)}</strong></div><p class="cart-estimate-note">Shipping is free over ${price(cartPricing.freeShippingThreshold)}. Tax is an estimate; final totals are recalculated by the server.</p><a class="button button-primary cart-checkout" href="./checkout.html">Continue to checkout</a><a class="cart-wishlist-link" href="./wishlist.html">View your wishlist</a></div>`;
}

async function openCart() {
	const dialog = document.getElementById("cart-dialog");
	if (!dialog) return;
	if (!dialog.open) dialog.showModal();
	renderCartLoading();
	try {
		const items = await refreshCartItems();
		renderHeader();
		renderCart(items);
	} catch (error) {
		renderCartError(error);
	}
}

async function addToCart(product, quantity = 1, options = {}) {
	const productId = String(product?._id || product?.productId || product?.id || product?.slug || "");
	if (!productId) {
		showToast("This item couldn't be identified. Refresh and try again.", "error");
		return false;
	}
	try {
		const currentProduct = await loadProduct(productId);
		if (Number(currentProduct.stock) < 1) {
			showToast("This item is currently out of stock.", "error");
			return false;
		}
		const requested = Math.max(1, Math.floor(Number(quantity) || 1));
		const items = cartItems();
		const id = String(currentProduct._id);
		const existing = items.find((item) => item.productId === id);
		const currentQuantity = existing?.quantity || 0;
		if (requested + currentQuantity > Number(currentProduct.stock)) {
			showToast(`Only ${currentProduct.stock} available. Your bag already has ${currentQuantity}.`, "error");
			return false;
		}
		const cartItem = {
			productId: id,
			name: currentProduct.name,
			image: currentProduct.images?.[0] || "",
			quantity: requested + currentQuantity,
			price: Number(currentProduct.price),
			stock: Number(currentProduct.stock)
		};
		if (existing) Object.assign(existing, cartItem);
		else items.push(cartItem);
		writeStorage(CART_KEY, items);
		productCache.set(id, currentProduct);
		if (options.moveFromWishlist) {
			writeStorage(WISHLIST_KEY, wishlistIds().filter((savedId) => savedId !== id));
			document.querySelectorAll(`[data-wishlist="${CSS.escape(id)}"]`).forEach((button) => {
				button.classList.remove("is-saved");
				button.setAttribute("aria-pressed", "false");
				button.setAttribute("aria-label", `Add to wishlist: ${currentProduct.name}`);
				const icon = button.querySelector("span");
				if (icon) icon.textContent = "♡";
			});
		}
		renderHeader();
		renderCart(items);
		if (options.moveFromWishlist && document.getElementById("account-wishlist")) renderAccountWishlist();
		if (options.moveFromWishlist && document.getElementById("wishlist-grid")) renderWishlistPage();
		if (options.openCart) {
			const dialog = document.getElementById("cart-dialog");
			if (dialog && !dialog.open) dialog.showModal();
		}
		showToast(options.moveFromWishlist ? "Moved to your bag." : `${currentProduct.name} added to your bag.`);
		return true;
	} catch (error) {
		showToast(error.message || "We couldn't verify current stock. Try again.", "error");
		return false;
	}
}

async function changeCartQuantity(id, quantity) {
	const items = cartItems();
	const current = items.find((item) => item.productId === id);
	if (!current) return;
	try {
		const product = await loadProduct(id);
		const requested = Math.floor(Number(quantity));
		if (!Number.isFinite(requested) || requested < 1) {
			renderCart(items);
			return;
		}
		if (product.stock < 1) {
			writeStorage(CART_KEY, items.filter((item) => item.productId !== id));
			showToast("This item is now out of stock and was removed.", "error");
		} else {
			const adjustedQuantity = Math.min(requested, Number(product.stock));
			Object.assign(current, {
				productId: String(product._id),
				name: product.name,
				image: product.images?.[0] || "",
				price: Number(product.price),
				stock: Number(product.stock),
				quantity: adjustedQuantity
			});
			writeStorage(CART_KEY, items);
			if (adjustedQuantity !== requested) showToast(`Quantity adjusted to current stock (${adjustedQuantity}).`, "error");
		}
		renderHeader();
		renderCart(cartItems());
	} catch (error) {
		showToast(error.message, "error");
		const dialog = document.getElementById("cart-dialog");
		if (dialog?.open) await openCart();
	}
}

function toggleWishlist(id) {
	const normalizedId = String(id);
	const ids = wishlistIds();
	const exists = ids.includes(normalizedId);
	writeStorage(WISHLIST_KEY, exists ? ids.filter((item) => item !== normalizedId) : [...ids, normalizedId]);
	renderHeader();
	document.querySelectorAll(`[data-wishlist="${CSS.escape(normalizedId)}"]`).forEach((button) => {
		button.classList.toggle("is-saved", !exists);
		button.setAttribute("aria-pressed", String(!exists));
		button.setAttribute("aria-label", `${exists ? "Add to" : "Remove from"} wishlist: ${productCache.get(normalizedId)?.name || "product"}`);
		const icon = button.querySelector("span");
		if (icon) icon.textContent = exists ? "♡" : "♥";
	});
	if (document.getElementById("account-wishlist")) renderAccountWishlist();
	if (document.getElementById("wishlist-grid")) renderWishlistPage();
	showToast(exists ? "Removed from your saved items." : "Saved for later.");
}

async function renderWishlistItems(container, wishlistPage = false) {
	const ids = wishlistIds();
	container.innerHTML = "";
	if (!ids.length) {
		container.innerHTML = `<div class="empty-state wishlist-empty"><span class="empty-mark" aria-hidden="true">♡</span><h3>Your wishlist is waiting for a first favorite.</h3><p>Save pieces you love and find them here whenever you're ready.</p><a class="button button-primary" href="./shop.html">Explore the shop</a></div>`;
		return;
	}
	container.innerHTML = skeletonCards(Math.min(ids.length, 4));
	try {
		const results = await Promise.all(ids.map(async (id) => {
			try {
				const product = await loadProduct(id);
				productCache.set(String(product._id), product);
				return product;
			} catch (error) {
				if (error.status === 404) return null;
				throw error;
			}
		}));
		const products = results.filter(Boolean);
		if (products.length !== ids.length) {
			writeStorage(WISHLIST_KEY, products.map((product) => String(product._id)));
			showToast("Unavailable items were removed from your wishlist.", "error");
		}
		container.innerHTML = products.length
			? products.map((product) => productCard(product, { wishlistPage })).join("")
			: `<div class="empty-state wishlist-empty"><span class="empty-mark" aria-hidden="true">♡</span><h3>Your wishlist is waiting for a first favorite.</h3><p>Save pieces you love and find them here whenever you're ready.</p><a class="button button-primary" href="./shop.html">Explore the shop</a></div>`;
		renderHeader();
	} catch (error) {
		container.innerHTML = `<div class="empty-state wishlist-empty" role="alert"><span class="empty-mark" aria-hidden="true">!</span><h3>We couldn't load your wishlist.</h3><p>${escapeHtml(error.message)}</p><button class="button button-secondary" type="button" data-retry="wishlist">Try again</button></div>`;
	}
}

async function renderAccountWishlist() {
	const container = document.getElementById("account-wishlist");
	if (!container) return;
	document.getElementById("account-wishlist-count").textContent = String(wishlistIds().length);
	await renderWishlistItems(container);
}

async function renderWishlistPage() {
	const container = document.getElementById("wishlist-grid");
	if (container) await renderWishlistItems(container, true);
}

async function initProduct() {
	const container = document.getElementById("product-content");
	const id = new URLSearchParams(window.location.search).get("id");
	if (!id) {
		container.innerHTML = `<div class="empty-state"><h2>Which find are you looking for?</h2><p>Choose a product from our collection to see all the details.</p><a class="button button-primary" href="./shop.html">Browse the shop</a></div>`;
		return;
	}
	container.innerHTML = `<div class="product-detail-skeleton" aria-hidden="true"><div></div><div><span></span><span></span><span></span></div></div>`;
	try {
		const product = await loadProduct(id);
		productCache.set(String(product._id), product);
		document.title = `${product.name} | LumaCart`;
		document.getElementById("product-crumb").textContent = product.name;
		const images = product.images?.length ? product.images : [];
		const saved = wishlistIds().includes(String(product._id));
		const discount = product.discount > 0 ? `<span class="discount-badge">−${product.discount}%</span>` : "";
		const rating = Number(product.rating || 0);
		container.innerHTML = `<section class="product-detail"><div class="product-gallery"><div class="product-main-image">${discount}<img id="main-product-image" src="${escapeHtml(images[0] || "")}" alt="${escapeHtml(product.name)}"></div><div class="product-thumbnails" role="group" aria-label="Product image gallery">${images.map((image, index) => `<button class="product-thumbnail${index === 0 ? " is-active" : ""}" type="button" data-gallery-image="${index}" aria-label="View image ${index + 1}" aria-pressed="${index === 0}"><img src="${escapeHtml(image)}" alt=""></button>`).join("")}</div></div><div class="product-detail-info"><p class="eyebrow">${escapeHtml(product.category)}</p><h1>${escapeHtml(product.name)}</h1><a class="detail-rating" href="#reviews" aria-label="${rating.toFixed(1)} out of 5, ${product.reviewCount} reviews"><span class="rating-stars" aria-hidden="true">★★★★★</span><strong>${rating.toFixed(1)}</strong><span>(${Number(product.reviewCount)} reviews)</span></a><div class="detail-price"><strong>${price(product.price)}</strong>${product.originalPrice > product.price ? `<del>${price(product.originalPrice)}</del><span class="detail-discount">Save ${product.discount}%</span>` : ""}</div><p class="product-description-short">${escapeHtml(product.description)}</p><p class="stock-status ${product.stock > 0 ? "in-stock" : "out-stock"}"><span aria-hidden="true">●</span> ${product.stock > 0 ? `${product.stock} in stock` : "Currently out of stock"}</p><div class="buy-controls"><div class="quantity-control"><button type="button" data-quantity-step="-1" aria-label="Decrease quantity" ${product.stock < 1 ? "disabled" : ""}>−</button><label class="sr-only" for="product-quantity">Quantity</label><input id="product-quantity" type="number" min="1" max="${Math.max(1, product.stock)}" value="1" ${product.stock < 1 ? "disabled" : ""}><button type="button" data-quantity-step="1" aria-label="Increase quantity" ${product.stock < 1 ? "disabled" : ""}>+</button></div><button class="button button-primary detail-add" type="button" data-detail-add="${escapeHtml(product._id)}" ${product.stock < 1 ? "disabled" : ""}>Add to bag</button><button class="button button-secondary detail-buy" type="button" data-detail-buy="${escapeHtml(product._id)}" ${product.stock < 1 ? "disabled" : ""}>Buy now</button><button class="detail-wishlist${saved ? " is-saved" : ""}" type="button" data-wishlist="${escapeHtml(product._id)}" aria-pressed="${saved}" aria-label="${saved ? "Remove from" : "Add to"} wishlist"><span aria-hidden="true">${saved ? "♥" : "♡"}</span></button></div><div class="detail-assurance"><span>↗ Secure checkout <small>Coming soon</small></span><span>◇ Thoughtfully selected</span></div></div></section><section class="product-tabs" aria-label="Product information"><div class="tab-list" role="tablist"><button id="tab-description" class="detail-tab is-active" type="button" role="tab" aria-selected="true" aria-controls="panel-description" data-detail-tab="description">Description</button><button id="tab-specifications" class="detail-tab" type="button" role="tab" aria-selected="false" aria-controls="panel-specifications" data-detail-tab="specifications">Specifications</button><button id="tab-reviews" class="detail-tab" type="button" role="tab" aria-selected="false" aria-controls="panel-reviews" data-detail-tab="reviews">Reviews (${Number(product.reviewCount)})</button></div><div id="panel-description" class="detail-tab-panel" role="tabpanel" aria-labelledby="tab-description"><h2>A little more about it</h2><p>${escapeHtml(product.description)}</p></div><div id="panel-specifications" class="detail-tab-panel" role="tabpanel" aria-labelledby="tab-specifications" hidden><h2>Product details</h2><dl class="spec-list"><div><dt>Category</dt><dd>${escapeHtml(product.category)}</dd></div><div><dt>Availability</dt><dd>${product.stock > 0 ? "In stock" : "Sold out"}</dd></div><div><dt>Product reference</dt><dd>${escapeHtml(product.slug)}</dd></div></dl></div><div id="panel-reviews" class="detail-tab-panel" role="tabpanel" aria-labelledby="tab-reviews" hidden><h2>Customer reviews</h2><div id="reviews" class="reviews-summary"><span class="review-big-rating">${rating.toFixed(1)}</span><div><span class="rating-stars" aria-hidden="true">★★★★★</span><p>Based on ${Number(product.reviewCount)} customer ${product.reviewCount === 1 ? "review" : "reviews"}.</p></div></div><p class="muted-note">Written reviews are not available yet.</p></div></section>`;
		try {
			const related = await loadProducts({ category: product.category, sort: "featured", limit: 4 });
			const relatedContainer = document.getElementById("related-products");
			const relatedProducts = related.data.filter((item) => String(item._id) !== String(product._id));
			if (relatedProducts.length) {
				relatedContainer.innerHTML = relatedProducts.slice(0, 4).map(productCard).join("");
				document.getElementById("related-section").hidden = false;
			}
		} catch {
			document.getElementById("related-section").hidden = true;
		}
	} catch (error) {
		container.innerHTML = `<div class="empty-state"><span class="empty-mark" aria-hidden="true">!</span><h2>We couldn't find that item.</h2><p>${escapeHtml(error.message)}</p><button class="button button-secondary" type="button" data-retry="product">Try again</button><a class="text-link" href="./shop.html">Back to the shop</a></div>`;
	} finally {
		container.setAttribute("aria-busy", "false");
	}
}

function setFormMessage(message, kind = "error", elementId = "auth-message") {
	const element = document.getElementById(elementId);
	if (!element) return;
	element.textContent = message;
	element.className = `form-message form-message-${kind}`;
	element.hidden = false;
}

function setSubmitState(button, loading, text) {
	if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent.trim();
	button.disabled = loading;
	button.setAttribute("aria-busy", String(loading));
	button.textContent = loading ? text : button.dataset.defaultText;
}

function authRedirect() {
	const next = new URLSearchParams(window.location.search).get("next");
	if (next === "checkout") return "./checkout.html";
	if (next === "orders") return "./account.html#orders";
	if (next === "wishlist") return "./wishlist.html";
	return "./account.html";
}

function initAuth() {
	document.querySelectorAll("[data-password-toggle]").forEach((button) => {
		button.addEventListener("click", () => {
			const input = document.getElementById(button.dataset.passwordToggle);
			const visible = input.type === "password";
			input.type = visible ? "text" : "password";
			button.textContent = visible ? "Hide" : "Show";
			button.setAttribute("aria-label", `${visible ? "Hide" : "Show"} ${input.id === "confirm-password" ? "confirmation " : ""}password`);
		});
	});

	const login = document.getElementById("login-form");
	login?.addEventListener("submit", async (event) => {
		event.preventDefault();
		const button = login.querySelector("[type=submit]");
		document.getElementById("auth-message").hidden = true;
		if (!login.reportValidity()) return;
		setSubmitState(button, true, "Signing in…");
		try {
			const result = await apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ email: login.elements.namedItem("email").value, password: login.elements.namedItem("password").value }) });
			localStorage.setItem(TOKEN_KEY, result.data.token);
			currentUser = result.data.user;
			window.location.assign(authRedirect());
		} catch (error) {
			setFormMessage(error.message);
		} finally {
			setSubmitState(button, false);
		}
	});

	const register = document.getElementById("register-form");
	register?.addEventListener("submit", async (event) => {
		event.preventDefault();
		const button = register.querySelector("[type=submit]");
		document.getElementById("auth-message").hidden = true;
		if (!register.reportValidity()) return;
		const formFields = register.elements;
		if (formFields.namedItem("password").value.length > 72) {
			setFormMessage("Password must be 72 characters or fewer.");
			return;
		}
		if (formFields.namedItem("password").value !== formFields.namedItem("confirmPassword").value) {
			setFormMessage("Passwords do not match.");
			formFields.namedItem("confirmPassword").focus();
			return;
		}
		setSubmitState(button, true, "Creating account…");
		try {
			const result = await apiRequest("/auth/register", { method: "POST", body: JSON.stringify({ name: formFields.namedItem("name").value, email: formFields.namedItem("email").value, password: formFields.namedItem("password").value, confirmPassword: formFields.namedItem("confirmPassword").value }) });
			localStorage.setItem(TOKEN_KEY, result.data.token);
			currentUser = result.data.user;
			window.location.assign("./account.html");
		} catch (error) {
			setFormMessage(error.message);
		} finally {
			setSubmitState(button, false);
		}
	});
}

function renderCheckoutSummary(items) {
	const totals = cartTotals(items);
	document.getElementById("checkout-items").innerHTML = items.map((item) => `<article class="checkout-item"><img src="${escapeHtml(item.image)}" alt=""><div class="checkout-item-copy"><strong>${escapeHtml(item.name)}</strong><span>Qty ${item.quantity} · ${price(item.price)} each</span></div><strong class="checkout-item-total">${price(item.price * item.quantity)}</strong></article>`).join("");
	document.getElementById("checkout-totals").innerHTML = `<div><span>Subtotal</span><strong>${price(totals.subtotal)}</strong></div><div><span>Shipping</span><strong>${totals.shipping ? price(totals.shipping) : "Free"}</strong></div><div><span>Estimated tax (${(cartPricing.taxRate * 100).toFixed(1)}%)</span><strong>${price(totals.tax)}</strong></div><div class="checkout-grand-total"><span>Estimated total</span><strong>${price(totals.total)}</strong></div><p>Final price, tax and availability are verified by the server when your order is placed.</p>`;
}

async function initCheckout() {
	if (!localStorage.getItem(TOKEN_KEY)) {
		window.location.replace("./login.html?next=checkout");
		return;
	}
	const loading = document.getElementById("checkout-loading");
	const error = document.getElementById("checkout-error");
	const empty = document.getElementById("checkout-empty");
	const layout = document.getElementById("checkout-layout");
	loading.hidden = false;
	error.hidden = true;
	empty.hidden = true;
	layout.hidden = true;
	try {
		const userResult = await apiRequest("/auth/me");
		currentUser = userResult.data.user;
		const items = await refreshCartItems();
		loading.hidden = true;
		if (!items.length) {
			empty.hidden = false;
			return;
		}
		const form = document.getElementById("checkout-form");
		form.elements.namedItem("name").value = currentUser.name || "";
		form.elements.namedItem("email").value = currentUser.email || "";
		renderCheckoutSummary(items);
		layout.hidden = false;
	} catch (requestError) {
		loading.hidden = true;
		error.textContent = requestError.message;
		error.hidden = false;
		error.insertAdjacentHTML("beforeend", ' <button class="text-button" type="button" data-retry="checkout">Try again</button>');
	}

	document.getElementById("checkout-form")?.addEventListener("submit", async (event) => {
		event.preventDefault();
		const form = event.currentTarget;
		const button = document.getElementById("place-order");
		const message = document.getElementById("checkout-message");
		message.hidden = true;
		if (!form.reportValidity()) return;
		const submittedItems = cartItems();
		if (!submittedItems.length) {
			layout.hidden = true;
			empty.hidden = false;
			return;
		}
		const fields = form.elements;
		const shippingAddress = Object.fromEntries(["name", "email", "phone", "line1", "line2", "city", "region", "postalCode", "country"].map((field) => [field, fields.namedItem(field).value.trim()]));
		setSubmitState(button, true, "Placing order…");
		try {
			const result = await apiRequest("/orders", {
				method: "POST",
				body: JSON.stringify({
					items: submittedItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
					shippingAddress,
					paymentMethod: fields.namedItem("paymentMethod").value
				})
			});
			const submittedIds = new Set(submittedItems.map((item) => item.productId));
			writeStorage(CART_KEY, cartItems().filter((item) => !submittedIds.has(item.productId)));
			renderHeader();
			window.location.assign(`./order.html?id=${encodeURIComponent(result.data._id)}&placed=1`);
		} catch (requestError) {
			setFormMessage(requestError.message, "error", "checkout-message");
			if (requestError.status === 409) {
				try {
					const items = await refreshCartItems();
					if (items.length) renderCheckoutSummary(items);
					else {
						layout.hidden = true;
						empty.hidden = false;
					}
				} catch { /* Keep the actionable stock error visible if refresh also fails. */ }
			}
		} finally {
			setSubmitState(button, false);
		}
	});
}

let orderHistoryPage = 1;

function orderDate(value) {
	return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function orderStatusLabel(status) {
	return String(status || "pending").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function canCancelOrder(order) {
	return !!order && ["pending", "confirmed", "processing"].includes(order.status);
}

function renderOrderDetail(order, placed = false) {
	const content = document.getElementById("order-content");
	if (!content) return;
	const itemRows = order.items.map((item) => `<article class="order-detail-item"><img src="${escapeHtml(item.productImage || "")}" alt=""><div><strong>${escapeHtml(item.productName)}</strong><span>Qty ${item.quantity} · ${price(item.price)} each</span></div><strong>${price(item.subtotal)}</strong></article>`).join("");
	const cancelButton = canCancelOrder(order)
		? `<button id="cancel-order-button" class="button button-secondary" type="button">Cancel Order</button>`
		: "";
	const orderFooter = `
		<div class="order-next-actions">
			${cancelButton}
			<a class="button button-secondary" href="./account.html#orders">View all orders</a>
		</div>`;

	content.innerHTML = `<header class="order-page-heading"><p class="eyebrow">${placed ? "THANK YOU FOR YOUR ORDER" : "YOUR PURCHASE"}</p><h1>${placed ? "Order confirmed." : "Order details"}</h1><p>${placed ? "Your demo order has been placed. No payment was collected." : "A secure summary of this order for your account."}</p></header><section class="order-detail-card"><div class="order-detail-top"><div><span class="order-status status-${escapeHtml(order.status)}">${escapeHtml(orderStatusLabel(order.status))}</span><h2>${escapeHtml(order.orderNumber)}</h2><p>Placed ${orderDate(order.createdAt)}</p></div><a class="text-link" href="./account.html#orders">All orders <span aria-hidden="true">→</span></a></div><div class="order-detail-grid"><section><h3>Items</h3><div class="order-detail-items">${itemRows}</div><div class="order-detail-totals"><div><span>Subtotal</span><strong>${price(order.subtotal)}</strong></div><div><span>Shipping</span><strong>${order.shipping ? price(order.shipping) : "Free"}</strong></div><div><span>Tax</span><strong>${price(order.tax)}</strong></div><div class="checkout-grand-total"><span>Total</span><strong>${price(order.total)}</strong></div></div>${orderFooter}</section><aside class="order-shipping"><h3>Shipping to</h3><address>${escapeHtml(order.shippingAddress.name)}<br>${escapeHtml(order.shippingAddress.line1)}${order.shippingAddress.line2 ? `<br>${escapeHtml(order.shippingAddress.line2)}` : ""}<br>${escapeHtml(order.shippingAddress.city)}, ${escapeHtml(order.shippingAddress.region)} ${escapeHtml(order.shippingAddress.postalCode)}<br>${escapeHtml(order.shippingAddress.country)}<br><a href="mailto:${escapeHtml(order.shippingAddress.email)}">${escapeHtml(order.shippingAddress.email)}</a><br>${escapeHtml(order.shippingAddress.phone)}</address><p class="demo-payment-label">${order.paymentMethod === "cod_demo" ? "Cash on Delivery (Demo)" : "Test Payment"}<br><small>No real payment was processed.</small></p><p>Payment status: ${escapeHtml(orderStatusLabel(order.paymentStatus || "pending"))}</p></aside></div></section>`;

	const cancelButtonElement = document.getElementById("cancel-order-button");
	cancelButtonElement?.addEventListener("click", async () => {
		if (!window.confirm("Cancel this order and restore the stock? This action cannot be undone.")) return;
		const button = cancelButtonElement;
		const originalText = button.textContent;
		button.disabled = true;
		button.textContent = "Cancelling…";
		try {
			const result = await apiRequest(`/orders/${encodeURIComponent(order._id)}/cancel`, { method: "PATCH" });
			order.status = result.data?.status || "cancelled";
			renderOrderDetail(order, placed);
			showToast(result.message || "Order cancelled successfully.", "success");
		} catch (error) {
			showToast(error.message, "error");
		} finally {
			if (document.getElementById("cancel-order-button")) {
				const updatedButton = document.getElementById("cancel-order-button");
				updatedButton.disabled = false;
				updatedButton.textContent = originalText;
			}
		}
	});
}

async function loadOrderHistory(page = 1) {
	const loading = document.getElementById("orders-loading");
	const errorBox = document.getElementById("orders-error");
	const list = document.getElementById("orders-list");
	const pagination = document.getElementById("orders-pagination");
	if (!loading || !list) return;
	orderHistoryPage = page;
	loading.hidden = false;
	errorBox.hidden = true;
	list.innerHTML = "";
	pagination.innerHTML = "";
	try {
		const result = await apiRequest(`/orders?page=${page}&limit=10`);
		loading.hidden = true;
		document.getElementById("account-order-count").textContent = String(result.pagination.total);
		if (!result.data.length) {
			list.innerHTML = `<div class="orders-empty"><span class="empty-mark" aria-hidden="true">↗</span><h3>No orders yet.</h3><p>Your completed checkouts will appear here.</p><a class="button button-secondary" href="./shop.html">Explore the shop</a></div>`;
			return;
		}
		list.innerHTML = result.data.map((order) => {
			const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
			return `<a class="order-history-row" href="./order.html?id=${encodeURIComponent(order._id)}"><span class="order-history-main"><strong>${escapeHtml(order.orderNumber)}</strong><small>${orderDate(order.createdAt)} · ${itemCount} ${itemCount === 1 ? "item" : "items"}</small></span><span class="order-status status-${escapeHtml(order.status)}">${escapeHtml(orderStatusLabel(order.status))}</span><strong class="order-history-total">${price(order.total)}</strong><span class="order-history-arrow" aria-hidden="true">→</span></a>`;
		}).join("");
		if (result.pagination.pages > 1) {
			pagination.innerHTML = `<button type="button" data-order-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>Previous</button><span>Page ${page} of ${result.pagination.pages}</span><button type="button" data-order-page="${page + 1}" ${page >= result.pagination.pages ? "disabled" : ""}>Next</button>`;
		}
	} catch (error) {
		loading.hidden = true;
		errorBox.textContent = error.message;
		errorBox.hidden = false;
		list.innerHTML = `<button class="button button-secondary" type="button" data-retry="orders">Try again</button>`;
	}
}

async function initOrderPage() {
	if (!localStorage.getItem(TOKEN_KEY)) {
		window.location.replace("./login.html?next=orders");
		return;
	}
	const loading = document.getElementById("order-loading");
	const errorView = document.getElementById("order-error");
	const content = document.getElementById("order-content");
	const orderId = new URLSearchParams(window.location.search).get("id");
	if (!orderId) {
		loading.hidden = true;
		errorView.hidden = false;
		return;
	}
	try {
		const result = await apiRequest(`/orders/${encodeURIComponent(orderId)}`);
		const order = result.data;
		const placed = new URLSearchParams(window.location.search).get("placed") === "1";
		loading.hidden = true;
		content.hidden = false;
		document.title = `${placed ? "Order confirmed" : "Order details"} | LumaCart`;
		renderOrderDetail(order, placed);
	} catch (error) {
		if (error.status === 401) {
			window.location.replace("./login.html?next=orders");
			return;
		}
		loading.hidden = true;
		errorView.hidden = false;
	}
}

async function initAccount() {
	const loading = document.getElementById("account-loading");
	const token = localStorage.getItem(TOKEN_KEY);
	if (!token) {
		window.location.replace("./login.html?next=account");
		return;
	}
	try {
		const result = await apiRequest("/auth/me");
		currentUser = result.data.user;
		document.getElementById("account-content").hidden = false;
		document.getElementById("account-greeting").textContent = `A little space for all things you, ${currentUser.name.split(" ")[0]}.`;
		document.getElementById("profile-name").value = currentUser.name;
		document.getElementById("profile-email").value = currentUser.email;
		document.getElementById("profile-created").textContent = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(currentUser.createdAt));
		loading.hidden = true;
		renderAccountWishlist();
		const requestedTab = window.location.hash.slice(1);
		setAccountTab(["orders", "wishlist"].includes(requestedTab) ? requestedTab : "profile");
	} catch (error) {
		localStorage.removeItem(TOKEN_KEY);
		window.location.replace(`./login.html?next=account&reason=${encodeURIComponent(error.message)}`);
	}

	document.getElementById("profile-form")?.addEventListener("submit", async (event) => {
		event.preventDefault();
		const form = event.currentTarget;
		if (!form.reportValidity()) return;
		const button = form.querySelector("[type=submit]");
		setSubmitState(button, true, "Saving…");
		const message = document.getElementById("profile-message");
		message.hidden = true;
		try {
			const result = await apiRequest("/auth/profile", { method: "PATCH", body: JSON.stringify({ name: form.elements.namedItem("name").value, email: form.elements.namedItem("email").value }) });
			currentUser = result.data.user;
			document.getElementById("account-greeting").textContent = `A little space for all things you, ${currentUser.name.split(" ")[0]}.`;
			setFormMessage("Your profile has been updated.", "success", "profile-message");
			renderHeader();
		} catch (error) {
			setFormMessage(error.message, "error", "profile-message");
		} finally {
			setSubmitState(button, false);
		}
	});

	document.querySelectorAll("[data-account-tab]").forEach((button) => button.addEventListener("click", () => setAccountTab(button.dataset.accountTab)));
}

function setAccountTab(tab) {
	document.querySelectorAll("[data-account-tab]").forEach((button) => {
		const active = button.dataset.accountTab === tab;
		button.classList.toggle("is-active", active);
		if (active) button.setAttribute("aria-current", "page");
		else button.removeAttribute("aria-current");
	});
	document.getElementById("profile-panel").hidden = tab !== "profile";
	document.getElementById("wishlist-panel").hidden = tab !== "wishlist";
	document.getElementById("orders-panel").hidden = tab !== "orders";
	if (tab === "orders") loadOrderHistory();
	if (tab === "wishlist") renderAccountWishlist();
}

async function logout() {
	try { await apiRequest("/auth/logout", { method: "POST" }); } catch { /* Local sign-out still works if the API is unavailable. */ }
	localStorage.removeItem(TOKEN_KEY);
	currentUser = null;
	if (document.body.dataset.page === "account") {
		window.location.assign("./index.html");
		return;
	}
	renderHeader();
	showToast("You are signed out.");
}

function initGlobalInteractions() {
	document.addEventListener("click", (event) => {
		const add = event.target.closest("[data-add-cart]");
		if (add) {
			const product = productCache.get(add.dataset.addCart);
			if (product) addToCart(product, 1, { moveFromWishlist: Boolean(add.closest(".wishlist-product-card")) });
			return;
		}
		const wishlist = event.target.closest("[data-wishlist]");
		if (wishlist) {
			toggleWishlist(wishlist.dataset.wishlist);
			return;
		}
		if (event.target.closest("[data-open-cart]")) {
			openCart();
			return;
		}
		if (event.target.closest("[data-close-cart]")) {
			document.getElementById("cart-dialog")?.close();
			return;
		}
		const remove = event.target.closest("[data-remove-cart]");
		if (remove) {
			writeStorage(CART_KEY, cartItems().filter((item) => item.productId !== remove.dataset.removeCart));
			renderHeader();
			renderCart();
			showToast("Item removed from your bag.");
			return;
		}
		const removeWishlist = event.target.closest("[data-remove-wishlist]");
		if (removeWishlist) {
			toggleWishlist(removeWishlist.dataset.removeWishlist);
			return;
		}
		const cartStep = event.target.closest("[data-cart-step]");
		if (cartStep) {
			const item = cartItems().find((candidate) => candidate.productId === cartStep.dataset.cartProduct);
			if (item) changeCartQuantity(item.productId, item.quantity + Number(cartStep.dataset.cartStep));
			return;
		}
		const pageButton = event.target.closest("[data-page-number]");
		if (pageButton && !pageButton.disabled) {
			shopPage = Number(pageButton.dataset.pageNumber);
			filterProducts();
			document.getElementById("product-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
			return;
		}
		const orderPageButton = event.target.closest("[data-order-page]");
		if (orderPageButton && !orderPageButton.disabled) {
			loadOrderHistory(Number(orderPageButton.dataset.orderPage));
			return;
		}
		const retry = event.target.closest("[data-retry]");
		if (retry) {
			if (retry.dataset.retry === "shop") filterProducts();
			else if (retry.dataset.retry === "product") initProduct();
			else if (retry.dataset.retry === "cart") openCart();
			else if (retry.dataset.retry === "wishlist") renderWishlistPage();
			else if (retry.dataset.retry === "checkout") initCheckout();
			else if (retry.dataset.retry === "orders") loadOrderHistory(orderHistoryPage);
			else if (retry.dataset.retry === "order") initOrderPage();
			else initHome();
			return;
		}
		if (event.target.closest("[data-clear-filters]")) {
			clearShopFilters();
			return;
		}
		const gallery = event.target.closest("[data-gallery-image]");
		if (gallery) {
			const image = document.querySelector("#main-product-image");
			const product = productCache.get(new URLSearchParams(location.search).get("id"));
			const selected = product?.images?.[Number(gallery.dataset.galleryImage)];
			if (selected && image) image.src = selected;
			document.querySelectorAll(".product-thumbnail").forEach((thumbnail) => {
				const active = thumbnail === gallery;
				thumbnail.classList.toggle("is-active", active);
				thumbnail.setAttribute("aria-pressed", String(active));
			});
			return;
		}
		const step = event.target.closest("[data-quantity-step]");
		if (step) {
			const input = document.getElementById("product-quantity");
			input.value = Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value) + Number(step.dataset.quantityStep)));
			return;
		}
		const addDetail = event.target.closest("[data-detail-add], [data-detail-buy]");
		if (addDetail) {
			const product = productCache.get(addDetail.dataset.detailAdd || addDetail.dataset.detailBuy);
			const quantity = Math.max(1, Number(document.getElementById("product-quantity")?.value) || 1);
			addToCart(product, quantity, { openCart: addDetail.hasAttribute("data-detail-buy") });
			return;
		}
		const ratingLink = event.target.closest('.detail-rating[href="#reviews"]');
		if (ratingLink) {
			event.preventDefault();
			document.getElementById("tab-reviews")?.click();
			document.getElementById("panel-reviews")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
			return;
		}
		const tab = event.target.closest("[data-detail-tab]");
		if (tab) {
			const selected = tab.dataset.detailTab;
			document.querySelectorAll("[data-detail-tab]").forEach((button) => {
				const active = button === tab;
				button.classList.toggle("is-active", active);
				button.setAttribute("aria-selected", String(active));
				button.tabIndex = active ? 0 : -1;
			});
			document.querySelectorAll(".detail-tab-panel").forEach((panel) => {
				panel.hidden = panel.id !== `panel-${selected}`;
			});
		}
	});

	document.addEventListener("change", (event) => {
		const quantityInput = event.target.closest("[data-cart-quantity]");
		if (quantityInput) changeCartQuantity(quantityInput.dataset.cartQuantity, quantityInput.value);
	});

	document.addEventListener("click", (event) => {
		if (event.target.closest("[data-logout]")) logout();
	});

	document.getElementById("mobile-menu-toggle")?.addEventListener("click", (event) => {
		const button = event.currentTarget;
		const navigation = document.getElementById("primary-navigation");
		const open = button.getAttribute("aria-expanded") !== "true";
		button.setAttribute("aria-expanded", String(open));
		button.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
		navigation.classList.toggle("is-open", open);
		document.body.classList.toggle("menu-open", open);
	});

	document.getElementById("header-search")?.addEventListener("submit", (event) => {
		event.preventDefault();
		const search = document.getElementById("header-search-input").value.trim();
		window.location.assign(`./shop.html${search ? `?search=${encodeURIComponent(search)}` : ""}`);
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			const panel = document.getElementById("filter-panel");
			if (panel?.classList.contains("is-open")) {
				setFilterDrawer(false);
				document.getElementById("open-filters").focus();
			}
			document.body.classList.remove("menu-open");
			document.getElementById("primary-navigation")?.classList.remove("is-open");
			document.getElementById("mobile-menu-toggle")?.setAttribute("aria-expanded", "false");
		}
	});
}

document.addEventListener("DOMContentLoaded", async () => {
	await syncUser();
	renderCart();
	initGlobalInteractions();
	if (document.body.dataset.page === "home") initHome();
	if (document.body.dataset.page === "shop") initShop();
	if (document.body.dataset.page === "product") initProduct();
	if (["login", "register"].includes(document.body.dataset.page)) initAuth();
	if (document.body.dataset.page === "account") initAccount();
	if (document.body.dataset.page === "wishlist") renderWishlistPage();
	if (document.body.dataset.page === "checkout") initCheckout();
	if (document.body.dataset.page === "order") initOrderPage();

	const reason = new URLSearchParams(window.location.search).get("reason");
	if (reason && document.getElementById("auth-message")) setFormMessage(reason);
});