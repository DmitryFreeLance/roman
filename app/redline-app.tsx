"use client";

import {
  ArrowLeft,
  AlertTriangle,
  BadgeCheck,
  Bell,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Crown,
  ExternalLink,
  Gauge,
  Heart,
  House,
  ImagePlus,
  LayoutDashboard,
  Lock,
  Menu,
  MessageCircle,
  Minus,
  PackagePlus,
  Pencil,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Trash2,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Screen =
  | "market"
  | "group"
  | "cart"
  | "orders"
  | "sales"
  | "listings"
  | "balance"
  | "create"
  | "admin"
  | "superadmin"
  | "help";

type Profile = {
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  selectedGroupId?: number;
  registered: boolean;
  sellerBlocked: boolean;
  globallyBanned: boolean;
  botCommissionPercent: number;
  commissionDebtKopecks: number;
  debtLimitKopecks: number;
  superAdmin: boolean;
  listingCount: number;
};

type SellerFinance = {
  platformCommissionPercent: number;
  platformDebtKopecks: number;
  platformDebtLimitKopecks: number;
  platformPaymentDetails: string;
  groupCommissionPercent: number;
  groupDebtKopecks: number;
  groupDebtLimitKopecks: number;
  groupPaymentDetails: string;
  platformBlocked: boolean;
  groupBlocked: boolean;
};

type Club = {
  id: number;
  telegramGroupId: number;
  title: string;
  imageUrl?: string;
  ownerTelegramId: number;
  shopThreadId: number;
  commissionPercent: number;
  debtLimitKopecks: number;
  productCount: number;
};

type AdminGroup = Club & {
  active: boolean;
  stores: number;
  completedOrders: number;
};

type Buyer = {
  telegramId: number;
  username?: string;
  name: string;
  phone?: string;
  status: string;
  selectedColorName?: string;
};

type Category = {
  id: number;
  name: string;
  sortOrder: number;
};

type Product = {
  id: number;
  title: string;
  description: string;
  specifications: string;
  category: string;
  stock: number;
  kind: "regular" | "group";
  sellerPriceKopecks: number;
  buyerPriceKopecks: number;
  images: string[];
  colorVariants: ProductColorVariant[];
  storeId: number;
  storeName: string;
  storeImageUrl?: string;
  sellerTelegramId: number;
  sellerName?: string;
  sellerUsername?: string;
  sellerPhone?: string;
  active: boolean;
  orderCount: number;
  rating: number;
  reviewCount: number;
  storeRating: number;
  groupBuyId?: number;
  targetCount?: number;
  reservedCount: number;
  groupBuyStatus?: string;
  reservedByMe: boolean;
};

type ProductColorVariant = {
  key: string;
  name: string;
  hex: string;
  images: string[];
  stock?: number;
};

type CartItem = {
  key: string;
  clubId: number;
  productId: number;
  productTitle: string;
  storeId: number;
  storeName: string;
  unitPriceKopecks: number;
  quantity: number;
  stock: number;
  image?: string;
  selectedColorKey?: string;
  selectedColorName?: string;
};

type DiscussionMessage = {
  id: number;
  authorTelegramId: number;
  authorName: string;
  authorUsername?: string;
  body: string;
  createdAt: string;
};

type Storefront = {
  id: number;
  name: string;
  sellerTelegramId: number;
  productCount: number;
  cover?: string;
  rating: number;
};

type PaymentBank = "SBER" | "TBANK" | "ALFA" | "VTB";

type SellerStore = {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  paymentDetails: string;
  paymentBank?: PaymentBank;
  paymentPhone?: string;
  paymentRecipientName?: string;
};

type SellerProfileData = {
  hasStore: boolean;
  storeId?: number;
  storeName?: string;
  storeDescription?: string;
  storeImageUrl?: string;
  paymentDetails?: string;
  paymentBank?: PaymentBank;
  paymentPhone?: string;
  paymentRecipientName?: string;
  listingCount: number;
  activeListingCount: number;
  completedSales: number;
  soldUnits: number;
  salesKopecks: number;
  rating: number;
  reviewCount: number;
};

type AppNotification = {
  id: number;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  targetScreen?: "orders" | "sales";
};

type GroupBuyPurchase = {
  groupBuyId: number;
  groupBuyStatus: string;
  reservationStatus: string;
  productTitle: string;
  image?: string;
  storeName: string;
  sellerName?: string;
  sellerTelegramId?: number;
  sellerUsername?: string;
  paymentDetails?: string;
  paymentBank?: PaymentBank;
  paymentPhone?: string;
  paymentRecipientName?: string;
  targetCount: number;
  reservedCount: number;
  finalPriceKopecks?: number;
  paymentDeadline?: string;
  deliveryFrom?: string;
  deliveryTo?: string;
  deliveryNote?: string;
  selectedColorName?: string;
};

type Order = {
  id: number;
  status: "AWAITING_PAYMENT" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELLED";
  productId: number;
  productTitle: string;
  image?: string;
  storeName: string;
  sellerPriceKopecks: number;
  buyerPriceKopecks: number;
  commissionKopecks: number;
  quantity: number;
  createdAt: string;
  sellerName?: string;
  sellerTelegramId?: number;
  sellerUsername?: string;
  paymentDetails?: string;
  paymentBank?: PaymentBank;
  paymentPhone?: string;
  paymentRecipientName?: string;
  buyerName?: string;
  buyerTelegramId?: number;
  buyerUsername?: string;
  buyerPhone?: string;
  reviewRating?: number;
  selectedColorName?: string;
  fulfillmentDetails?: string;
};

type TelegramWebApp = {
  initData: string;
  isFullscreen?: boolean;
  platform?: string;
  initDataUnsafe?: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
  };
  ready: () => void;
  expand: () => void;
  exitFullscreen?: () => void;
  isVersionAtLeast?: (version: string) => boolean;
  hideKeyboard?: () => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink?: (url: string) => void;
  BackButton?: { hide: () => void };
  SettingsButton?: { hide: () => void };
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy") => void;
    notificationOccurred: (type: "success" | "warning" | "error") => void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const API = "/redlineclub-api/api/v1";
const CART_STORAGE_KEY = "redline-market-cart";

const PRODUCT_COLORS: Omit<ProductColorVariant, "images">[] = [
  { key: "black", name: "Чёрный", hex: "#111111" },
  { key: "white", name: "Белый", hex: "#ffffff" },
  { key: "gray", name: "Серый", hex: "#8a8a8a" },
  { key: "red", name: "Красный", hex: "#e31b23" },
  { key: "blue", name: "Синий", hex: "#246bdb" },
  { key: "light-blue", name: "Голубой", hex: "#54b8e8" },
  { key: "green", name: "Зелёный", hex: "#29a35a" },
  { key: "yellow", name: "Жёлтый", hex: "#f1cf2f" },
  { key: "orange", name: "Оранжевый", hex: "#f47b20" },
  { key: "brown", name: "Коричневый", hex: "#77482f" },
  { key: "purple", name: "Фиолетовый", hex: "#813cb0" },
  { key: "pink", name: "Розовый", hex: "#e56b9f" },
  { key: "beige", name: "Бежевый", hex: "#d4bd91" },
  { key: "silver", name: "Серебристый", hex: "#c4c8cc" },
];

const navBase: { id: Screen; label: string; icon: React.ElementType }[] = [
  { id: "market", label: "Каталог", icon: House },
  { id: "orders", label: "Мои заказы", icon: ShoppingBag },
  { id: "cart", label: "Корзина", icon: ShoppingCart },
  { id: "create", label: "Создать объявление", icon: PackagePlus },
  { id: "listings", label: "Мои объявления", icon: Store },
  { id: "sales", label: "Заказы клиентов", icon: UsersRound },
  { id: "balance", label: "Баланс и комиссии", icon: WalletCards },
  { id: "help", label: "Помощь", icon: CircleHelp },
];

const formatPrice = (kopecks: number) =>
  `${new Intl.NumberFormat("ru-RU").format(Math.round(kopecks / 100))} ₽`;

async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  worker: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const run = async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(values[index]);
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(Math.max(1, limit), values.length) },
      run,
    ),
  );
  return results;
}

const MOSCOW_TIME_ZONE = "Europe/Moscow";
const parseApiDate = (value: string) => {
  const normalized =
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
      ? `${value.replace(" ", "T")}Z`
      : value;
  return new Date(normalized);
};
const formatMoscowDate = (value: string) =>
  parseApiDate(value).toLocaleDateString("ru-RU", { timeZone: MOSCOW_TIME_ZONE });
const formatMoscowDateTime = (value: string) =>
  parseApiDate(value).toLocaleString("ru-RU", { timeZone: MOSCOW_TIME_ZONE });

const PAYMENT_BANKS: { value: PaymentBank; label: string }[] = [
  { value: "SBER", label: "Сбербанк" },
  { value: "TBANK", label: "Т-Банк" },
  { value: "ALFA", label: "Альфа-Банк" },
  { value: "VTB", label: "ВТБ" },
];

const paymentBankLabel = (bank?: PaymentBank) =>
  PAYMENT_BANKS.find((item) => item.value === bank)?.label || "Банк";

const asPaymentBank = (value: unknown): PaymentBank | undefined => {
  const normalized = String(value || "").toUpperCase();
  return PAYMENT_BANKS.some((item) => item.value === normalized)
    ? (normalized as PaymentBank)
    : undefined;
};

const openBankTransfer = (
  bank: PaymentBank,
  phone: string,
  amountKopecks: number,
) => {
  const phoneDigits = phone.replace(/\D/g, "");
  const amount = (amountKopecks / 100).toFixed(2);
  const query = new URLSearchParams({
    phone: phoneDigits,
    phoneNumber: phoneDigits,
    amount,
  }).toString();
  const links: Record<
    PaymentBank,
    { app: string; web: string }
  > = {
    SBER: {
      app: `sberbankonline://payments/transfer/by-phone?${query}`,
      web: "https://online.sberbank.ru/CSAFront/index.do",
    },
    TBANK: {
      app: `tinkoffbank://Main/PayByMobileNumber?${query}`,
      web: "https://www.tbank.ru/login/",
    },
    ALFA: {
      app: `alfabank://transfers/by-phone?${query}`,
      web: "https://web.alfabank.ru/",
    },
    VTB: {
      app: `vtb-online://payments/transfers/by-phone?${query}`,
      web: "https://online.vtb.ru/login",
    },
  };
  const target = links[bank];
  let appOpened = false;
  const onVisibilityChanged = () => {
    if (document.visibilityState === "hidden") appOpened = true;
  };
  document.addEventListener("visibilitychange", onVisibilityChanged);
  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", onVisibilityChanged);
    if (appOpened) return;
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(target.web);
    } else {
      window.location.href = target.web;
    }
  }, 1800);
  window.location.href = target.app;
};

const openTelegramDialog = (
  telegramId: number,
  username?: string,
  phone?: string,
) => {
  const normalizedUsername = username?.replace(/^@/, "").trim();
  if (normalizedUsername) {
    const url = `https://t.me/${encodeURIComponent(normalizedUsername)}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.location.href = url;
    }
    return;
  }
  const phoneDigits = phone?.replace(/\D/g, "") || "";
  const normalizedPhone =
    phoneDigits.length === 11 && phoneDigits.startsWith("8")
      ? `+7${phoneDigits.slice(1)}`
      : phoneDigits.startsWith("7")
        ? `+${phoneDigits}`
        : phoneDigits;
  if (normalizedPhone) {
    // Telegram's WebView may ignore window.location changes for external
    // schemes. A real anchor activated inside the user's click reliably
    // hands the tel: link to iOS/Android and desktop Telegram.
    const callLink = document.createElement("a");
    callLink.href = `tel:${normalizedPhone}`;
    callLink.style.display = "none";
    callLink.setAttribute("aria-hidden", "true");
    document.body.appendChild(callLink);
    callLink.click();
    window.setTimeout(() => callLink.remove(), 0);
    return;
  }
  const telegramLink = document.createElement("a");
  telegramLink.href = `tg://user?id=${telegramId}`;
  telegramLink.style.display = "none";
  telegramLink.setAttribute("aria-hidden", "true");
  document.body.appendChild(telegramLink);
  telegramLink.click();
  window.setTimeout(() => telegramLink.remove(), 0);
};

const asBoolean = (value: unknown) =>
  value === true || value === 1 || value === "1" || value === "true";

const asNumber = (value: unknown) => Number(value || 0);

const camelProfile = (row: Record<string, unknown>): Profile => ({
  telegramId: asNumber(row.telegram_id),
  username: row.username ? String(row.username) : undefined,
  firstName: String(row.first_name || ""),
  lastName: row.last_name ? String(row.last_name) : undefined,
  displayName: row.display_name ? String(row.display_name) : undefined,
  phone: row.phone ? String(row.phone) : undefined,
  selectedGroupId: row.selected_group_id
    ? asNumber(row.selected_group_id)
    : undefined,
  registered: asBoolean(row.registered),
  sellerBlocked: asBoolean(row.seller_blocked),
  globallyBanned: asBoolean(row.globally_banned),
  botCommissionPercent: asNumber(row.bot_commission_percent),
  commissionDebtKopecks: asNumber(row.commission_debt_kopecks),
  debtLimitKopecks: asNumber(row.debt_limit_kopecks),
  superAdmin: asBoolean(row.super_admin),
  listingCount: asNumber(row.listing_count),
});

const camelSellerFinance = (row: Record<string, unknown>): SellerFinance => ({
  platformCommissionPercent: asNumber(row.platform_commission_percent),
  platformDebtKopecks: asNumber(row.platform_debt_kopecks),
  platformDebtLimitKopecks: asNumber(row.platform_debt_limit_kopecks),
  platformPaymentDetails: String(row.platform_payment_details || ""),
  groupCommissionPercent: asNumber(row.group_commission_percent),
  groupDebtKopecks: asNumber(row.group_debt_kopecks),
  groupDebtLimitKopecks: asNumber(row.group_debt_limit_kopecks),
  groupPaymentDetails: String(row.group_payment_details || ""),
  platformBlocked: asBoolean(row.platform_blocked),
  groupBlocked: asBoolean(row.group_blocked),
});

const camelClub = (row: Record<string, unknown>): Club => ({
  id: asNumber(row.id),
  telegramGroupId: asNumber(row.telegram_group_id),
  title: String(row.title || ""),
  imageUrl: row.image_url ? String(row.image_url) : undefined,
  ownerTelegramId: asNumber(row.owner_telegram_id),
  shopThreadId: asNumber(row.shop_thread_id),
  commissionPercent: asNumber(row.commission_percent),
  debtLimitKopecks: asNumber(row.debt_limit_kopecks),
  productCount: asNumber(row.product_count),
});

const camelCategory = (row: Record<string, unknown>): Category => ({
  id: asNumber(row.id),
  name: String(row.name || ""),
  sortOrder: asNumber(row.sort_order),
});

const camelAdminGroup = (row: Record<string, unknown>): AdminGroup => ({
  ...camelClub(row),
  active: asBoolean(row.active),
  stores: asNumber(row.stores),
  completedOrders: asNumber(row.completed_orders),
});

const camelBuyer = (row: Record<string, unknown>): Buyer => ({
  telegramId: asNumber(row.telegram_id),
  username: row.username ? String(row.username) : undefined,
  name:
    [row.first_name, row.last_name].filter(Boolean).join(" ") ||
    `ID ${asNumber(row.telegram_id)}`,
  phone: row.contact_phone ? String(row.contact_phone) : undefined,
  status: String(row.status || "RESERVED"),
  selectedColorName: row.selected_color_name
    ? String(row.selected_color_name)
    : undefined,
});

const camelProduct = (row: Record<string, unknown>): Product => {
  let images: string[] = [];
  let colorVariants: ProductColorVariant[] = [];
  try {
    images = JSON.parse(String(row.image_urls || "[]"));
  } catch {
    images = [];
  }
  try {
    colorVariants = JSON.parse(String(row.color_variants || "[]"));
  } catch {
    colorVariants = [];
  }
  return {
    id: asNumber(row.id),
    title: String(row.title || ""),
    description: String(row.description || ""),
    specifications: String(row.specifications || ""),
    category: String(row.category || ""),
    stock: asNumber(row.stock),
    kind: row.kind === "GROUP_BUY" ? "group" : "regular",
    sellerPriceKopecks: asNumber(row.seller_price_kopecks),
    buyerPriceKopecks: asNumber(row.buyer_price_kopecks),
    images,
    colorVariants,
    storeId: asNumber(row.store_id),
    storeName: String(row.store_name || ""),
    storeImageUrl: row.store_image_url
      ? String(row.store_image_url)
      : undefined,
    sellerTelegramId: asNumber(row.seller_telegram_id),
    sellerName: row.seller_name ? String(row.seller_name) : undefined,
    sellerUsername: row.seller_username ? String(row.seller_username) : undefined,
    sellerPhone: row.seller_phone ? String(row.seller_phone) : undefined,
    active: row.active === undefined ? true : asBoolean(row.active),
    orderCount: asNumber(row.order_count),
    rating: asNumber(row.rating),
    reviewCount: asNumber(row.review_count),
    storeRating: asNumber(row.store_rating),
    groupBuyId: row.group_buy_id ? asNumber(row.group_buy_id) : undefined,
    targetCount: row.target_count ? asNumber(row.target_count) : undefined,
    reservedCount: asNumber(row.reserved_count),
    groupBuyStatus: row.group_buy_status
      ? String(row.group_buy_status)
      : undefined,
    reservedByMe: asBoolean(row.reserved_by_me),
  };
};

const camelOrder = (row: Record<string, unknown>): Order => {
  let images: string[] = [];
  try {
    images = JSON.parse(
      String(row.selected_color_images || row.image_urls || "[]"),
    );
  } catch {
    images = [];
  }
  return {
    id: asNumber(row.id),
    status: String(row.status || "AWAITING_PAYMENT") as Order["status"],
    productId: asNumber(row.product_id),
    productTitle: String(row.product_title || ""),
    image: images[0],
    storeName: String(row.store_name || ""),
    sellerPriceKopecks: asNumber(row.seller_price_kopecks),
    buyerPriceKopecks: asNumber(row.buyer_price_kopecks),
    commissionKopecks: asNumber(row.commission_kopecks),
    quantity: Math.max(1, asNumber(row.quantity)),
    createdAt: String(row.created_at || ""),
    sellerName: row.seller_name ? String(row.seller_name) : undefined,
    sellerTelegramId: row.seller_telegram_id
      ? asNumber(row.seller_telegram_id)
      : undefined,
    sellerUsername: row.seller_username
      ? String(row.seller_username)
      : undefined,
    paymentDetails: row.payment_details
      ? String(row.payment_details)
      : undefined,
    paymentBank: asPaymentBank(row.payment_bank),
    paymentPhone: row.payment_phone
      ? String(row.payment_phone)
      : undefined,
    paymentRecipientName: row.payment_recipient_name
      ? String(row.payment_recipient_name)
      : undefined,
    buyerName: row.buyer_name ? String(row.buyer_name) : undefined,
    buyerTelegramId: row.buyer_telegram_id
      ? asNumber(row.buyer_telegram_id)
      : undefined,
    buyerUsername: row.buyer_username ? String(row.buyer_username) : undefined,
    buyerPhone: row.buyer_phone ? String(row.buyer_phone) : undefined,
    reviewRating: row.review_rating ? asNumber(row.review_rating) : undefined,
    selectedColorName: row.selected_color_name
      ? String(row.selected_color_name)
      : undefined,
    fulfillmentDetails: row.fulfillment_details
      ? String(row.fulfillment_details)
      : undefined,
  };
};

const camelStore = (row: Record<string, unknown>): SellerStore => ({
  id: asNumber(row.id),
  name: String(row.name || ""),
  description: row.description ? String(row.description) : undefined,
  imageUrl: row.image_url ? String(row.image_url) : undefined,
  paymentDetails: String(row.payment_details || ""),
  paymentBank: asPaymentBank(row.payment_bank),
  paymentPhone: row.payment_phone ? String(row.payment_phone) : undefined,
  paymentRecipientName: row.payment_recipient_name
    ? String(row.payment_recipient_name)
    : undefined,
});

const camelSellerProfile = (
  row: Record<string, unknown>,
): SellerProfileData => ({
  hasStore: asBoolean(row.has_store),
  storeId: row.store_id ? asNumber(row.store_id) : undefined,
  storeName: row.store_name ? String(row.store_name) : undefined,
  storeDescription: row.store_description
    ? String(row.store_description)
    : undefined,
  storeImageUrl: row.store_image_url
    ? String(row.store_image_url)
    : undefined,
  paymentDetails: row.payment_details
    ? String(row.payment_details)
    : undefined,
  paymentBank: asPaymentBank(row.payment_bank),
  paymentPhone: row.payment_phone ? String(row.payment_phone) : undefined,
  paymentRecipientName: row.payment_recipient_name
    ? String(row.payment_recipient_name)
    : undefined,
  listingCount: asNumber(row.listing_count),
  activeListingCount: asNumber(row.active_listing_count),
  completedSales: asNumber(row.completed_sales),
  soldUnits: asNumber(row.sold_units),
  salesKopecks: asNumber(row.sales_kopecks),
  rating: asNumber(row.rating),
  reviewCount: asNumber(row.review_count),
});

const camelNotification = (
  row: Record<string, unknown>,
): AppNotification => ({
  id: asNumber(row.id),
  title: String(row.title || "REDLINE"),
  body: String(row.body || ""),
  isRead: asBoolean(row.is_read),
  createdAt: String(row.created_at || ""),
  targetScreen:
    row.target_screen === "orders" || row.target_screen === "sales"
      ? row.target_screen
      : undefined,
});

const camelDiscussionMessage = (
  row: Record<string, unknown>,
): DiscussionMessage => ({
  id: asNumber(row.id),
  authorTelegramId: asNumber(row.author_telegram_id),
  authorName: String(row.author_name || `ID ${asNumber(row.author_telegram_id)}`),
  authorUsername: row.author_username
    ? String(row.author_username)
    : undefined,
  body: String(row.body || ""),
  createdAt: String(row.created_at || ""),
});

const camelGroupBuyPurchase = (
  row: Record<string, unknown>,
): GroupBuyPurchase => {
  let images: string[] = [];
  try {
    images = JSON.parse(
      String(row.selected_color_images || row.image_urls || "[]"),
    );
  } catch {
    images = [];
  }
  return {
    groupBuyId: asNumber(row.group_buy_id),
    groupBuyStatus: String(row.group_buy_status || "COLLECTING"),
    reservationStatus: String(row.reservation_status || "RESERVED"),
    productTitle: String(row.product_title || ""),
    image: images[0],
    storeName: String(row.store_name || ""),
    sellerName: row.seller_name ? String(row.seller_name) : undefined,
    sellerTelegramId: row.seller_telegram_id
      ? asNumber(row.seller_telegram_id)
      : undefined,
    sellerUsername: row.seller_username ? String(row.seller_username) : undefined,
    paymentDetails: row.payment_details ? String(row.payment_details) : undefined,
    paymentBank: asPaymentBank(row.payment_bank),
    paymentPhone: row.payment_phone ? String(row.payment_phone) : undefined,
    paymentRecipientName: row.payment_recipient_name
      ? String(row.payment_recipient_name)
      : undefined,
    targetCount: asNumber(row.target_count),
    reservedCount: asNumber(row.reserved_count),
    finalPriceKopecks: row.final_price_kopecks
      ? asNumber(row.final_price_kopecks)
      : undefined,
    paymentDeadline: row.payment_deadline ? String(row.payment_deadline) : undefined,
    deliveryFrom: row.delivery_from ? String(row.delivery_from) : undefined,
    deliveryTo: row.delivery_to ? String(row.delivery_to) : undefined,
    deliveryNote: row.delivery_note ? String(row.delivery_note) : undefined,
    selectedColorName: row.selected_color_name
      ? String(row.selected_color_name)
      : undefined,
  };
};

function dismissKeyboard(event: React.PointerEvent<HTMLElement>) {
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  ) {
    return;
  }
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
  window.Telegram?.WebApp?.hideKeyboard?.();
}

