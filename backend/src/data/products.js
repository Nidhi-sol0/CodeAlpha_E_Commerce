const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=82`;

const catalog = [
  ["Studio Pro Wireless Headphones", "studio-pro-wireless-headphones", "Immersive over-ear sound, adaptive noise cancelling and a comfortable all-day fit for work or travel.", "Electronics", 249, 329, 4.8, 324, 28, true, "photo-1505740420928-5e560c06d30e"],
  ["Arc Portable Bluetooth Speaker", "arc-portable-bluetooth-speaker", "Rich room-filling audio in a compact, splash-resistant design with up to 16 hours of battery life.", "Electronics", 89, 119, 4.6, 186, 54, true, "photo-1608043152269-423dbba4e7e1"],
  ["LumaFit Smartwatch", "lumafit-smartwatch", "Track everyday activity, sleep and heart rate with a bright display and a refined stainless-steel case.", "Electronics", 179, 219, 4.5, 241, 33, true, "photo-1523275335684-37898b6baf30"],
  ["Pocket Mirrorless Camera", "pocket-mirrorless-camera", "A lightweight 24-megapixel camera with fast autofocus and crisp 4K video for creative days out.", "Electronics", 699, 799, 4.7, 97, 12, false, "photo-1516035069371-29a1b244cc32"],
  ["Everyday Wireless Earbuds", "everyday-wireless-earbuds", "Small, secure-fit earbuds with clear calls, touch controls and a pocket-sized charging case.", "Electronics", 79, 99, 4.4, 412, 86, false, "photo-1606220945770-b5b6c2c55bf1"],
  ["4K Streaming Display", "4k-streaming-display", "A vivid 32-inch 4K monitor with accurate color, slim bezels and one-cable USB-C connectivity.", "Electronics", 429, 499, 4.6, 73, 9, false, "photo-1527443224154-c4a3942d3acf"],
  ["Relaxed Cotton Overshirt", "relaxed-cotton-overshirt", "A versatile mid-weight cotton layer with a relaxed silhouette, corozo buttons and two chest pockets.", "Fashion", 68, 88, 4.5, 128, 41, true, "photo-1529139574466-a303027c1d8b"],
  ["Everyday Leather Sneakers", "everyday-leather-sneakers", "Clean low-profile leather sneakers with a cushioned footbed and durable recycled rubber sole.", "Fashion", 112, 145, 4.7, 206, 37, true, "photo-1542291026-7eec264c27ff"],
  ["Merino Knit Crewneck", "merino-knit-crewneck", "Soft, breathable merino wool in a timeless regular fit, finished with ribbed cuffs and neckline.", "Fashion", 135, 165, 4.6, 84, 22, false, "photo-1618354691373-d851c5c3a990"],
  ["Tailored Everyday Trousers", "tailored-everyday-trousers", "Smart-casual trousers cut from a comfortable stretch twill with a clean tapered leg.", "Fashion", 94, 120, 4.3, 62, 19, false, "photo-1473966968600-fa801b869a1a"],
  ["Linen Weekend Shirt", "linen-weekend-shirt", "Lightweight European linen with a relaxed collar, easy drape and a naturally breathable feel.", "Fashion", 76, 96, 4.6, 153, 48, false, "photo-1603252109303-2751441dd157"],
  ["City Packable Rain Jacket", "city-packable-rain-jacket", "A water-resistant shell with sealed seams and a compact hood that packs into its own pocket.", "Fashion", 158, 198, 4.5, 91, 16, false, "photo-1544923246-77307dd654cb"],
  ["Sculpted Ceramic Table Lamp", "sculpted-ceramic-table-lamp", "A hand-finished ceramic base and warm linen shade bring soft, considered light to any bedside.", "Home & Living", 124, 158, 4.8, 77, 15, true, "photo-1507473885765-e6ed057f782c"],
  ["Cloud Cotton Duvet Set", "cloud-cotton-duvet-set", "Crisp, breathable percale woven from long-staple cotton for a cool and comfortable night's sleep.", "Home & Living", 148, 185, 4.7, 194, 26, true, "photo-1631049307264-da0ec9d70304"],
  ["Arc Lounge Chair", "arc-lounge-chair", "A sculptural solid-oak frame paired with supportive upholstery for a comfortable reading corner.", "Home & Living", 549, 690, 4.9, 38, 6, false, "photo-1503602642458-232111445657"],
  ["Stoneware Breakfast Set", "stoneware-breakfast-set", "A four-piece glazed stoneware set with softly irregular edges, made for slow mornings.", "Home & Living", 64, 82, 4.6, 113, 32, false, "photo-1490312278390-ab64016e0aa9"],
  ["Woven Storage Basket", "woven-storage-basket", "A sturdy handwoven cotton rope basket that keeps everyday essentials tidy and within reach.", "Home & Living", 38, 49, 4.4, 68, 57, false, "photo-1593085260707-5377ba37f868"],
  ["Linen Table Runner", "linen-table-runner", "A softly textured, machine-washable linen runner that adds an understated finish to the table.", "Home & Living", 42, 54, 4.5, 59, 23, false, "photo-1603199506016-b9a594b593c0"],
  ["Daily Barrier Face Cream", "daily-barrier-face-cream", "A fragrance-free moisturizer with ceramides and squalane to support comfortable, hydrated skin.", "Beauty", 34, 42, 4.7, 378, 64, true, "photo-1608248543803-ba4f8c70ae0b"],
  ["Botanical Cleansing Oil", "botanical-cleansing-oil", "A lightweight plant-oil cleanser that dissolves sunscreen and makeup without a tight after-feel.", "Beauty", 29, 36, 4.6, 214, 52, true, "photo-1608571423902-eed4a5ad8108"],
  ["Satin Finish Lip Color", "satin-finish-lip-color", "A comfortable buildable lip color with a soft satin finish and nourishing jojoba oil.", "Beauty", 24, 30, 4.4, 189, 45, false, "photo-1586495777744-4413f21062fa"],
  ["Vitamin C Brightening Serum", "vitamin-c-brightening-serum", "A daily antioxidant serum formulated with vitamin C and hyaluronic acid for a fresh-looking glow.", "Beauty", 48, 59, 4.5, 267, 31, false, "photo-1620916566398-39f1143ab7be"],
  ["Soft Focus Mineral SPF 40", "soft-focus-mineral-spf-40", "A sheer mineral sunscreen with a comfortable, non-greasy finish for everyday broad-spectrum protection.", "Beauty", 32, 39, 4.3, 146, 38, false, "photo-1556229010-6c3f2c9ca5f8"],
  ["Evening Reset Body Oil", "evening-reset-body-oil", "A fast-absorbing botanical body oil with a subtle herbal scent for a simple evening ritual.", "Beauty", 36, 45, 4.6, 92, 27, false, "photo-1601049541289-9b1b7bbbfe19"],
  ["Minimalist Leather Card Holder", "minimalist-leather-card-holder", "Slim full-grain leather with four card slots and a central pocket for the essentials.", "Accessories", 48, 62, 4.7, 171, 43, true, "photo-1627123424574-724758594e93"],
  ["Everyday Carryall Tote", "everyday-carryall-tote", "A durable canvas tote with an interior zip pocket, reinforced handles and room for daily essentials.", "Accessories", 58, 74, 4.5, 148, 61, true, "photo-1544816155-12df9643f363"],
  ["Classic Acetate Sunglasses", "classic-acetate-sunglasses", "Lightweight acetate frames with polarized lenses and full UV protection in a versatile shape.", "Accessories", 96, 128, 4.6, 117, 24, false, "photo-1511499767150-a48a237f0083"],
  ["Braided Leather Belt", "braided-leather-belt", "A finely braided leather belt with a brushed metal buckle that pairs easily with denim or chinos.", "Accessories", 64, 80, 4.4, 73, 29, false, "photo-1624222247344-550fb8e2c7f3"],
  ["Sterling Silver Pendant", "sterling-silver-pendant", "A polished recycled-silver pendant on an adjustable fine chain, presented in a gift-ready box.", "Accessories", 82, 105, 4.8, 132, 17, false, "photo-1611652022419-a9419f74343d"],
  ["Travel Organizer Set", "travel-organizer-set", "Three lightweight zip pouches in water-resistant recycled fabric keep travel essentials organized.", "Accessories", 39, 50, 4.3, 101, 72, false, "photo-1553062407-98eeb64c6a62"],
  ["TrailFlex Running Shoes", "trailflex-running-shoes", "Responsive cushioning and a grippy outsole make these lightweight trainers ready for road or trail.", "Sports", 128, 160, 4.7, 224, 35, true, "photo-1552674605-db6ffd4facb5"],
  ["Studio Grip Yoga Mat", "studio-grip-yoga-mat", "A supportive natural-rubber mat with a textured surface for dependable grip through every flow.", "Sports", 78, 98, 4.8, 306, 46, true, "photo-1603988363607-e1e4a66962c5"],
  ["Insulated Active Bottle", "insulated-active-bottle", "Double-wall stainless steel keeps drinks cold for 24 hours with a leak-resistant carry lid.", "Sports", 36, 45, 4.6, 281, 83, false, "photo-1602143407151-7111542de6e8"],
  ["Adjustable Strength Bands", "adjustable-strength-bands", "A five-resistance loop band set with a cotton carry pouch for versatile at-home workouts.", "Sports", 28, 35, 4.4, 168, 58, false, "photo-1598289431512-b97b0917affc"],
  ["Lightweight Training Duffel", "lightweight-training-duffel", "A compact gym bag with a ventilated shoe compartment, padded strap and recycled ripstop shell.", "Sports", 72, 90, 4.5, 94, 21, false, "photo-1517836357463-d25dfeac3438"],
  ["Performance Running Cap", "performance-running-cap", "A quick-drying running cap with a soft brim, reflective detail and an adjustable rear strap.", "Sports", 32, 40, 4.3, 87, 49, false, "photo-1588850561407-ed78c282e89b"]
];

module.exports = catalog.map(([name, slug, description, category, price, originalPrice, rating, reviewCount, stock, featured, photo]) => ({
  name,
  slug,
  description,
  category,
  price,
  originalPrice,
  rating,
  reviewCount,
  stock,
  featured,
  images: [
    image(photo),
    image(photo).replace("w=900", "w=900&crop=faces"),
    image(photo).replace("w=900", "w=900&crop=entropy")
  ]
}));