"use client";

import {
  ArrowLeft,
  AlertTriangle,
  BadgeCheck,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Crown,
  Gauge,
  Heart,
  House,
  ImagePlus,
  LayoutDashboard,
  Menu,
  PackagePlus,
  Pencil,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Trash2,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Screen =
  | "market"
  | "group"
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
};

type Club = {
  id: number;
  telegramGroupId: number;
  title: string;
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
  category: string;
  stock: number;
  kind: "regular" | "group";
  sellerPriceKopecks: number;
  buyerPriceKopecks: number;
  images: string[];
  storeId: number;
  storeName: string;
  sellerTelegramId: number;
  sellerName?: string;
  sellerUsername?: string;
  active: boolean;
  orderCount: number;
  rating: number;
  reviewCount: number;
  storeRating: number;
  groupBuyId?: number;
  targetCount?: number;
  reservedCount: number;
  groupBuyStatus?: string;
};

type Storefront = {
  id: number;
  name: string;
  sellerTelegramId: number;
  productCount: number;
  cover?: string;
  rating: number;
};

type SellerStore = {
  id: number;
  name: string;
  description?: string;
  paymentDetails: string;
};

type AppNotification = {
  id: number;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

type GroupBuyPurchase = {
  groupBuyId: number;
  groupBuyStatus: string;
  reservationStatus: string;
  productTitle: string;
  image?: string;
  storeName: string;
  sellerName?: string;
  sellerUsername?: string;
  paymentDetails?: string;
  targetCount: number;
  reservedCount: number;
  finalPriceKopecks?: number;
  paymentDeadline?: string;
  deliveryFrom?: string;
  deliveryTo?: string;
  deliveryNote?: string;
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
  createdAt: string;
  sellerName?: string;
  sellerUsername?: string;
  paymentDetails?: string;
  buyerName?: string;
  buyerUsername?: string;
  buyerPhone?: string;
  reviewRating?: number;
};

type TelegramWebApp = {
  initData: string;
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
  hideKeyboard?: () => void;
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

const navBase: { id: Screen; label: string; icon: React.ElementType }[] = [
  { id: "market", label: "Маркет", icon: House },
  { id: "group", label: "Групповые закупки", icon: UsersRound },
  { id: "orders", label: "Мои покупки", icon: ShoppingBag },
  { id: "sales", label: "Заказы клиентов", icon: UsersRound },
  { id: "listings", label: "Мои объявления", icon: Store },
  { id: "create", label: "Создать объявление", icon: PackagePlus },
  { id: "balance", label: "Баланс и комиссии", icon: WalletCards },
  { id: "help", label: "Помощь", icon: CircleHelp },
];

const formatPrice = (kopecks: number) =>
  `${new Intl.NumberFormat("ru-RU").format(Math.round(kopecks / 100))} ₽`;

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
});

const camelClub = (row: Record<string, unknown>): Club => ({
  id: asNumber(row.id),
  telegramGroupId: asNumber(row.telegram_group_id),
  title: String(row.title || ""),
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
});

const camelProduct = (row: Record<string, unknown>): Product => {
  let images: string[] = [];
  try {
    images = JSON.parse(String(row.image_urls || "[]"));
  } catch {
    images = [];
  }
  return {
    id: asNumber(row.id),
    title: String(row.title || ""),
    description: String(row.description || ""),
    category: String(row.category || ""),
    stock: asNumber(row.stock),
    kind: row.kind === "GROUP_BUY" ? "group" : "regular",
    sellerPriceKopecks: asNumber(row.seller_price_kopecks),
    buyerPriceKopecks: asNumber(row.buyer_price_kopecks),
    images,
    storeId: asNumber(row.store_id),
    storeName: String(row.store_name || ""),
    sellerTelegramId: asNumber(row.seller_telegram_id),
    sellerName: row.seller_name ? String(row.seller_name) : undefined,
    sellerUsername: row.seller_username ? String(row.seller_username) : undefined,
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
  };
};

const camelOrder = (row: Record<string, unknown>): Order => {
  let images: string[] = [];
  try {
    images = JSON.parse(String(row.image_urls || "[]"));
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
    createdAt: String(row.created_at || ""),
    sellerName: row.seller_name ? String(row.seller_name) : undefined,
    sellerUsername: row.seller_username
      ? String(row.seller_username)
      : undefined,
    paymentDetails: row.payment_details
      ? String(row.payment_details)
      : undefined,
    buyerName: row.buyer_name ? String(row.buyer_name) : undefined,
    buyerUsername: row.buyer_username ? String(row.buyer_username) : undefined,
    buyerPhone: row.buyer_phone ? String(row.buyer_phone) : undefined,
    reviewRating: row.review_rating ? asNumber(row.review_rating) : undefined,
  };
};

const camelStore = (row: Record<string, unknown>): SellerStore => ({
  id: asNumber(row.id),
  name: String(row.name || ""),
  description: row.description ? String(row.description) : undefined,
  paymentDetails: String(row.payment_details || ""),
});

