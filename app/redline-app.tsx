"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  Crown,
  Gauge,
  Heart,
  House,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageCircleMore,
  PackageCheck,
  PackagePlus,
  Pencil,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Trash2,
  Truck,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
type ProductKind = "group" | "regular";
type Product = {
  id: number;
  title: string;
  subtitle: string;
  seller: string;
  sellerPrice: number;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  stock: number;
  kind: ProductKind;
  imageClass: string;
  category: string;
  reserved?: number;
  target?: number;
  ends?: string;
  badge?: string;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        HapticFeedback?: {
          impactOccurred: (style: "light" | "medium" | "heavy") => void;
          notificationOccurred: (type: "success" | "warning" | "error") => void;
        };
      };
    };
  }
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat("ru-RU").format(value) + " ₽";

const initialProducts: Product[] = [
  {
    id: 1,
    title: "Кованые диски R20",
    subtitle: "Комплект 4 шт. · 5×112 · Graphite",
    seller: "Forge District",
    sellerPrice: 78_200,
    price: 84_900,
    oldPrice: 96_000,
    rating: 4.9,
    reviews: 48,
    stock: 10,
    kind: "group",
    imageClass: "product-wheel",
    category: "Диски",
    reserved: 9,
    target: 10,
    ends: "2 дня",
    badge: "–12%",
  },
  {
    id: 2,
    title: "Карбоновый спойлер",
    subtitle: "Dry Carbon · Gloss · G-series",
    seller: "Carbon Works",
    sellerPrice: 44_500,
    price: 48_310,
    rating: 4.8,
    reviews: 31,
    stock: 3,
    kind: "regular",
    imageClass: "product-carbon",
    category: "Карбон",
    badge: "TOP",
  },
  {
    id: 3,
    title: "Тормозной комплект",
    subtitle: "6-pot · 380 mm · Racing Red",
    seller: "RaceLab Siberia",
    sellerPrice: 119_900,
    price: 130_170,
    oldPrice: 138_000,
    rating: 5,
    reviews: 17,
    stock: 12,
    kind: "group",
    imageClass: "product-brake",
    category: "Тормоза",
    reserved: 7,
    target: 12,
    ends: "5 дней",
    badge: "GROUP",
  },
  {
    id: 4,
    title: "Выхлопная система",
    subtitle: "Titanium · Valvetronic · 76 mm",
    seller: "Octane Custom",
    sellerPrice: 71_200,
    price: 77_295,
    rating: 4.7,
    reviews: 22,
    stock: 2,
    kind: "regular",
    imageClass: "product-exhaust",
    category: "Выхлоп",
    badge: "NEW",
  },
];

const navItems: { id: Screen; label: string; icon: React.ElementType }[] = [
  { id: "market", label: "Маркет", icon: House },
  { id: "group", label: "Групповые закупки", icon: UsersRound },
  { id: "orders", label: "Мои покупки", icon: ShoppingBag },
  { id: "listings", label: "Мои объявления", icon: Store },
  { id: "create", label: "Создать объявление", icon: PackagePlus },
  { id: "balance", label: "Баланс и комиссии", icon: WalletCards },
  { id: "admin", label: "Админка группы", icon: LayoutDashboard },
  { id: "superadmin", label: "Супер-админ", icon: Crown },
  { id: "help", label: "Помощь", icon: CircleHelp },
];