export function RedlineApp() {
  const [initData, setInitData] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>(() => {
    if (typeof window === "undefined") return "market";
    const stored = window.sessionStorage.getItem("redline-active-screen");
    return stored && navBase.some((item) => item.id === stored)
      ? (stored as Screen)
      : "market";
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [discussionProduct, setDiscussionProduct] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState("Все");
  const [activeStoreId, setActiveStoreId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sellerFinance, setSellerFinance] = useState<SellerFinance | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const checkoutRequestRef = useRef<{ fingerprint: string; id: string } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    const connectTelegram = async () => {
      await Promise.resolve();
      let telegram = window.Telegram?.WebApp;
      for (let attempt = 0; !telegram?.initData && attempt < 100; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 100));
        telegram = window.Telegram?.WebApp;
      }
      if (cancelled) return;
      telegram?.ready();
      telegram?.expand();
      telegram?.BackButton?.hide();
      telegram?.SettingsButton?.hide();
      if (
        telegram?.isFullscreen &&
        telegram.isVersionAtLeast?.("8.0")
      ) {
        telegram.exitFullscreen?.();
      }
      const data = telegram?.initData || "";
      setInitData(data);
      if (!data) {
        setLoading(false);
        return;
      }
      await loadBootstrap(data);
    };
    void connectTelegram();
    return () => {
      cancelled = true;
    };
    // The Telegram payload is captured exactly once when the Mini App opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem("redline-active-screen", screen);
  }, [screen]);

  useEffect(() => {
    const loadCart = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(CART_STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        setCart(Array.isArray(parsed) ? parsed : []);
      } catch {
        setCart([]);
      } finally {
        setCartLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(loadCart);
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart, cartLoaded]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!selectedClub) return;
    void loadCatalog(selectedClub.telegramGroupId);
    if (profile?.registered) {
      void loadSellerFinance(selectedClub.telegramGroupId);
    }
    // The catalog reloads only when the selected Telegram group changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClub]);

  useEffect(() => {
    if (!initData || !profile?.registered) return;
    let cancelled = false;
    const refresh = () => {
      void request<Record<string, unknown>[]>("/me/notifications")
        .then((rows) => {
          if (!cancelled) setNotifications(rows.map(camelNotification));
        })
        .catch(() => {
          // Telegram messages continue working if a background refresh fails.
        });
    };
    refresh();
    const timer = window.setInterval(refresh, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // Notifications use the Telegram session captured during bootstrap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData, profile?.registered]);

  useEffect(() => {
    if (!initData || !profile?.registered) return;
    let cancelled = false;
    void request<number[]>("/me/favorites")
      .then((rows) => {
        if (!cancelled) setFavorites(rows.map(Number));
      })
      .catch(() => {
        // Favorites can be retried on the next app opening.
      });
    return () => {
      cancelled = true;
    };
    // Favorites belong to the authenticated Telegram user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData, profile?.registered]);

  async function request<T>(
    path: string,
    options: RequestInit = {},
    data = initData,
  ): Promise<T> {
    const headers = new Headers(options.headers);
    if (data) headers.set("X-Telegram-Init-Data", data);
    if (options.body && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    const controller = new AbortController();
    const timeoutMs = options.body instanceof FormData ? 90_000 : 30_000;
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    const abortFromCaller = () => controller.abort();
    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
    try {
      const response = await fetch(`${API}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      if (!response.ok) {
        let message = `Ошибка ${response.status}`;
        try {
          const body = await response.json();
          message = body.message || body.error || message;
        } catch {
          // Keep the HTTP status message.
        }
        throw new Error(message);
      }
      if (response.status === 204) return undefined as T;
      const responseText = await response.text();
      if (!responseText) return undefined as T;
      return JSON.parse(responseText) as T;
    } catch (requestError) {
      if (
        controller.signal.aborted &&
        !(options.signal && options.signal.aborted)
      ) {
        throw new Error(
          options.body instanceof FormData
            ? "Загрузка фотографии заняла слишком много времени. Проверьте интернет и повторите."
            : "Сервер не ответил вовремя. Повторите действие.",
        );
      }
      throw requestError;
    } finally {
      window.clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abortFromCaller);
    }
  }

  async function loadBootstrap(data = initData) {
    setLoading(true);
    setError("");
    try {
      const [profileRow, groupRows, categoryRows] = await Promise.all([
        request<Record<string, unknown>>("/me", {}, data),
        request<Record<string, unknown>[]>("/groups", {}, data),
        request<Record<string, unknown>[]>("/categories", {}, data),
      ]);
      const nextProfile = camelProfile(profileRow);
      const nextClubs = groupRows.map(camelClub);
      setProfile(nextProfile);
      setClubs(nextClubs);
      setCategories(categoryRows.map(camelCategory));

      const requestedGroup = Number(
        new URLSearchParams(window.location.search).get("group"),
      );
      const requested = nextClubs.find(
        (club) => club.telegramGroupId === requestedGroup,
      );
      const preferred = nextClubs.find(
        (club) => club.id === nextProfile.selectedGroupId,
      );
      setSelectedClub((current) => {
        if (current) {
          return nextClubs.find((club) => club.id === current.id) || null;
        }
        return requested || preferred || null;
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить REDLINE",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalog(groupId: number) {
    try {
      const rows = await request<Record<string, unknown>[]>(
        `/groups/${groupId}/catalog`,
      );
      const nextProducts = rows.map(camelProduct);
      setProducts(nextProducts);
      const requestedProduct = Number(
        new URLSearchParams(window.location.search).get("product"),
      );
      if (requestedProduct) {
        const requested = nextProducts.find(
          (product) => product.id === requestedProduct,
        ) || null;
        const openDiscussion =
          new URLSearchParams(window.location.search).get("discussion") === "1";
        if (openDiscussion) {
          setDiscussionProduct(requested);
          setSelectedProduct(null);
        } else {
          setSelectedProduct(requested);
        }
      }
    } catch (catalogError) {
      setError(
        catalogError instanceof Error
          ? catalogError.message
          : "Не удалось загрузить каталог",
      );
    }
  }

  async function loadSellerFinance(telegramGroupId: number) {
    try {
      const row = await request<Record<string, unknown>>(
        `/me/finance/${telegramGroupId}`,
      );
      const finance = camelSellerFinance(row);
      setSellerFinance(finance);
      setProfile((current) =>
        current
          ? {
              ...current,
              sellerBlocked: finance.platformBlocked || finance.groupBlocked,
              botCommissionPercent: finance.platformCommissionPercent,
              commissionDebtKopecks: finance.platformDebtKopecks,
              debtLimitKopecks: finance.platformDebtLimitKopecks,
            }
          : current,
      );
    } catch (financeError) {
      setSellerFinance(null);
      setToast(
        financeError instanceof Error
          ? financeError.message
          : "Не удалось загрузить комиссии продавца",
      );
    }
  }

  async function reloadCategories() {
    const rows = await request<Record<string, unknown>[]>("/categories");
    setCategories(rows.map(camelCategory));
  }

  async function reloadNotifications() {
    const rows = await request<Record<string, unknown>[]>("/me/notifications");
    setNotifications(rows.map(camelNotification));
  }

  const marketCategoryNames = useMemo(() => {
    const categoryOrder = new Map(
      categories.map((category, index) => [category.name, index]),
    );
    return Array.from(
      new Set(
        products
          .filter(
            (product) =>
              (activeStoreId === null || product.storeId === activeStoreId) &&
              (!favoritesOnly || favorites.includes(product.id)),
          )
          .map((product) => product.category.trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => {
      const leftOrder = categoryOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = categoryOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.localeCompare(right, "ru");
    });
  }, [activeStoreId, categories, favorites, favoritesOnly, products]);

  const effectiveActiveCategory =
    activeCategory === "Все" || marketCategoryNames.includes(activeCategory)
      ? activeCategory
      : "Все";

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.stock > 0 &&
          (product.kind !== "group" ||
            product.groupBuyStatus === "COLLECTING") &&
          (effectiveActiveCategory === "Все" ||
            product.category === effectiveActiveCategory) &&
          (activeStoreId === null || product.storeId === activeStoreId) &&
          (!favoritesOnly || favorites.includes(product.id)) &&
          `${product.title} ${product.storeName}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [
      activeStoreId,
      effectiveActiveCategory,
      favorites,
      favoritesOnly,
      products,
      query,
    ],
  );

  const storefronts = useMemo(() => {
    const byId = new Map<number, Storefront>();
    for (const product of products) {
      const current = byId.get(product.storeId);
      if (current) {
        current.productCount += 1;
        if (!current.cover && product.storeImageUrl) {
          current.cover = product.storeImageUrl;
        }
        current.rating = product.storeRating;
      } else {
        byId.set(product.storeId, {
          id: product.storeId,
          name: product.storeName,
          sellerTelegramId: product.sellerTelegramId,
          productCount: 1,
          cover: product.storeImageUrl,
          rating: product.storeRating,
        });
      }
    }
    return Array.from(byId.values());
  }, [products]);

  const groupProducts = products.filter((product) => product.kind === "group");
  const activeCartItems = cart.filter(
    (item) => item.clubId === selectedClub?.id,
  );
  const cartCount = activeCartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const isClubOwner =
    !!profile &&
    !!selectedClub &&
    selectedClub.ownerTelegramId === profile.telegramId;
  const displayName =
    profile?.displayName ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    "Участник";
  const initial = displayName.slice(0, 1).toUpperCase();

  const haptic = (kind: "light" | "medium" | "heavy" = "light") =>
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(kind);

  const navigate = (next: Screen) => {
    haptic();
    setScreen(next);
    setDrawerOpen(false);
    if (
      selectedClub &&
      ["listings", "sales", "create", "balance"].includes(next)
    ) {
      void loadSellerFinance(selectedClub.telegramGroupId);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function toggleFavorite(productId: number) {
    const favorite = !favorites.includes(productId);
    setFavorites((items) =>
      favorite ? [...items, productId] : items.filter((id) => id !== productId),
    );
    try {
      await request(`/me/favorites/${productId}`, {
        method: "PUT",
        body: JSON.stringify({ favorite }),
      });
    } catch (favoriteError) {
      setFavorites((items) =>
        favorite ? items.filter((id) => id !== productId) : [...items, productId],
      );
      setToast(
        favoriteError instanceof Error
          ? favoriteError.message
          : "Не удалось изменить избранное",
      );
    }
  }

  async function reserve(product: Product, selectedColorKey?: string) {
    if (!product.groupBuyId || !profile?.phone) return;
    try {
      const cancelling = product.reservedByMe;
      const result = await request<{
        reserved: number;
        target: number;
        thresholdReached: boolean;
      }>(
        `/group-buys/${product.groupBuyId}/reservations${cancelling ? "/me" : ""}`,
        {
        method: cancelling ? "DELETE" : "POST",
        ...(cancelling
          ? {}
          : {
              body: JSON.stringify({
                phone: profile.phone,
                selectedColorKey,
              }),
            }),
        },
      );
      setProducts((items) =>
        items.map((item) =>
          item.id === product.id
            ? {
                ...item,
                reservedCount: result.reserved,
                targetCount: result.target,
                reservedByMe: !cancelling,
                groupBuyStatus: result.thresholdReached
                  ? "PRICE_CONFIRMATION"
                  : "COLLECTING",
              }
            : item,
        ),
      );
      setSelectedProduct((item) =>
        item?.id === product.id
          ? {
              ...item,
              reservedCount: result.reserved,
              targetCount: result.target,
              reservedByMe: !cancelling,
              groupBuyStatus: result.thresholdReached
                ? "PRICE_CONFIRMATION"
                : "COLLECTING",
            }
          : item,
      );
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
      setToast(
        cancelling
          ? "Бронь отменена."
          : result.thresholdReached
          ? "Группа собрана. Продавец обновит цену и запустит оплату."
          : "Место в закупке забронировано.",
      );
    } catch (reserveError) {
      setToast(
        reserveError instanceof Error
          ? reserveError.message
          : "Не удалось забронировать",
      );
    }
  }

  function addToCart(
    product: Product,
    quantity: number,
    selectedColorKey?: string,
  ) {
    if (!selectedClub) {
      setToast("Сначала выберите клуб");
      return;
    }
    const selectedColor = product.colorVariants.find(
      (variant) => variant.key === selectedColorKey,
    );
    const availableStock = selectedColor?.stock ?? product.stock;
    const key = `${selectedClub.id}:${product.id}:${selectedColorKey || "default"}`;
    setCart((items) => {
      const existing = items.find((item) => item.key === key);
      if (existing) {
        return items.map((item) =>
          item.key === key
            ? {
                ...item,
                quantity: Math.min(
                  availableStock,
                  item.quantity + quantity,
                ),
                stock: availableStock,
                unitPriceKopecks: product.buyerPriceKopecks,
              }
            : item,
        );
      }
      return [
        ...items,
        {
          key,
          clubId: selectedClub.id,
          productId: product.id,
          productTitle: product.title,
          storeId: product.storeId,
          storeName: product.storeName,
          unitPriceKopecks: product.buyerPriceKopecks,
          quantity: Math.min(availableStock, quantity),
          stock: availableStock,
          image: selectedColor?.images[0] || product.images[0],
          selectedColorKey: selectedColor?.key,
          selectedColorName: selectedColor?.name,
        },
      ];
    });
    checkoutRequestRef.current = null;
    setSelectedProduct(null);
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
    setToast(`${product.title} добавлен в корзину`);
  }

  function updateCartQuantity(key: string, quantity: number) {
    setCart((items) =>
      items.map((item) =>
        item.key === key
          ? {
              ...item,
              quantity: Math.max(1, Math.min(item.stock, quantity)),
            }
          : item,
      ),
    );
    checkoutRequestRef.current = null;
  }

  function removeFromCart(key: string) {
    setCart((items) => items.filter((item) => item.key !== key));
    checkoutRequestRef.current = null;
  }

  async function checkoutCart(
    items: CartItem[],
    fulfillmentDetails: string,
  ) {
    if (!items.length) return;
    const normalizedFulfillment = fulfillmentDetails.trim();
    if (normalizedFulfillment.length < 3) {
      setToast("Укажите доставку или способ получения");
      return;
    }
    const fingerprint = JSON.stringify(
      [
        normalizedFulfillment,
        ...items.map((item) => [
          item.productId,
          item.quantity,
          item.selectedColorKey || "",
        ]),
      ],
    );
    if (checkoutRequestRef.current?.fingerprint !== fingerprint) {
      checkoutRequestRef.current = {
        fingerprint,
        id:
          globalThis.crypto?.randomUUID?.() ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
    }
    const requestId = checkoutRequestRef.current.id;
    const result = await request<{ ids: number[] }>("/orders/batch", {
      method: "POST",
      body: JSON.stringify({
        requestId,
        fulfillmentDetails: normalizedFulfillment,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedColorKey: item.selectedColorKey,
        })),
      }),
    });
    const clubId = items[0].clubId;
    setCart((current) => current.filter((item) => item.clubId !== clubId));
    checkoutRequestRef.current = null;
    if (selectedClub) {
      await loadCatalog(selectedClub.telegramGroupId);
    }
    navigate("orders");
    setToast(
      `Заказ оформлен: ${result.ids.length} ${result.ids.length === 1 ? "позиция" : "позиций"}.`,
    );
  }

  if (loading) {
    return <StatePage icon={<Gauge />} title="Загрузка REDLINE" text="Получаем данные из Telegram и Базы данных…" />;
  }

  if (!initData) {
    return (
      <StatePage
        icon={<ShieldCheck />}
        title="Откройте приложение в Telegram"
        text="Для безопасного входа используйте кнопку меню вашего бота REDLINE."
      />
    );
  }

  if (error && !profile) {
    return (
      <StatePage
        icon={<ShieldCheck />}
        title="Не удалось войти"
        text={error}
        action={<button onClick={() => void loadBootstrap()}>Повторить</button>}
      />
    );
  }

  if (profile && !profile.registered) {
    return (
      <Registration
        profile={profile}
        clubs={clubs}
        onRegister={async (name, phone, groupId) => {
          await request("/register", {
            method: "POST",
            body: JSON.stringify({ displayName: name, phone, groupId }),
          });
          await loadBootstrap();
        }}
      />
    );
  }

  if (profile?.globallyBanned) {
    return (
      <StatePage
        icon={<ShieldCheck />}
        title="Аккаунт заблокирован"
        text="Доступ к REDLINE ограничен супер-администратором."
      />
    );
  }

  if (profile?.registered && clubs.length > 0 && !selectedClub) {
    return (
      <ClubChoice
        clubs={clubs}
        onChoose={async (club) => {
          await request(`/me/group/${club.id}`, { method: "PUT" });
          setProfile((current) =>
            current
              ? {
                  ...current,
                  selectedGroupId: club.id,
                }
              : current,
          );
          setActiveStoreId(null);
          setFavoritesOnly(false);
          setSelectedClub(club);
        }}
      />
    );
  }

  const navItems = [
    ...navBase.filter(
      (item) => item.id !== "balance" || (profile?.listingCount || 0) > 0,
    ),
    ...(isClubOwner
      ? [{ id: "admin" as Screen, label: "Админка группы", icon: LayoutDashboard }]
      : []),
    ...(profile?.superAdmin
      ? [{ id: "superadmin" as Screen, label: "Супер-админ", icon: Crown }]
      : []),
  ];

  return (
    <main className="app-shell" onPointerDown={dismissKeyboard}>
      <div className="noise" />
      <header className="topbar">
        <button className="icon-button menu-button" onClick={() => setDrawerOpen(true)} aria-label="Открыть меню">
          <Menu size={22} />
        </button>

        <label className="group-switcher group-selector">
          <span className={`group-mark ${selectedClub?.imageUrl ? "has-image" : ""}`}>
            {selectedClub?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedClub.imageUrl} alt="" />
            ) : selectedClub ? (
              selectedClub.title.slice(0, 2).toUpperCase()
            ) : (
              "—"
            )}
          </span>
          <span>
            <small>КЛУБ</small>
            <select
              value={selectedClub?.id || ""}
              onChange={async (event) => {
                const nextClub =
                  clubs.find((club) => club.id === Number(event.target.value)) ||
                  null;
                if (!nextClub) return;
                try {
                  await request(`/me/group/${nextClub.id}`, { method: "PUT" });
                  setProfile((current) =>
                    current
                      ? {
                          ...current,
                          selectedGroupId: nextClub.id,
                        }
                      : current,
                  );
                  setActiveStoreId(null);
                  setFavoritesOnly(false);
                  setActiveCategory("Все");
                  setSelectedClub(nextClub);
                } catch (selectionError) {
                  setToast(
                    selectionError instanceof Error
                      ? selectionError.message
                      : "Не удалось выбрать клуб",
                  );
                }
              }}
            >
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>{club.title}</option>
              ))}
            </select>
          </span>
          <ChevronDown size={15} />
        </label>

        <div className="top-actions">
          <button
            className={`icon-button cart-button ${cartCount > 0 ? "has-items" : ""}`}
            aria-label={`Корзина, товаров: ${cartCount}`}
            title="Корзина"
            onClick={() => navigate("cart")}
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && <em>{Math.min(99, cartCount)}</em>}
          </button>
          <button
            className="icon-button notification-button"
            aria-label="Уведомления"
            onClick={() => {
              setNotificationsOpen((open) => !open);
              void reloadNotifications();
            }}
          >
            <Bell size={19} />
            {notifications.some((item) => !item.isRead) && (
              <em>{Math.min(99, notifications.filter((item) => !item.isRead).length)}</em>
            )}
          </button>
          <button
            className="avatar-button"
            onClick={() => setProfileOpen(true)}
            aria-label="Открыть профиль продавца"
            title="Профиль и статистика"
          >
            {initial}
          </button>
        </div>
      </header>

      <aside className={`drawer ${drawerOpen ? "is-open" : ""}`} aria-hidden={!drawerOpen}>
        <div className="drawer-head">
          <div className="brand-lockup"><span className="brand-slash" /><div><b>REDLINE</b><small>CLUB MARKET</small></div></div>
          <button className="icon-button" onClick={() => setDrawerOpen(false)} aria-label="Закрыть меню"><X size={21} /></button>
        </div>
        <button
          type="button"
          className="profile-card"
          onClick={() => {
            setDrawerOpen(false);
            setProfileOpen(true);
          }}
        >
          <span className="profile-avatar">{initial}</span>
          <span className="profile-card-copy">
            <strong>{displayName}</strong>
            <span><BadgeCheck size={13} /> Зарегистрирован</span>
          </span>
        </button>
        <nav className="drawer-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const needsClub = ["cart", "orders", "sales", "listings", "create", "admin"].includes(item.id);
            const disabled = needsClub && !selectedClub;
            return (
              <div className="drawer-nav-item" key={item.id}>
                {(item.id === "create" || item.id === "admin") && (
                  <span className="drawer-divider" />
                )}
                <button
                  className={`${screen === item.id ? "active" : ""} ${disabled ? "disabled" : ""}`}
                  onClick={() => !disabled && navigate(item.id)}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                  {item.id === "admin" && <small>OWNER</small>}
                  {item.id === "superadmin" && <small>SUPER</small>}
                </button>
              </div>
            );
          })}
        </nav>
        <p className="drawer-legal">REDLINE CLUB · Прямые расчёты между участниками</p>
      </aside>
      {drawerOpen && <button className="drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-label="Закрыть меню" />}

      <div className="page-content">
        {screen === "market" && (
          <Market
            club={selectedClub}
            clubs={clubs}
            categoryNames={marketCategoryNames}
            products={visibleProducts}
            storefronts={storefronts}
            activeStoreId={activeStoreId}
            setActiveStoreId={setActiveStoreId}
            favoritesOnly={favoritesOnly}
            setFavoritesOnly={setFavoritesOnly}
            totalProducts={products.length}
            activeCategory={effectiveActiveCategory}
            setActiveCategory={setActiveCategory}
            query={query}
            setQuery={setQuery}
            favorites={favorites}
            onFavorite={(id) => void toggleFavorite(id)}
            onOpen={setSelectedProduct}
            onReserve={reserve}
          />
        )}

        {screen === "group" && (
          <SimpleList
            title="Групповые закупки"
            text="Закупки появляются после публикации продавцом."
            products={groupProducts}
            favorites={favorites}
            onFavorite={(id) => void toggleFavorite(id)}
            onOpen={setSelectedProduct}
            onReserve={reserve}
          />
        )}

        {screen === "cart" && (
          <CartPage
            club={selectedClub}
            items={activeCartItems}
            onBack={() => navigate("market")}
            onChangeQuantity={updateCartQuantity}
            onRemove={removeFromCart}
            onCheckout={checkoutCart}
            onToast={setToast}
          />
        )}

        {screen === "orders" && (
          <OrdersPage
            mode="purchases"
            club={selectedClub}
            request={request}
            onCatalogChanged={async () => {
              if (selectedClub) await loadCatalog(selectedClub.telegramGroupId);
            }}
            onToast={setToast}
          />
        )}

        {screen === "sales" && (
          <OrdersPage
            mode="sales"
            club={selectedClub}
            request={request}
            onCatalogChanged={async () => {
              if (selectedClub) await loadCatalog(selectedClub.telegramGroupId);
            }}
            onToast={setToast}
          />
        )}

        {screen === "listings" && (
          <SellerListings
            club={selectedClub}
            categories={categories}
            request={request}
            onCreate={() => navigate("create")}
            onChanged={async () => {
              await Promise.all([
                selectedClub
                  ? loadCatalog(selectedClub.telegramGroupId)
                  : Promise.resolve(),
                reloadCategories(),
                loadBootstrap(),
              ]);
            }}
            onToast={setToast}
          />
        )}

        {screen === "balance" && profile && (
          <Balance profile={profile} finance={sellerFinance} />
        )}

        {screen === "create" && profile && (
          <CreateListing
            key={selectedClub?.telegramGroupId || "no-club"}
            profile={profile}
            finance={sellerFinance}
            club={selectedClub}
            categories={categories}
            request={request}
            onCreated={async () => {
              await Promise.all([
                selectedClub
                  ? loadCatalog(selectedClub.telegramGroupId)
                  : Promise.resolve(),
                reloadCategories(),
                loadBootstrap(),
              ]);
              setToast("Объявление опубликовано в теме «Магазин».");
              navigate("market");
            }}
          />
        )}

        {screen === "admin" && selectedClub && (
          <ClubAdmin
            club={selectedClub}
            products={products}
            request={request}
            onChanged={async () => {
              await loadBootstrap();
              await loadCatalog(selectedClub.telegramGroupId);
            }}
            onToast={setToast}
          />
        )}

        {screen === "superadmin" && profile?.superAdmin && (
          <SuperAdmin
            request={request}
            onToast={setToast}
          />
        )}

        {screen === "help" && <Help />}

      </div>

      {sellerFinance &&
        (sellerFinance.platformBlocked || sellerFinance.groupBlocked) &&
        ["listings", "sales", "create", "balance"].includes(screen) && (
          <SellerDebtModal
            finance={sellerFinance}
            clubTitle={selectedClub?.title || "текущий клуб"}
            onClose={() => navigate("market")}
          />
        )}

      {notificationsOpen && (
        <NotificationsModal
          notifications={notifications}
          request={request}
          onChanged={reloadNotifications}
          onNavigate={navigate}
          onClose={() => setNotificationsOpen(false)}
          onToast={setToast}
        />
      )}

      {profileOpen && profile && (
        <SellerProfileModal
          profile={profile}
          club={selectedClub}
          request={request}
          onClose={() => setProfileOpen(false)}
          onChanged={async () => {
            if (selectedClub) {
              await loadCatalog(selectedClub.telegramGroupId);
            }
            setToast("Профиль магазина обновлён");
          }}
        />
      )}

      {selectedProduct && (
        <ProductModal
          key={selectedProduct.id}
          product={selectedProduct}
          favorite={favorites.includes(selectedProduct.id)}
          onFavorite={() => void toggleFavorite(selectedProduct.id)}
          onClose={() => setSelectedProduct(null)}
          onDiscuss={() => {
            setDiscussionProduct(selectedProduct);
            setSelectedProduct(null);
          }}
          onReserve={(selectedColorKey) =>
            void reserve(selectedProduct, selectedColorKey)
          }
          onAddToCart={(quantity, selectedColorKey) =>
            addToCart(selectedProduct, quantity, selectedColorKey)
          }
        />
      )}

      {discussionProduct && profile && (
        <ProductDiscussion
          product={discussionProduct}
          profile={profile}
          request={request}
          onClose={() => setDiscussionProduct(null)}
        />
      )}

      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </main>
  );
}