const camelNotification = (
  row: Record<string, unknown>,
): AppNotification => ({
  id: asNumber(row.id),
  title: String(row.title || "REDLINE"),
  body: String(row.body || ""),
  isRead: asBoolean(row.is_read),
  createdAt: String(row.created_at || ""),
});

const camelGroupBuyPurchase = (
  row: Record<string, unknown>,
): GroupBuyPurchase => {
  let images: string[] = [];
  try {
    images = JSON.parse(String(row.image_urls || "[]"));
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
    sellerUsername: row.seller_username ? String(row.seller_username) : undefined,
    paymentDetails: row.payment_details ? String(row.payment_details) : undefined,
    targetCount: asNumber(row.target_count),
    reservedCount: asNumber(row.reserved_count),
    finalPriceKopecks: row.final_price_kopecks
      ? asNumber(row.final_price_kopecks)
      : undefined,
    paymentDeadline: row.payment_deadline ? String(row.payment_deadline) : undefined,
    deliveryFrom: row.delivery_from ? String(row.delivery_from) : undefined,
    deliveryTo: row.delivery_to ? String(row.delivery_to) : undefined,
    deliveryNote: row.delivery_note ? String(row.delivery_note) : undefined,
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
  const [screen, setScreen] = useState<Screen>("market");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState("Все");
  const [activeStoreId, setActiveStoreId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const connectTelegram = async () => {
      await Promise.resolve();
      let telegram = window.Telegram?.WebApp;
      for (let attempt = 0; !telegram?.initData && attempt < 20; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 100));
        telegram = window.Telegram?.WebApp;
      }
      if (cancelled) return;
      telegram?.ready();
      telegram?.expand();
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
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!selectedClub) return;
    void loadCatalog(selectedClub.telegramGroupId);
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
    const response = await fetch(`${API}${path}`, { ...options, headers });
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
    return response.json() as Promise<T>;
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
        setSelectedProduct(
          nextProducts.find((product) => product.id === requestedProduct) || null,
        );
      }
    } catch (catalogError) {
      setError(
        catalogError instanceof Error
          ? catalogError.message
          : "Не удалось загрузить каталог",
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

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          (activeCategory === "Все" ||
            product.category === activeCategory) &&
          (activeStoreId === null || product.storeId === activeStoreId) &&
          (!favoritesOnly || favorites.includes(product.id)) &&
          `${product.title} ${product.storeName}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [activeCategory, activeStoreId, favorites, favoritesOnly, products, query],
  );

  const storefronts = useMemo(() => {
    const byId = new Map<number, Storefront>();
    for (const product of products) {
      const current = byId.get(product.storeId);
      if (current) {
        current.productCount += 1;
        if (!current.cover && product.images[0]) current.cover = product.images[0];
        current.rating = product.storeRating;
      } else {
        byId.set(product.storeId, {
          id: product.storeId,
          name: product.storeName,
          sellerTelegramId: product.sellerTelegramId,
          productCount: 1,
          cover: product.images[0],
          rating: product.storeRating,
        });
      }
    }
    return Array.from(byId.values());
  }, [products]);

  const groupProducts = products.filter((product) => product.kind === "group");
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

  async function reserve(product: Product) {
    if (!product.groupBuyId || !profile?.phone) return;
    try {
      const result = await request<{
        reserved: number;
        target: number;
        thresholdReached: boolean;
      }>(`/group-buys/${product.groupBuyId}/reservations`, {
        method: "POST",
        body: JSON.stringify({ phone: profile.phone }),
      });
      setProducts((items) =>
        items.map((item) =>
          item.id === product.id
            ? { ...item, reservedCount: result.reserved }
            : item,
        ),
      );
      setSelectedProduct((item) =>
        item?.id === product.id
          ? { ...item, reservedCount: result.reserved }
          : item,
      );
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
      setToast(
        result.thresholdReached
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

  async function buy(product: Product) {
    try {
      await request(`/products/${product.id}/orders`, { method: "POST" });
      setSelectedProduct(null);
      navigate("orders");
      setToast("Заказ создан. Продавец получил уведомление.");
    } catch (buyError) {
      setToast(
        buyError instanceof Error ? buyError.message : "Не удалось создать заказ",
      );
    }
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
                  debtLimitKopecks: club.debtLimitKopecks,
                  sellerBlocked:
                    current.commissionDebtKopecks >= club.debtLimitKopecks,
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
    ...navBase,
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
          <span className="group-mark">{selectedClub ? selectedClub.title.slice(0, 2).toUpperCase() : "—"}</span>
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
                          debtLimitKopecks: nextClub.debtLimitKopecks,
                          sellerBlocked:
                            current.commissionDebtKopecks >=
                            nextClub.debtLimitKopecks,
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
          <button className="avatar-button" onClick={() => setToast(`Профиль: ${displayName}`)}>{initial}</button>
        </div>
      </header>

      <aside className={`drawer ${drawerOpen ? "is-open" : ""}`} aria-hidden={!drawerOpen}>
        <div className="drawer-head">
          <div className="brand-lockup"><span className="brand-slash" /><div><b>REDLINE</b><small>CLUB MARKET</small></div></div>
          <button className="icon-button" onClick={() => setDrawerOpen(false)} aria-label="Закрыть меню"><X size={21} /></button>
        </div>
        <div className="profile-card">
          <div className="profile-avatar">{initial}</div>
          <div>
            <strong>{displayName}</strong>
            <span><BadgeCheck size={13} /> Зарегистрирован</span>
          </div>
        </div>
        <nav className="drawer-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const needsClub = ["group", "orders", "sales", "listings", "create", "admin"].includes(item.id);
            const disabled = needsClub && !selectedClub;
            return (
              <button
                key={item.id}
                className={`${screen === item.id ? "active" : ""} ${disabled ? "disabled" : ""}`}
                onClick={() => !disabled && navigate(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.id === "group" && groupProducts.length > 0 && <em>{groupProducts.length}</em>}
                {item.id === "admin" && <small>OWNER</small>}
                {item.id === "superadmin" && <small>SUPER</small>}
              </button>
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
            categories={categories}
            products={visibleProducts}
            storefronts={storefronts}
            activeStoreId={activeStoreId}
            setActiveStoreId={setActiveStoreId}
            favoritesOnly={favoritesOnly}
            setFavoritesOnly={setFavoritesOnly}
            totalProducts={products.length}
            groupCount={groupProducts.length}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            query={query}
            setQuery={setQuery}
            favorites={favorites}
            onFavorite={(id) => void toggleFavorite(id)}
            onOpen={setSelectedProduct}
            onReserve={reserve}
            onNavigate={navigate}
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
              if (selectedClub) await loadCatalog(selectedClub.telegramGroupId);
            }}
            onToast={setToast}
          />
        )}

        {screen === "balance" && profile && (
          <Balance profile={profile} />
        )}

        {screen === "create" && profile && (
          <CreateListing
            key={selectedClub?.telegramGroupId || "no-club"}
            profile={profile}
            club={selectedClub}
            categories={categories}
            request={request}
            onCreated={async () => {
              if (selectedClub) await loadCatalog(selectedClub.telegramGroupId);
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
            categories={categories}
            request={request}
            onCategoriesChanged={reloadCategories}
            onToast={setToast}
          />
        )}

        {screen === "help" && <Help />}

      </div>

      {notificationsOpen && (
        <NotificationsModal
          notifications={notifications}
          request={request}
          onChanged={reloadNotifications}
          onClose={() => setNotificationsOpen(false)}
          onToast={setToast}
        />
      )}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          favorite={favorites.includes(selectedProduct.id)}
          onFavorite={() => void toggleFavorite(selectedProduct.id)}
          onClose={() => setSelectedProduct(null)}
          onReserve={() => void reserve(selectedProduct)}
          onBuy={() => void buy(selectedProduct)}
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
  categories,
  products,
  storefronts,
  activeStoreId,
  setActiveStoreId,
  favoritesOnly,
  setFavoritesOnly,
  totalProducts,
  groupCount,
  activeCategory,
  setActiveCategory,
  query,
  setQuery,
  favorites,
  onFavorite,
  onOpen,
  onReserve,
  onNavigate,
}: {
  club: Club | null;
  clubs: Club[];
  categories: Category[];
  products: Product[];
  storefronts: Storefront[];
  activeStoreId: number | null;
  setActiveStoreId: (value: number | null) => void;
  favoritesOnly: boolean;
  setFavoritesOnly: (value: boolean) => void;
  totalProducts: number;
  groupCount: number;
  activeCategory: string;
  setActiveCategory: (value: string) => void;
  query: string;
  setQuery: (value: string) => void;
  favorites: number[];
  onFavorite: (id: number) => void;
  onOpen: (product: Product) => void;
  onReserve: (product: Product) => Promise<void>;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">REDLINE CLUB</span>
          <h1>ДЕТАЛИ,<br /><em>КОТОРЫЕ РЕШАЮТ</em></h1>
          <p>Реальные объявления и групповые закупки вашего автоклуба.</p>
          <button onClick={() => onNavigate("create")}>Продать товар <ArrowLeft className="arrow-right" size={17} /></button>
        </div>
      </section>

      <section className="trust-strip">
        <div><Store size={20} /><span><strong>{clubs.length}</strong>подключено групп</span></div>
        <i />
        <div><ShoppingBag size={20} /><span><strong>{totalProducts}</strong>товаров в клубе</span></div>
        <i />
        <div><UsersRound size={20} /><span><strong>{groupCount}</strong>активных закупок</span></div>
      </section>

      <section className="catalog-section">
        <div className="section-heading">
          <div><span className="section-kicker">MARKETPLACE</span><h2>{club ? `Каталог · ${club.title}` : "Каталог клуба"}</h2></div>
        </div>

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
                      // Product uploads are served by the same app and lazy-loaded below the fold.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={store.cover} alt="" loading="lazy" decoding="async" />
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
              {["Все", ...categories.map((category) => category.name)].map((category) => (
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
                    onReserve={() => void onReserve(product)}
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
    </>
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
        <div className="rating-line">
          <Star size={13} fill={product.reviewCount ? "currentColor" : "none"} />
          <b>{product.reviewCount ? product.rating.toFixed(1) : "—"}</b>
          <span>{product.reviewCount ? `${product.reviewCount} оценок` : "Нет оценок"}</span>
        </div>
        {product.kind === "group" && product.targetCount && (
          <div className="group-progress">
            <div className="progress-label"><span>Забронировали</span><b>{product.reservedCount} из {product.targetCount}</b></div>
            <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
          </div>
        )}
        <div className="price-row"><div><strong>{formatPrice(product.buyerPriceKopecks)}</strong></div><span>В наличии: {product.stock}</span></div>
        <button className="primary-card-action" onClick={product.kind === "group" ? onReserve : onOpen}>{product.kind === "group" ? "Забронировать" : "Подробнее"}<ChevronRight size={15} /></button>
      </div>
    </article>
  );
}

function ProductModal({
  product,
  favorite,
  onFavorite,
  onClose,
  onReserve,
  onBuy,
}: {
  product: Product;
  favorite: boolean;
  onFavorite: () => void;
  onClose: () => void;
  onReserve: () => void;
  onBuy: () => void;
}) {
  const progress = product.targetCount
    ? Math.min(100, Math.round((product.reservedCount / product.targetCount) * 100))
    : 0;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <article className="product-modal">
        <div className="modal-visual actual-product-image" style={product.images[0] ? { backgroundImage: `linear-gradient(transparent 50%, #101010), url("${product.images[0]}")` } : undefined}>
          <button className="modal-close" onClick={onClose}><X size={19} /></button>
          <button className={`modal-heart ${favorite ? "active" : ""}`} onClick={onFavorite}><Heart size={18} fill={favorite ? "currentColor" : "none"} /></button>
        </div>
        <div className="modal-body">
          <span className="seller-line"><BadgeCheck size={13} />{product.storeName}</span>
          <h2>{product.title}</h2>
          <div className="rating-line modal-rating">
            <Star size={15} fill={product.reviewCount ? "currentColor" : "none"} />
            <b>{product.reviewCount ? product.rating.toFixed(1) : "—"}</b>
            <span>{product.reviewCount ? `${product.reviewCount} оценок` : "Оценок пока нет"}</span>
          </div>
          <p>{product.description}</p>
          {product.kind === "group" && product.targetCount && (
            <div className="modal-group-box">
              <div><span>Собрано</span><b>{product.reservedCount} / {product.targetCount}</b></div>
              <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
            </div>
          )}
          <div className="modal-price"><span>Цена покупателя</span><strong>{formatPrice(product.buyerPriceKopecks)}</strong></div>
          <button className="main-action" onClick={product.kind === "group" ? onReserve : onBuy}>{product.kind === "group" ? "Забронировать место" : "Купить"}</button>
        </div>
      </article>
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
  onReserve: (product: Product) => Promise<void>;
}) {
  return (
    <section className="inner-page">
      <div className="page-title"><span className="section-kicker">GROUP BUY</span><h1>{title}</h1><p>{text}</p></div>
      {products.length ? (
        <div className="catalog-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} onFavorite={() => onFavorite(product.id)} onOpen={() => onOpen(product)} onReserve={() => void onReserve(product)} />
          ))}
        </div>
      ) : (
        <div className="empty-state"><UsersRound size={32} /><h3>Активных закупок нет</h3><p>Никакие демонстрационные товары не загружены.</p></div>
      )}
    </section>
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
      await request(`/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: String(form.get("title")),
          description: String(form.get("description")),
          category: String(form.get("category")),
          stock: Number(form.get("stock")),
          sellerPriceKopecks: Math.round(Number(form.get("price")) * 100),
          imageUrlsJson: JSON.stringify(images),
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
          <label><span>Название товара</span><input name="title" defaultValue={product.title} required /></label>
          <label><span>Категория</span><select name="category" defaultValue={product.category} required>{categories.map((category) => <option key={category.id}>{category.name}</option>)}</select></label>
          <label><span>Описание</span><textarea name="description" defaultValue={product.description} rows={4} required /></label>
          <div className="form-row">
            <label><span>Цена продавца, ₽</span><input name="price" type="number" min="1" step="1" defaultValue={Math.round(product.sellerPriceKopecks / 100)} required /></label>
            <label><span>Количество</span><input name="stock" type="number" min="1" defaultValue={product.stock} required /></label>
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

  async function loadOrders() {
    if (!club) return;
    setLoading(true);
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
      onToast(
        ordersError instanceof Error
          ? ordersError.message
          : "Не удалось загрузить заказы",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    void Promise.all([
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
    ])
      .then(([rows, groupRows]) => {
        if (!cancelled) {
          setOrders(rows.map(camelOrder));
          if (mode === "sales") {
            setSellerGroupBuys(
              groupRows.map(camelProduct).filter((product) => product.kind === "group"),
            );
          } else {
            setGroupBuyPurchases(groupRows.map(camelGroupBuyPurchase));
          }
        }
      })
      .catch((ordersError) => {
        if (!cancelled) {
          onToast(
            ordersError instanceof Error
              ? ordersError.message
              : "Не удалось загрузить заказы",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Orders reload when role or selected Telegram group changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.telegramGroupId, mode]);

  if (!club) {
    return <EmptySection title={mode === "sales" ? "Заказы клиентов" : "Мои покупки"} text="Сначала выберите клуб." />;
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

  async function review(order: Order, rating: number) {
    try {
      await request(`/orders/${order.id}/review`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      });
      await Promise.all([
        loadOrders(),
        onCatalogChanged ? onCatalogChanged() : Promise.resolve(),
      ]);
      onToast("Спасибо! Оценка сохранена");
    } catch (reviewError) {
      onToast(
        reviewError instanceof Error
          ? reviewError.message
          : "Не удалось сохранить оценку",
      );
    }
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
        <h1>{mode === "sales" ? "Заказы клиентов" : "Мои покупки"}</h1>
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
                onChanged={loadOrders}
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
                onChanged={loadOrders}
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
            onAdvance={(status) => void advance(order, status)}
            onReport={() => setReportingOrder(order)}
            onReview={(rating) => void review(order, rating)}
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
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="report-modal"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={dismissKeyboard}
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
        <label><span>Причина</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={5} minLength={5} required placeholder="Опишите проблему с продавцом или заказом" /></label>
        {error && <p className="form-error">{error}</p>}
        <div className="report-modal-actions">
          <button type="button" className="outline-action" onClick={onClose}>Отменить</button>
          <button className="main-action" disabled={saving || reason.trim().length < 5}>{saving ? "Отправляем…" : "Отправить"}</button>
        </div>
      </form>
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
    purchase.reservationStatus === "PAYMENT_REQUESTED";

  return (
    <>
    <article className="order-card group-purchase-card">
      <div className="order-head">
        <div><span className="order-number">ГРУППОВАЯ ЗАКУПКА</span><strong>{statusLabels[purchase.groupBuyStatus] || purchase.groupBuyStatus}</strong></div>
        <div className="order-head-actions">
          <span>{purchase.reservedCount}/{purchase.targetCount}</span>
          <button className="report-order-button" onClick={() => setReporting(true)} aria-label="Пожаловаться на продавца" title="Пожаловаться на продавца"><AlertTriangle size={16} /></button>
        </div>
      </div>
      <div className="order-product">
        <div className="order-thumb actual-product-image" style={purchase.image ? { backgroundImage: `url("${purchase.image}")` } : undefined} />
        <div>
          <b>{purchase.productTitle}</b>
          <span>{purchase.storeName}</span>
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
          {purchase.paymentDetails && purchase.groupBuyStatus === "AWAITING_PAYMENT" && (
            <div className="requisites">
              <div><span>Реквизиты продавца</span><strong>{purchase.paymentDetails}</strong></div>
              <button onClick={async () => {
                try {
                  await navigator.clipboard.writeText(purchase.paymentDetails || "");
                  onToast("Реквизиты скопированы");
                } catch {
                  onToast("Не удалось скопировать");
                }
              }}>Копировать</button>
            </div>
          )}
          {purchase.paymentDeadline && purchase.groupBuyStatus === "AWAITING_PAYMENT" && (
            <p className="payment-deadline">Оплатите до {new Date(purchase.paymentDeadline).toLocaleString("ru-RU")}</p>
          )}
        </div>
      )}
      {purchase.reservationStatus === "PAID" && (
        <div className="paid-confirmation"><Check size={16} /> Вы отметили оплату. Продавец проверяет поступление.</div>
      )}
      {purchase.deliveryFrom && (
        <div className="delivery-note">
          <span>ОРИЕНТИР ПОСТАВКИ</span>
          <b>{new Date(purchase.deliveryFrom).toLocaleDateString("ru-RU")} — {purchase.deliveryTo ? new Date(purchase.deliveryTo).toLocaleDateString("ru-RU") : "уточняется"}</b>
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
              onToast("Продавец получил уведомление об оплате");
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
  onAdvance: (status: "PAID" | "SHIPPED" | "COMPLETED" | "CANCELLED") => void;
  onReport: () => void;
  onReview: (rating: number) => void;
  onToast: (message: string) => void;
}) {
  const [ratingOpen, setRatingOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const steps = [
    { status: "AWAITING_PAYMENT", label: "Ожидает оплаты", text: "Покупатель переводит деньги продавцу" },
    { status: "PAID", label: "Оплачено", text: "Продавец проверяет поступление" },
    { status: "SHIPPED", label: "Отправлено", text: "Покупатель ожидает товар" },
    { status: "COMPLETED", label: "Завершено", text: "Получение подтверждено" },
  ];
  const currentIndex = steps.findIndex((step) => step.status === order.status);
  const statusLabel = order.status === "CANCELLED" ? "Отменён" : steps[currentIndex]?.label || order.status;
  const action =
    mode === "purchases" && order.status === "AWAITING_PAYMENT"
      ? { label: "Я оплатил", status: "PAID" as const }
      : mode === "sales" && order.status === "PAID"
        ? { label: "Отправил товар / выполнил услугу", status: "SHIPPED" as const }
        : mode === "purchases" && order.status === "SHIPPED"
          ? { label: "Подтвердить получение", status: "COMPLETED" as const }
          : null;

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      onToast("Скопировано");
    } catch {
      onToast("Не удалось скопировать");
    }
  };

  return (
    <article className={`order-card ${order.status === "AWAITING_PAYMENT" ? "featured-order" : ""}`}>
      <div className="order-head">
        <div><span className="order-number">ЗАКАЗ #{order.id}</span><strong>{statusLabel}</strong></div>
        <div className="order-head-actions">
          <span>{new Date(order.createdAt).toLocaleDateString("ru-RU")}</span>
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
          <span>{order.storeName}</span>
          <strong>{formatPrice(order.buyerPriceKopecks)}</strong>
        </div>
      </div>

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
            {requisitesOpen ? "Скрыть реквизиты" : "Показать реквизиты продавца"}
          </button>
          {requisitesOpen && (
            <div className="payment-details">
              <div className="client-details">
                <span>ПРОДАВЕЦ</span>
                <b>{order.sellerName || order.storeName}</b>
                <p>{order.sellerUsername ? `@${order.sellerUsername}` : "Контакт через магазин"}</p>
              </div>
              {order.paymentDetails && (
                <div className="requisites"><div><span>Реквизиты продавца</span><strong>{order.paymentDetails}</strong></div><button onClick={() => void copyValue(order.paymentDetails || "")}>Копировать</button></div>
              )}
              {!order.paymentDetails && <div className="empty-inline">Продавец ещё не указал реквизиты.</div>}
            </div>
          )}
        </>
      )}

      {order.status === "CANCELLED" ? (
        <div className="cancelled-order-note">Заказ отменён. Товар возвращён в остаток продавца.</div>
      ) : <div className="status-timeline">
        {steps.map((step, index) => (
          <div key={step.status} className={index < currentIndex ? "done" : index === currentIndex ? "current" : ""}>
            <i>{index < currentIndex ? "✓" : index + 1}</i>
            <span><b>{step.label}</b><small>{step.text}</small></span>
          </div>
        ))}
      </div>}

      {mode === "sales" && (
        <div className="seller-order-finance">
          <span>Вам: <b>{formatPrice(order.sellerPriceKopecks)}</b></span>
          <span>Комиссия после завершения: <b>{formatPrice(order.commissionKopecks)}</b></span>
        </div>
      )}
      {action && <button className="main-action" onClick={() => onAdvance(action.status)}>{action.label}</button>}
      {["AWAITING_PAYMENT", "PAID"].includes(order.status) && (
        <button className="outline-action cancel-order-action" onClick={() => onAdvance("CANCELLED")}>Отменить заказ</button>
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
              <button className="main-action" disabled={!selectedRating} onClick={() => onReview(selectedRating)}>Подтвердить</button>
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
  club,
  categories,
  request,
  onCreated,
}: {
  profile: Profile;
  club: Club | null;
  categories: Category[];
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onCreated: () => Promise<void>;
}) {
  const [kind, setKind] = useState<"regular" | "group">("regular");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [store, setStore] = useState<SellerStore | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);

  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview)),
    [previews],
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
  if (profile.sellerBlocked) return <EmptySection title="Публикация недоступна" text="Достигнут лимит комиссионного долга. Обратитесь к администратору." />;
  const activeClub = club;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!files.length) {
      setError("Добавьте хотя бы одну фотографию.");
      return;
    }
    if (!categories.length) {
      setError("Супер-админ ещё не создал категории.");
      return;
    }
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const body = new FormData();
          body.append("file", file);
          return request<{ url: string }>("/uploads", { method: "POST", body });
        }),
      );

      if (!store) {
        await request("/stores", {
          method: "POST",
          body: JSON.stringify({
            groupId: activeClub.id,
            name: String(form.get("storeName")),
            description: "",
            paymentDetails: String(form.get("paymentDetails")),
          }),
        });
      }

      const rubles = Number(price.replace(/[^\d]/g, ""));
      await request("/products", {
        method: "POST",
        body: JSON.stringify({
          groupId: activeClub.id,
          title: String(form.get("title")),
          description: String(form.get("description")),
          category: String(form.get("category")),
          stock: Number(form.get("stock")),
          sellerPriceKopecks: rubles * 100,
          kind: kind === "group" ? "GROUP_BUY" : "REGULAR",
          imageUrlsJson: JSON.stringify(uploaded.map((item) => item.url)),
          targetCount: kind === "group" ? Number(form.get("targetCount")) : null,
          collectionDays: kind === "group" ? Number(form.get("collectionDays")) : null,
        }),
      });
      await onCreated();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось создать объявление");
    } finally {
      setSaving(false);
    }
  }

  const sellerRubles = Number(price.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  const finalBuyerKopecks = Math.round(
    sellerRubles *
      100 *
      (1 + profile.botCommissionPercent / 100 + activeClub.commissionPercent / 100),
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
            <p>Все новые объявления автоматически публикуются в этом магазине.</p>
          </div>
        ) : (
          <div className="store-setup-fields">
            <div><span>ПЕРВЫЙ ТОВАР В КЛУБЕ</span><b>Создайте один магазин</b><p>В этом клубе у вас будет только один магазин. В другом клубе можно открыть отдельный.</p></div>
            <label><span>Название магазина</span><input name="storeName" required placeholder="Например, Garage 54" /></label>
            <label><span>Общие реквизиты продавца</span><input name="paymentDetails" required placeholder="Один номер карты, СБП или пояснение" /></label>
          </div>
        )}
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
        <label><span>Название товара</span><input name="title" required placeholder="Например, кованые диски R20" /></label>
        <label>
          <span>Категория</span>
          <select name="category" required defaultValue="">
            <option value="" disabled>{categories.length ? "Выберите категорию" : "Категории ещё не созданы"}</option>
            {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
          </select>
        </label>
        <label><span>Описание</span><textarea name="description" required rows={4} placeholder="Комплектация, состояние, совместимость…" /></label>
        <div className="form-row">
          <label><span>Цена продавца</span><div className="input-suffix"><input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="numeric" required /><b>₽</b></div></label>
          <label><span>Количество</span><input name="stock" type="number" min="1" defaultValue="1" required /></label>
        </div>
        <div className="price-preview">
          <span>Конечная цена для покупателя</span>
          <b>{sellerRubles > 0 ? formatPrice(finalBuyerKopecks) : "—"}</b>
          <small>
            Ваша цена {sellerRubles > 0 ? formatPrice(sellerRubles * 100) : "не указана"} + бот {profile.botCommissionPercent}% + клуб {activeClub.commissionPercent}%
          </small>
        </div>
        {kind === "group" && (
          <div className="group-fields">
            <label><span>Участников для старта</span><input name="targetCount" type="number" min="2" defaultValue="10" required /></label>
            <label><span>Срок набора</span><select name="collectionDays" defaultValue="7"><option value="3">3 дня</option><option value="7">7 дней</option><option value="14">14 дней</option></select></label>
          </div>
        )}
        <label className="checkbox-label"><input type="checkbox" required /><span>Подтверждаю достоверность объявления</span></label>
        {error && <p className="form-error">{error}</p>}
        <button className="main-action" type="submit" disabled={saving || storeLoading || !categories.length}>{saving ? "Публикуем…" : "Опубликовать объявление"}<ChevronRight size={17} /></button>
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
  const [savingCommission, setSavingCommission] = useState(false);
  const [stats, setStats] = useState({
    products: products.length,
    sellers: 0,
    completedOrders: 0,
    groupCommissionKopecks: 0,
  });

  useEffect(() => {
    let cancelled = false;
    void request<Record<string, unknown>>(
      `/groups/${club.telegramGroupId}/admin/stats`,
    )
      .then((row) => {
        if (!cancelled) {
          setStats({
            products: asNumber(row.products),
            sellers: asNumber(row.sellers),
            completedOrders: asNumber(row.completed_orders),
            groupCommissionKopecks: asNumber(row.group_commission_kopecks),
          });
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
              body: JSON.stringify({ commissionPercent: Number(commission) }),
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
        <button className="main-action" disabled={savingCommission}>
          {savingCommission ? "Сохраняем…" : "Сохранить комиссию"}
        </button>
      </form>
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
                <p><b>{buyer.name}</b><small>{buyer.phone || "Телефон не указан"}{buyer.username ? ` · @${buyer.username}` : ""}</small></p>
                <em className={buyer.status === "PAID" ? "paid" : ""}>{buyer.status}</em>
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
  categories,
  request,
  onCategoriesChanged,
  onToast,
}: {
  categories: Category[];
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onCategoriesChanged: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [tab, setTab] = useState<"categories" | "groups" | "debts" | "users" | "moderation">("categories");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [adminGroups, setAdminGroups] = useState<AdminGroup[]>([]);
  const [debts, setDebts] = useState<Record<string, unknown>[]>([]);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [reports, setReports] = useState<Record<string, unknown>[]>([]);
  const [userQuery, setUserQuery] = useState("");

  useEffect(() => {
    void loadAdminData();
    // Admin data is loaded once when this protected screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAdminData() {
    try {
      const [groupRows, debtRows, userRows, reportRows] = await Promise.all([
        request<Record<string, unknown>[]>("/admin/groups"),
        request<Record<string, unknown>[]>("/admin/debts"),
        request<Record<string, unknown>[]>("/admin/users"),
        request<Record<string, unknown>[]>("/admin/reports"),
      ]);
      setAdminGroups(groupRows.map(camelAdminGroup));
      setDebts(debtRows);
      setUsers(userRows);
      setReports(reportRows);
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
        <button className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}>Категории</button>
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
      {tab === "categories" && (
        <div className="settings-card">
          <h2>Категории товаров</h2>
          <p className="settings-hint">Категории не создаются автоматически. Продавец сможет выбрать только значения из этого списка.</p>
          <form
            className="category-create"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!name.trim()) return;
              setSaving(true);
              try {
                await request("/admin/categories", { method: "POST", body: JSON.stringify({ name }) });
                setName("");
                await onCategoriesChanged();
                onToast("Категория добавлена");
              } finally {
                setSaving(false);
              }
            }}
          >
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Название категории" />
            <button className="main-action" disabled={saving}>{saving ? "Добавляем…" : "Добавить"}</button>
          </form>
          <div className="category-admin-list">
            {categories.map((category) => (
              <div key={category.id}><span>{category.name}</span><button aria-label={`Удалить ${category.name}`} onClick={async () => { await request(`/admin/categories/${category.id}`, { method: "DELETE" }); await onCategoriesChanged(); onToast("Категория удалена"); }}><Trash2 size={16} /></button></div>
            ))}
            {!categories.length && <div className="empty-inline">Категорий пока нет.</div>}
          </div>
        </div>
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
        <div className="admin-table-card">
          <div className="table-heading"><div><h2>Комиссионные долги</h2><p>Фактические данные продавцов</p></div></div>
          {debts.map((debt) => {
            const sellerId = asNumber(debt.telegram_id);
            const amount = asNumber(debt.commission_debt_kopecks);
            const sellerName = [debt.first_name, debt.last_name].filter(Boolean).join(" ") || `ID ${sellerId}`;
            return (
              <div className={`debt-row ${asBoolean(debt.seller_blocked) ? "blocked" : ""}`} key={sellerId}>
                <span className="shop-avatar">{sellerName.slice(0, 2).toUpperCase()}</span>
                <p><b>{sellerName}</b><small>{debt.username ? `@${String(debt.username)}` : `Telegram ID: ${sellerId}`}</small></p>
                <strong>{formatPrice(amount)}</strong>
                <em>{asBoolean(debt.seller_blocked) ? "ЗАБЛОКИРОВАН" : "АКТИВЕН"}</em>
                <button
                  onClick={async () => {
                    try {
                      await request(`/admin/debts/${sellerId}/repay`, {
                        method: "POST",
                        body: JSON.stringify({ amountKopecks: amount }),
                      });
                      await loadAdminData();
                      onToast("Долг погашен");
                    } catch (repayError) {
                      onToast(repayError instanceof Error ? repayError.message : "Не удалось погасить долг");
                    }
                  }}
                >
                  Погасить
                </button>
              </div>
            );
          })}
          {!debts.length && <div className="empty-inline">Задолженностей нет.</div>}
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
                return (
                  <article className={`admin-user-card ${banned ? "banned" : ""}`} key={telegramId}>
                    <span className="profile-avatar">{userName.slice(0, 2).toUpperCase()}</span>
                    <div><b>{userName}</b><small>{user.username ? `@${String(user.username)}` : `Telegram ID: ${telegramId}`}</small><p>{asNumber(user.order_count)} заказов · {asNumber(user.store_count)} магазинов</p></div>
                    <button
                      className={banned ? "unban-action" : "ban-action"}
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
                <small>От: {String(report.reporter_name || report.reporter_telegram_id)}{report.reporter_username ? ` · @${String(report.reporter_username)}` : ""} · Telegram ID: {String(report.reporter_telegram_id)} · {new Date(String(report.created_at)).toLocaleString("ru-RU")}</small>
                {pending && (
                  <div className="report-review-actions">
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
                  </div>
                )}
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

function Balance({ profile }: { profile: Profile }) {
  const percent = profile.debtLimitKopecks
    ? Math.min(100, Math.round((profile.commissionDebtKopecks / profile.debtLimitKopecks) * 100))
    : 0;
  return (
    <section className="inner-page narrow-page">
      <div className="page-title"><span className="section-kicker">SELLER FINANCE</span><h1>Баланс и комиссии</h1><p>Фактические данные вашего профиля</p></div>
      <div className={`debt-card ${profile.sellerBlocked ? "danger" : ""}`}>
        <span>Комиссионный долг</span>
        <strong>{formatPrice(profile.commissionDebtKopecks)}</strong>
        <div><i style={{ width: `${percent}%` }} /></div>
        <p>Лимит блокировки: {formatPrice(profile.debtLimitKopecks)}</p>
      </div>
    </section>
  );
}

function NotificationsModal({
  notifications,
  request,
  onChanged,
  onClose,
  onToast,
}: {
  notifications: AppNotification[];
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onChanged: () => Promise<void>;
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
                if (item.isRead) return;
                try {
                  await request(`/me/notifications/${item.id}/read`, { method: "PUT" });
                  await onChanged();
                } catch (readError) {
                  onToast(readError instanceof Error ? readError.message : "Не удалось прочитать уведомление");
                }
              }}
            >
              <i><Bell size={16} /></i>
              <span><b>{item.title}</b><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString("ru-RU")}</small></span>
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