export function RedlineApp() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("market");
  const [products, setProducts] = useState(initialProducts);
  const [selected, setSelected] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState("Все");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<number[]>([2]);
  const [role, setRole] = useState<"buyer" | "seller" | "admin">("buyer");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPrice, setCurrentPrice] = useState("84 900");
  const [paymentSent, setPaymentSent] = useState(false);
  const [purchaseConfirmed, setPurchaseConfirmed] = useState(false);

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const categories = ["Все", "Диски", "Карбон", "Тормоза", "Выхлоп"];
  const visibleProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          (activeCategory === "Все" || product.category === activeCategory) &&
          `${product.title} ${product.seller}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [activeCategory, products, query],
  );

  const haptic = (kind: "light" | "medium" | "heavy" = "light") =>
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(kind);

  const navigate = (next: Screen) => {
    haptic();
    setScreen(next);
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reserve = (product: Product) => {
    if (product.kind !== "group" || !product.target || !product.reserved) return;
    const nextCount = Math.min(product.target, product.reserved + 1);
    const reached = nextCount === product.target;
    setProducts((items) =>
      items.map((item) =>
        item.id === product.id ? { ...item, reserved: nextCount } : item,
      ),
    );
    setSelected((item) =>
      item?.id === product.id ? { ...item, reserved: nextCount } : item,
    );
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
    setToast(
      reached
        ? "Порог собран! Организатор уточняет цену и запустит оплату."
        : "Место забронировано. Мы уведомим, когда группа соберётся.",
    );
  };

  const toggleFavorite = (id: number) => {
    haptic();
    setFavorites((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );
  };

  return (
    <main className="app-shell">
      <div className="noise" />
      <header className="topbar">
        <button
          className="icon-button menu-button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Открыть меню"
        >
          <Menu size={22} />
        </button>
        <button className="group-switcher" onClick={() => setToast("Сейчас открыт клуб BMW Siberia")}>
          <span className="group-mark">RS</span>
          <span>
            <small>КЛУБ</small>
            <strong>BMW Siberia</strong>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="top-actions">
          <button className="icon-button alert-button" aria-label="Уведомления" onClick={() => navigate("orders")}>
            <Bell size={19} />
            <i />
          </button>
          <button className="avatar-button" onClick={() => setToast("Профиль Романа открыт")}>
            Р
          </button>
        </div>
      </header>

      <aside className={`drawer ${drawerOpen ? "is-open" : ""}`} aria-hidden={!drawerOpen}>
        <div className="drawer-head">
          <div className="brand-lockup">
            <span className="brand-slash" />
            <div>
              <b>REDLINE</b>
              <small>CLUB MARKET</small>
            </div>
          </div>
          <button className="icon-button" onClick={() => setDrawerOpen(false)} aria-label="Закрыть меню">
            <X size={21} />
          </button>
        </div>
        <div className="profile-card">
          <div className="profile-avatar">Р</div>
          <div>
            <strong>Роман</strong>
            <span><BadgeCheck size={13} /> Проверенный участник</span>
          </div>
          <ChevronRight size={18} />
        </div>
        <nav className="drawer-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const disabled = item.id === "create" && role === "seller";
            return (
              <button
                key={item.id}
                className={`${screen === item.id ? "active" : ""} ${disabled ? "disabled" : ""}`}
                onClick={() => !disabled && navigate(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.id === "group" && <em>2</em>}
                {item.id === "admin" && <small>OWNER</small>}
                {item.id === "superadmin" && <small>SUPER</small>}
                {disabled && <LockKeyhole size={14} />}
              </button>
            );
          })}
        </nav>
        <div className="role-switch">
          <span>Демо-режим</span>
          <div>
            {(["buyer", "seller", "admin"] as const).map((item) => (
              <button
                key={item}
                className={role === item ? "active" : ""}
                onClick={() => {
                  setRole(item);
                  setToast(
                    item === "buyer"
                      ? "Режим покупателя"
                      : item === "seller"
                        ? "Продавец с лимитом долга"
                        : "Режим владельца группы",
                  );
                }}
              >
                {item === "buyer" ? "Покупатель" : item === "seller" ? "Продавец" : "Админ"}
              </button>
            ))}
          </div>
        </div>
        <p className="drawer-legal">REDLINE CLUB · Информационная площадка<br />Прямые расчёты между участниками</p>
      </aside>
      {drawerOpen && <button className="drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-label="Закрыть меню" />}

      <div className="page-content">
        {screen === "market" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <span className="eyebrow"><Sparkles size={13} /> PRIVATE DROP · 07</span>
                <h1>ДЕТАЛИ,<br /><em>КОТОРЫЕ РЕШАЮТ</em></h1>
                <p>Проверенные продавцы. Закрытые цены.<br />Сделки внутри вашего клуба.</p>
                <button onClick={() => navigate("group")}>
                  Смотреть дроп <ArrowLeft className="arrow-right" size={17} />
                </button>
              </div>
              <div className="hero-stat">
                <span>до</span>
                <strong>–18%</strong>
                <small>на групповых закупках</small>
              </div>
            </section>

            <section className="trust-strip">
              <div><ShieldCheck size={20} /><span><strong>146</strong>проверенных продавцов</span></div>
              <i />
              <div><PackageCheck size={20} /><span><strong>2 481</strong>успешная сделка</span></div>
              <i />
              <div><Star size={20} /><span><strong>4.9</strong>рейтинг клуба</span></div>
            </section>

            <section className="catalog-section">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">MARKETPLACE</span>
                  <h2>Каталог клуба</h2>
                </div>
                <button className="filter-button" onClick={() => setShowFilters(!showFilters)}>
                  <SlidersHorizontal size={18} /><span>Фильтр</span>
                </button>
              </div>
              <div className="search-box">
                <Search size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по товарам и магазинам" />
                {query && <button onClick={() => setQuery("")}><X size={16} /></button>}
              </div>
              {showFilters && (
                <div className="filter-panel">
                  <button className="active">Сначала новые</button>
                  <button>По рейтингу</button>
                  <button>Цена ↑</button>
                  <button>В наличии</button>
                </div>
              )}
              <div className="category-row">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={activeCategory === category ? "active" : ""}
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="catalog-grid">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    favorite={favorites.includes(product.id)}
                    onFavorite={() => toggleFavorite(product.id)}
                    onOpen={() => {
                      haptic();
                      setSelected(product);
                    }}
                    onReserve={() => reserve(product)}
                  />
                ))}
              </div>
              {visibleProducts.length === 0 && (
                <div className="empty-state"><Gauge size={30} /><h3>Ничего не найдено</h3><p>Попробуйте другой запрос или категорию.</p></div>
              )}
            </section>
          </>
        )}

        {screen === "group" && (
          <GroupPurchases
            products={products.filter((item) => item.kind === "group")}
            onOpen={setSelected}
            onReserve={reserve}
          />
        )}
        {screen === "orders" && (
          <Orders paymentSent={paymentSent} onPay={() => { setPaymentSent(true); setToast("Продавец получил уведомление о вашей оплате"); }} />
        )}
        {screen === "listings" && <Listings role={role} onNavigate={navigate} />}
        {screen === "balance" && <Balance role={role} />}
        {screen === "create" && <CreateListing role={role} onCreated={() => { setToast("Объявление отправлено в тему «Магазин»"); navigate("listings"); }} />}
        {screen === "admin" && (
          <AdminPanel
            currentPrice={currentPrice}
            setCurrentPrice={setCurrentPrice}
            paymentSent={paymentSent}
            purchaseConfirmed={purchaseConfirmed}
            onRequestPayment={() => {
              setPaymentSent(true);
              setToast("10 участникам отправлен запрос на оплату");
            }}
            onConfirm={() => {
              setPurchaseConfirmed(true);
              setToast("Закупка сформирована. Покупатели уведомлены.");
            }}
            onToast={setToast}
          />
        )}
        {screen === "superadmin" && <SuperAdmin onToast={setToast} />}
        {screen === "help" && <Help />}
      </div>

      {selected && (
        <ProductModal
          product={products.find((item) => item.id === selected.id) || selected}
          favorite={favorites.includes(selected.id)}
          onFavorite={() => toggleFavorite(selected.id)}
          onClose={() => setSelected(null)}
          onReserve={reserve}
          onBuy={() => {
            setSelected(null);
            navigate("orders");
            setToast("Заказ создан. Проверьте сумму и реквизиты продавца.");
          }}
        />
      )}
      {toast && <div className="toast"><Check size={17} />{toast}</div>}
    </main>
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
  const progress =
    product.kind === "group" && product.reserved && product.target
      ? Math.round((product.reserved / product.target) * 100)
      : 0;
  return (
    <article className="product-card">
      <div
        className={`product-image ${product.imageClass}`}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onOpen();
        }}
        role="button"
        tabIndex={0}
        aria-label={`Открыть ${product.title}`}
      >
        <span className={`product-badge ${product.kind === "group" ? "group-badge" : ""}`}>{product.badge}</span>
        <button
          className={`heart-button ${favorite ? "active" : ""}`}
          onClick={(event) => { event.stopPropagation(); onFavorite(); }}
          aria-label="Добавить в избранное"
        >
          <Heart size={17} fill={favorite ? "currentColor" : "none"} />
        </button>
        {product.kind === "group" && <span className="group-chip"><UsersRound size={13} /> совместная цена</span>}
      </div>
      <div className="product-body">
        <button className="seller-line" onClick={onOpen}>
          <span>{product.seller}</span><BadgeCheck size={13} />
        </button>
        <button className="product-title" onClick={onOpen}>{product.title}</button>
        <p>{product.subtitle}</p>
        <div className="rating-line">
          <Star size={13} fill="currentColor" /><b>{product.rating}</b><span>{product.reviews} отзывов</span>
        </div>
        {product.kind === "group" && product.reserved !== undefined && product.target && (
          <div className="group-progress">
            <div className="progress-label">
              <span>Уже в закупке <b>{product.reserved}</b></span>
              <span>Нужно <b>{product.target}</b></span>
            </div>
            <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
            <div className="progress-foot">
              <span><Clock3 size={12} /> Осталось {product.ends}</span>
              <strong>{progress}%</strong>
            </div>
          </div>
        )}
        <div className="price-row">
          <div><strong>{formatPrice(product.price)}</strong>{product.oldPrice && <s>{formatPrice(product.oldPrice)}</s>}</div>
          <span>{product.stock} шт.</span>
        </div>
        <button className={`primary-card-action ${progress === 100 ? "success" : ""}`} onClick={product.kind === "group" ? onReserve : onOpen}>
          {product.kind === "group" ? (progress === 100 ? "Группа собрана" : "Забронировать") : "Подробнее"}
          <ChevronRight size={16} />
        </button>
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
  onReserve: (product: Product) => void;
  onBuy: () => void;
}) {
  const progress =
    product.kind === "group" && product.reserved && product.target
      ? Math.round((product.reserved / product.target) * 100)
      : 0;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <article className="product-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className={`modal-visual ${product.imageClass}`}>
          <button className="modal-close" onClick={onClose}><X size={21} /></button>
          <button className={`modal-heart ${favorite ? "active" : ""}`} onClick={onFavorite}><Heart size={20} fill={favorite ? "currentColor" : "none"} /></button>
          <span className="modal-index">01 <i /> 04</span>
        </div>
        <div className="modal-body">
          <div className="modal-seller"><span className="shop-avatar">FD</span><div><strong>{product.seller} <BadgeCheck size={14} /></strong><small>На площадке с 2024 · отвечает за 12 мин.</small></div></div>
          <h2>{product.title}</h2>
          <p className="modal-subtitle">{product.subtitle}</p>
          <div className="modal-tags"><span>Гарантия 12 мес.</span><span>Доставка по РФ</span><span>Новый</span></div>
          {product.kind === "group" && product.target && product.reserved !== undefined && (
            <div className="modal-group-box">
              <div className="modal-group-title"><UsersRound size={19} /><div><b>Групповая закупка</b><span>Цена действует, когда соберётся {product.target} участников</span></div></div>
              <div className="member-stack"><span>AK</span><span>МС</span><span>ДК</span><span>ЕТ</span><span className="more">+{Math.max(0, product.reserved - 4)}</span><b>{product.reserved} из {product.target}</b></div>
              <div className="progress-track large"><i style={{ width: `${progress}%` }} /></div>
              <p><Clock3 size={13} /> Организатор зафиксирует актуальную цену после сбора группы. На оплату будет 48 часов.</p>
            </div>
          )}
          <div className="price-breakdown">
            <span>Цена продавца <b>{formatPrice(product.sellerPrice)}</b></span>
            <span>Сервис + комиссия группы <b>{formatPrice(product.price - product.sellerPrice)}</b></span>
            <strong>Итого <em>{formatPrice(product.price)}</em></strong>
          </div>
          <div className="modal-actions">
            <button className="chat-action"><MessageCircleMore size={18} /></button>
            <button className="buy-action" onClick={() => product.kind === "group" ? onReserve(product) : onBuy()}>
              {product.kind === "group" ? (progress === 100 ? "Вы в закупке" : "Забронировать место") : "Купить"}
            </button>
          </div>
          <p className="safe-note"><ShieldCheck size={14} /> Оплата напрямую продавцу после подтверждения условий</p>
        </div>
      </article>
    </div>
  );
}

function GroupPurchases({
  products,
  onOpen,
  onReserve,
}: {
  products: Product[];
  onOpen: (product: Product) => void;
  onReserve: (product: Product) => void;
}) {
  return (
    <section className="inner-page">
      <div className="inner-hero group-hero">
        <span className="section-kicker">COLLECTIVE POWER</span>
        <h1>Групповые<br /><em>закупки</em></h1>
        <p>Больше участников — лучше условия.<br />Бронь без оплаты до сбора группы.</p>
      </div>
      <div className="how-it-works">
        <div><span>01</span><b>Бронируете</b><small>Подтверждаете намерение</small></div>
        <i />
        <div><span>02</span><b>Собираем группу</b><small>От 10 участников</small></div>
        <i />
        <div><span>03</span><b>Фиксируем цену</b><small>Оплата за 48 часов</small></div>
      </div>
      <div className="section-heading compact"><div><span className="section-kicker">LIVE</span><h2>Активные сборы</h2></div><span className="live-count"><i />{products.length} сейчас</span></div>
      <div className="group-list">
        {products.map((product) => {
          const progress = Math.round(((product.reserved || 0) / (product.target || 1)) * 100);
          return (
            <article key={product.id} className="group-wide-card">
              <button className={`group-wide-image ${product.imageClass}`} onClick={() => onOpen(product)}>
                <span>{progress}%</span>
              </button>
              <div className="group-wide-body">
                <div className="wide-top"><span>{product.category}</span><small><Clock3 size={12} /> {product.ends}</small></div>
                <button onClick={() => onOpen(product)}>{product.title}</button>
                <p>{product.subtitle}</p>
                <div className="wide-price"><strong>{formatPrice(product.price)}</strong>{product.oldPrice && <s>{formatPrice(product.oldPrice)}</s>}</div>
                <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
                <div className="wide-members"><span><UsersRound size={14} /><b>{product.reserved}</b> участников</span><span>цель {product.target}</span></div>
                <button className="reserve-wide" onClick={() => onReserve(product)}>{progress === 100 ? "Сбор завершён" : "Вступить в закупку"}<ChevronRight size={16} /></button>
              </div>
            </article>
          );
        })}
      </div>
      <div className="info-callout"><ShieldCheck size={22} /><div><b>Бронь не списывает деньги</b><p>Реквизиты и финальная сумма придут отдельным уведомлением только после сбора группы.</p></div></div>
    </section>
  );
}

function Orders({ paymentSent, onPay }: { paymentSent: boolean; onPay: () => void }) {
  const [requisites, setRequisites] = useState(false);
  const [received, setReceived] = useState(false);
  return (
    <section className="inner-page narrow-page">
      <div className="page-title"><span className="section-kicker">MY GARAGE</span><h1>Мои покупки</h1><p>Заказы и групповые закупки</p></div>
      <div className="segmented"><button className="active">Активные <span>2</span></button><button>Завершённые</button></div>
      <article className="order-card featured-order">
        <div className="order-head"><div><span className="order-number">ЗАКАЗ #R-2407</span><strong>{paymentSent ? "Оплата проверяется" : "Ожидает оплаты"}</strong></div><Clock3 size={19} /></div>
        <div className="order-product"><div className="order-thumb product-wheel" /><div><b>Кованые диски R20</b><span>Forge District · 1 комплект</span><strong>84 900 ₽</strong></div></div>
        <div className="status-timeline">
          <div className="done"><i><Check size={12} /></i><span><b>Группа собрана</b><small>Сегодня, 12:40</small></span></div>
          <div className={paymentSent ? "done" : "current"}><i>{paymentSent ? <Check size={12} /> : "2"}</i><span><b>{paymentSent ? "Вы отметили оплату" : "Оплатите продавцу"}</b><small>{paymentSent ? "Продавец проверяет поступление" : "До завтра, 18:00"}</small></span></div>
          <div><i>3</i><span><b>Формирование закупки</b><small>После оплаты всех участников</small></span></div>
          <div><i>4</i><span><b>Поставка</b><small>Ориентир: 18–25 августа</small></span></div>
        </div>
        {!requisites ? (
          <button className="outline-action" onClick={() => setRequisites(true)}><CreditCard size={17} /> Показать реквизиты продавца</button>
        ) : (
          <div className="requisites">
            <div><span>СБП · Альфа-Банк</span><strong>+7 913 •••-42-18</strong><small>Получатель: А. К.</small></div>
            <button onClick={() => navigator.clipboard?.writeText("+79130004218")}>Копировать</button>
          </div>
        )}
        <button className={`main-action ${paymentSent ? "disabled" : ""}`} onClick={!paymentSent ? onPay : undefined}>{paymentSent ? "Уведомление отправлено продавцу" : "Я оплатил 84 900 ₽"}</button>
        <p className="p2p-note">REDLINE не принимает оплату — перевод идёт напрямую продавцу.</p>
      </article>
      <article className="order-card">
        <div className="order-head"><div><span className="order-number">ЗАКАЗ #R-2391</span><strong>{received ? "Завершён" : "Товар отправлен"}</strong></div><Truck size={19} /></div>
        <div className="order-product"><div className="order-thumb product-carbon" /><div><b>Карбоновый спойлер</b><span>СДЭК · 1493028801</span><strong>48 310 ₽</strong></div></div>
        <button className={`main-action ${received ? "disabled" : ""}`} onClick={() => setReceived(true)}>{received ? "Получение подтверждено" : "Подтвердить получение"}</button>
      </article>
    </section>
  );
}

function Listings({ role, onNavigate }: { role: "buyer" | "seller" | "admin"; onNavigate: (screen: Screen) => void }) {
  const blocked = role === "seller";
  return (
    <section className="inner-page narrow-page">
      <div className="page-title"><span className="section-kicker">SELLER SPACE</span><h1>Мои объявления</h1><p>Управление товарами вашего магазина</p></div>
      {blocked && <div className="blocked-banner"><LockKeyhole size={22} /><div><b>Продажи временно приостановлены</b><p>Долг по комиссии 620 ₽ превысил лимит 500 ₽. После погашения доступ восстановится автоматически.</p></div></div>}
      <div className="seller-summary"><div><span>Активные</span><b>{blocked ? 0 : 3}</b></div><div><span>Просмотры</span><b>1 284</b></div><div><span>Заказы</span><b>17</b></div></div>
      <div className="listing-card">
        <div className="listing-thumb product-brake" />
        <div><span className={blocked ? "status-off" : "status-on"}>{blocked ? "ПРИОСТАНОВЛЕНО" : "ОПУБЛИКОВАНО"}</span><b>Тормозной комплект</b><small>130 170 ₽ · 12 шт.</small><p>328 просмотров · 7 броней</p></div>
        <div className="listing-actions"><button><Pencil size={16} /></button><button><Trash2 size={16} /></button></div>
      </div>
      <button className={`main-action ${blocked ? "disabled" : ""}`} onClick={() => !blocked && onNavigate("create")}><PackagePlus size={18} /> Создать объявление</button>
    </section>
  );
}

function Balance({ role }: { role: "buyer" | "seller" | "admin" }) {
  const blocked = role === "seller";
  return (
    <section className="inner-page narrow-page">
      <div className="page-title"><span className="section-kicker">FINANCE</span><h1>Баланс и комиссии</h1><p>Учёт без хранения средств на площадке</p></div>
      <div className={`debt-card ${blocked ? "danger" : ""}`}>
        <span>Задолженность по комиссии</span>
        <strong>{blocked ? "620 ₽" : "180 ₽"}</strong>
        <div><i style={{ width: blocked ? "100%" : "36%" }} /><em>Лимит блокировки 500 ₽</em></div>
        <p>{blocked ? "Приём заказов остановлен до погашения" : "До ограничения продаж ещё 320 ₽"}</p>
      </div>
      <div className="finance-note"><ShieldCheck size={21} /><p><b>Площадка не хранит ваши деньги.</b> Оплата товаров и комиссий выполняется прямым переводом по реквизитам.</p></div>
      <h3 className="subsection-title">История начислений</h3>
      <div className="transaction-list">
        <div><span className="transaction-icon"><BriefcaseBusiness size={17} /></span><p><b>Комиссия · Заказ #R-2388</b><small>24 июля · Завершено</small></p><strong>+ 420 ₽</strong></div>
        <div><span className="transaction-icon"><CreditCard size={17} /></span><p><b>Частичное погашение</b><small>21 июля · Подтверждено админом</small></p><strong className="positive">– 500 ₽</strong></div>
        <div><span className="transaction-icon"><BriefcaseBusiness size={17} /></span><p><b>Комиссия · Заказ #R-2321</b><small>17 июля · Завершено</small></p><strong>+ 260 ₽</strong></div>
      </div>
    </section>
  );
}

function CreateListing({ role, onCreated }: { role: "buyer" | "seller" | "admin"; onCreated: () => void }) {
  const [kind, setKind] = useState<ProductKind>("regular");
  const [price, setPrice] = useState("75 000");
  const blocked = role === "seller";
  if (blocked) return (
    <section className="inner-page narrow-page">
      <div className="page-title"><span className="section-kicker">SELLER SPACE</span><h1>Новое объявление</h1></div>
      <div className="locked-page"><LockKeyhole size={34} /><h2>Публикация недоступна</h2><p>Задолженность по комиссии превысила 500 ₽. Свяжитесь с администратором группы и погасите долг.</p><button>Написать администратору</button></div>
    </section>
  );
  return (
    <section className="inner-page narrow-page">
      <div className="page-title"><span className="section-kicker">SELLER SPACE</span><h1>Новое объявление</h1><p>Карточка появится в теме «Магазин»</p></div>
      <div className="type-picker">
        <button className={kind === "regular" ? "active" : ""} onClick={() => setKind("regular")}><ShoppingBag size={20} /><b>Обычная продажа</b><small>Фиксированная цена и наличие</small></button>
        <button className={kind === "group" ? "active" : ""} onClick={() => setKind("group")}><UsersRound size={20} /><b>Групповая закупка</b><small>Старт после сбора участников</small></button>
      </div>
      <form className="listing-form" onSubmit={(event) => { event.preventDefault(); onCreated(); }}>
        <label className="upload-area"><PackagePlus size={28} /><b>Добавить фотографии</b><span>До 6 изображений · JPG, PNG</span><input type="file" accept="image/*" multiple /></label>
        <label><span>Название товара</span><input required placeholder="Например, кованые диски R20" /></label>
        <label><span>Категория</span><select defaultValue=""><option value="" disabled>Выберите категорию</option><option>Диски</option><option>Карбон</option><option>Тормоза</option><option>Выхлоп</option></select></label>
        <label><span>Описание</span><textarea required rows={4} placeholder="Комплектация, состояние, совместимость…" /></label>
        <div className="form-row">
          <label><span>Цена продавца</span><div className="input-suffix"><input value={price} onChange={(event) => setPrice(event.target.value)} /><b>₽</b></div></label>
          <label><span>Количество</span><input type="number" min="1" defaultValue="10" /></label>
        </div>
        {kind === "group" && (
          <div className="group-fields">
            <label><span>Участников для старта</span><input type="number" min="2" defaultValue="10" /></label>
            <label><span>Срок набора</span><select defaultValue="7"><option value="3">3 дня</option><option value="7">7 дней</option><option value="14">14 дней</option></select></label>
            <p><UsersRound size={17} /><span>После сбора группы вы сможете обновить цену и запустить оплату на 24–48 часов.</span></p>
          </div>
        )}
        <div className="price-preview"><span>Увидит покупатель</span><strong>{formatPrice(Math.round(Number(price.replace(/\s/g, "")) * 1.085) || 0)}</strong><small>Включая комиссию бота 5% и группы 3,5%</small></div>
        <label><span>Реквизиты для P2P-оплаты</span><input required placeholder="+7 9•• •••-••-•• / номер карты" /></label>
        <label className="checkbox-label"><input type="checkbox" required /><span>Подтверждаю достоверность данных и правила прямых расчётов</span></label>
        <button className="main-action" type="submit">Опубликовать объявление <ChevronRight size={17} /></button>
      </form>
    </section>
  );
}

function AdminPanel({
  currentPrice,
  setCurrentPrice,
  paymentSent,
  purchaseConfirmed,
  onRequestPayment,
  onConfirm,
  onToast,
}: {
  currentPrice: string;
  setCurrentPrice: (value: string) => void;
  paymentSent: boolean;
  purchaseConfirmed: boolean;
  onRequestPayment: () => void;
  onConfirm: () => void;
  onToast: (value: string) => void;
}) {
  const [tab, setTab] = useState<"group" | "debts" | "settings">("group");
  const buyers = [
    ["АК", "Алексей К.", "@alex_k", "Оплачено"],
    ["МС", "Михаил С.", "+7 923 •••-17-02", "Оплачено"],
    ["ДК", "Денис К.", "@den_kr", paymentSent ? "Ожидаем" : "Бронь"],
    ["ЕТ", "Егор Т.", "+7 913 •••-42-18", paymentSent ? "Ожидаем" : "Бронь"],
  ];
  return (
    <section className="inner-page admin-page">
      <div className="page-title"><span className="section-kicker">GROUP OWNER</span><h1>Админка клуба</h1><p>BMW Siberia · 8 412 участников</p></div>
      <div className="admin-tabs"><button className={tab === "group" ? "active" : ""} onClick={() => setTab("group")}>Закупки</button><button className={tab === "debts" ? "active" : ""} onClick={() => setTab("debts")}>Комиссии</button><button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>Настройки</button></div>
      {tab === "group" && (
        <>
          <div className="admin-metrics"><div><span>Активные сборы</span><b>2</b><small>+1 за неделю</small></div><div><span>Оборот клуба</span><b>2,48 млн ₽</b><small>Июль 2026</small></div><div><span>Комиссия группы</span><b>86 420 ₽</b><small>Начислено</small></div></div>
          <article className="procurement-card">
            <div className="procurement-head"><div className="admin-product-thumb product-wheel" /><div><span className={`admin-status ${purchaseConfirmed ? "success" : paymentSent ? "payment" : ""}`}>{purchaseConfirmed ? "СФОРМИРОВАНА" : paymentSent ? "СБОР ОПЛАТЫ" : "ПОРОГ ДОСТИГНУТ"}</span><h2>Кованые диски R20</h2><p>10 из 10 участников</p></div><button><ChevronDown size={18} /></button></div>
            <div className="admin-flow">
              <div className="done"><i><Check size={12} /></i><span>Группа собрана</span></div>
              <div className={paymentSent ? "done" : "current"}><i>{paymentSent ? <Check size={12} /> : "2"}</i><span>Зафиксировать цену</span></div>
              <div className={purchaseConfirmed ? "done" : paymentSent ? "current" : ""}><i>{purchaseConfirmed ? <Check size={12} /> : "3"}</i><span>Собрать оплату</span></div>
              <div><i>4</i><span>Ожидать поставку</span></div>
            </div>
            {!paymentSent && (
              <div className="price-fix-panel">
                <h3>Актуальная цена</h3>
                <p>Обновите цену на текущий момент. Участники получат сумму и дедлайн оплаты.</p>
                <div className="price-input-row"><label><span>Цена для покупателя</span><div><input value={currentPrice} onChange={(event) => setCurrentPrice(event.target.value)} /><b>₽</b></div></label><label><span>Срок оплаты</span><select defaultValue="48"><option value="24">24 часа</option><option value="48">48 часов</option></select></label></div>
                <div className="message-preview"><Bell size={17} /><p><b>Закупка собрана!</b> Актуальная цена: {currentPrice} ₽. Оплатите продавцу в течение 48 часов.</p></div>
                <button className="main-action" onClick={onRequestPayment}>Зафиксировать и запросить оплату <ChevronRight size={17} /></button>
              </div>
            )}
            {paymentSent && (
              <div className="buyers-panel">
                <div className="buyers-head"><h3>Покупатели</h3><span>{purchaseConfirmed ? "10 оплачено" : "8 из 10 оплачено"}</span></div>
                <div className="buyers-list">
                  {buyers.map((buyer, index) => (
                    <div key={buyer[1]}><span className="buyer-avatar">{buyer[0]}</span><p><b>{buyer[1]}</b><small>{buyer[2]}</small></p><em className={index < 2 || purchaseConfirmed ? "paid" : ""}>{purchaseConfirmed ? "Оплачено" : buyer[3]}</em><button><MessageCircleMore size={16} /></button></div>
                  ))}
                  <button className="show-all">Показать всех 10 покупателей <ChevronRight size={15} /></button>
                </div>
                <div className="payment-summary"><span>Получено продавцом <b>{purchaseConfirmed ? "849 000 ₽" : "679 200 ₽"}</b></span><div><i style={{ width: purchaseConfirmed ? "100%" : "80%" }} /></div></div>
                {!purchaseConfirmed ? <button className="main-action" onClick={onConfirm}>Подтвердить формирование закупки</button> : (
                  <div className="delivery-form"><h3>Ориентир поставки</h3><div><input type="date" defaultValue="2026-08-18" /><span>—</span><input type="date" defaultValue="2026-08-25" /></div><textarea defaultValue="Поставка ожидается 18–25 августа. Сообщим, когда груз пройдёт терминал." /><button className="main-action" onClick={() => onToast("Срок поставки отправлен всем 10 покупателям")}>Разослать покупателям</button></div>
                )}
              </div>
            )}
          </article>
        </>
      )}
      {tab === "debts" && (
        <div className="admin-table-card">
          <div className="table-heading"><div><h2>Комиссионные долги</h2><p>Блокировка при долге от 500 ₽</p></div><button>Экспорт</button></div>
          {[["Forge District", "18 сделок", "420 ₽", false], ["RaceLab Siberia", "12 сделок", "620 ₽", true], ["Carbon Works", "31 сделка", "1 340 ₽", true]].map((row) => (
            <div className={`debt-row ${row[3] ? "blocked" : ""}`} key={String(row[0])}><span className="shop-avatar">{String(row[0]).slice(0,2).toUpperCase()}</span><p><b>{row[0]}</b><small>{row[1]}</small></p><strong>{row[2]}</strong><em>{row[3] ? "ЗАБЛОКИРОВАН" : "В НОРМЕ"}</em><button onClick={() => onToast(`Погашение для ${row[0]} зафиксировано`)}>Погасить</button></div>
          ))}
        </div>
      )}
      {tab === "settings" && (
        <div className="settings-card">
          <h2>Настройки BMW Siberia</h2>
          <label><span>Комиссия группы</span><div className="input-suffix"><input type="number" defaultValue="3.5" step=".1" /><b>%</b></div></label>
          <label><span>Тема магазина</span><input defaultValue="Магазин" /></label>
          <label><span>ID темы Telegram</span><input defaultValue="10842" disabled /></label>
          <div className="setting-switch"><div><b>Автопубликация карточек</b><small>Новые товары сразу появляются в теме</small></div><button className="switch on"><i /></button></div>
          <div className="setting-switch"><div><b>Модерация до публикации</b><small>Проверять товары вручную</small></div><button className="switch"><i /></button></div>
          <button className="main-action" onClick={() => onToast("Настройки группы сохранены")}>Сохранить настройки</button>
        </div>
      )}
    </section>
  );
}

function Help() {
  const [open, setOpen] = useState(0);
  const questions = [
    ["Как проходит оплата?", "Площадка показывает реквизиты продавца, а вы переводите деньги напрямую. REDLINE не принимает и не хранит средства."],
    ["Что значит групповая закупка?", "Вы бесплатно бронируете место. Когда собирается нужное число участников, продавец уточняет цену и присылает запрос на оплату."],
    ["Когда начисляется комиссия?", "Только после того, как покупатель подтвердил получение товара. До этого комиссионный долг продавца не меняется."],
    ["Что делать при споре?", "Откройте заказ и напишите в поддержку, приложив переписку и подтверждение перевода."],
  ];
  return (
    <section className="inner-page narrow-page">
      <div className="page-title"><span className="section-kicker">SUPPORT</span><h1>Помощь</h1><p>Правила, ответы и связь с командой</p></div>
      <div className="support-card"><MessageCircleMore size={26} /><div><b>Поддержка REDLINE</b><p>Обычно отвечаем за 5–15 минут</p></div><button>Написать</button></div>
      <h3 className="subsection-title">Частые вопросы</h3>
      <div className="faq-list">{questions.map((item, index) => <button key={item[0]} className={open === index ? "open" : ""} onClick={() => setOpen(open === index ? -1 : index)}><span><b>{item[0]}</b><ChevronDown size={18} /></span><p>{item[1]}</p></button>)}</div>
      <div className="legal-card"><ShieldCheck size={22} /><div><b>Важное о расчётах</b><p>REDLINE CLUB — информационная площадка и не является платёжным агентом. Все расчёты происходят напрямую между покупателем и продавцом.</p></div></div>
    </section>
  );
}

function SuperAdmin({ onToast }: { onToast: (value: string) => void }) {
  const [tab, setTab] = useState<"overview" | "groups" | "users">("overview");
  return (
    <section className="inner-page admin-page">
      <div className="page-title">
        <span className="section-kicker"><Crown size={13} /> PLATFORM OWNER</span>
        <h1>Супер-админ</h1>
        <p>Глобальное управление REDLINE CLUB</p>
      </div>
      <div className="admin-tabs">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Финансы</button>
        <button className={tab === "groups" ? "active" : ""} onClick={() => setTab("groups")}>Группы</button>
        <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>Пользователи</button>
      </div>
      {tab === "overview" && (
        <>
          <div className="admin-metrics super-metrics">
            <div><span>Оборот платформы</span><b>18,6 млн ₽</b><small>+14,8% за месяц</small></div>
            <div><span>Начислено комиссий</span><b>1,24 млн ₽</b><small>6,7% от оборота</small></div>
            <div><span>Активные группы</span><b>38</b><small>12 840 пользователей</small></div>
          </div>
          <div className="super-grid">
            <div className="settings-card">
              <h2>Глобальные настройки</h2>
              <label><span>Базовая комиссия бота</span><div className="input-suffix"><input type="number" defaultValue="5" step=".1" /><b>%</b></div></label>
              <label><span>Лимит долга для блокировки</span><div className="input-suffix"><input type="number" defaultValue="500" /><b>₽</b></div></label>
              <button className="main-action" onClick={() => onToast("Глобальные настройки сохранены")}>Сохранить</button>
            </div>
            <div className="admin-table-card">
              <div className="table-heading"><div><h2>Требуют внимания</h2><p>Продавцы выше лимита</p></div><span className="danger-count">12</span></div>
              {[["RL", "RaceLab Siberia", "620 ₽"], ["CW", "Carbon Works", "1 340 ₽"], ["AS", "AutoSound Pro", "890 ₽"]].map((seller) => (
                <div className="attention-row" key={seller[1]}><span className="shop-avatar">{seller[0]}</span><p><b>{seller[1]}</b><small>Продажи заблокированы</small></p><strong>{seller[2]}</strong><button onClick={() => onToast(`Долг ${seller[1]} погашен`)}>Погасить</button></div>
              ))}
            </div>
          </div>
        </>
      )}
      {tab === "groups" && (
        <div className="admin-table-card">
          <div className="table-heading"><div><h2>Подключённые группы</h2><p>38 активных сообществ</p></div><button>Экспорт</button></div>
          {[["BS", "BMW Siberia", "8 412", "3,5%"], ["PC", "Porsche Club RU", "4 185", "4,0%"], ["JC", "JDM Community", "6 920", "3,0%"]].map((group) => (
            <div className="group-admin-row" key={group[1]}><span className="shop-avatar">{group[0]}</span><p><b>{group[1]}</b><small>{group[2]} участников</small></p><strong>{group[3]}</strong><em>АКТИВНА</em><button onClick={() => onToast(`Настройки ${group[1]} открыты`)}><Settings size={16} /></button></div>
          ))}
        </div>
      )}
      {tab === "users" && (
        <div className="admin-table-card">
          <div className="table-heading"><div><h2>Пользователи</h2><p>Поиск и глобальная модерация</p></div><button>Найти по ID</button></div>
          {[["АК", "Алексей К.", "@alex_k", "Покупатель"], ["FD", "Forge District", "@forgedistrict", "Продавец"], ["AP", "Антон П.", "ID 62184013", "Владелец группы"]].map((user) => (
            <div className="group-admin-row" key={user[1]}><span className="buyer-avatar">{user[0]}</span><p><b>{user[1]}</b><small>{user[2]}</small></p><strong>{user[3]}</strong><em className="neutral-status">АКТИВЕН</em><button className="ban-action" onClick={() => onToast(`${user[1]} заблокирован глобально`)}>Бан</button></div>
          ))}
        </div>
      )}
    </section>
  );
}