function Registration({
  profile,
  clubs,
  onRegister,
}: {
  profile: Profile;
  clubs: Club[];
  onRegister: (name: string, phone: string, groupId: number | null) => Promise<void>;
}) {
  const suggestedName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const [name, setName] = useState(suggestedName);
  const [phone, setPhone] = useState("");
  const [groupId, setGroupId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  return (
    <main className="registration-shell" onPointerDown={dismissKeyboard}>
      <div className="registration-card">
        <div className="brand-lockup"><span className="brand-slash" /><div><b>REDLINE</b><small>CLUB MARKET</small></div></div>
        <span className="section-kicker">ПЕРВЫЙ ВХОД</span>
        <h1>Регистрация</h1>
        <p>Имя и телефон нужны продавцам для связи и участия в групповых закупках.</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            setError("");
            try {
              await onRegister(name, phone, groupId ? Number(groupId) : null);
            } catch (registrationError) {
              setError(
                registrationError instanceof Error
                  ? registrationError.message
                  : "Не удалось завершить регистрацию",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          <label>
            <span>Как к вам обращаться</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              enterKeyHint="next"
            />
          </label>
          <label>
            <span>Телефон</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
              inputMode="tel"
              enterKeyHint="next"
              placeholder="+7 900 000-00-00"
            />
          </label>
          {clubs.length > 0 && (
            <label>
              <span>Ваш клуб</span>
              <select
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                required
              >
                <option value="" disabled>Выберите клуб из списка</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>{club.title}</option>
                ))}
              </select>
            </label>
          )}
          <label className="checkbox-label"><input type="checkbox" required /><span>Согласен с правилами прямых расчётов между участниками</span></label>
          {error && <p className="form-error">{error}</p>}
          <button className="main-action" type="submit" disabled={saving}>{saving ? "Сохраняем…" : "Зарегистрироваться"}</button>
        </form>
      </div>
    </main>
  );
}

