"use client";

import {
  ArrowLeft,
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
  Search,
  ShieldCheck,
  ShoppingBag,
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
  registered: boolean;
  sellerBlocked: boolean;
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
  productCount: number;
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
  storeName: string;
  rating: number;
  reviewCount: number;
  groupBuyId?: number;
  targetCount?: number;
  reservedCount: number;
  groupBuyStatus?: string;
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
  registered: asBoolean(row.registered),
  sellerBlocked: asBoolean(row.seller_blocked),
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
  productCount: asNumber(row.product_count),
});

const camelCategory = (row: Record<string, unknown>): Category => ({
  id: asNumber(row.id),
  name: String(row.name || ""),
  sortOrder: asNumber(row.sort_order),
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
    storeName: String(row.store_name || ""),
    rating: asNumber(row.rating),
    reviewCount: asNumber(row.review_count),
    groupBuyId: row.group_buy_id ? asNumber(row.group_buy_id) : undefined,
    targetCount: row.target_count ? asNumber(row.target_count) : undefined,
    reservedCount: asNumber(row.reserved_count),
    groupBuyStatus: row.group_buy_status
      ? String(row.group_buy_status)
      : undefined,
  };
};

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
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;
    telegram?.ready();
    telegram?.expand();
    const data = telegram?.initData || "";
    void Promise.resolve().then(async () => {
      setInitData(data);
      if (!data) {
        setLoading(false);
        return;
      }
      await loadBootstrap(data);
    });
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
      const profileRow = await request<Record<string, unknown>>("/me", {}, data);
      const nextProfile = camelProfile(profileRow);
      setProfile(nextProfile);
      if (!nextProfile.registered) return;

      const [groupRows, categoryRows] = await Promise.all([
        request<Record<string, unknown>[]>("/groups", {}, data),
        request<Record<string, unknown>[]>("/categories", {}, data),
      ]);
      const nextClubs = groupRows.map(camelClub);
      setClubs(nextClubs);
      setCategories(categoryRows.map(camelCategory));

      const requestedGroup = Number(
        new URLSearchParams(window.location.search).get("group"),
      );
      const requested = nextClubs.find(
        (club) => club.telegramGroupId === requestedGroup,
      );
      setSelectedClub((current) => {
        if (current) {
          return nextClubs.find((club) => club.id === current.id) || null;
        }
        return requested || (nextClubs.length === 1 ? nextClubs[0] : null);
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

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          (activeCategory === "Все" ||
            product.category === activeCategory) &&
          `${product.title} ${product.storeName}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [activeCategory, products, query],
  );

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
    return <StatePage icon={<Gauge />} title="Загрузка REDLINE" text="Получаем данные из Telegram и SQLite…" />;
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
        onRegister={async (name, phone) => {
          await request("/register", {
            method: "POST",
            body: JSON.stringify({ displayName: name, phone }),
          });
          await loadBootstrap();
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
    <main className="app-shell">
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
              onChange={(event) => {
                const nextClub =
                  clubs.find((club) => club.id === Number(event.target.value)) ||
                  null;
                if (!nextClub) setProducts([]);
                setSelectedClub(nextClub);
              }}
            >
              <option value="">Клуб не выбран</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>{club.title}</option>
              ))}
            </select>
          </span>
          <ChevronDown size={15} />
        </label>

        <div className="top-actions">
          <button className="icon-button" aria-label="Покупки" onClick={() => navigate("orders")}>
            <Bell size={19} />
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
            const needsClub = ["group", "listings", "create", "admin"].includes(item.id);
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
            totalProducts={products.length}
            groupCount={groupProducts.length}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            query={query}
            setQuery={setQuery}
            favorites={favorites}
            onFavorite={(id) =>
              setFavorites((items) =>
                items.includes(id)
                  ? items.filter((item) => item !== id)
                  : [...items, id],
              )
            }
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
            onOpen={setSelectedProduct}
            onReserve={reserve}
          />
        )}

        {screen === "orders" && (
          <EmptySection title="Мои покупки" text="Заказов пока нет. После покупки они появятся здесь." />
        )}

        {screen === "listings" && (
          <EmptySection
            title="Мои объявления"
            text="Созданные вами объявления будут отображаться здесь."
            action={<button className="main-action" onClick={() => navigate("create")}>Создать объявление</button>}
          />
        )}

        {screen === "balance" && profile && (
          <Balance profile={profile} />
        )}

        {screen === "create" && profile && (
          <CreateListing
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
          <ClubAdmin club={selectedClub} products={products} />
        )}

        {screen === "superadmin" && profile?.superAdmin && (
          <SuperAdmin
            categories={categories}
            clubs={clubs}
            request={request}
            onCategoriesChanged={reloadCategories}
            onToast={setToast}
          />
        )}

        {screen === "help" && <Help />}
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          favorite={favorites.includes(selectedProduct.id)}
          onFavorite={() =>
            setFavorites((items) =>
              items.includes(selectedProduct.id)
                ? items.filter((id) => id !== selectedProduct.id)
                : [...items, selectedProduct.id],
            )
          }
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
  onRegister,
}: {
  profile: Profile;
  onRegister: (name: string, phone: string) => Promise<void>;
}) {
  const suggestedName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const [name, setName] = useState(suggestedName);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  return (
    <main className="registration-shell">
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
              await onRegister(name, phone);
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
          <label><span>Как к вам обращаться</span><input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} /></label>
          <label><span>Телефон</span><input value={phone} onChange={(event) => setPhone(event.target.value)} required placeholder="+7 900 000-00-00" /></label>
          <label className="checkbox-label"><input type="checkbox" required /><span>Согласен с правилами прямых расчётов между участниками</span></label>
          {error && <p className="form-error">{error}</p>}
          <button className="main-action" type="submit" disabled={saving}>{saving ? "Сохраняем…" : "Зарегистрироваться"}</button>
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
              <div className="empty-state"><Gauge size={30} /><h3>Магазин пока пуст</h3><p>Здесь появятся только реальные объявления участников.</p></div>
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
        style={product.images[0] ? { backgroundImage: `linear-gradient(transparent 45%, rgba(0,0,0,.75)), url("${product.images[0]}")` } : undefined}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onOpen();
        }}
        role="button"
        tabIndex={0}
      >
        <span className={`product-badge ${product.kind === "group" ? "group-badge" : ""}`}>{product.kind === "group" ? "GROUP" : "SALE"}</span>
        <button type="button" className={`heart-button ${favorite ? "active" : ""}`} onClick={(event) => { event.stopPropagation(); onFavorite(); }} aria-label="Избранное"><Heart size={15} fill={favorite ? "currentColor" : "none"} /></button>
      </div>
      <div className="product-body">
        <span className="seller-line"><BadgeCheck size={12} />{product.storeName}</span>
        <button className="product-title" onClick={onOpen}>{product.title}</button>
        <p>{product.description}</p>
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
  onOpen,
  onReserve,
}: {
  title: string;
  text: string;
  products: Product[];
  favorites: number[];
  onOpen: (product: Product) => void;
  onReserve: (product: Product) => Promise<void>;
}) {
  return (
    <section className="inner-page">
      <div className="page-title"><span className="section-kicker">GROUP BUY</span><h1>{title}</h1><p>{text}</p></div>
      {products.length ? (
        <div className="catalog-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} onFavorite={() => undefined} onOpen={() => onOpen(product)} onReserve={() => void onReserve(product)} />
          ))}
        </div>
      ) : (
        <div className="empty-state"><UsersRound size={32} /><h3>Активных закупок нет</h3><p>Никакие демонстрационные товары не загружены.</p></div>
      )}
    </section>
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

  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview)),
    [previews],
  );

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

      await request("/stores", {
        method: "POST",
        body: JSON.stringify({
          groupId: activeClub.id,
          name: String(form.get("storeName")),
          description: "",
          paymentPhone: profile.phone || "",
          paymentCard: String(form.get("paymentCard")),
        }),
      });

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

  return (
    <section className="inner-page narrow-page">
      <div className="page-title"><span className="section-kicker">SELLER SPACE</span><h1>Новое объявление</h1><p>После публикации карточка появится в теме «Магазин».</p></div>
      <div className="type-picker">
        <button className={kind === "regular" ? "active" : ""} onClick={() => setKind("regular")}><ShoppingBag size={20} /><b>Обычная продажа</b><small>Фиксированная цена</small></button>
        <button className={kind === "group" ? "active" : ""} onClick={() => setKind("group")}><UsersRound size={20} /><b>Групповая закупка</b><small>Старт после сбора участников</small></button>
      </div>
      <form className="listing-form" onSubmit={submit}>
        <label className={`upload-area ${previews.length ? "has-preview" : ""}`}>
          {previews.length ? (
            <div className="upload-preview-grid">
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
        <label><span>Название магазина</span><input name="storeName" required placeholder="Например, Garage 54" /></label>
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
        {kind === "group" && (
          <div className="group-fields">
            <label><span>Участников для старта</span><input name="targetCount" type="number" min="2" defaultValue="10" required /></label>
            <label><span>Срок набора</span><select name="collectionDays" defaultValue="7"><option value="3">3 дня</option><option value="7">7 дней</option><option value="14">14 дней</option></select></label>
          </div>
        )}
        <label><span>Карта или реквизиты для оплаты</span><input name="paymentCard" required placeholder="Номер карты или пояснение" /></label>
        <label className="checkbox-label"><input type="checkbox" required /><span>Подтверждаю достоверность объявления</span></label>
        {error && <p className="form-error">{error}</p>}
        <button className="main-action" type="submit" disabled={saving || !categories.length}>{saving ? "Публикуем…" : "Опубликовать объявление"}<ChevronRight size={17} /></button>
      </form>
    </section>
  );
}

function ClubAdmin({ club, products }: { club: Club; products: Product[] }) {
  const groupBuys = products.filter((product) => product.kind === "group");
  return (
    <section className="inner-page admin-page">
      <div className="page-title"><span className="section-kicker">GROUP OWNER</span><h1>Админка клуба</h1><p>{club.title}</p></div>
      <div className="admin-metrics">
        <div><span>Товаров</span><b>{products.length}</b><small>Реальные объявления</small></div>
        <div><span>Групповых закупок</span><b>{groupBuys.length}</b><small>По текущему каталогу</small></div>
        <div><span>Комиссия группы</span><b>{club.commissionPercent}%</b><small>ID темы: {club.shopThreadId}</small></div>
      </div>
      {groupBuys.length ? (
        <div className="admin-table-card">
          {groupBuys.map((product) => (
            <div className="group-admin-row" key={product.id}>
              <span className="shop-avatar">{product.title.slice(0, 2).toUpperCase()}</span>
              <p><b>{product.title}</b><small>{product.reservedCount} из {product.targetCount || 0} участников</small></p>
              <strong>{formatPrice(product.buyerPriceKopecks)}</strong>
              <em>{product.groupBuyStatus || "COLLECTING"}</em>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state"><UsersRound size={30} /><h3>Закупок пока нет</h3><p>Данные появятся после публикации группового товара.</p></div>
      )}
    </section>
  );
}

function SuperAdmin({
  categories,
  clubs,
  request,
  onCategoriesChanged,
  onToast,
}: {
  categories: Category[];
  clubs: Club[];
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onCategoriesChanged: () => Promise<void>;
  onToast: (message: string) => void;
}) {
  const [tab, setTab] = useState<"categories" | "groups">("categories");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <section className="inner-page admin-page">
      <div className="page-title"><span className="section-kicker"><Crown size={13} /> PLATFORM OWNER</span><h1>Супер-админ</h1><p>Только реальные данные SQLite</p></div>
      <div className="admin-tabs">
        <button className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}>Категории</button>
        <button className={tab === "groups" ? "active" : ""} onClick={() => setTab("groups")}>Группы</button>
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
          <div className="table-heading"><div><h2>Подключённые группы</h2><p>{clubs.length} в SQLite</p></div></div>
          {clubs.map((club) => (
            <div className="group-admin-row" key={club.id}><span className="shop-avatar">{club.title.slice(0, 2).toUpperCase()}</span><p><b>{club.title}</b><small>Telegram ID: {club.telegramGroupId}</small></p><strong>{club.productCount} товаров</strong><em>АКТИВНА</em></div>
          ))}
          {!clubs.length && <div className="empty-inline">Группы ещё не подключены.</div>}
        </div>
      )}
    </section>
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