function ClubChoice({
  clubs,
  onChoose,
}: {
  clubs: Club[];
  onChoose: (club: Club) => Promise<void>;
}) {
  const [groupId, setGroupId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  return (
    <main className="registration-shell" onPointerDown={dismissKeyboard}>
      <div className="registration-card club-choice-card">
        <div className="brand-lockup"><span className="brand-slash" /><div><b>REDLINE</b><small>CLUB MARKET</small></div></div>
        <span className="section-kicker">ПЕРВЫЙ ВХОД</span>
        <h1>Выберите клуб</h1>
        <p>Каталог, объявления и настройки будут открыты для выбранной Telegram-группы.</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const club = clubs.find((item) => item.id === Number(groupId));
            if (!club) return;
            setSaving(true);
            setError("");
            try {
              await onChoose(club);
            } catch (selectionError) {
              setError(
                selectionError instanceof Error
                  ? selectionError.message
                  : "Не удалось выбрать клуб",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          <label>
            <span>Доступные клубы</span>
            <select value={groupId} onChange={(event) => setGroupId(event.target.value)} required>
              <option value="" disabled>Выберите клуб из списка</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>{club.title}</option>
              ))}
            </select>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="main-action" disabled={saving || !groupId}>
            {saving ? "Сохраняем…" : "Войти в клуб"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Market({
  club,
  clubs,
  categoryNames,
  products,
  storefronts,
  activeStoreId,
  setActiveStoreId,
  favoritesOnly,
  setFavoritesOnly,
  totalProducts,
  activeCategory,
  setActiveCategory,
  query,
  setQuery,
  favorites,
  onFavorite,
  onOpen,
  onReserve,
}: {
  club: Club | null;
  clubs: Club[];
  categoryNames: string[];
  products: Product[];
  storefronts: Storefront[];
  activeStoreId: number | null;
  setActiveStoreId: (value: number | null) => void;
  favoritesOnly: boolean;
  setFavoritesOnly: (value: boolean) => void;
  totalProducts: number;
  activeCategory: string;
  setActiveCategory: (value: string) => void;
  query: string;
  setQuery: (value: string) => void;
  favorites: number[];
  onFavorite: (id: number) => void;
  onOpen: (product: Product) => void;
  onReserve: (product: Product, selectedColorKey?: string) => Promise<void>;
}) {
  return (
    <section className="catalog-section catalog-section-direct">
        {!club ? (
          <ConnectClubState hasGroups={clubs.length > 0} />
        ) : (
          <>
            <div className="storefront-heading">
              <div><span className="section-kicker">МАГАЗИНЫ</span><h3>Выберите магазин</h3></div>
              <button
                className={`favorites-filter ${favoritesOnly ? "active" : ""}`}
                onClick={() => {
                  setFavoritesOnly(!favoritesOnly);
                  setActiveStoreId(null);
                  setActiveCategory("Все");
                  setQuery("");
                }}
              >
                <Heart size={14} fill={favoritesOnly ? "currentColor" : "none"} />
                Избранное
                {favorites.length > 0 && <em>{favorites.length}</em>}
              </button>
            </div>
            <div className="storefront-row">
              <button
                className={`storefront-card all-stores ${activeStoreId === null ? "active" : ""}`}
                onClick={() => {
                  setActiveStoreId(null);
                  setFavoritesOnly(false);
                  setActiveCategory("Все");
                  setQuery("");
                }}
              >
                <span className="storefront-monogram">ALL</span>
                <b>Все магазины</b>
                <small>{totalProducts} товаров</small>
              </button>
              {storefronts.map((store) => (
                <button
                  key={store.id}
                  className={`storefront-card ${activeStoreId === store.id ? "active" : ""}`}
                  onClick={() => {
                    setActiveStoreId(store.id);
                    setFavoritesOnly(false);
                    setActiveCategory("Все");
                    setQuery("");
                  }}
                >
                  <span className="storefront-cover">
                    {store.cover ? (
                      // Store uploads are served by the same app and lazy-loaded below the fold.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={store.cover} alt={`Обложка магазина ${store.name}`} loading="lazy" decoding="async" />
                    ) : store.name.slice(0, 2).toUpperCase()}
                  </span>
                  <b>{store.name}</b>
                  <small>{store.productCount} товаров{store.rating > 0 ? ` · ★ ${store.rating.toFixed(1)}` : ""}</small>
                </button>
              ))}
            </div>
            <div className="store-products-heading">
              <span className="section-kicker">ТОВАРЫ</span>
              <h3>
                {favoritesOnly
                  ? "Избранные товары"
                  : activeStoreId === null
                  ? "Все товары"
                  : storefronts.find((store) => store.id === activeStoreId)?.name || "Товары магазина"}
              </h3>
            </div>
            <div className="search-box">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по товарам и магазинам" />
              {query && <button onClick={() => setQuery("")}><X size={16} /></button>}
            </div>
            <div className="category-row">
              {["Все", ...categoryNames].map((category) => (
                <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>{category}</button>
              ))}
            </div>
            {products.length ? (
              <div className="catalog-grid">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    favorite={favorites.includes(product.id)}
                    onFavorite={() => onFavorite(product.id)}
                    onOpen={() => onOpen(product)}
                    onReserve={() =>
                      product.colorVariants.length
                        ? onOpen(product)
                        : void onReserve(product)
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                {favoritesOnly ? <Heart size={30} /> : <Gauge size={30} />}
                <h3>{favoritesOnly ? "В избранном пока пусто" : "Магазин пока пуст"}</h3>
                <p>{favoritesOnly ? "Нажмите на сердечко в карточке товара, чтобы сохранить его здесь." : "Здесь появятся только реальные объявления участников."}</p>
              </div>
            )}
          </>
        )}
    </section>
  );
}

function ConnectClubState({ hasGroups }: { hasGroups: boolean }) {
  return (
    <div className="connect-club-state">
      <UsersRound size={38} />
      <h3>{hasGroups ? "Выберите клуб сверху" : "Подключите Telegram-группу"}</h3>
      <p>
        {hasGroups
          ? "Выберите одну из реально подключённых групп в верхнем меню."
          : "Добавьте бота в группу как администратора, включите темы и выдайте право «Управление темами». После этого группа появится здесь автоматически."}
      </p>
      {!hasGroups && (
        <ol>
          <li>Добавьте бота REDLINE в Telegram-группу.</li>
          <li>Назначьте его администратором.</li>
          <li>Разрешите управление темами.</li>
        </ol>
      )}
    </div>
  );
}

function ProductCard({
  product,
  favorite,
  onFavorite,
  onOpen,
  onReserve,
}: {
  product: Product;
  favorite: boolean;
  onFavorite: () => void;
  onOpen: () => void;
  onReserve: () => void;
}) {
  const progress = product.targetCount
    ? Math.min(100, Math.round((product.reservedCount / product.targetCount) * 100))
    : 0;
  const groupClosed =
    product.kind === "group" &&
    (product.groupBuyStatus !== "COLLECTING" ||
      product.reservedCount >= (product.targetCount || Number.MAX_SAFE_INTEGER));
  return (
    <article className="product-card">
      <div
        className="product-image actual-product-image"
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onOpen();
        }}
        role="button"
        tabIndex={0}
      >
        {product.images[0] && (
          // Native lazy loading prevents the catalog from downloading every photo at once.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0]} alt={product.title} loading="lazy" decoding="async" />
        )}
        <span className={`product-badge ${product.kind === "group" ? "group-badge" : ""}`}>{product.kind === "group" ? "GROUP" : "SALE"}</span>
        <button type="button" className={`heart-button ${favorite ? "active" : ""}`} onClick={(event) => { event.stopPropagation(); onFavorite(); }} aria-label="Избранное"><Heart size={15} fill={favorite ? "currentColor" : "none"} /></button>
      </div>
      <div className="product-body">
        <span className="seller-line"><BadgeCheck size={12} />{product.storeName}</span>
        <button className="product-title" onClick={onOpen}>{product.title}</button>
        <p>{product.description}</p>
        <div className="product-card-tail">
          <div className="rating-line">
            <Star size={13} fill={product.reviewCount ? "currentColor" : "none"} />
            <b>{product.reviewCount ? product.rating.toFixed(1) : "—"}</b>
            <span>{product.reviewCount ? `${product.reviewCount} оценок` : "Нет оценок"}</span>
          </div>
          <div className="card-progress-slot">
            {product.kind === "group" && product.targetCount ? (
              <div className="group-progress">
                <div className="progress-label"><span>Забронировали</span><b>{product.reservedCount} из {product.targetCount}</b></div>
                <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
              </div>
            ) : null}
          </div>
          <div className="price-row"><div><strong>{formatPrice(product.buyerPriceKopecks)}</strong></div><span>В наличии: {product.stock}</span></div>
          <div className="product-card-actions">
            <button
              className={`primary-card-action ${groupClosed ? "locked" : ""} ${product.reservedByMe ? "success" : ""}`}
              disabled={groupClosed && !product.reservedByMe}
              onClick={product.kind === "group" ? onReserve : onOpen}
            >
              {product.kind === "group" ? (
                product.reservedByMe ? (
                  "Отменить бронь"
                ) : groupClosed ? (
                  <><Lock size={14} /> Группа собрана</>
                ) : (
                  "Забронировать"
                )
              ) : (
                "Подробнее"
              )}
              {!groupClosed && <ChevronRight size={15} />}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProductModal({
  product,
  favorite,
  onFavorite,
  onClose,
  onDiscuss,
  onReserve,
  onAddToCart,
}: {
  product: Product;
  favorite: boolean;
  onFavorite: () => void;
  onClose: () => void;
  onDiscuss: () => void;
  onReserve: (selectedColorKey?: string) => void;
  onAddToCart: (quantity: number, selectedColorKey?: string) => void;
}) {
  const [activeImage, setActiveImage] = useState(0);
  const [activeColorKey, setActiveColorKey] = useState(
    product.colorVariants[0]?.key || "",
  );
  const [quantity, setQuantity] = useState(1);
  const progress = product.targetCount
    ? Math.min(100, Math.round((product.reservedCount / product.targetCount) * 100))
    : 0;
  const activeColor = product.colorVariants.find(
    (variant) => variant.key === activeColorKey,
  );
  const availableStock = activeColor?.stock ?? product.stock;
  const images = (activeColor?.images || product.images).filter(Boolean);
  const selectedImage = images[activeImage];
  const groupClosed =
    product.kind === "group" &&
    (product.groupBuyStatus !== "COLLECTING" ||
      product.reservedCount >= (product.targetCount || Number.MAX_SAFE_INTEGER));
  const canToggleReservation =
    product.kind === "group" &&
    (product.reservedByMe
      ? ["COLLECTING", "PRICE_CONFIRMATION"].includes(
          product.groupBuyStatus || "COLLECTING",
        )
      : !groupClosed);

  const changeImage = (direction: number) => {
    if (images.length < 2) return;
    setActiveImage((current) =>
      (current + direction + images.length) % images.length,
    );
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <article className="product-modal">
        <div className={`modal-visual actual-product-image ${selectedImage ? "has-image" : ""}`}>
          {selectedImage && (
            // Preserve the original proportions instead of cropping the photo.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selectedImage} alt={`${product.title}, фото ${activeImage + 1}`} />
          )}
          <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть"><X size={19} /></button>
          <button type="button" className={`modal-heart ${favorite ? "active" : ""}`} onClick={onFavorite} aria-label="В избранное"><Heart size={18} fill={favorite ? "currentColor" : "none"} /></button>
          {images.length > 1 && (
            <>
              <button type="button" className="slider-arrow slider-arrow-left" onClick={() => changeImage(-1)} aria-label="Предыдущее фото"><ChevronLeft size={21} /></button>
              <button type="button" className="slider-arrow slider-arrow-right" onClick={() => changeImage(1)} aria-label="Следующее фото"><ChevronRight size={21} /></button>
              <div className="slider-counter">{activeImage + 1} / {images.length}</div>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="product-thumbnails" aria-label="Фотографии товара">
            {images.map((image, index) => (
              <button
                type="button"
                key={`${image}-${index}`}
                className={index === activeImage ? "active" : ""}
                onClick={() => setActiveImage(index)}
                aria-label={`Открыть фото ${index + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="" />
              </button>
            ))}
          </div>
        )}
        <div className="modal-body">
          <span className="seller-line"><BadgeCheck size={13} />{product.storeName}</span>
          <span className="availability-chip">● В наличии · {availableStock} шт.</span>
          <h2>{product.title}</h2>
          <div className="rating-line modal-rating">
            <div>
              <Star size={15} fill={product.reviewCount ? "currentColor" : "none"} />
              <b>{product.reviewCount ? product.rating.toFixed(1) : "—"}</b>
              <span>{product.reviewCount ? `${product.reviewCount} оценок` : "Оценок пока нет"}</span>
            </div>
            <button type="button" onClick={onDiscuss}>
              <MessageCircle size={14} /> Обсудить
            </button>
          </div>
          {product.colorVariants.length > 0 && (
            <section className="product-color-selector">
              <div>
                <span>Цвет</span>
                <b>{activeColor?.name}</b>
              </div>
              <div className="product-color-options">
                {product.colorVariants.map((variant) => (
                  <button
                    type="button"
                    key={variant.key}
                    className={variant.key === activeColorKey ? "active" : ""}
                    onClick={() => {
                      setActiveColorKey(variant.key);
                      setActiveImage(0);
                      setQuantity(1);
                    }}
                    aria-label={`Выбрать цвет ${variant.name}`}
                    title={variant.name}
                  >
                    <i style={{ backgroundColor: variant.hex }} />
                  </button>
                ))}
              </div>
            </section>
          )}
          <section className="product-detail-section">
            <span>Описание</span>
            <p>{product.description}</p>
          </section>
          {product.specifications && (
            <section className="product-detail-section product-specifications">
              <span>Характеристики</span>
              <p>{product.specifications}</p>
            </section>
          )}
          {product.kind === "group" && product.targetCount && (
            <div className="modal-group-box">
              <div><span>Собрано</span><b>{product.reservedCount} / {product.targetCount}</b></div>
              <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
            </div>
          )}
          <div className="modal-price">
            <span>Цена</span>
            <strong>{formatPrice(product.buyerPriceKopecks)}</strong>
          </div>
          {product.kind === "regular" && (
            <div className="quantity-picker">
              <div><span>Количество</span><small>Доступно: {availableStock} шт.</small></div>
              <div>
                <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} disabled={quantity <= 1} aria-label="Уменьшить количество"><Minus size={17} /></button>
                <b>{quantity}</b>
                <button type="button" onClick={() => setQuantity((current) => Math.min(availableStock, current + 1))} disabled={quantity >= availableStock} aria-label="Увеличить количество"><Plus size={17} /></button>
              </div>
            </div>
          )}
          <button
            className="main-action product-buy-action"
            disabled={
              availableStock < 1 ||
              (product.kind === "group" && !canToggleReservation)
            }
            onClick={
              product.kind === "group"
                ? () => onReserve(activeColor?.key)
                : () => onAddToCart(quantity, activeColor?.key)
            }
          >
            {product.kind === "group"
              ? product.reservedByMe
                ? "Отменить бронь"
                : groupClosed
                  ? <><Lock size={16} /> Группа собрана</>
                  : "Забронировать место"
              : `В корзину · ${formatPrice(product.buyerPriceKopecks * quantity)}`}
          </button>
        </div>
      </article>
    </div>
  );
}

function CartPage({
  club,
  items,
  onBack,
  onChangeQuantity,
  onRemove,
  onCheckout,
  onToast,
}: {
  club: Club | null;
  items: CartItem[];
  onBack: () => void;
  onChangeQuantity: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
  onCheckout: (
    items: CartItem[],
    fulfillmentDetails: string,
  ) => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [checkingOut, setCheckingOut] = useState(false);
  const [fulfillmentDetails, setFulfillmentDetails] = useState("");
  const checkoutRef = useRef(false);
  const storeGroups = useMemo(() => {
    const grouped = new Map<
      number,
      { storeId: number; storeName: string; items: CartItem[] }
    >();
    for (const item of items) {
      const current = grouped.get(item.storeId);
      if (current) {
        current.items.push(item);
      } else {
        grouped.set(item.storeId, {
          storeId: item.storeId,
          storeName: item.storeName,
          items: [item],
        });
      }
    }
    return Array.from(grouped.values());
  }, [items]);
  const total = items.reduce(
    (sum, item) => sum + item.unitPriceKopecks * item.quantity,
    0,
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const submit = async () => {
    if (checkoutRef.current || !items.length) return;
    checkoutRef.current = true;
    setCheckingOut(true);
    try {
      if (fulfillmentDetails.trim().length < 3) {
        onToast("Укажите доставку или способ получения");
        return;
      }
      await onCheckout(items, fulfillmentDetails);
    } catch (checkoutError) {
      onToast(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Не удалось оформить заказ",
      );
    } finally {
      checkoutRef.current = false;
      setCheckingOut(false);
    }
  };

  return (
    <section className="inner-page narrow-page cart-page">
      <div className="cart-page-head">
        <div className="page-title">
          <span className="section-kicker">SHOPPING CART</span>
          <h1>Корзина</h1>
          <p>
            {club
              ? `Товары клуба ${club.title}`
              : "Выберите клуб, чтобы открыть его корзину"}
          </p>
        </div>
        <button type="button" className="cart-back-button" onClick={onBack}>
          <ArrowLeft size={15} /> В магазин
        </button>
      </div>

      {!club ? (
        <div className="empty-state">
          <ShoppingCart size={30} />
          <h3>Клуб не выбран</h3>
          <p>Выберите клуб в верхней панели.</p>
        </div>
      ) : !items.length ? (
        <div className="empty-state">
          <ShoppingCart size={30} />
          <h3>Корзина пока пуста</h3>
          <p>Откройте товар, выберите количество и добавьте его в корзину.</p>
          <button className="main-action" onClick={onBack}>
            Перейти к товарам
          </button>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-store-list">
            {storeGroups.map((group) => (
              <section className="cart-store-group" key={group.storeId}>
                <div className="cart-store-heading">
                  <Store size={15} />
                  <span>Магазин</span>
                  <b>{group.storeName}</b>
                </div>
                {group.items.map((item) => (
                  <article className="cart-item" key={item.key}>
                    <div className="cart-item-image actual-product-image">
                      {item.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.productTitle} />
                      )}
                    </div>
                    <div className="cart-item-copy">
                      <span>{item.storeName}</span>
                      <b>{item.productTitle}</b>
                      {item.selectedColorName && (
                        <small>Цвет: {item.selectedColorName}</small>
                      )}
                      <strong>
                        {formatPrice(item.unitPriceKopecks * item.quantity)}
                      </strong>
                    </div>
                    <div className="cart-item-controls">
                      <div>
                        <button
                          type="button"
                          disabled={item.quantity <= 1}
                          onClick={() =>
                            onChangeQuantity(item.key, item.quantity - 1)
                          }
                          aria-label="Уменьшить количество"
                        >
                          <Minus size={15} />
                        </button>
                        <b>{item.quantity}</b>
                        <button
                          type="button"
                          disabled={item.quantity >= item.stock}
                          onClick={() =>
                            onChangeQuantity(item.key, item.quantity + 1)
                          }
                          aria-label="Увеличить количество"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-remove-button"
                        onClick={() => onRemove(item.key)}
                        aria-label={`Удалить ${item.productTitle}`}
                      >
                        <Trash2 size={15} /> Удалить
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            ))}
          </div>
          <aside className="cart-summary">
            <div>
              <span>Позиций</span>
              <b>{items.length}</b>
            </div>
            <div>
              <span>Товаров</span>
              <b>{itemCount}</b>
            </div>
            <div className="cart-summary-total">
              <span>Итого</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <label className="cart-fulfillment-field">
              <span>Доставка/Получение</span>
              <textarea
                value={fulfillmentDetails}
                onChange={(event) => setFulfillmentDetails(event.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Например: СДЭК до пункта…, адрес, ФИО и телефон получателя или самовывоз"
                required
              />
              <small>
                Укажите способ получения и все данные, необходимые продавцу.
              </small>
            </label>
            <button
              type="button"
              className="main-action"
              disabled={
                checkingOut || fulfillmentDetails.trim().length < 3
              }
              onClick={() => void submit()}
            >
              <ShoppingCart size={18} />
              {checkingOut
                ? "Оформляем…"
                : `Оформить заказ · ${formatPrice(total)}`}
            </button>
            <small>
              Заказы создаются одновременно. Если хотя бы одной позиции уже
              недостаточно, корзина останется без изменений.
            </small>
          </aside>
        </div>
      )}
    </section>
  );
}

function ProductDiscussion({
  product,
  profile,
  request,
  onClose,
}: {
  product: Product;
  profile: Profile;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function loadMessages(showLoading = false) {
    if (showLoading) setLoading(true);
    try {
      const rows = await request<Record<string, unknown>[]>(
        `/products/${product.id}/discussion`,
      );
      setMessages(rows.map(camelDiscussionMessage));
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить обсуждение",
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const refresh = async (showLoading = false) => {
      if (cancelled) return;
      await loadMessages(showLoading);
    };
    void refresh(true);
    const timer = window.setInterval(() => void refresh(), 3_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // Discussion polling is scoped to the selected product.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      await request(`/products/${product.id}/discussion`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setDraft("");
      await loadMessages();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Не удалось отправить сообщение",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="discussion-backdrop">
      <section className="product-discussion" aria-label={`Обсуждение товара ${product.title}`}>
        <header className="discussion-header">
          <button type="button" onClick={onClose} aria-label="Закрыть обсуждение">
            <ArrowLeft size={20} />
          </button>
          <div>
            <span>ОБСУЖДЕНИЕ ТОВАРА</span>
            <b>{product.title}</b>
          </div>
          <MessageCircle size={21} />
        </header>
        <div className="discussion-product">
          {product.images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.images[0]} alt="" />
          )}
          <div>
            <b>{product.title}</b>
            <span>{formatPrice(product.buyerPriceKopecks)} · {product.storeName}</span>
          </div>
        </div>
        <div className="discussion-messages">
          {loading ? (
            <div className="discussion-empty">Загружаем сообщения…</div>
          ) : messages.length === 0 ? (
            <div className="discussion-empty">
              <MessageCircle size={28} />
              <b>Начните обсуждение</b>
              <span>Спросите о товаре, совместимости, комплекте или доставке.</span>
            </div>
          ) : (
            messages.map((message) => {
              const mine = message.authorTelegramId === profile.telegramId;
              return (
                <article
                  key={message.id}
                  className={`discussion-message ${mine ? "mine" : ""}`}
                >
                  <div>
                    <b>{mine ? "Вы" : message.authorName}</b>
                    <time>{formatMoscowDateTime(message.createdAt)}</time>
                  </div>
                  <p>{message.body}</p>
                </article>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <form className="discussion-composer" onSubmit={sendMessage}>
          {error && <p>{error}</p>}
          <div>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={2000}
              rows={1}
              placeholder="Напишите сообщение…"
              aria-label="Сообщение в обсуждение"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button type="submit" disabled={sending || !draft.trim()} aria-label="Отправить">
              <Send size={18} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function SellerProfileModal({
  profile,
  club,
  request,
  onClose,
  onChanged,
}: {
  profile: Profile;
  club: Club | null;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [sellerProfile, setSellerProfile] =
    useState<SellerProfileData | null>(null);
  const [storeName, setStoreName] = useState("");
  const [paymentBank, setPaymentBank] = useState<PaymentBank>("SBER");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentRecipientName, setPaymentRecipientName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(!!club);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const displayName =
    profile.displayName ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    `ID ${profile.telegramId}`;

  async function loadProfile() {
    if (!club) return;
    setLoading(true);
    try {
      const row = await request<Record<string, unknown>>(
        `/me/seller-profile/${club.telegramGroupId}`,
      );
      const next = camelSellerProfile(row);
      setSellerProfile(next);
      setStoreName(next.storeName || "");
      setPaymentBank(next.paymentBank || "SBER");
      setPaymentPhone(next.paymentPhone || "");
      setPaymentRecipientName(next.paymentRecipientName || "");
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить профиль",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    void request<Record<string, unknown>>(
      `/me/seller-profile/${club.telegramGroupId}`,
    )
      .then((row) => {
        if (cancelled) return;
        const next = camelSellerProfile(row);
        setSellerProfile(next);
        setStoreName(next.storeName || "");
        setPaymentBank(next.paymentBank || "SBER");
        setPaymentPhone(next.paymentPhone || "");
        setPaymentRecipientName(next.paymentRecipientName || "");
        setError("");
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Не удалось загрузить профиль",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // The seller profile is scoped to the selected club.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.telegramGroupId]);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sellerProfile?.storeId) return;
    setSaving(true);
    setError("");
    try {
      let imageUrl = sellerProfile.storeImageUrl || "";
      if (file) {
        const body = new FormData();
        body.append("file", file);
        const uploaded = await request<{ url: string }>("/uploads", {
          method: "POST",
          body,
        });
        imageUrl = uploaded.url;
      }
      await request(`/stores/${sellerProfile.storeId}/profile`, {
        method: "PUT",
        body: JSON.stringify({
          name: storeName,
          imageUrl,
          paymentBank,
          paymentPhone,
          paymentRecipientName,
        }),
      });
      setFile(null);
      if (preview) {
        URL.revokeObjectURL(preview);
        setPreview("");
      }
      await Promise.all([loadProfile(), onChanged()]);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Не удалось обновить магазин",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop profile-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="seller-profile-modal">
        <header className="seller-profile-head">
          <div>
            <span className="section-kicker">SELLER PROFILE</span>
            <h2>Мой профиль</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть профиль">
            <X size={20} />
          </button>
        </header>
        <div className="seller-identity">
          <span className="profile-avatar">
            {displayName.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <b>{displayName}</b>
            <small>
              {profile.username
                ? `@${profile.username}`
                : `Telegram ID: ${profile.telegramId}`}
              {profile.phone ? ` · ${profile.phone}` : ""}
            </small>
            <em>{club ? club.title : "Клуб не выбран"}</em>
          </div>
        </div>

        {!club ? (
          <div className="profile-empty">
            <Store size={28} />
            <b>Выберите клуб</b>
            <span>Статистика и магазин показываются отдельно для каждого клуба.</span>
          </div>
        ) : loading ? (
          <div className="profile-empty">Загружаем статистику…</div>
        ) : sellerProfile?.hasStore ? (
          <>
            <div className="seller-profile-stats">
              <div><PackagePlus size={17} /><span>Объявления</span><b>{sellerProfile.listingCount}</b><small>{sellerProfile.activeListingCount} активных</small></div>
              <div><ShoppingBag size={17} /><span>Продажи</span><b>{sellerProfile.completedSales}</b><small>{sellerProfile.soldUnits} товаров</small></div>
              <div><WalletCards size={17} /><span>Выручка</span><b>{formatPrice(sellerProfile.salesKopecks)}</b><small>после завершения</small></div>
              <div><Star size={17} /><span>Рейтинг</span><b>{sellerProfile.reviewCount ? sellerProfile.rating.toFixed(1) : "—"}</b><small>{sellerProfile.reviewCount} оценок</small></div>
            </div>
            <form className="seller-profile-form" onSubmit={saveProfile}>
              <label className="profile-store-image">
                {(preview || sellerProfile.storeImageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview || sellerProfile.storeImageUrl}
                    alt="Фотография магазина"
                  />
                ) : (
                  <div><ImagePlus size={28} /><span>Добавить фото магазина</span></div>
                )}
                <em><Pencil size={13} /> Изменить фото</em>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    if (preview) URL.revokeObjectURL(preview);
                    const nextFile = event.target.files?.[0] || null;
                    setFile(nextFile);
                    setPreview(nextFile ? URL.createObjectURL(nextFile) : "");
                  }}
                />
              </label>
              <label>
                <span>Название магазина</span>
                <input
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                  maxLength={100}
                  required
                />
              </label>
              <label>
                <span>Банк получателя</span>
                <select
                  value={paymentBank}
                  onChange={(event) =>
                    setPaymentBank(event.target.value as PaymentBank)
                  }
                  required
                >
                  {PAYMENT_BANKS.map((bank) => (
                    <option key={bank.value} value={bank.value}>
                      {bank.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Телефон, привязанный к СБП</span>
                <input
                  value={paymentPhone}
                  onChange={(event) => setPaymentPhone(event.target.value)}
                  inputMode="tel"
                  maxLength={30}
                  placeholder="+7 999 111-22-33"
                  required
                />
              </label>
              <label>
                <span>Имя получателя</span>
                <input
                  value={paymentRecipientName}
                  onChange={(event) =>
                    setPaymentRecipientName(event.target.value)
                  }
                  maxLength={100}
                  placeholder="Иван Иванович И."
                  required
                />
                <small>
                  Покупатель увидит имя и полный телефон перед переводом.
                </small>
              </label>
              {error && <p className="form-error">{error}</p>}
              <button
                className="main-action"
                disabled={
                  saving ||
                  !storeName.trim() ||
                  !paymentPhone.trim() ||
                  !paymentRecipientName.trim()
                }
              >
                {saving ? "Сохраняем…" : "Сохранить профиль магазина"}
              </button>
            </form>
          </>
        ) : (
          <div className="profile-empty">
            <Store size={28} />
            <b>Магазина в этом клубе пока нет</b>
            <span>Создайте первое объявление — вместе с ним появится магазин и статистика.</span>
          </div>
        )}
        {error && !sellerProfile?.hasStore && <p className="form-error">{error}</p>}
      </section>
    </div>
  );
}

function SimpleList({
  title,
  text,
  products,
  favorites,
  onFavorite,
  onOpen,
  onReserve,
}: {
  title: string;
  text: string;
  products: Product[];
  favorites: number[];
  onFavorite: (id: number) => void;
  onOpen: (product: Product) => void;
  onReserve: (product: Product, selectedColorKey?: string) => Promise<void>;
}) {
  return (
    <section className="inner-page">
      <div className="page-title"><span className="section-kicker">GROUP BUY</span><h1>{title}</h1><p>{text}</p></div>
      {products.length ? (
        <div className="catalog-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              favorite={favorites.includes(product.id)}
              onFavorite={() => onFavorite(product.id)}
              onOpen={() => onOpen(product)}
              onReserve={() =>
                product.colorVariants.length
                  ? onOpen(product)
                  : void onReserve(product)
              }
            />
          ))}
        </div>
      ) : (
        <div className="empty-state"><UsersRound size={32} /><h3>Активных закупок нет</h3><p>Никакие демонстрационные товары не загружены.</p></div>
      )}
    </section>
  );
}

function CategoryInput({
  categories,
  defaultValue = "",
}: {
  categories: Category[];
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const normalized = value.trim().toLocaleLowerCase("ru-RU");
  const suggestions = categories
    .filter(
      (category) =>
        !normalized ||
        category.name.toLocaleLowerCase("ru-RU").includes(normalized),
    )
    .slice(0, 12);

  return (
    <label className="category-input-field">
      <span>Категория</span>
      <input
        name="category"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={80}
        required
        autoComplete="off"
        placeholder="Выберите или впишите новую"
      />
      {suggestions.length > 0 && (
        <div className="category-suggestion-list">
          {suggestions.map((category) => (
            <button
              type="button"
              key={category.id}
              className={value === category.name ? "active" : ""}
              onClick={() => setValue(category.name)}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}
      <small>
        Выберите существующую категорию или впишите новую — она создастся
        автоматически.
      </small>
    </label>
  );
}

function SellerListings({
  club,
  categories,
  request,
  onCreate,
  onChanged,
  onToast,
}: {
  club: Club | null;
  categories: Category[];
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onCreate: () => void;
  onChanged: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);

  async function loadListings() {
    if (!club) return;
    setLoading(true);
    try {
      const rows = await request<Record<string, unknown>[]>(
        `/groups/${club.telegramGroupId}/my-products`,
      );
      setItems(rows.map(camelProduct));
    } catch (listingsError) {
      onToast(
        listingsError instanceof Error
          ? listingsError.message
          : "Не удалось загрузить объявления",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    void request<Record<string, unknown>[]>(
      `/groups/${club.telegramGroupId}/my-products`,
    )
      .then((rows) => {
        if (!cancelled) setItems(rows.map(camelProduct));
      })
      .catch((listingsError) => {
        if (!cancelled) {
          onToast(
            listingsError instanceof Error
              ? listingsError.message
              : "Не удалось загрузить объявления",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Seller listings reload when the selected Telegram group changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.telegramGroupId]);

  if (!club) {
    return <EmptySection title="Мои объявления" text="Сначала выберите клуб." />;
  }

  const activeCount = items.filter((item) => item.active).length;
  const totalOrders = items.reduce((sum, item) => sum + item.orderCount, 0);

  return (
    <section className="inner-page narrow-page">
      <div className="page-title"><span className="section-kicker">SELLER SPACE</span><h1>Мои объявления</h1><p>{club.title}</p></div>
      <div className="seller-summary">
        <div><span>Всего</span><b>{items.length}</b></div>
        <div><span>Активных</span><b>{activeCount}</b></div>
        <div><span>Заказов</span><b>{totalOrders}</b></div>
      </div>
      <button className="main-action listings-create" onClick={onCreate}>Создать объявление</button>
      {loading ? (
        <div className="empty-inline">Загружаем объявления…</div>
      ) : items.length ? (
        <div className="seller-listings">
          {items.map((product) => (
            <article className="listing-card" key={product.id}>
              <div
                className="listing-thumb actual-product-image"
                style={product.images[0] ? { backgroundImage: `url("${product.images[0]}")` } : undefined}
              />
              <div>
                <span className={product.active ? "status-on" : "status-off"}>
                  {product.active ? "АКТИВНО" : "СКРЫТО"}
                </span>
                <b>{product.title}</b>
                <small>{product.storeName} · {product.category}</small>
                <p>{formatPrice(product.buyerPriceKopecks)} · Остаток: {product.stock} · Заказов: {product.orderCount}</p>
              </div>
              <div className="seller-listing-actions">
                <button onClick={() => setEditing(product)}>
                  <Pencil size={14} /> Редактировать
                </button>
                <button
                  onClick={async () => {
                    try {
                      await request(`/products/${product.id}/active`, {
                        method: "PUT",
                        body: JSON.stringify({ active: !product.active }),
                      });
                      await Promise.all([loadListings(), onChanged()]);
                      onToast(product.active ? "Объявление скрыто" : "Объявление снова активно");
                    } catch (toggleError) {
                      onToast(toggleError instanceof Error ? toggleError.message : "Не удалось изменить объявление");
                    }
                  }}
                >
                  {product.active ? "Скрыть" : "Включить"}
                </button>
                <button
                  className="danger-action"
                  onClick={async () => {
                    if (!window.confirm(`Удалить объявление «${product.title}»?`)) return;
                    try {
                      await request(`/products/${product.id}`, { method: "DELETE" });
                      await Promise.all([loadListings(), onChanged()]);
                      onToast("Объявление удалено");
                    } catch (deleteError) {
                      onToast(deleteError instanceof Error ? deleteError.message : "Не удалось удалить объявление");
                    }
                  }}
                >
                  <Trash2 size={14} /> Удалить
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state"><Store size={30} /><h3>Объявлений пока нет</h3><p>После публикации товар появится здесь автоматически.</p></div>
      )}
      {editing && (
        <EditListingModal
          product={editing}
          categories={categories}
          request={request}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await Promise.all([loadListings(), onChanged()]);
            onToast("Объявление обновлено");
          }}
        />
      )}
    </section>
  );
}

function EditListingModal({
  product,
  categories,
  request,
  onClose,
  onSaved,
}: {
  product: Product;
  categories: Category[];
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [variantStocks, setVariantStocks] = useState<Record<string, string>>(
    () => {
      const variantCount = product.colorVariants.length;
      return Object.fromEntries(
        product.colorVariants.map((variant, index) => [
          variant.key,
          String(
            variant.stock ??
              Math.floor(product.stock / Math.max(1, variantCount)) +
                (index < product.stock % Math.max(1, variantCount) ? 1 : 0),
          ),
        ]),
      );
    },
  );

  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview)),
    [previews],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      let images = product.images;
      if (files.length) {
        const uploaded = await Promise.all(
          files.map(async (file) => {
            const body = new FormData();
            body.append("file", file);
            return request<{ url: string }>("/uploads", {
              method: "POST",
              body,
            });
          }),
        );
        images = uploaded.map((item) => item.url);
      }
      const updatedColorVariants = product.colorVariants.map((variant) => ({
        ...variant,
        stock: Math.max(0, Number(variantStocks[variant.key]) || 0),
      }));
      const stock = updatedColorVariants.length
        ? updatedColorVariants.reduce(
            (total, variant) => total + (variant.stock || 0),
            0,
          )
        : Number(form.get("stock"));
      await request(`/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: String(form.get("title")),
          description: String(form.get("description")),
          specifications: String(form.get("specifications")),
          category: String(form.get("category")),
          stock,
          sellerPriceKopecks: Math.round(Number(form.get("price")) * 100),
          imageUrlsJson: JSON.stringify(images),
          colorVariantsJson: JSON.stringify(updatedColorVariants),
        }),
      });
      await onSaved();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Не удалось сохранить объявление",
      );
    } finally {
      setSaving(false);
    }
  }

  const displayImages = previews.length ? previews : product.images;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="product-modal edit-listing-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрыть"><X /></button>
        <div className="page-title"><span className="section-kicker">EDIT</span><h1>Редактировать</h1></div>
        <form className="listing-form" onSubmit={submit}>
          {product.colorVariants.length ? (
            <div className="color-variant-editor edit-color-variants">
              <div className="color-picker-heading">
                <span>Остатки по цветам</span>
                <small>Фотографии и количество каждого цвета</small>
              </div>
              {product.colorVariants.map((variant) => (
                <div className="color-photo-field" key={variant.key}>
                  <div className="color-photo-title">
                    <i style={{ backgroundColor: variant.hex }} />
                    <div>
                      <b>{variant.name}</b>
                      <span>{variant.images.length} фото</span>
                    </div>
                  </div>
                  <div className={`upload-area compact has-preview`}>
                    <div className={`upload-preview-grid ${variant.images.length === 1 ? "single-photo" : ""}`}>
                      {variant.images.map((image, index) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={`${image}-${index}`} src={image} alt={`${variant.name}, фото ${index + 1}`} />
                      ))}
                    </div>
                  </div>
                  <label className="color-stock-field">
                    <span>Количество цвета «{variant.name}», шт.</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={variantStocks[variant.key] || "0"}
                      onChange={(event) =>
                        setVariantStocks((items) => ({
                          ...items,
                          [variant.key]: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <>
              <label className={`upload-area ${displayImages.length ? "has-preview" : ""}`}>
                <div className={`upload-preview-grid ${displayImages.length === 1 ? "single-photo" : ""}`}>
                  {displayImages.map((preview, index) => (
                    // Existing URLs and local blob previews are user-selected images.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={`${preview}-${index}`} src={preview} alt={`Фото ${index + 1}`} />
                  ))}
                </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => {
                  previews.forEach((preview) => URL.revokeObjectURL(preview));
                  const nextFiles = Array.from(event.target.files || []).slice(0, 6);
                  setFiles(nextFiles);
                  setPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
                }}
              />
              </label>
              <p className="upload-caption">Нажмите на фото, чтобы заменить весь набор.</p>
            </>
          )}
          <label><span>Название товара</span><input name="title" defaultValue={product.title} required /></label>
          <CategoryInput
            categories={categories}
            defaultValue={product.category}
          />
          <label><span>Описание</span><textarea name="description" defaultValue={product.description} rows={4} required /></label>
          <label><span>Характеристики</span><textarea name="specifications" defaultValue={product.specifications} rows={4} placeholder="Артикул, производитель, размеры, совместимость…" /></label>
          <div className="form-row">
            <label><span>Цена продавца, ₽</span><input name="price" type="number" min="1" step="1" defaultValue={Math.round(product.sellerPriceKopecks / 100)} required /></label>
            {!product.colorVariants.length && (
              <label><span>Количество</span><input name="stock" type="number" min="1" defaultValue={product.stock} required /></label>
            )}
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="main-action" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить"}</button>
        </form>
      </div>
    </div>
  );
}

function OrdersPage({
  mode,
  club,
  request,
  onCatalogChanged,
  onToast,
}: {
  mode: "purchases" | "sales";
  club: Club | null;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onCatalogChanged?: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellerGroupBuys, setSellerGroupBuys] = useState<Product[]>([]);
  const [groupBuyPurchases, setGroupBuyPurchases] = useState<GroupBuyPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRequisites, setOpenRequisites] = useState<number[]>([]);
  const [salesTab, setSalesTab] = useState<"active" | "completed">("active");
  const [reportingOrder, setReportingOrder] = useState<Order | null>(null);

  async function loadOrders(showLoading = true) {
    if (!club) return;
    if (showLoading) setLoading(true);
    try {
      const [rows, groupRows] = await Promise.all([
        request<Record<string, unknown>[]>(
          `/groups/${club.telegramGroupId}/orders/${mode}`,
        ),
        mode === "sales"
          ? request<Record<string, unknown>[]>(
              `/groups/${club.telegramGroupId}/my-products`,
            )
          : request<Record<string, unknown>[]>(
              `/groups/${club.telegramGroupId}/group-buys/purchases`,
            ),
      ]);
      setOrders(rows.map(camelOrder));
      if (mode === "sales") {
        setSellerGroupBuys(
          groupRows.map(camelProduct).filter((product) => product.kind === "group"),
        );
      } else {
        setGroupBuyPurchases(groupRows.map(camelGroupBuyPurchase));
      }
    } catch (ordersError) {
      if (showLoading) {
        onToast(
          ordersError instanceof Error
            ? ordersError.message
            : "Не удалось загрузить заказы",
        );
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    if (!club) return;
    const initial = window.setTimeout(() => void loadOrders(true), 0);
    const refresh = () => void loadOrders(false);
    const timer = window.setInterval(refresh, 5_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // Keep order statuses in sync while both sides have the Mini App open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.telegramGroupId, mode]);

  if (!club) {
    return <EmptySection title={mode === "sales" ? "Заказы клиентов" : "Мои заказы"} text="Сначала выберите клуб." />;
  }

  async function advance(order: Order, status: "PAID" | "SHIPPED" | "COMPLETED" | "CANCELLED") {
    try {
      await request(`/orders/${order.id}/status/${status.toLowerCase()}`, {
        method: "POST",
      });
      await loadOrders();
      onToast(
        status === "CANCELLED"
          ? "Заказ отменён"
          : status === "PAID"
          ? "Продавец получил уведомление об оплате"
          : status === "SHIPPED"
            ? "Покупатель уведомлён об отправке"
            : "Получение подтверждено, заказ завершён",
      );
    } catch (advanceError) {
      onToast(
        advanceError instanceof Error
          ? advanceError.message
          : "Не удалось обновить заказ",
      );
    }
  }

  async function review(order: Order, rating: number): Promise<boolean> {
    try {
      await request(`/orders/${order.id}/review`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      });
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id ? { ...item, reviewRating: rating } : item,
        ),
      );
      onToast("Спасибо! Оценка сохранена");
    } catch (reviewError) {
      onToast(
        reviewError instanceof Error
          ? reviewError.message
          : "Не удалось сохранить оценку",
      );
      return false;
    }
    void onCatalogChanged?.().catch(() => {
      // The review is already saved; the catalog will refresh on the next visit.
    });
    return true;
  }

  const shownOrders =
    mode === "sales"
      ? orders.filter((order) =>
          salesTab === "completed"
            ? ["COMPLETED", "CANCELLED"].includes(order.status)
            : !["COMPLETED", "CANCELLED"].includes(order.status),
        )
      : orders;

  return (
    <section className="inner-page narrow-page">
      <div className="page-title">
        <span className="section-kicker">{mode === "sales" ? "SELLER ORDERS" : "MY ORDERS"}</span>
        <h1>{mode === "sales" ? "Заказы клиентов" : "Мои заказы"}</h1>
        <p>{mode === "sales" ? "Контакты покупателей и выполнение заказов" : `Покупки в клубе ${club.title}`}</p>
      </div>
      {mode === "sales" && (
        <div className="order-tabs">
          <button className={salesTab === "active" ? "active" : ""} onClick={() => setSalesTab("active")}>Активные заказы</button>
          <button className={salesTab === "completed" ? "active" : ""} onClick={() => setSalesTab("completed")}>Завершённые заказы</button>
        </div>
      )}
      {mode === "sales" && salesTab === "active" && sellerGroupBuys.length > 0 && (
        <>
          <div className="subsection-heading order-group-heading"><h2>Групповые закупки</h2><p>Зафиксируйте цену, проверьте оплаты и сообщите сроки поставки.</p></div>
          <div className="procurement-list">
            {sellerGroupBuys.map((product) => (
              <GroupBuyAdminCard
                key={product.id}
                product={product}
                request={request}
                onChanged={async () => {
                  await loadOrders();
                  await onCatalogChanged?.();
                }}
                onToast={onToast}
              />
            ))}
          </div>
        </>
      )}
      {mode === "purchases" && groupBuyPurchases.length > 0 && (
        <>
          <div className="subsection-heading order-group-heading"><h2>Мои групповые закупки</h2><p>Брони, оплата и сроки поставки.</p></div>
          <div className="group-purchase-list">
            {groupBuyPurchases.map((purchase) => (
              <GroupBuyPurchaseCard
                key={purchase.groupBuyId}
                purchase={purchase}
                request={request}
                onChanged={async () => {
                  await loadOrders();
                  await onCatalogChanged?.();
                }}
                onToast={onToast}
              />
            ))}
          </div>
        </>
      )}
      {loading ? (
        <div className="empty-inline">Загружаем заказы…</div>
      ) : shownOrders.length ? (
        shownOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            mode={mode}
            requisitesOpen={openRequisites.includes(order.id)}
            onToggleRequisites={() =>
              setOpenRequisites((current) =>
                current.includes(order.id)
                  ? current.filter((id) => id !== order.id)
                  : [...current, order.id],
              )
            }
            onAdvance={(status) => advance(order, status)}
            onReport={() => setReportingOrder(order)}
            onReview={(rating) => review(order, rating)}
            onToast={onToast}
          />
        ))
      ) : (mode === "sales" ? salesTab === "active" && sellerGroupBuys.length > 0 : groupBuyPurchases.length > 0) ? null : (
        <div className="empty-state"><ShoppingBag size={30} /><h3>Заказов пока нет</h3><p>{mode === "sales" && salesTab === "completed" ? "Завершённые и отменённые заказы будут храниться здесь." : mode === "sales" ? "Новые заказы ваших товаров появятся здесь." : "После покупки заказ появится здесь."}</p></div>
      )}
      {reportingOrder && (
        <ReportSellerModal
          title="Жалоба на продавца"
          subtitle={`Заказ #${reportingOrder.id} · ${reportingOrder.productTitle}`}
          endpoint={`/orders/${reportingOrder.id}/reports`}
          request={request}
          onClose={() => setReportingOrder(null)}
          onSent={() => {
            setReportingOrder(null);
            onToast("Жалоба отправлена супер-администратору");
          }}
        />
      )}
    </section>
  );
}

function ReportSellerModal({
  title,
  subtitle,
  endpoint,
  request,
  onClose,
  onSent,
}: {
  title: string;
  subtitle: string;
  endpoint: string;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onClose: () => void;
  onSent: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <div
      className="modal-backdrop report-modal-backdrop"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <form
        className="report-modal"
        onSubmit={async (event) => {
          event.preventDefault();
          const active = document.activeElement;
          if (active instanceof HTMLElement) active.blur();
          window.Telegram?.WebApp?.hideKeyboard?.();
          setSaving(true);
          setError("");
          try {
            await request(endpoint, {
              method: "POST",
              body: JSON.stringify({ reason }),
            });
            onSent();
          } catch (reportError) {
            setError(reportError instanceof Error ? reportError.message : "Не удалось отправить жалобу");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="report-modal-icon"><AlertTriangle size={24} /></div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        <label><span>Причина</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={5} minLength={5} required enterKeyHint="done" placeholder="Опишите проблему с продавцом или заказом" /></label>
        {error && <p className="form-error">{error}</p>}
        <div className="report-modal-actions">
          <button type="button" className="outline-action" onClick={onClose}>Отменить</button>
          <button className="main-action" disabled={saving || reason.trim().length < 5}>{saving ? "Отправляем…" : "Отправить"}</button>
        </div>
      </form>
    </div>
  );
}

function BankPaymentPanel({
  bank,
  phone,
  recipientName,
  amountKopecks,
  onToast,
}: {
  bank?: PaymentBank;
  phone?: string;
  recipientName?: string;
  amountKopecks: number;
  onToast: (message: string) => void;
}) {
  if (!bank || !phone || !recipientName) {
    return (
      <div className="empty-inline">
        Продавец ещё не настроил перевод по номеру телефона. Свяжитесь с ним
        перед оплатой.
      </div>
    );
  }
  return (
    <div className="bank-payment-panel">
      <div className="bank-payment-title">
        <span>ПЕРЕВОД ПРОДАВЦУ</span>
        <b>{paymentBankLabel(bank)}</b>
      </div>
      <div className="bank-payment-row">
        <span>Получатель</span>
        <strong>{recipientName}</strong>
      </div>
      <div className="bank-payment-row">
        <span>Телефон</span>
        <strong>{phone}</strong>
      </div>
      <div className="bank-payment-row payment-total-row">
        <span>Сумма</span>
        <strong>{formatPrice(amountKopecks)}</strong>
      </div>
      <p className="bank-payment-warning">
        Перед подтверждением перевода убедитесь, что приложение банка
        показывает получателя «{recipientName}».
      </p>
      <button
        type="button"
        className="main-action bank-open-action"
        onClick={() => {
          try {
            openBankTransfer(bank, phone, amountKopecks);
            onToast(`Открываем ${paymentBankLabel(bank)}`);
          } catch {
            onToast("Не удалось открыть приложение банка");
          }
        }}
      >
        <ExternalLink size={17} />
        Открыть приложение банка · {formatPrice(amountKopecks)}
      </button>
    </div>
  );
}

function GroupBuyPurchaseCard({
  purchase,
  request,
  onChanged,
  onToast,
}: {
  purchase: GroupBuyPurchase;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onChanged: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [reporting, setReporting] = useState(false);
  const statusLabels: Record<string, string> = {
    COLLECTING: "Идёт набор участников",
    PRICE_CONFIRMATION: "Группа собрана — продавец уточняет цену",
    AWAITING_PAYMENT: "Нужно оплатить продавцу",
    FORMED: "Закупка сформирована",
    IN_DELIVERY: "Ожидается поставка",
    COMPLETED: "Закупка завершена",
    CANCELLED: "Закупка отменена",
  };
  const canPay =
    purchase.groupBuyStatus === "AWAITING_PAYMENT" &&
    purchase.reservationStatus === "PAYMENT_REQUESTED" &&
    !!purchase.paymentBank &&
    !!purchase.paymentPhone &&
    !!purchase.paymentRecipientName;
  const canCancelReservation =
    ["COLLECTING", "PRICE_CONFIRMATION"].includes(
      purchase.groupBuyStatus,
    ) && purchase.reservationStatus === "RESERVED";

  return (
    <>
    <article className="order-card group-purchase-card">
      <div className="order-head">
        <div><span className="order-number">ГРУППОВАЯ ЗАКУПКА</span><strong>{statusLabels[purchase.groupBuyStatus] || purchase.groupBuyStatus}</strong></div>
        <div className="order-head-actions">
          <span>{purchase.reservedCount}/{purchase.targetCount}</span>
          {purchase.sellerTelegramId && (
            <button
              className="contact-order-button"
              onClick={() =>
                openTelegramDialog(
                  purchase.sellerTelegramId!,
                  purchase.sellerUsername,
                  purchase.paymentPhone,
                )
              }
              aria-label="Связаться с продавцом"
              title="Связаться"
            >
              {purchase.sellerUsername ? (
                <MessageCircle size={15} />
              ) : (
                <Phone size={15} />
              )}
            </button>
          )}
          <button className="report-order-button" onClick={() => setReporting(true)} aria-label="Пожаловаться на продавца" title="Пожаловаться на продавца"><AlertTriangle size={16} /></button>
        </div>
      </div>
      <div className="order-product">
        <div className="order-thumb actual-product-image" style={purchase.image ? { backgroundImage: `url("${purchase.image}")` } : undefined} />
        <div>
          <b>{purchase.productTitle}</b>
          <span>
            {purchase.storeName}
            {purchase.selectedColorName ? ` · Цвет: ${purchase.selectedColorName}` : ""}
          </span>
          {purchase.finalPriceKopecks && <strong>{formatPrice(purchase.finalPriceKopecks)}</strong>}
        </div>
      </div>
      {purchase.groupBuyStatus === "PRICE_CONFIRMATION" && (
        <div className="group-buy-guidance">Участники набраны. Продавец обновляет актуальную цену — после этого здесь появятся сумма, реквизиты и срок оплаты.</div>
      )}
      {["AWAITING_PAYMENT", "FORMED", "IN_DELIVERY"].includes(purchase.groupBuyStatus) && (
        <div className="payment-details">
          <div className="client-details">
            <span>ПРОДАВЕЦ</span>
            <b>{purchase.sellerName || purchase.storeName}</b>
            <p>{purchase.sellerUsername ? `@${purchase.sellerUsername}` : "Контакт через магазин"}</p>
          </div>
          {purchase.groupBuyStatus === "AWAITING_PAYMENT" &&
            purchase.reservationStatus === "PAYMENT_REQUESTED" &&
            purchase.finalPriceKopecks && (
              <BankPaymentPanel
                bank={purchase.paymentBank}
                phone={purchase.paymentPhone}
                recipientName={purchase.paymentRecipientName}
                amountKopecks={purchase.finalPriceKopecks}
                onToast={onToast}
              />
            )}
          {purchase.paymentDeadline && purchase.groupBuyStatus === "AWAITING_PAYMENT" && (
            <p className="payment-deadline">Оплатите до {formatMoscowDateTime(purchase.paymentDeadline)} МСК</p>
          )}
        </div>
      )}
      {purchase.reservationStatus === "PAID" && (
        <div className="paid-confirmation"><Check size={16} /> Вы отметили оплату. Продавец проверяет поступление.</div>
      )}
      {purchase.deliveryFrom && (
        <div className="delivery-note">
          <span>ОРИЕНТИР ПОСТАВКИ</span>
          <b>{formatMoscowDate(purchase.deliveryFrom)} — {purchase.deliveryTo ? formatMoscowDate(purchase.deliveryTo) : "уточняется"}</b>
          {purchase.deliveryNote && <p>{purchase.deliveryNote}</p>}
        </div>
      )}
      {canPay && (
        <button
          className="main-action"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await request(`/group-buys/${purchase.groupBuyId}/paid`, { method: "POST" });
              await onChanged();
              onToast("Продавец получил подтверждение оплаты");
            } catch (paymentError) {
              onToast(paymentError instanceof Error ? paymentError.message : "Не удалось отметить оплату");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Отправляем…" : "Я оплатил"}
        </button>
      )}
      {canCancelReservation && (
        <button
          type="button"
          className="outline-action cancel-reservation-action"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await request(
                `/group-buys/${purchase.groupBuyId}/reservations/me`,
                { method: "DELETE" },
              );
              await onChanged();
              onToast("Бронь отменена");
            } catch (cancelError) {
              onToast(
                cancelError instanceof Error
                  ? cancelError.message
                  : "Не удалось отменить бронь",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          Отменить бронь
        </button>
      )}
    </article>
    {reporting && (
      <ReportSellerModal
        title="Жалоба на продавца"
        subtitle={`Групповая закупка · ${purchase.productTitle}`}
        endpoint={`/group-buys/${purchase.groupBuyId}/reports`}
        request={request}
        onClose={() => setReporting(false)}
        onSent={() => {
          setReporting(false);
          onToast("Жалоба отправлена супер-администратору");
        }}
      />
    )}
    </>
  );
}

function OrderCard({
  order,
  mode,
  requisitesOpen,
  onToggleRequisites,
  onAdvance,
  onReport,
  onReview,
  onToast,
}: {
  order: Order;
  mode: "purchases" | "sales";
  requisitesOpen: boolean;
  onToggleRequisites: () => void;
  onAdvance: (status: "PAID" | "SHIPPED" | "COMPLETED" | "CANCELLED") => Promise<void>;
  onReport: () => void;
  onReview: (rating: number) => Promise<boolean>;
  onToast: (message: string) => void;
}) {
  const [ratingOpen, setRatingOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [actionSaving, setActionSaving] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const actionSavingRef = useRef(false);
  const reviewSavingRef = useRef(false);
  const steps = [
    { status: "AWAITING_PAYMENT", label: "Ожидает оплаты", text: "Покупатель переводит деньги продавцу" },
    { status: "PAID", label: "Оплата отмечена", text: "Продавец проверяет поступление" },
    { status: "SHIPPED", label: "Отправлено", text: "Покупатель ожидает товар" },
    { status: "COMPLETED", label: "Завершено", text: "Получение подтверждено" },
  ];
  const currentIndex = steps.findIndex((step) => step.status === order.status);
  const statusLabel = order.status === "CANCELLED" ? "Отменён" : steps[currentIndex]?.label || order.status;
  const paymentReady =
    !!order.paymentBank &&
    !!order.paymentPhone &&
    !!order.paymentRecipientName;
  const action =
    mode === "purchases" &&
    order.status === "AWAITING_PAYMENT" &&
    paymentReady
      ? { label: "Я оплатил", status: "PAID" as const }
      : mode === "sales" && order.status === "PAID"
        ? { label: "Отправил товар / выполнил услугу", status: "SHIPPED" as const }
        : mode === "purchases" && order.status === "SHIPPED"
          ? { label: "Подтвердить получение", status: "COMPLETED" as const }
          : null;

  return (
    <article className={`order-card ${order.status === "AWAITING_PAYMENT" ? "featured-order" : ""}`}>
      <div className="order-head">
        <div><span className="order-number">ЗАКАЗ #{order.id}</span><strong>{statusLabel}</strong></div>
        <div className="order-head-actions">
          <span>{formatMoscowDate(order.createdAt)}</span>
          {(mode === "purchases"
            ? order.sellerTelegramId
            : order.buyerTelegramId) && (
            <button
              className="contact-order-button"
              onClick={() =>
                openTelegramDialog(
                  mode === "purchases"
                    ? order.sellerTelegramId!
                    : order.buyerTelegramId!,
                  mode === "purchases"
                    ? order.sellerUsername
                    : order.buyerUsername,
                  mode === "purchases"
                    ? order.paymentPhone
                    : order.buyerPhone,
                )
              }
              aria-label={
                mode === "purchases"
                  ? "Связаться с продавцом"
                  : "Связаться с покупателем"
              }
              title="Связаться"
            >
              {(mode === "purchases"
                ? order.sellerUsername
                : order.buyerUsername) ? (
                <MessageCircle size={15} />
              ) : (
                <Phone size={15} />
              )}
            </button>
          )}
          {mode === "purchases" && order.status !== "CANCELLED" && (
            <button className="report-order-button" onClick={onReport} aria-label="Пожаловаться на продавца" title="Пожаловаться на продавца"><AlertTriangle size={16} /></button>
          )}
        </div>
      </div>
      <div className="order-product">
        <div
          className="order-thumb actual-product-image"
          style={order.image ? { backgroundImage: `url("${order.image}")` } : undefined}
        />
        <div>
          <b>{order.productTitle}</b>
          <span>
            {order.storeName} · {order.quantity} шт.
            {order.selectedColorName ? ` · Цвет: ${order.selectedColorName}` : ""}
          </span>
          <strong>{formatPrice(order.buyerPriceKopecks)}</strong>
        </div>
      </div>
      {order.fulfillmentDetails && (
        <div className="order-fulfillment-details">
          <span>ДОСТАВКА/ПОЛУЧЕНИЕ</span>
          <p>{order.fulfillmentDetails}</p>
        </div>
      )}

      {mode === "sales" && (
        <div className="client-details">
          <span>ПОКУПАТЕЛЬ</span>
          <b>{order.buyerName || "Покупатель"}</b>
          <p>{order.buyerPhone || "Телефон не указан"}{order.buyerUsername ? ` · @${order.buyerUsername}` : ""}</p>
        </div>
      )}

      {mode === "purchases" && !["COMPLETED", "CANCELLED"].includes(order.status) && (
        <>
          <button className="outline-action" onClick={onToggleRequisites}>
            {requisitesOpen ? "Скрыть оплату" : "Перейти к оплате"}
          </button>
          {requisitesOpen && (
            <div className="payment-details">
              <div className="client-details">
                <span>ПРОДАВЕЦ</span>
                <b>{order.sellerName || order.storeName}</b>
                <p>{order.sellerUsername ? `@${order.sellerUsername}` : "Контакт через магазин"}</p>
              </div>
              {order.status === "AWAITING_PAYMENT" && (
                <BankPaymentPanel
                  bank={order.paymentBank}
                  phone={order.paymentPhone}
                  recipientName={order.paymentRecipientName}
                  amountKopecks={order.buyerPriceKopecks}
                  onToast={onToast}
                />
              )}
              {order.status === "PAID" && (
                <div className="paid-confirmation">
                  <Check size={16} /> Вы отметили оплату. Продавец проверяет
                  поступление.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {order.status === "CANCELLED" ? (
        <div className="cancelled-order-note">Заказ отменён. Товар возвращён в остаток продавца.</div>
      ) : <div className="status-timeline">
        {steps.map((step, index) => {
          const done =
            index < currentIndex ||
            (order.status === "COMPLETED" && index === currentIndex);
          return (
            <div
              key={step.status}
              className={done ? "done" : index === currentIndex ? "current" : ""}
            >
              <i>{done ? "✓" : index + 1}</i>
              <span><b>{step.label}</b><small>{step.text}</small></span>
            </div>
          );
        })}
      </div>}

      {mode === "sales" && (
        <div className="seller-order-finance">
          <span>Вам: <b>{formatPrice(order.sellerPriceKopecks)}</b></span>
          <span>Комиссия после завершения: <b>{formatPrice(order.commissionKopecks)}</b></span>
        </div>
      )}
      {action && (
        <button
          className="main-action"
          disabled={actionSaving}
          onClick={async () => {
            if (actionSavingRef.current) return;
            actionSavingRef.current = true;
            setActionSaving(true);
            try {
              await onAdvance(action.status);
            } finally {
              actionSavingRef.current = false;
              setActionSaving(false);
            }
          }}
        >
          {actionSaving ? "Обновляем…" : action.label}
        </button>
      )}
      {["AWAITING_PAYMENT", "PAID"].includes(order.status) && (
        <button
          className="outline-action cancel-order-action"
          disabled={actionSaving}
          onClick={async () => {
            if (actionSavingRef.current) return;
            actionSavingRef.current = true;
            setActionSaving(true);
            try {
              await onAdvance("CANCELLED");
            } finally {
              actionSavingRef.current = false;
              setActionSaving(false);
            }
          }}
        >
          Отменить заказ
        </button>
      )}
      {mode === "purchases" && order.status === "COMPLETED" && (
        <div className="order-rating">
          {order.reviewRating ? (
            <button className="outline-action rated-action" disabled>
              <Star size={16} fill="currentColor" /> Оценка: {order.reviewRating} из 5
            </button>
          ) : ratingOpen ? (
            <div className="rating-picker">
              <span>Выберите оценку:</span>
              <div>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setSelectedRating(value)}
                    aria-label={`${value} из 5`}
                  >
                    <Star size={25} fill={value <= selectedRating ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="main-action"
                disabled={!selectedRating || reviewSaving}
                onClick={async () => {
                  if (!selectedRating || reviewSavingRef.current) return;
                  reviewSavingRef.current = true;
                  setReviewSaving(true);
                  try {
                    if (await onReview(selectedRating)) {
                      setRatingOpen(false);
                    }
                  } finally {
                    reviewSavingRef.current = false;
                    setReviewSaving(false);
                  }
                }}
              >
                {reviewSaving ? "Сохраняем…" : "Подтвердить"}
              </button>
            </div>
          ) : (
            <button className="outline-action" onClick={() => setRatingOpen(true)}>
              <Star size={16} /> Оценить
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function CreateListing({
  profile,
  finance,
  club,
  categories,
  request,
  onCreated,
}: {
  profile: Profile;
  finance: SellerFinance | null;
  club: Club | null;
  categories: Category[];
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onCreated: () => Promise<void>;
}) {
  const [kind, setKind] = useState<"regular" | "group">("regular");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [multipleColors, setMultipleColors] = useState(false);
  const [selectedColorKeys, setSelectedColorKeys] = useState<string[]>([]);
  const [colorFiles, setColorFiles] = useState<Record<string, File[]>>({});
  const [colorPreviews, setColorPreviews] = useState<Record<string, string[]>>({});
  const [colorStocks, setColorStocks] = useState<Record<string, string>>({});
  const colorPreviewsRef = useRef<Record<string, string[]>>({});
  const [storeFile, setStoreFile] = useState<File | null>(null);
  const [storePreview, setStorePreview] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingLabel, setSavingLabel] = useState("");
  const [error, setError] = useState("");
  const [store, setStore] = useState<SellerStore | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);

  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview)),
    [previews],
  );

  useEffect(() => {
    colorPreviewsRef.current = colorPreviews;
  }, [colorPreviews]);

  useEffect(
    () => () =>
      Object.values(colorPreviewsRef.current)
        .flat()
        .forEach((preview) => URL.revokeObjectURL(preview)),
    [],
  );

  useEffect(
    () => () => {
      if (storePreview) URL.revokeObjectURL(storePreview);
    },
    [storePreview],
  );

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    void request<Record<string, unknown>>(
      `/groups/${club.telegramGroupId}/my-store`,
    )
      .then((row) => {
        if (!cancelled) setStore(camelStore(row));
      })
      .catch(() => {
        if (!cancelled) setStore(null);
      })
      .finally(() => {
        if (!cancelled) setStoreLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Store ownership is scoped to the currently selected club.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.telegramGroupId]);

  if (!club) return <EmptySection title="Новое объявление" text="Сначала подключите и выберите Telegram-группу." />;
  if (profile.sellerBlocked) return <EmptySection title="Публикация недоступна" text="Один из комиссионных долгов достиг лимита. Реквизиты и суммы указаны в окне оплаты." />;
  const activeClub = club;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!multipleColors && !files.length) {
      setError("Добавьте хотя бы одну фотографию.");
      return;
    }
    if (multipleColors && selectedColorKeys.length < 2) {
      setError("Выберите минимум два доступных цвета.");
      return;
    }
    if (
      multipleColors &&
      selectedColorKeys.some((key) => !(colorFiles[key]?.length > 0))
    ) {
      setError("Для каждого выбранного цвета загрузите хотя бы одну фотографию.");
      return;
    }
    if (
      multipleColors &&
      selectedColorKeys.some((key) => Number(colorStocks[key]) < 1)
    ) {
      setError("Укажите количество товара отдельно для каждого цвета.");
      return;
    }
    if (!store && !storeFile) {
      setError("Добавьте отдельную фотографию магазина.");
      return;
    }
    setSaving(true);
    setSavingLabel("Подготавливаем фотографии…");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const totalUploads =
        (multipleColors
          ? selectedColorKeys.reduce(
              (total, key) => total + (colorFiles[key]?.length || 0),
              0,
            )
          : files.length) + (!store && storeFile ? 1 : 0);
      let completedUploads = 0;
      const uploadFile = async (file: File) => {
        const body = new FormData();
        body.append("file", file);
        const uploaded = await request<{ url: string }>("/uploads", {
          method: "POST",
          body,
        });
        completedUploads += 1;
        setSavingLabel(
          `Загружаем фотографии: ${completedUploads} из ${totalUploads}`,
        );
        return uploaded;
      };
      let imageUrls: string[] = [];
      const colorVariants: ProductColorVariant[] = [];
      if (multipleColors) {
        for (const color of PRODUCT_COLORS.filter((item) =>
          selectedColorKeys.includes(item.key),
        )) {
          const uploaded = await mapWithConcurrency(
            colorFiles[color.key] || [],
            3,
            uploadFile,
          );
          colorVariants.push({
            ...color,
            stock: Number(colorStocks[color.key]),
            images: uploaded.map((item) => item.url),
          });
        }
        imageUrls = colorVariants.flatMap((variant) => variant.images);
      } else {
        imageUrls = (
          await mapWithConcurrency(files, 3, uploadFile)
        ).map((item) => item.url);
      }

      if (!store) {
        const storeImage = await uploadFile(storeFile as File);
        setSavingLabel("Создаём магазин…");
        await request("/stores", {
          method: "POST",
          body: JSON.stringify({
            groupId: activeClub.id,
            name: String(form.get("storeName")),
            description: "",
            imageUrl: storeImage.url,
            paymentBank: String(form.get("paymentBank")),
            paymentPhone: String(form.get("paymentPhone")),
            paymentRecipientName: String(form.get("paymentRecipientName")),
          }),
        });
      }

      const rubles = Number(price.replace(/[^\d]/g, ""));
      setSavingLabel("Сохраняем объявление…");
      await request("/products", {
        method: "POST",
        body: JSON.stringify({
          groupId: activeClub.id,
          title: String(form.get("title")),
          description: String(form.get("description")),
          specifications: String(form.get("specifications")),
          category: String(form.get("category")),
          stock: multipleColors
            ? colorVariants.reduce(
                (total, variant) => total + (variant.stock || 0),
                0,
              )
            : Number(form.get("stock")),
          sellerPriceKopecks: rubles * 100,
          kind: kind === "group" ? "GROUP_BUY" : "REGULAR",
          imageUrlsJson: JSON.stringify(imageUrls),
          colorVariantsJson: JSON.stringify(colorVariants),
          targetCount: kind === "group" ? Number(form.get("targetCount")) : null,
          collectionDays: kind === "group" ? Number(form.get("collectionDays")) : null,
        }),
      });
      await onCreated();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось создать объявление");
    } finally {
      setSaving(false);
      setSavingLabel("");
    }
  }

  const sellerRubles = Number(price.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  const finalBuyerKopecks = Math.round(
    sellerRubles *
      100 *
      (1 +
        (finance?.platformCommissionPercent ??
          profile.botCommissionPercent) /
          100 +
        (finance?.groupCommissionPercent ?? activeClub.commissionPercent) /
          100),
  );

  return (
    <section className="inner-page narrow-page">
      <div className="page-title"><span className="section-kicker">SELLER SPACE</span><h1>Новое объявление</h1><p>После публикации карточка появится в теме «Магазин».</p></div>
      <div className="type-picker">
        <button className={kind === "regular" ? "active" : ""} onClick={() => setKind("regular")}><ShoppingBag size={20} /><b>Обычная продажа</b><small>Фиксированная цена</small></button>
        <button className={kind === "group" ? "active" : ""} onClick={() => setKind("group")}><UsersRound size={20} /><b>Групповая закупка</b><small>Старт после сбора участников</small></button>
      </div>
      <form className="listing-form" onSubmit={submit}>
        {storeLoading ? (
          <div className="empty-inline">Проверяем магазин в клубе…</div>
        ) : store ? (
          <div className="store-bound-card">
            <span>ВАШ МАГАЗИН В ЭТОМ КЛУБЕ</span>
            <b>{store.name}</b>
            <p>
              Все новые объявления автоматически публикуются в этом магазине.
              Название, реквизиты и фото магазина изменяются в профиле.
            </p>
          </div>
        ) : (
          <div className="store-setup-fields">
            <div><span>ПЕРВЫЙ ТОВАР В КЛУБЕ</span><b>Создайте один магазин</b><p>В этом клубе у вас будет только один магазин. В другом клубе можно открыть отдельный.</p></div>
            <label><span>Название магазина</span><input name="storeName" required placeholder="Например, Garage 54" /></label>
            <label className={`store-image-upload ${storePreview ? "has-preview" : ""}`}>
              <span>Отдельное фото магазина</span>
              {storePreview ? (
                // Local preview preserves the source image proportions.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={storePreview} alt="Предпросмотр фотографии магазина" />
              ) : (
                <div><ImagePlus size={23} /><b>Загрузить обложку магазина</b><small>Не используется фото товара · JPG, PNG или WEBP</small></div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={(event) => {
                  if (storePreview) URL.revokeObjectURL(storePreview);
                  const nextFile = event.target.files?.[0] || null;
                  setStoreFile(nextFile);
                  setStorePreview(nextFile ? URL.createObjectURL(nextFile) : "");
                }}
              />
            </label>
            <div>
              <span>ПРИЁМ ОПЛАТЫ</span>
              <b>Перевод по номеру телефона</b>
              <p>Эти данные запрашиваются только один раз. Позже их можно изменить в профиле магазина.</p>
            </div>
            <label>
              <span>Банк получателя</span>
              <select name="paymentBank" defaultValue="SBER" required>
                {PAYMENT_BANKS.map((bank) => (
                  <option key={bank.value} value={bank.value}>{bank.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Телефон, привязанный к СБП</span>
              <input
                name="paymentPhone"
                inputMode="tel"
                maxLength={30}
                required
                placeholder="+7 999 111-22-33"
              />
            </label>
            <label>
              <span>Имя получателя</span>
              <input
                name="paymentRecipientName"
                maxLength={100}
                required
                placeholder="Иван Иванович И."
              />
              <small>Покупатель проверит это имя перед подтверждением перевода.</small>
            </label>
          </div>
        )}
        <label className="checkbox-label color-mode-checkbox">
          <input
            type="checkbox"
            checked={multipleColors}
            onChange={(event) => {
              const enabled = event.target.checked;
              setMultipleColors(enabled);
              if (enabled) {
                previews.forEach((preview) => URL.revokeObjectURL(preview));
                setFiles([]);
                setPreviews([]);
              }
              setError("");
            }}
          />
          <span>
            <b>Несколько цветов</b>
            <small>Для каждого цвета потребуются отдельные фотографии и количество.</small>
          </span>
        </label>
        {multipleColors ? (
          <div className="color-variant-editor">
            <div className="color-picker-heading">
              <span>Доступные цвета</span>
              <small>Выберите минимум два</small>
            </div>
            <div className="color-picker-grid">
              {PRODUCT_COLORS.map((color) => {
                const selected = selectedColorKeys.includes(color.key);
                return (
                  <button
                    type="button"
                    key={color.key}
                    className={selected ? "active" : ""}
                    onClick={() => {
                      if (selected) {
                        (colorPreviews[color.key] || []).forEach((preview) =>
                          URL.revokeObjectURL(preview),
                        );
                        setSelectedColorKeys((keys) =>
                          keys.filter((key) => key !== color.key),
                        );
                        setColorFiles((items) => {
                          const next = { ...items };
                          delete next[color.key];
                          return next;
                        });
                        setColorPreviews((items) => {
                          const next = { ...items };
                          delete next[color.key];
                          return next;
                        });
                        setColorStocks((items) => {
                          const next = { ...items };
                          delete next[color.key];
                          return next;
                        });
                      } else {
                        setSelectedColorKeys((keys) => [...keys, color.key]);
                        setColorStocks((items) => ({
                          ...items,
                          [color.key]: items[color.key] || "1",
                        }));
                      }
                    }}
                    aria-pressed={selected}
                  >
                    <i style={{ backgroundColor: color.hex }} />
                    <span>{color.name}</span>
                    {selected && <Check size={13} />}
                  </button>
                );
              })}
            </div>
            {PRODUCT_COLORS.filter((color) =>
              selectedColorKeys.includes(color.key),
            ).map((color) => {
              const selectedPreviews = colorPreviews[color.key] || [];
              return (
                <div className="color-photo-field" key={color.key}>
                  <div className="color-photo-title">
                    <i style={{ backgroundColor: color.hex }} />
                    <div>
                      <b>{color.name}</b>
                      <span>
                        {selectedPreviews.length
                          ? `${selectedPreviews.length} фото`
                          : "Фотографии обязательны"}
                      </span>
                    </div>
                  </div>
                  <label className={`upload-area compact ${selectedPreviews.length ? "has-preview" : ""}`}>
                    {selectedPreviews.length ? (
                      <div className={`upload-preview-grid ${selectedPreviews.length === 1 ? "single-photo" : ""}`}>
                        {selectedPreviews.map((preview, index) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={preview} src={preview} alt={`${color.name}, фото ${index + 1}`} />
                        ))}
                      </div>
                    ) : (
                      <>
                        <ImagePlus size={24} />
                        <b>Фото цвета «{color.name}»</b>
                        <span>От 1 до 6 изображений</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(event) => {
                        (colorPreviews[color.key] || []).forEach((preview) =>
                          URL.revokeObjectURL(preview),
                        );
                        const nextFiles = Array.from(
                          event.target.files || [],
                        ).slice(0, 6);
                        setColorFiles((items) => ({
                          ...items,
                          [color.key]: nextFiles,
                        }));
                        setColorPreviews((items) => ({
                          ...items,
                          [color.key]: nextFiles.map((file) =>
                            URL.createObjectURL(file),
                          ),
                        }));
                      }}
                    />
                  </label>
                  <label className="color-stock-field">
                    <span>Количество цвета «{color.name}», шт.</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={colorStocks[color.key] || ""}
                      onChange={(event) =>
                        setColorStocks((items) => ({
                          ...items,
                          [color.key]: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <label className={`upload-area ${previews.length ? "has-preview" : ""}`}>
              {previews.length ? (
                <div className={`upload-preview-grid ${previews.length === 1 ? "single-photo" : ""}`}>
                  {previews.map((preview, index) => (
                    // Blob previews exist only in the browser and cannot use next/image.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={preview} src={preview} alt={`Фото ${index + 1}`} />
                  ))}
                </div>
              ) : (
                <><ImagePlus size={30} /><b>Добавить фотографии</b><span>До 6 изображений · JPG, PNG, WEBP</span></>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => {
                  previews.forEach((preview) => URL.revokeObjectURL(preview));
                  const nextFiles = Array.from(event.target.files || []).slice(0, 6);
                  setFiles(nextFiles);
                  setPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
                }}
              />
            </label>
            {previews.length > 0 && <p className="upload-caption">{previews.length} фото выбрано. Нажмите на область, чтобы заменить.</p>}
          </>
        )}
        <label><span>Название товара</span><input name="title" required placeholder="Например, кованые диски R20" /></label>
        <CategoryInput categories={categories} />
        <label><span>Описание</span><textarea name="description" required rows={4} placeholder="Комплектация, состояние, совместимость…" /></label>
        <label><span>Характеристики товара</span><textarea name="specifications" rows={4} placeholder="Артикул, производитель, размеры, материал, совместимость…" /></label>
        <div className="form-row">
          <label><span>Цена продавца</span><div className="input-suffix"><input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="numeric" required /><b>₽</b></div></label>
          {!multipleColors && (
            <label><span>Количество товара, шт.</span><input name="stock" type="number" min="1" defaultValue="1" required /></label>
          )}
        </div>
        <div className="price-preview">
          <span>Конечная цена для покупателя</span>
          <b>{sellerRubles > 0 ? formatPrice(finalBuyerKopecks) : "—"}</b>
          <small>
            Ваша цена {sellerRubles > 0 ? formatPrice(sellerRubles * 100) : "не указана"} + платформа {finance?.platformCommissionPercent ?? profile.botCommissionPercent}% + клуб {finance?.groupCommissionPercent ?? activeClub.commissionPercent}%
          </small>
        </div>
        {kind === "group" && (
          <div className="group-fields">
            <label><span>Участников для старта</span><input name="targetCount" type="number" min="2" defaultValue="10" required /></label>
            <label>
              <span>Срок набора, дней</span>
              <input
                name="collectionDays"
                type="number"
                min="1"
                max="360"
                step="1"
                defaultValue="7"
                inputMode="numeric"
                required
              />
              <small>Укажите свой срок от 1 до 360 дней.</small>
            </label>
          </div>
        )}
        <label className="checkbox-label"><input type="checkbox" required /><span>Подтверждаю достоверность объявления</span></label>
        {error && <p className="form-error">{error}</p>}
        <button className="main-action" type="submit" disabled={saving || storeLoading}>{saving ? savingLabel || "Публикуем…" : "Опубликовать объявление"}<ChevronRight size={17} /></button>
      </form>
    </section>
  );
}

function ClubAdmin({
  club,
  products,
  request,
  onChanged,
  onToast,
}: {
  club: Club;
  products: Product[];
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onChanged: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const groupBuys = products.filter((product) => product.kind === "group");
  const [commission, setCommission] = useState(String(club.commissionPercent));
  const [paymentDetails, setPaymentDetails] = useState("");
  const [groupImageUrl, setGroupImageUrl] = useState(club.imageUrl || "");
  const [uploadingGroupImage, setUploadingGroupImage] = useState(false);
  const [sellerFinances, setSellerFinances] = useState<
    Record<string, unknown>[]
  >([]);
  const [savingCommission, setSavingCommission] = useState(false);
  const [stats, setStats] = useState({
    products: products.length,
    sellers: 0,
    completedOrders: 0,
    groupCommissionKopecks: 0,
  });

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      request<Record<string, unknown>>(
        `/groups/${club.telegramGroupId}/admin/stats`,
      ),
      request<Record<string, unknown>[]>(
        `/groups/${club.telegramGroupId}/admin/seller-finances`,
      ),
    ])
      .then(([row, financeRows]) => {
        if (!cancelled) {
          setStats({
            products: asNumber(row.products),
            sellers: asNumber(row.sellers),
            completedOrders: asNumber(row.completed_orders),
            groupCommissionKopecks: asNumber(row.group_commission_kopecks),
          });
          setPaymentDetails(String(row.payment_details || ""));
          setGroupImageUrl(String(row.image_url || club.imageUrl || ""));
          setSellerFinances(financeRows);
        }
      })
      .catch((statsError) => {
        if (!cancelled) {
          onToast(
            statsError instanceof Error
              ? statsError.message
              : "Не удалось получить статистику клуба",
          );
        }
      });
    return () => {
      cancelled = true;
    };
    // Statistics reload when the selected Telegram group changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club.telegramGroupId]);

  return (
    <section className="inner-page admin-page">
      <div className="page-title"><span className="section-kicker">GROUP OWNER</span><h1>Админка клуба</h1><p>{club.title}</p></div>
      <div className="admin-metrics">
        <div><span>Товаров / продавцов</span><b>{stats.products} / {stats.sellers}</b><small>Активные записи</small></div>
        <div><span>Завершено продаж</span><b>{stats.completedOrders}</b><small>Фактические сделки</small></div>
        <div><span>Начислено группе</span><b>{formatPrice(stats.groupCommissionKopecks)}</b><small>Комиссия {club.commissionPercent}%</small></div>
      </div>
      <form
        className="settings-card admin-settings-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setSavingCommission(true);
          try {
            await request(`/groups/${club.telegramGroupId}/commission`, {
              method: "PUT",
              body: JSON.stringify({
                commissionPercent: Number(commission),
                paymentDetails,
              }),
            });
            await onChanged();
            onToast("Комиссия клуба сохранена");
          } catch (commissionError) {
            onToast(
              commissionError instanceof Error
                ? commissionError.message
                : "Не удалось сохранить комиссию",
            );
          } finally {
            setSavingCommission(false);
          }
        }}
      >
        <div>
          <h2>Настройки клуба</h2>
          <p className="settings-hint">Комиссия клуба прибавляется к цене покупателя. Менять её может владелец группы.</p>
        </div>
        <label className="store-image-upload group-image-upload">
          <span>Логотип клуба в верхнем меню</span>
          {groupImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={groupImageUrl} alt={`Логотип клуба ${club.title}`} />
          ) : (
            <div>
              <ImagePlus size={28} />
              <b>Загрузить логотип клуба</b>
              <small>Квадратное изображение JPG, PNG или WEBP</small>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploadingGroupImage}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setUploadingGroupImage(true);
              try {
                const body = new FormData();
                body.append("file", file);
                const uploaded = await request<{ url: string }>("/uploads", {
                  method: "POST",
                  body,
                });
                await request(`/groups/${club.telegramGroupId}/image`, {
                  method: "PUT",
                  body: JSON.stringify({ imageUrl: uploaded.url }),
                });
                setGroupImageUrl(uploaded.url);
                await onChanged();
                onToast("Логотип клуба обновлён");
              } catch (imageError) {
                onToast(
                  imageError instanceof Error
                    ? imageError.message
                    : "Не удалось обновить логотип клуба",
                );
              } finally {
                setUploadingGroupImage(false);
                event.target.value = "";
              }
            }}
          />
          <em>{uploadingGroupImage ? "Загрузка…" : "Изменить"}</em>
        </label>
        <label>
          <span>Комиссия группы, %</span>
          <input
            value={commission}
            onChange={(event) => setCommission(event.target.value)}
            inputMode="decimal"
            type="number"
            min="0"
            max="30"
            step="0.1"
            required
          />
        </label>
        <label>
          <span>Реквизиты для оплаты долга клубу</span>
          <textarea
            value={paymentDetails}
            onChange={(event) => setPaymentDetails(event.target.value)}
            rows={3}
            placeholder="СБП, номер карты, получатель и комментарий к платежу"
            required
          />
        </label>
        <button className="main-action" disabled={savingCommission}>
          {savingCommission ? "Сохраняем…" : "Сохранить настройки"}
        </button>
      </form>
      <div className="subsection-heading">
        <h2>Комиссии и лимиты продавцов</h2>
        <p>Настройки действуют отдельно для каждого магазина этого клуба.</p>
      </div>
      <div className="finance-admin-list">
        {sellerFinances.map((seller) => (
          <SellerFinanceAdminRow
            key={asNumber(seller.telegram_id)}
            seller={seller}
            savePath={`/groups/${club.telegramGroupId}/admin/sellers/${asNumber(seller.telegram_id)}/finance`}
            repayPath={`/groups/${club.telegramGroupId}/admin/sellers/${asNumber(seller.telegram_id)}/repay`}
            request={request}
            onSaved={async (message) => {
              const rows = await request<Record<string, unknown>[]>(
                `/groups/${club.telegramGroupId}/admin/seller-finances`,
              );
              setSellerFinances(rows);
              onToast(message);
            }}
          />
        ))}
        {!sellerFinances.length && (
          <div className="empty-inline">Продавцов в клубе пока нет.</div>
        )}
      </div>
      <div className="subsection-heading">
        <h2>Групповые закупки</h2>
        <p>Фиксация цены, подтверждение оплаты, контакты и сроки поставки.</p>
      </div>
      {groupBuys.length ? (
        <div className="procurement-list">
          {groupBuys.map((product) => (
            <GroupBuyAdminCard
              key={product.id}
              product={product}
              request={request}
              onChanged={onChanged}
              onToast={onToast}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state"><UsersRound size={30} /><h3>Закупок пока нет</h3><p>Данные появятся после публикации группового товара.</p></div>
      )}
      <div className="subsection-heading">
        <h2>Модерация объявлений</h2>
        <p>Скрывайте отдельные карточки или блокируйте продавца внутри этой группы.</p>
      </div>
      {products.length ? (
        <div className="admin-table-card">
          {products.map((product) => (
            <div className="moderation-row" key={product.id}>
              <span
                className="moderation-thumb actual-product-image"
                style={product.images[0] ? { backgroundImage: `url("${product.images[0]}")` } : undefined}
              />
              <p>
                <b>{product.title}</b>
                <small>{product.storeName} · Продавец: {product.sellerName || "Имя не указано"}{product.sellerUsername ? ` · @${product.sellerUsername}` : ""} · Telegram ID: {product.sellerTelegramId}</small>
              </p>
              <button
                className="contact-action"
                onClick={() =>
                  openTelegramDialog(
                    product.sellerTelegramId,
                    product.sellerUsername,
                    product.sellerPhone,
                  )
                }
              >
                {product.sellerUsername ? (
                  <MessageCircle size={14} />
                ) : (
                  <Phone size={14} />
                )} Связаться
              </button>
              <button
                onClick={async () => {
                  try {
                    await request(
                      `/groups/${club.telegramGroupId}/products/${product.id}`,
                      { method: "DELETE" },
                    );
                    await onChanged();
                    onToast("Объявление скрыто");
                  } catch (moderationError) {
                    onToast(moderationError instanceof Error ? moderationError.message : "Не удалось скрыть объявление");
                  }
                }}
              >
                Скрыть
              </button>
              <button
                className="ban-action"
                onClick={async () => {
                  try {
                    await request(
                      `/groups/${club.telegramGroupId}/sellers/${product.sellerTelegramId}/ban`,
                      {
                        method: "PUT",
                        body: JSON.stringify({ banned: true }),
                      },
                    );
                    await onChanged();
                    onToast("Продавец заблокирован в группе");
                  } catch (banError) {
                    onToast(banError instanceof Error ? banError.message : "Не удалось заблокировать продавца");
                  }
                }}
              >
                Заблокировать
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-inline">Активных объявлений нет.</div>
      )}
    </section>
  );
}

function SellerFinanceAdminRow({
  seller,
  savePath,
  repayPath,
  request,
  onSaved,
}: {
  seller: Record<string, unknown>;
  savePath: string;
  repayPath: string;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onSaved: (message: string) => Promise<void>;
}) {
  const sellerId = asNumber(seller.telegram_id);
  const sellerName = String(
    seller.seller_name ||
      [seller.first_name, seller.last_name].filter(Boolean).join(" ") ||
      `ID ${sellerId}`,
  );
  const debt = asNumber(seller.commission_debt_kopecks);
  const [commission, setCommission] = useState(
    String(asNumber(seller.commission_percent)),
  );
  const [limit, setLimit] = useState(
    String(Math.round(asNumber(seller.debt_limit_kopecks) / 100)),
  );
  const [saving, setSaving] = useState(false);

  return (
    <form
      className={`seller-finance-admin-row ${asBoolean(seller.seller_blocked) ? "blocked" : ""}`}
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
          await request(savePath, {
            method: "PUT",
            body: JSON.stringify({
              commissionPercent: Number(commission),
              debtLimitKopecks: Number(limit) * 100,
            }),
          });
          await onSaved("Настройки продавца сохранены");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="seller-finance-identity">
        <span className="shop-avatar">{sellerName.slice(0, 2).toUpperCase()}</span>
        <p><b>{sellerName}</b><small>{seller.store_name ? `${String(seller.store_name)} · ` : ""}ID {sellerId}</small></p>
      </div>
      <label><span>Комиссия, %</span><input type="number" min="0" max="30" step="0.1" value={commission} onChange={(event) => setCommission(event.target.value)} required /></label>
      <label><span>Лимит, ₽</span><input type="number" min="1" step="1" value={limit} onChange={(event) => setLimit(event.target.value)} required /></label>
      <div className="seller-finance-debt"><span>Текущий долг</span><b>{formatPrice(debt)}</b></div>
      <div className="seller-finance-actions">
        <button
          type="button"
          className="contact-action"
          onClick={() =>
            openTelegramDialog(
              sellerId,
              seller.username ? String(seller.username) : undefined,
              seller.phone ? String(seller.phone) : undefined,
            )
          }
        >
          {seller.username ? (
            <MessageCircle size={14} />
          ) : (
            <Phone size={14} />
          )} Связаться
        </button>
        <button type="submit" disabled={saving}>{saving ? "…" : "Сохранить"}</button>
        <button
          type="button"
          disabled={saving || debt <= 0}
          onClick={async () => {
            setSaving(true);
            try {
              await request(repayPath, {
                method: "POST",
                body: JSON.stringify({ amountKopecks: debt }),
              });
              await onSaved("Оплата подтверждена, долг погашен");
            } finally {
              setSaving(false);
            }
          }}
        >
          Подтвердить оплату
        </button>
      </div>
    </form>
  );
}

function GroupBuyAdminCard({
  product,
  request,
  onChanged,
  onToast,
}: {
  product: Product;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onChanged: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [buyersOpen, setBuyersOpen] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [targetCount, setTargetCount] = useState(
    String(product.targetCount || 2),
  );
  const status = product.groupBuyStatus || "COLLECTING";
  const statusLabel: Record<string, string> = {
    COLLECTING: "Идёт набор",
    PRICE_CONFIRMATION: "Нужно обновить цену",
    AWAITING_PAYMENT: "Ожидается оплата",
    FORMED: "Закупка сформирована",
    IN_DELIVERY: "Ожидается поставка",
    COMPLETED: "Завершена",
    CANCELLED: "Отменена",
  };

  async function runAction(action: () => Promise<void>, success: string) {
    setActionSaving(true);
    try {
      await action();
      await onChanged();
      onToast(success);
    } catch (actionError) {
      onToast(
        actionError instanceof Error
          ? actionError.message
          : "Не удалось выполнить действие",
      );
    } finally {
      setActionSaving(false);
    }
  }

  async function toggleBuyers() {
    if (buyersOpen) {
      setBuyersOpen(false);
      return;
    }
    try {
      const rows = await request<Record<string, unknown>[]>(
        `/group-buys/${product.groupBuyId}/buyers`,
      );
      setBuyers(rows.map(camelBuyer));
      setBuyersOpen(true);
    } catch (buyersError) {
      onToast(
        buyersError instanceof Error
          ? buyersError.message
          : "Не удалось получить покупателей",
      );
    }
  }

  return (
    <article className="procurement-card">
      <div className="procurement-head">
        <span
          className="procurement-thumb actual-product-image"
          style={product.images[0] ? { backgroundImage: `url("${product.images[0]}")` } : undefined}
        />
        <div>
          <span className="admin-status">{statusLabel[status] || status}</span>
          <h2>{product.title}</h2>
          <p>{product.reservedCount} из {product.targetCount || 0} участников · {formatPrice(product.buyerPriceKopecks)}</p>
        </div>
        <button type="button" onClick={() => void toggleBuyers()} aria-label="Показать покупателей">
          <ChevronDown size={19} />
        </button>
      </div>

      {["COLLECTING", "PRICE_CONFIRMATION"].includes(status) && (
        <form
          className="group-target-editor"
          onSubmit={(event) => {
            event.preventDefault();
            void runAction(
              () =>
                request(`/group-buys/${product.groupBuyId}/target`, {
                  method: "PUT",
                  body: JSON.stringify({
                    targetCount: Number(targetCount),
                  }),
                }),
              "Количество участников обновлено",
            );
          }}
        >
          <label>
            <span>Количество участников</span>
            <input
              type="number"
              min="2"
              max="1000"
              step="1"
              inputMode="numeric"
              value={targetCount}
              onChange={(event) => setTargetCount(event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={actionSaving}>
            Сохранить
          </button>
          <small>
            Можно менять до начала оплаты. Если новый лимит уже достигнут,
            набор закроется автоматически.
          </small>
        </form>
      )}

      {status === "PRICE_CONFIRMATION" && (
        <form
          className="price-fix-panel"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void runAction(
              () =>
                request(`/group-buys/${product.groupBuyId}/open-payment`, {
                  method: "POST",
                  body: JSON.stringify({
                    finalPriceKopecks: Number(form.get("price")) * 100,
                    deadlineHours: Number(form.get("hours")),
                  }),
                }),
              "Цена зафиксирована, участникам отправлен запрос оплаты",
            );
          }}
        >
          <h3>Зафиксировать актуальную цену</h3>
          <p>После сохранения у участников будет 24–48 часов на оплату продавцу.</p>
          <div className="price-input-row">
            <label><span>Цена продавца, ₽</span><input name="price" type="number" min="1" defaultValue={Math.round(product.sellerPriceKopecks / 100)} required /></label>
            <label><span>Срок оплаты</span><select name="hours" defaultValue="48"><option value="24">24 часа</option><option value="48">48 часов</option></select></label>
          </div>
          <button className="main-action" disabled={actionSaving}>{actionSaving ? "Отправляем…" : "Обновить цену и запросить оплату"}</button>
        </form>
      )}

      {status === "AWAITING_PAYMENT" && (
        <div className="admin-action-panel">
          <p>Проверьте поступления. Подтвердить закупку можно, когда все участники отметили оплату.</p>
          <button
            className="main-action"
            disabled={actionSaving}
            onClick={() =>
              void runAction(
                () => request(`/group-buys/${product.groupBuyId}/confirm`, { method: "POST" }),
                "Закупка подтверждена, участники уведомлены",
              )
            }
          >
            Подтвердить закупку
          </button>
        </div>
      )}

      {(status === "FORMED" || status === "IN_DELIVERY") && (
        <form
          className="delivery-form admin-action-panel"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const from = new Date(`${String(form.get("from"))}T00:00:00`).toISOString();
            const to = new Date(`${String(form.get("to"))}T23:59:59`).toISOString();
            void runAction(
              () =>
                request(`/group-buys/${product.groupBuyId}/delivery`, {
                  method: "PUT",
                  body: JSON.stringify({ from, to, note: String(form.get("note")) }),
                }),
              "Ориентир поставки отправлен всем покупателям",
            );
          }}
        >
          <h3>Ориентировочный срок поставки</h3>
          <div>
            <input name="from" type="date" required />
            <span>—</span>
            <input name="to" type="date" required />
          </div>
          <textarea name="note" required rows={3} placeholder="Комментарий о доставке" />
          <button className="main-action" disabled={actionSaving}>Уведомить покупателей</button>
        </form>
      )}

      {buyersOpen && (
        <div className="buyers-panel">
          <div className="buyers-head"><h3>Покупатели и контакты</h3><span>{buyers.length}</span></div>
          <div className="buyers-list">
            {buyers.map((buyer) => (
              <div key={buyer.telegramId}>
                <span className="buyer-avatar">{buyer.name.slice(0, 2).toUpperCase()}</span>
                <p><b>{buyer.name}</b><small>{buyer.phone || "Телефон не указан"}{buyer.username ? ` · @${buyer.username}` : ""}{buyer.selectedColorName ? ` · Цвет: ${buyer.selectedColorName}` : ""}</small></p>
                <em className={buyer.status === "PAID" ? "paid" : ""}>{buyer.status}</em>
                <button
                  type="button"
                  className="contact-icon-button"
                  onClick={() =>
                    openTelegramDialog(
                      buyer.telegramId,
                      buyer.username,
                      buyer.phone,
                    )
                  }
                  aria-label={`Связаться с ${buyer.name}`}
                  title="Связаться"
                >
                  {buyer.username ? (
                    <MessageCircle size={14} />
                  ) : (
                    <Phone size={14} />
                  )}
                </button>
              </div>
            ))}
            {!buyers.length && <div className="empty-inline">Броней пока нет.</div>}
          </div>
        </div>
      )}
    </article>
  );
}

function SuperAdmin({
  request,
  onToast,
}: {
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onToast: (message: string) => void;
}) {
  const [tab, setTab] = useState<"settings" | "groups" | "debts" | "users" | "moderation">("settings");
  const [saving, setSaving] = useState(false);
  const [adminGroups, setAdminGroups] = useState<AdminGroup[]>([]);
  const [debts, setDebts] = useState<Record<string, unknown>[]>([]);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [reports, setReports] = useState<Record<string, unknown>[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [globalSettings, setGlobalSettings] = useState({
    commission: "",
    limitRubles: "",
    paymentDetails: "",
  });

  useEffect(() => {
    void loadAdminData();
    // Admin data is loaded once when this protected screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAdminData() {
    try {
      const [groupRows, debtRows, userRows, reportRows, settingsRow] = await Promise.all([
        request<Record<string, unknown>[]>("/admin/groups"),
        request<Record<string, unknown>[]>("/admin/debts"),
        request<Record<string, unknown>[]>("/admin/users"),
        request<Record<string, unknown>[]>("/admin/reports"),
        request<Record<string, unknown>>("/admin/settings"),
      ]);
      setAdminGroups(groupRows.map(camelAdminGroup));
      setDebts(debtRows);
      setUsers(userRows);
      setReports(reportRows);
      setGlobalSettings({
        commission: String(asNumber(settingsRow.bot_commission_percent)),
        limitRubles: String(
          Math.round(asNumber(settingsRow.default_debt_limit_kopecks) / 100),
        ),
        paymentDetails: String(settingsRow.payment_details || ""),
      });
    } catch (adminError) {
      onToast(
        adminError instanceof Error
          ? adminError.message
          : "Не удалось загрузить настройки",
      );
    }
  }

  return (
    <section className="inner-page admin-page">
      <div className="page-title"><span className="section-kicker"><Crown size={13} /> PLATFORM OWNER</span><h1>Супер-админ</h1><p>Только реальные данные из Базы данных</p></div>
      <div className="admin-tabs">
        <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>Платформа</button>
        <button className={tab === "groups" ? "active" : ""} onClick={() => setTab("groups")}>Группы и комиссии</button>
        <button className={tab === "debts" ? "active" : ""} onClick={() => setTab("debts")}>Долги</button>
        <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>Пользователи</button>
        <button className={tab === "moderation" ? "active" : ""} onClick={() => setTab("moderation")}>
          Модерация
          {reports.filter((report) => String(report.status) === "PENDING").length > 0 && (
            <em>{reports.filter((report) => String(report.status) === "PENDING").length}</em>
          )}
        </button>
      </div>
      {tab === "settings" && (
        <form
          className="settings-card admin-settings-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            try {
              await request("/admin/settings", {
                method: "PUT",
                body: JSON.stringify({
                  botCommissionPercent: Number(globalSettings.commission),
                  debtLimitKopecks: Number(globalSettings.limitRubles) * 100,
                  paymentDetails: globalSettings.paymentDetails,
                }),
              });
              await loadAdminData();
              onToast("Настройки платформы сохранены");
            } finally {
              setSaving(false);
            }
          }}
        >
          <div><h2>Комиссия платформы</h2><p className="settings-hint">Значения по умолчанию применяются к новым продавцам. Индивидуальные значения задаются во вкладке «Долги».</p></div>
          <label><span>Комиссия платформы, %</span><input type="number" min="0" max="30" step="0.1" value={globalSettings.commission} onChange={(event) => setGlobalSettings((current) => ({ ...current, commission: event.target.value }))} required /></label>
          <label><span>Лимит долга нового продавца, ₽</span><input type="number" min="1" step="1" value={globalSettings.limitRubles} onChange={(event) => setGlobalSettings((current) => ({ ...current, limitRubles: event.target.value }))} required /></label>
          <label><span>Реквизиты супер-администратора</span><textarea rows={4} value={globalSettings.paymentDetails} onChange={(event) => setGlobalSettings((current) => ({ ...current, paymentDetails: event.target.value }))} placeholder="СБП, номер карты, получатель и назначение платежа" required /></label>
          <button className="main-action" disabled={saving}>{saving ? "Сохраняем…" : "Сохранить настройки"}</button>
        </form>
      )}
      {tab === "groups" && (
        <div className="admin-table-card">
          <div className="table-heading"><div><h2>Группы, комиссии и лимиты</h2><p>{adminGroups.length} записей в Базе данных</p></div></div>
          {adminGroups.map((club) => (
            <AdminGroupRow
              key={club.id}
              club={club}
              request={request}
              onSaved={async () => {
                await loadAdminData();
                onToast("Настройки группы сохранены");
              }}
            />
          ))}
          {!adminGroups.length && <div className="empty-inline">Группы ещё не подключены.</div>}
        </div>
      )}
      {tab === "debts" && (
        <div className="finance-admin-list">
          <div className="table-heading"><div><h2>Долги продавцов платформе</h2><p>Отдельны от долгов перед администраторами клубов. Здесь можно настроить комиссию и лимит каждого продавца.</p></div></div>
          {debts.map((debt) => {
            const sellerId = asNumber(debt.telegram_id);
            return (
              <SellerFinanceAdminRow
                key={sellerId}
                seller={{
                  ...debt,
                  seller_name:
                    [debt.first_name, debt.last_name].filter(Boolean).join(" ") ||
                    `ID ${sellerId}`,
                  commission_percent: debt.bot_commission_percent,
                  store_name: debt.club_titles,
                }}
                savePath={`/admin/debts/${sellerId}/settings`}
                repayPath={`/admin/debts/${sellerId}/repay`}
                request={request}
                onSaved={async (message) => {
                  await loadAdminData();
                  onToast(message);
                }}
              />
            );
          })}
          {!debts.length && <div className="empty-inline">Продавцов с магазинами пока нет.</div>}
        </div>
      )}
      {tab === "users" && (
        <div className="settings-card admin-users-panel">
          <div><h2>Пользователи</h2><p className="settings-hint">Поиск по имени, username или Telegram ID.</p></div>
          <div className="admin-user-search"><Search size={17} /><input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="Найти пользователя" /></div>
          <div className="admin-user-grid">
            {users
              .filter((user) => {
                const haystack = `${user.display_name || ""} ${user.first_name || ""} ${user.last_name || ""} ${user.username || ""} ${user.telegram_id || ""}`.toLowerCase();
                return haystack.includes(userQuery.trim().toLowerCase());
              })
              .map((user) => {
                const telegramId = asNumber(user.telegram_id);
                const userName = String(user.display_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || `ID ${telegramId}`);
                const banned = asBoolean(user.globally_banned);
                const superAdmin = asBoolean(user.super_admin);
                return (
                  <article className={`admin-user-card ${banned ? "banned" : ""}`} key={telegramId}>
                    <span className="profile-avatar">{userName.slice(0, 2).toUpperCase()}</span>
                    <div><b>{userName}</b><small>{user.username ? `@${String(user.username)}` : `Telegram ID: ${telegramId}`}</small><p>{asNumber(user.order_count)} заказов · {asNumber(user.store_count)} магазинов</p></div>
                    <div className="admin-user-actions">
                      <button
                        className="contact-action"
                        onClick={() =>
                          openTelegramDialog(
                            telegramId,
                            user.username ? String(user.username) : undefined,
                            user.phone ? String(user.phone) : undefined,
                          )
                        }
                      >
                        {user.username ? (
                          <MessageCircle size={14} />
                        ) : (
                          <Phone size={14} />
                        )} Связаться
                      </button>
                      <button
                        className={`super-role-action ${superAdmin ? "super-admin-active" : ""}`}
                        disabled={superAdmin}
                        onClick={async () => {
                          try {
                            await request(`/admin/users/${telegramId}/super-admin`, {
                              method: "PUT",
                              body: JSON.stringify({ enabled: true }),
                            });
                            await loadAdminData();
                            onToast("Пользователь назначен супер-администратором");
                          } catch (roleError) {
                            onToast(roleError instanceof Error ? roleError.message : "Не удалось выдать права");
                          }
                        }}
                      >
                        {superAdmin ? "Супер-админ" : "Сделать супер-админом"}
                      </button>
                      <button
                        className={banned ? "unban-action" : "ban-action"}
                        disabled={superAdmin}
                        onClick={async () => {
                          try {
                            await request(`/admin/users/${telegramId}/ban`, {
                              method: "PUT",
                              body: JSON.stringify({ banned: !banned }),
                            });
                            await loadAdminData();
                            onToast(banned ? "Блокировка снята" : "Пользователь заблокирован");
                          } catch (banError) {
                            onToast(banError instanceof Error ? banError.message : "Не удалось изменить блокировку");
                          }
                        }}
                      >
                        {banned ? "Разблокировать" : "Бан"}
                      </button>
                    </div>
                  </article>
                );
              })}
          </div>
        </div>
      )}
      {tab === "moderation" && (
        <div className="admin-table-card reports-panel">
          <div className="table-heading"><div><h2>Жалобы на продавцов</h2><p>Рассмотрите причину и примите решение.</p></div></div>
          {reports.map((report) => {
            const reportId = asNumber(report.id);
            const pending = String(report.status) === "PENDING";
            const reportStatus = {
              PENDING: "НА РАССМОТРЕНИИ",
              BANNED: "ПРОДАВЕЦ ЗАБЛОКИРОВАН",
              DISMISSED: "ОТКЛОНЕНА",
            }[String(report.status)] || String(report.status);
            return (
              <article className={`report-review-card ${pending ? "pending" : ""}`} key={reportId}>
                <div className="report-review-head"><AlertTriangle size={18} /><div><b>{String(report.reported_name || `ID ${report.reported_telegram_id}`)}{report.reported_username ? ` · @${String(report.reported_username)}` : ""}</b><small>Telegram ID: {String(report.reported_telegram_id)} · Жалоба #{reportId} · {report.order_id ? `заказ #${String(report.order_id)}` : `закупка #${String(report.group_buy_id)}`} · {String(report.product_title)}</small></div><em>{reportStatus}</em></div>
                <p>{String(report.reason)}</p>
                <small>От: {String(report.reporter_name || report.reporter_telegram_id)}{report.reporter_username ? ` · @${String(report.reporter_username)}` : ""} · Telegram ID: {String(report.reporter_telegram_id)} · {formatMoscowDateTime(String(report.created_at))} МСК</small>
                <div className="report-review-actions">
                  <button
                    className="contact-action"
                    onClick={() =>
                      openTelegramDialog(
                        asNumber(report.reported_telegram_id),
                        report.reported_username
                          ? String(report.reported_username)
                          : undefined,
                        report.reported_phone
                          ? String(report.reported_phone)
                          : undefined,
                      )
                    }
                  >
                    {report.reported_username ? (
                      <MessageCircle size={15} />
                    ) : (
                      <Phone size={15} />
                    )} Связаться
                  </button>
                  {pending && (
                    <>
                    <button
                      className="ban-action"
                      onClick={async () => {
                        try {
                          await request(`/admin/reports/${reportId}`, { method: "PUT", body: JSON.stringify({ action: "BAN" }) });
                          await loadAdminData();
                          onToast("Продавец заблокирован, жалоба закрыта");
                        } catch (reportError) {
                          onToast(reportError instanceof Error ? reportError.message : "Не удалось рассмотреть жалобу");
                        }
                      }}
                    >
                      Заблокировать продавца
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await request(`/admin/reports/${reportId}`, { method: "PUT", body: JSON.stringify({ action: "DISMISS" }) });
                          await loadAdminData();
                          onToast("Жалоба отклонена");
                        } catch (reportError) {
                          onToast(reportError instanceof Error ? reportError.message : "Не удалось рассмотреть жалобу");
                        }
                      }}
                    >
                      Отклонить
                    </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
          {!reports.length && <div className="empty-inline">Жалоб пока нет.</div>}
        </div>
      )}
    </section>
  );
}

function AdminGroupRow({
  club,
  request,
  onSaved,
}: {
  club: AdminGroup;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onSaved: () => Promise<void>;
}) {
  const [commission, setCommission] = useState(String(club.commissionPercent));
  const [debtLimit, setDebtLimit] = useState(
    String(Math.round(club.debtLimitKopecks / 100)),
  );
  const [active, setActive] = useState(club.active);
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="group-management-row"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
          await request(`/admin/groups/${club.id}`, {
            method: "PUT",
            body: JSON.stringify({
              commissionPercent: Number(commission),
              debtLimitKopecks: Number(debtLimit) * 100,
              active,
            }),
          });
          await onSaved();
        } finally {
          setSaving(false);
        }
      }}
    >
      <span className="shop-avatar">{club.title.slice(0, 2).toUpperCase()}</span>
      <p><b>{club.title}</b><small>{club.productCount} товаров · {club.stores} магазинов · ID {club.telegramGroupId}</small></p>
      <label><span>Комиссия, %</span><input type="number" min="0" max="30" step="0.1" value={commission} onChange={(event) => setCommission(event.target.value)} /></label>
      <label><span>Лимит долга, ₽</span><input type="number" min="1" step="1" value={debtLimit} onChange={(event) => setDebtLimit(event.target.value)} /></label>
      <label className="active-check"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /><span>{active ? "Активна" : "Отключена"}</span></label>
      <button disabled={saving}>{saving ? "…" : "Сохранить"}</button>
    </form>
  );
}

function Balance({
  profile,
  finance,
}: {
  profile: Profile;
  finance: SellerFinance | null;
}) {
  const platformDebt =
    finance?.platformDebtKopecks ?? profile.commissionDebtKopecks;
  const platformLimit =
    finance?.platformDebtLimitKopecks ?? profile.debtLimitKopecks;
  const platformPercent = platformLimit
    ? Math.min(100, Math.round((platformDebt / platformLimit) * 100))
    : 0;
  const groupPercent = finance?.groupDebtLimitKopecks
    ? Math.min(
        100,
        Math.round(
          (finance.groupDebtKopecks / finance.groupDebtLimitKopecks) * 100,
        ),
      )
    : 0;
  return (
    <section className="inner-page narrow-page">
      <div className="page-title"><span className="section-kicker">SELLER FINANCE</span><h1>Баланс и комиссии</h1><p>Фактические данные вашего профиля</p></div>
      <div className={`debt-card ${finance?.platformBlocked ? "danger" : ""}`}>
        <span>Долг платформе · комиссия {finance?.platformCommissionPercent ?? profile.botCommissionPercent}%</span>
        <strong>{formatPrice(platformDebt)}</strong>
        <div><i style={{ width: `${platformPercent}%` }} /></div>
        <p>Лимит блокировки: {formatPrice(platformLimit)}</p>
      </div>
      {finance && (
        <div className={`debt-card ${finance.groupBlocked ? "danger" : ""}`}>
          <span>Долг клубу · комиссия {finance.groupCommissionPercent}%</span>
          <strong>{formatPrice(finance.groupDebtKopecks)}</strong>
          <div><i style={{ width: `${groupPercent}%` }} /></div>
          <p>Лимит блокировки: {formatPrice(finance.groupDebtLimitKopecks)}</p>
        </div>
      )}
    </section>
  );
}

function SellerDebtModal({
  finance,
  clubTitle,
  onClose,
}: {
  finance: SellerFinance;
  clubTitle: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop seller-debt-backdrop">
      <section className="report-modal seller-debt-modal" role="dialog" aria-modal="true">
        <div className="report-modal-icon"><WalletCards size={24} /></div>
        <h2>Продажи приостановлены</h2>
        <p>Объявления скрыты до подтверждения оплаты. Покупать товары других продавцов можно.</p>
        <div className="seller-debt-breakdown">
          <article className={finance.platformBlocked ? "blocked" : ""}>
            <span>ПЛАТФОРМА</span>
            <b>{formatPrice(finance.platformDebtKopecks)}</b>
            <small>Лимит {formatPrice(finance.platformDebtLimitKopecks)} · комиссия {finance.platformCommissionPercent}%</small>
            {finance.platformBlocked && (
              <p><strong>Реквизиты супер-администратора</strong>{finance.platformPaymentDetails || "Реквизиты пока не указаны. Свяжитесь с супер-администратором."}</p>
            )}
          </article>
          <article className={finance.groupBlocked ? "blocked" : ""}>
            <span>КЛУБ «{clubTitle}»</span>
            <b>{formatPrice(finance.groupDebtKopecks)}</b>
            <small>Лимит {formatPrice(finance.groupDebtLimitKopecks)} · комиссия {finance.groupCommissionPercent}%</small>
            {finance.groupBlocked && (
              <p><strong>Реквизиты администратора клуба</strong>{finance.groupPaymentDetails || "Реквизиты пока не указаны. Свяжитесь с администратором клуба."}</p>
            )}
          </article>
        </div>
        <p className="seller-debt-note">Переведите сумму долга, затем дождитесь подтверждения получателя. После погашения обоих достигнутых лимитов объявления вернутся автоматически.</p>
        <button className="main-action" onClick={onClose}>Понятно, перейти в маркет</button>
      </section>
    </div>
  );
}

function NotificationsModal({
  notifications,
  request,
  onChanged,
  onNavigate,
  onClose,
  onToast,
}: {
  notifications: AppNotification[];
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onChanged: () => Promise<void>;
  onNavigate: (screen: Screen) => void;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const unread = notifications.filter((item) => !item.isRead).length;

  return (
    <div className="notification-modal-backdrop" onClick={onClose}>
      <section className="notification-modal" onClick={(event) => event.stopPropagation()}>
        <div className="notification-modal-head">
          <div><span>INBOX</span><h2>Уведомления</h2></div>
          <button onClick={onClose} aria-label="Закрыть уведомления"><X size={18} /></button>
        </div>
      {unread > 0 && (
        <button
          className="outline-action notifications-read-all"
          onClick={async () => {
            try {
              await request("/me/notifications/read-all", { method: "PUT" });
              await onChanged();
            } catch (readError) {
              onToast(readError instanceof Error ? readError.message : "Не удалось отметить уведомления");
            }
          }}
        >
          Прочитать все · {unread}
        </button>
      )}
      {notifications.length ? (
        <div className="notification-list">
          {notifications.map((item) => (
            <button
              key={item.id}
              className={`notification-card ${item.isRead ? "" : "unread"}`}
              onClick={async () => {
                if (!item.isRead) {
                  try {
                    await request(`/me/notifications/${item.id}/read`, {
                      method: "PUT",
                    });
                    await onChanged();
                  } catch (readError) {
                    onToast(
                      readError instanceof Error
                        ? readError.message
                        : "Не удалось прочитать уведомление",
                    );
                  }
                }
                if (item.targetScreen) {
                  onClose();
                  onNavigate(item.targetScreen);
                }
              }}
            >
              <i><Bell size={16} /></i>
              <span><b>{item.title}</b><p>{item.body}</p><small>{formatMoscowDateTime(item.createdAt)} МСК</small></span>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state"><Bell size={30} /><h3>Уведомлений пока нет</h3><p>Новые события заказов и закупок появятся здесь.</p></div>
      )}
      </section>
    </div>
  );
}

function EmptySection({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <section className="inner-page narrow-page">
      <div className="page-title"><span className="section-kicker">REDLINE</span><h1>{title}</h1></div>
      <div className="empty-state"><Gauge size={30} /><h3>Пока пусто</h3><p>{text}</p>{action}</div>
    </section>
  );
}

function Help() {
  return (
    <section className="inner-page narrow-page">
      <div className="page-title"><span className="section-kicker">SUPPORT</span><h1>Помощь</h1><p>Как подключить и использовать REDLINE</p></div>
      <div className="settings-card">
        <h2>Подключение клуба</h2>
        <p className="settings-hint">Добавьте бота в Telegram-группу, включите темы, назначьте бота администратором и разрешите управление темами. Бот создаст тему «Магазин» автоматически.</p>
        <h2>Групповые закупки</h2>
        <p className="settings-hint">После достижения порога продавец фиксирует актуальную цену и отправляет участникам запрос оплаты.</p>
        <h2>Как продавец оплачивает комиссии</h2>
        <p className="settings-hint">
          Комиссия начисляется только после завершения заказа. Для продавца
          ведутся два независимых долга: платформе и администратору клуба. У
          каждого долга есть собственные комиссия и лимит.
        </p>
        <h2>Где посмотреть сумму и реквизиты</h2>
        <p className="settings-hint">
          Откройте «Баланс и комиссии» в меню. Там указаны текущие долги,
          лимиты и реквизиты супер-администратора и администратора клуба. Пункт
          появляется после создания первого объявления.
        </p>
        <h2>Что происходит при достижении лимита</h2>
        <p className="settings-hint">
          Объявления временно скрываются, а создание новых и приём заказов
          блокируются. В разделах продавца показывается сумма долга и реквизиты.
          Переведите необходимую сумму получателю комиссии. После того как
          соответствующий администратор подтвердит платёж, долг уменьшится и
          продажи восстановятся автоматически.
        </p>
      </div>
    </section>
  );
}

function StatePage({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <main className="state-page">
      <div className="state-card">{icon}<div className="brand-lockup"><span className="brand-slash" /><div><b>REDLINE</b><small>CLUB MARKET</small></div></div><h1>{title}</h1><p>{text}</p>{action}</div>
    </main>
  );
}
