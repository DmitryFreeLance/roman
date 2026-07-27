package club.redline.service;

import club.redline.config.RedlineProperties;
import club.redline.security.TelegramInitDataVerifier.TelegramUser;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Service
public class MarketplaceService {
    private static final Logger log = LoggerFactory.getLogger(MarketplaceService.class);
    private final JdbcTemplate jdbc;
    private final TelegramApiClient telegram;

    public MarketplaceService(JdbcTemplate jdbc, TelegramApiClient telegram,
                              RedlineProperties properties) {
        this.jdbc = jdbc;
        this.telegram = telegram;
    }

    @Transactional
    public void upsertUser(TelegramUser user) {
        jdbc.update("""
                INSERT INTO users (
                  telegram_id, username, first_name, last_name,
                  bot_commission_percent, debt_limit_kopecks
                )
                VALUES (
                  ?, ?, ?, ?,
                  (SELECT bot_commission_percent FROM platform_settings WHERE singleton = 1),
                  (SELECT default_debt_limit_kopecks FROM platform_settings WHERE singleton = 1)
                )
                ON CONFLICT (telegram_id) DO UPDATE SET
                  username = EXCLUDED.username,
                  first_name = EXCLUDED.first_name,
                  last_name = EXCLUDED.last_name,
                  updated_at = CURRENT_TIMESTAMP
                """, user.id(), user.username(), user.firstName(), user.lastName());
    }

    @Transactional
    public void registerGroup(long groupId, String title, long ownerTelegramId, int shopThreadId) {
        jdbc.update("""
                INSERT INTO telegram_groups
                  (telegram_group_id, title, owner_telegram_id, shop_thread_id, commission_percent)
                VALUES (?, ?, ?, ?, 3.5)
                ON CONFLICT (telegram_group_id) DO UPDATE SET
                  title = EXCLUDED.title,
                  owner_telegram_id = EXCLUDED.owner_telegram_id,
                  shop_thread_id = EXCLUDED.shop_thread_id,
                  active = 1
                """, groupId, title, ownerTelegramId, shopThreadId);
    }

    public List<Map<String, Object>> catalog(long telegramGroupId) {
        return jdbc.queryForList("""
                SELECT p.id, p.title, p.description, p.category, p.stock, p.kind,
                       p.seller_price_kopecks,
                       CAST(ROUND(p.seller_price_kopecks *
                         (1 + s.bot_commission_percent / 100 + g.commission_percent / 100)) AS INTEGER)
                         AS buyer_price_kopecks,
                       p.image_urls, st.id AS store_id, st.name AS store_name,
                       st.seller_telegram_id, p.active,
                       COALESCE(AVG(r.rating), 0) AS rating,
                       COUNT(r.id) AS review_count,
                       gb.id AS group_buy_id, gb.target_count,
                       gb.status AS group_buy_status, gb.payment_deadline,
                       COUNT(gbr.id) FILTER (WHERE gbr.status <> 'CANCELLED') AS reserved_count
                FROM products p
                JOIN stores st ON st.id = p.store_id
                JOIN users s ON s.telegram_id = st.seller_telegram_id
                JOIN telegram_groups g ON g.id = p.group_id
                LEFT JOIN reviews r ON r.product_id = p.id
                LEFT JOIN group_buys gb ON gb.product_id = p.id
                LEFT JOIN group_buy_reservations gbr ON gbr.group_buy_id = gb.id
                WHERE g.telegram_group_id = ? AND p.active = 1 AND p.deleted = 0
                  AND s.globally_banned = 0
                  AND NOT EXISTS (
                    SELECT 1 FROM group_seller_bans b
                    WHERE b.group_id = g.id AND b.seller_telegram_id = st.seller_telegram_id
                  )
                GROUP BY p.id, s.bot_commission_percent, g.commission_percent,
                         st.id, st.name,
                         gb.target_count, gb.status, gb.payment_deadline
                ORDER BY p.created_at DESC
                """, telegramGroupId);
    }

    public List<Map<String, Object>> sellerProducts(long sellerTelegramId,
                                                     long telegramGroupId) {
        return jdbc.queryForList("""
                SELECT p.id, p.title, p.description, p.category, p.stock, p.kind,
                       p.seller_price_kopecks,
                       CAST(ROUND(p.seller_price_kopecks *
                         (1 + u.bot_commission_percent / 100 + g.commission_percent / 100)) AS INTEGER)
                         AS buyer_price_kopecks,
                       p.image_urls, p.active, st.id AS store_id, st.name AS store_name,
                       st.seller_telegram_id,
                       gb.id AS group_buy_id, gb.target_count,
                       gb.status AS group_buy_status,
                       COUNT(DISTINCT gbr.id) FILTER (WHERE gbr.status <> 'CANCELLED')
                         AS reserved_count,
                       COUNT(DISTINCT o.id) AS order_count
                FROM products p
                JOIN stores st ON st.id = p.store_id
                JOIN users u ON u.telegram_id = st.seller_telegram_id
                JOIN telegram_groups g ON g.id = p.group_id
                LEFT JOIN group_buys gb ON gb.product_id = p.id
                LEFT JOIN group_buy_reservations gbr ON gbr.group_buy_id = gb.id
                LEFT JOIN orders o ON o.product_id = p.id
                WHERE g.telegram_group_id = ? AND st.seller_telegram_id = ?
                  AND p.deleted = 0
                GROUP BY p.id, u.bot_commission_percent, g.commission_percent,
                         st.id, st.name, gb.id, gb.target_count, gb.status
                ORDER BY p.created_at DESC
                """, telegramGroupId, sellerTelegramId);
    }

    @Transactional
    public void setSellerProductActive(long sellerTelegramId, long productId, boolean active) {
        Map<String, Object> product = jdbc.queryForMap("""
                SELECT p.group_id FROM products p
                JOIN stores st ON st.id = p.store_id
                WHERE p.id = ? AND st.seller_telegram_id = ? AND p.deleted = 0
                """, productId, sellerTelegramId);
        if (active) {
            assertSellerCanTrade(
                    sellerTelegramId,
                    ((Number) product.get("group_id")).longValue()
            );
        }
        jdbc.update("""
                UPDATE products SET active = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """, active, productId);
    }

    @Transactional
    public void updateSellerProduct(long sellerTelegramId, long productId,
                                    UpdateProduct input) {
        Integer categoryExists = jdbc.queryForObject("""
                SELECT COUNT(*) FROM categories WHERE name = ? AND active = 1
                """, Integer.class, input.category());
        if (categoryExists == null || categoryExists == 0) {
            throw new IllegalArgumentException("Category is not available");
        }
        int updated = jdbc.update("""
                UPDATE products
                SET title = ?, description = ?, category = ?, stock = ?,
                    seller_price_kopecks = ?, image_urls = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND deleted = 0 AND store_id IN (
                  SELECT id FROM stores WHERE seller_telegram_id = ?
                )
                """, input.title(), input.description(), input.category(),
                input.stock(), input.sellerPriceKopecks(), input.imageUrlsJson(),
                productId, sellerTelegramId);
        if (updated == 0) {
            throw new IllegalArgumentException("Product not found or access denied");
        }
    }

    @Transactional
    public void deleteSellerProduct(long sellerTelegramId, long productId) {
        int updated = jdbc.update("""
                UPDATE products SET deleted = 1, active = 0,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND deleted = 0 AND store_id IN (
                  SELECT id FROM stores WHERE seller_telegram_id = ?
                )
                """, productId, sellerTelegramId);
        if (updated == 0) {
            throw new IllegalArgumentException("Product not found or access denied");
        }
    }

    @Transactional
    public long createProduct(long sellerTelegramId, NewProduct input) {
        assertSellerCanTrade(sellerTelegramId, input.groupId());
        Integer categoryExists = jdbc.queryForObject("""
                SELECT COUNT(*) FROM categories WHERE name = ? AND active = 1
                """, Integer.class, input.category());
        if (categoryExists == null || categoryExists == 0) {
            throw new IllegalArgumentException("Category is not available");
        }
        Long storeId = jdbc.queryForObject("""
                SELECT id FROM stores WHERE seller_telegram_id = ? AND group_id = ?
                """, Long.class, sellerTelegramId, input.groupId());
        Long productId = jdbc.queryForObject("""
                INSERT INTO products
                  (store_id, group_id, title, description, category, stock, seller_price_kopecks,
                   kind, image_urls)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id
                """, Long.class, storeId, input.groupId(), input.title(), input.description(),
                input.category(), input.stock(), input.sellerPriceKopecks(), input.kind(),
                input.imageUrlsJson());
        if ("GROUP_BUY".equals(input.kind())) {
            jdbc.update("""
                    INSERT INTO group_buys (product_id, target_count, collection_deadline)
                    VALUES (?, ?, ?)
                    """, productId, input.targetCount(),
                    Instant.now().plus(input.collectionDays(), ChronoUnit.DAYS).toString());
        }
        try {
            publishProduct(productId);
        } catch (RuntimeException publishError) {
            log.warn("Product {} was saved, but Telegram publication failed: {}",
                    productId, publishError.getMessage());
        }
        return productId;
    }

    @Transactional
    public long createStore(long sellerTelegramId, NewStore input) {
        Long storeId = jdbc.queryForObject("""
                INSERT INTO stores
                  (group_id, seller_telegram_id, name, description, payment_details)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (group_id, seller_telegram_id) DO UPDATE SET
                  name = EXCLUDED.name,
                  description = EXCLUDED.description,
                  payment_details = EXCLUDED.payment_details,
                  active = 1
                RETURNING id
                """, Long.class, input.groupId(), sellerTelegramId, input.name(),
                input.description(), input.paymentDetails());
        return storeId;
    }

    public Map<String, Object> myStore(long sellerTelegramId, long telegramGroupId) {
        return jdbc.queryForMap("""
                SELECT st.id, st.name, st.description,
                       COALESCE(
                         NULLIF(st.payment_details, ''),
                         NULLIF(st.payment_card, ''),
                         NULLIF(st.payment_phone, '')
                       ) AS payment_details
                FROM stores st
                JOIN telegram_groups g ON g.id = st.group_id
                WHERE st.seller_telegram_id = ? AND g.telegram_group_id = ?
                  AND st.active = 1
                """, sellerTelegramId, telegramGroupId);
    }

    public Map<String, Object> profile(long telegramId) {
        return jdbc.queryForMap("""
                SELECT telegram_id, username, first_name, last_name,
                       display_name, phone, selected_group_id, registered, seller_blocked,
                       bot_commission_percent, commission_debt_kopecks, debt_limit_kopecks
                FROM users WHERE telegram_id = ?
                """, telegramId);
    }

    @Transactional
    public void registerProfile(long telegramId, String displayName, String phone, Long groupId) {
        validateActiveGroup(groupId);
        int updated = jdbc.update("""
                UPDATE users
                SET display_name = ?, phone = ?, selected_group_id = ?, registered = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE telegram_id = ?
                """, displayName.strip(), phone.strip(), groupId, telegramId);
        if (updated == 0) throw new IllegalArgumentException("Telegram user is not initialized");
    }

    public void registerProfile(long telegramId, String displayName, String phone) {
        registerProfile(telegramId, displayName, phone, null);
    }

    @Transactional
    public void selectGroup(long telegramId, long groupId) {
        validateActiveGroup(groupId);
        int updated = jdbc.update("""
                UPDATE users SET selected_group_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE telegram_id = ?
                """, groupId, telegramId);
        if (updated == 0) throw new IllegalArgumentException("Telegram user is not initialized");
    }

    public List<Map<String, Object>> availableGroups() {
        return jdbc.queryForList("""
                SELECT g.id, g.telegram_group_id, g.title, g.owner_telegram_id,
                       g.shop_thread_id, g.commission_percent,
                       COUNT(DISTINCT p.id) AS product_count
                FROM telegram_groups g
                LEFT JOIN products p ON p.group_id = g.id
                  AND p.active = 1 AND p.deleted = 0
                WHERE g.active = 1
                GROUP BY g.id
                ORDER BY g.created_at DESC
                """);
    }

    public boolean groupExists(long telegramGroupId) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM telegram_groups
                WHERE telegram_group_id = ? AND active = 1
                """, Integer.class, telegramGroupId);
        return count != null && count > 0;
    }

    public List<Map<String, Object>> categories() {
        return jdbc.queryForList("""
                SELECT id, name, sort_order
                FROM categories
                WHERE active = 1
                ORDER BY sort_order, name
                """);
    }

    @Transactional
    public long createCategory(String name) {
        String normalized = name.strip();
        if (normalized.isEmpty()) throw new IllegalArgumentException("Category name is required");
        Long id = jdbc.queryForObject("""
                INSERT INTO categories (name, active)
                VALUES (?, 1)
                ON CONFLICT (name) DO UPDATE SET active = 1
                RETURNING id
                """, Long.class, normalized);
        if (id == null) throw new IllegalStateException("Category was not created");
        return id;
    }

    @Transactional
    public void deleteCategory(long categoryId) {
        jdbc.update("UPDATE categories SET active = 0 WHERE id = ?", categoryId);
    }

    @Transactional
    public ReservationResult reserve(long groupBuyId, long buyerTelegramId, String phone) {
        Map<String, Object> groupBuy = jdbc.queryForMap("""
                SELECT gb.target_count, gb.status, p.stock
                FROM group_buys gb JOIN products p ON p.id = gb.product_id
                WHERE gb.id = ?
                """, groupBuyId);
        if (!"COLLECTING".equals(groupBuy.get("status"))) {
            throw new IllegalStateException("Group buy is no longer collecting reservations");
        }
        jdbc.update("""
                INSERT INTO group_buy_reservations (group_buy_id, buyer_telegram_id, contact_phone)
                VALUES (?, ?, ?)
                ON CONFLICT (group_buy_id, buyer_telegram_id) DO NOTHING
                """, groupBuyId, buyerTelegramId, phone);
        Integer reserved = jdbc.queryForObject("""
                SELECT COUNT(*) FROM group_buy_reservations
                WHERE group_buy_id = ? AND status <> 'CANCELLED'
                """, Integer.class, groupBuyId);
        int target = ((Number) groupBuy.get("target_count")).intValue();
        boolean reached = MarketplaceRules.groupBuyThresholdReached(
                reserved == null ? 0 : reserved, target
        );
        if (reached) {
            jdbc.update("""
                    UPDATE group_buys SET status = 'PRICE_CONFIRMATION',
                      updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND status = 'COLLECTING'
                    """, groupBuyId);
            notifyGroupBuySeller(groupBuyId,
                    "Группа собрана. Обновите актуальную цену и запустите оплату.");
        }
        return new ReservationResult(reserved == null ? 0 : reserved, target, reached);
    }

    @Transactional
    public void openPayment(long groupBuyId, long sellerTelegramId, long finalPriceKopecks, int hours) {
        assertGroupBuySeller(groupBuyId, sellerTelegramId);
        Instant deadline = Instant.now().plus(hours, ChronoUnit.HOURS);
        jdbc.update("""
                UPDATE group_buys
                SET status = 'AWAITING_PAYMENT', final_price_kopecks = ?,
                    payment_deadline = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'PRICE_CONFIRMATION'
                """, finalPriceKopecks, deadline.toString(), groupBuyId);
        jdbc.update("""
                UPDATE group_buy_reservations SET status = 'PAYMENT_REQUESTED'
                WHERE group_buy_id = ? AND status = 'RESERVED'
                """, groupBuyId);
        List<Long> buyers = participantIds(groupBuyId);
        buyers.forEach(id -> notifyUser(id, """
                <b>Закупка собрана!</b>
                Актуальная цена: <b>%d ₽</b>.
                Оплатите продавцу до %s и нажмите «Я оплатил» в разделе покупок.
                """.formatted(finalPriceKopecks / 100, deadline)));
    }

    @Transactional
    public void markGroupBuyPaid(long groupBuyId, long buyerTelegramId) {
        int updated = jdbc.update("""
                UPDATE group_buy_reservations SET status = 'PAID',
                  paid_at = CURRENT_TIMESTAMP
                WHERE group_buy_id = ? AND buyer_telegram_id = ?
                  AND status IN ('RESERVED', 'PAYMENT_REQUESTED')
                """, groupBuyId, buyerTelegramId);
        if (updated == 0) throw new IllegalStateException("Reservation is not payable");
        notifyGroupBuySeller(groupBuyId, "Участник отметил оплату. Проверьте поступление.");
    }

    @Transactional
    public void confirmGroupBuy(long groupBuyId, long sellerTelegramId) {
        assertGroupBuySeller(groupBuyId, sellerTelegramId);
        Integer unpaid = jdbc.queryForObject("""
                SELECT COUNT(*) FROM group_buy_reservations
                WHERE group_buy_id = ? AND status <> 'PAID'
                """, Integer.class, groupBuyId);
        if (unpaid != null && unpaid > 0) {
            throw new IllegalStateException("Not all participants are marked as paid");
        }
        jdbc.update("""
                UPDATE group_buys SET status = 'FORMED',
                  formed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'AWAITING_PAYMENT'
                """, groupBuyId);
        participantIds(groupBuyId).forEach(id -> notifyUser(id,
                "<b>Закупка сформирована.</b>\nОплата подтверждена. Ожидайте информацию о поставке."));
    }

    @Transactional
    public void updateDelivery(long groupBuyId, long sellerTelegramId, Instant from,
                               Instant to, String note) {
        assertGroupBuySeller(groupBuyId, sellerTelegramId);
        jdbc.update("""
                UPDATE group_buys SET status = 'IN_DELIVERY', delivery_from = ?,
                  delivery_to = ?, delivery_note = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status IN ('FORMED', 'IN_DELIVERY')
                """, from.toString(), to.toString(), note, groupBuyId);
        participantIds(groupBuyId).forEach(id -> notifyUser(id, """
                <b>Новый ориентир поставки</b>
                %s — %s
                %s
                """.formatted(from, to, note)));
    }

    @Transactional
    public long createOrder(long buyerTelegramId, long productId) {
        Map<String, Object> product = jdbc.queryForMap("""
                SELECT p.id, p.stock, p.seller_price_kopecks, p.group_id,
                       p.active, p.deleted, st.seller_telegram_id, u.bot_commission_percent,
                       g.commission_percent
                FROM products p
                JOIN stores st ON st.id = p.store_id
                JOIN users u ON u.telegram_id = st.seller_telegram_id
                JOIN telegram_groups g ON g.id = p.group_id
                WHERE p.id = ?
                """, productId);
        long sellerId = ((Number) product.get("seller_telegram_id")).longValue();
        long groupId = ((Number) product.get("group_id")).longValue();
        if (!asBoolean(product.get("active")) || asBoolean(product.get("deleted"))) {
            throw new IllegalStateException("Product is not available");
        }
        if (sellerId == buyerTelegramId) {
            throw new IllegalStateException("You cannot buy your own product");
        }
        assertSellerCanTrade(sellerId, groupId);
        int stock = ((Number) product.get("stock")).intValue();
        if (stock < 1) throw new IllegalStateException("Product is out of stock");
        long sellerPrice = ((Number) product.get("seller_price_kopecks")).longValue();
        double botRate = ((Number) product.get("bot_commission_percent")).doubleValue();
        double groupRate = ((Number) product.get("commission_percent")).doubleValue();
        long buyerPrice = Math.round(sellerPrice * (1 + botRate / 100 + groupRate / 100));
        long commission = buyerPrice - sellerPrice;
        Long orderId = jdbc.queryForObject("""
                INSERT INTO orders
                  (product_id, buyer_telegram_id, seller_telegram_id, group_id,
                   seller_price_kopecks, buyer_price_kopecks, commission_kopecks)
                VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
                """, Long.class, productId, buyerTelegramId, sellerId, groupId,
                sellerPrice, buyerPrice, commission);
        jdbc.update("UPDATE products SET stock = stock - 1 WHERE id = ?", productId);
        notifyUser(sellerId, "<b>Новый заказ.</b>\nПокупатель ожидает реквизиты.");
        return orderId;
    }

    public List<Map<String, Object>> purchaseOrders(long buyerTelegramId,
                                                     long telegramGroupId) {
        return jdbc.queryForList("""
                SELECT o.id, o.status, o.seller_price_kopecks, o.buyer_price_kopecks,
                       o.commission_kopecks, o.created_at, o.updated_at,
                       p.id AS product_id, p.title AS product_title, p.image_urls,
                       st.id AS store_id, st.name AS store_name,
                       COALESCE(
                         NULLIF(st.payment_details, ''),
                         NULLIF(st.payment_card, ''),
                         NULLIF(st.payment_phone, '')
                       ) AS payment_details,
                       seller.telegram_id AS seller_telegram_id,
                       seller.username AS seller_username,
                       COALESCE(NULLIF(seller.display_name, ''),
                         TRIM(seller.first_name || ' ' || COALESCE(seller.last_name, '')))
                         AS seller_name
                FROM orders o
                JOIN products p ON p.id = o.product_id
                JOIN stores st ON st.id = p.store_id
                JOIN users seller ON seller.telegram_id = o.seller_telegram_id
                JOIN telegram_groups g ON g.id = o.group_id
                WHERE o.buyer_telegram_id = ? AND g.telegram_group_id = ?
                ORDER BY o.created_at DESC
                """, buyerTelegramId, telegramGroupId);
    }

    public List<Map<String, Object>> salesOrders(long sellerTelegramId,
                                                  long telegramGroupId) {
        return jdbc.queryForList("""
                SELECT o.id, o.status, o.seller_price_kopecks, o.buyer_price_kopecks,
                       o.commission_kopecks, o.created_at, o.updated_at,
                       p.id AS product_id, p.title AS product_title, p.image_urls,
                       st.id AS store_id, st.name AS store_name,
                       buyer.telegram_id AS buyer_telegram_id,
                       buyer.username AS buyer_username, buyer.phone AS buyer_phone,
                       COALESCE(NULLIF(buyer.display_name, ''),
                         TRIM(buyer.first_name || ' ' || COALESCE(buyer.last_name, '')))
                         AS buyer_name
                FROM orders o
                JOIN products p ON p.id = o.product_id
                JOIN stores st ON st.id = p.store_id
                JOIN users buyer ON buyer.telegram_id = o.buyer_telegram_id
                JOIN telegram_groups g ON g.id = o.group_id
                WHERE o.seller_telegram_id = ? AND g.telegram_group_id = ?
                ORDER BY o.created_at DESC
                """, sellerTelegramId, telegramGroupId);
    }

    public List<Map<String, Object>> notifications(long telegramId) {
        return jdbc.queryForList("""
                SELECT id, type, title, body, entity_type, entity_id,
                       is_read, created_at
                FROM notifications
                WHERE user_telegram_id = ?
                ORDER BY created_at DESC, id DESC
                LIMIT 200
                """, telegramId);
    }

    @Transactional
    public void markNotificationRead(long telegramId, long notificationId) {
        jdbc.update("""
                UPDATE notifications SET is_read = 1
                WHERE id = ? AND user_telegram_id = ?
                """, notificationId, telegramId);
    }

    @Transactional
    public void markAllNotificationsRead(long telegramId) {
        jdbc.update("""
                UPDATE notifications SET is_read = 1
                WHERE user_telegram_id = ?
                """, telegramId);
    }

    @Transactional
    public void advanceOrder(long orderId, long actorTelegramId, String targetStatus) {
        Map<String, Object> order = jdbc.queryForMap("""
                SELECT buyer_telegram_id, seller_telegram_id, product_id,
                       status, commission_kopecks
                FROM orders WHERE id = ?
                """, orderId);
        String current = String.valueOf(order.get("status"));
        long buyer = ((Number) order.get("buyer_telegram_id")).longValue();
        long seller = ((Number) order.get("seller_telegram_id")).longValue();
        boolean valid = switch (targetStatus) {
            case "PAID" -> actorTelegramId == buyer && "AWAITING_PAYMENT".equals(current);
            case "SHIPPED" -> actorTelegramId == seller && "PAID".equals(current);
            case "COMPLETED" -> actorTelegramId == buyer && "SHIPPED".equals(current);
            case "CANCELLED" ->
                    (actorTelegramId == buyer || actorTelegramId == seller)
                            && ("AWAITING_PAYMENT".equals(current) || "PAID".equals(current));
            default -> false;
        };
        if (!valid) throw new IllegalStateException("Invalid order status transition");
        int updated = jdbc.update("""
                UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = ?
                """, targetStatus, orderId, current);
        if (updated == 0) {
            throw new IllegalStateException("Order status was already changed");
        }
        if ("CANCELLED".equals(targetStatus)) {
            jdbc.update("UPDATE products SET stock = stock + 1 WHERE id = ?",
                    ((Number) order.get("product_id")).longValue());
            long recipient = actorTelegramId == buyer ? seller : buyer;
            notifyUser(recipient, "<b>Заказ отменён.</b>\nЗаказ #" + orderId
                    + " отменён второй стороной.");
            return;
        }
        if ("PAID".equals(targetStatus)) {
            notifyUser(seller,
                    "<b>Покупатель отметил оплату.</b>\nПроверьте поступление и отправьте товар.");
        } else if ("SHIPPED".equals(targetStatus)) {
            notifyUser(buyer,
                    "<b>Продавец отметил товар отправленным.</b>\nПосле получения подтвердите заказ.");
        }
        if ("COMPLETED".equals(targetStatus)) {
            long commission = ((Number) order.get("commission_kopecks")).longValue();
            jdbc.update("""
                    UPDATE users SET commission_debt_kopecks = commission_debt_kopecks + ?
                    WHERE telegram_id = ?
                    """, commission, seller);
            jdbc.update("""
                    INSERT INTO commission_ledger
                      (seller_telegram_id, order_id, amount_kopecks, entry_type)
                    VALUES (?, ?, ?, 'ACCRUAL')
                    """, seller, orderId, commission);
            refreshSellerBlock(seller);
            notifyUser(seller,
                    "<b>Заказ завершён.</b>\nКомиссия начислена в счётчик задолженности.");
        }
    }

    @Transactional
    public void repayDebt(long sellerTelegramId, long amountKopecks, long adminTelegramId) {
        jdbc.update("""
                UPDATE users SET commission_debt_kopecks =
                  MAX(0, commission_debt_kopecks - ?)
                WHERE telegram_id = ?
                """, amountKopecks, sellerTelegramId);
        jdbc.update("""
                INSERT INTO commission_ledger
                  (seller_telegram_id, amount_kopecks, entry_type, recorded_by_telegram_id)
                VALUES (?, ?, 'REPAYMENT', ?)
                """, sellerTelegramId, -amountKopecks, adminTelegramId);
        refreshSellerBlock(sellerTelegramId);
    }

    public List<Map<String, Object>> groupBuyBuyers(long groupBuyId, long sellerTelegramId) {
        assertGroupBuySeller(groupBuyId, sellerTelegramId);
        return jdbc.queryForList("""
                SELECT u.telegram_id, u.username, u.first_name, u.last_name,
                       r.contact_phone, r.status, r.paid_at
                FROM group_buy_reservations r
                JOIN users u ON u.telegram_id = r.buyer_telegram_id
                WHERE r.group_buy_id = ?
                ORDER BY r.created_at
                """, groupBuyId);
    }

    public List<Map<String, Object>> commissionDebts() {
        return jdbc.queryForList("""
                SELECT u.telegram_id, u.username, u.first_name, u.last_name,
                       u.commission_debt_kopecks, u.debt_limit_kopecks, u.seller_blocked,
                       COUNT(o.id) FILTER (WHERE o.status = 'COMPLETED') AS completed_orders
                FROM users u
                LEFT JOIN orders o ON o.seller_telegram_id = u.telegram_id
                WHERE u.commission_debt_kopecks > 0
                GROUP BY u.telegram_id
                ORDER BY u.seller_blocked DESC, u.commission_debt_kopecks DESC
                """);
    }

    public List<Map<String, Object>> groups() {
        return jdbc.queryForList("""
                SELECT g.id, g.telegram_group_id, g.title, g.owner_telegram_id,
                       g.shop_thread_id, g.commission_percent, g.active,
                       COUNT(DISTINCT s.id) AS stores,
                       COUNT(DISTINCT p.id) FILTER (
                         WHERE p.active = 1 AND p.deleted = 0
                       ) AS product_count,
                       COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'COMPLETED') AS completed_orders
                FROM telegram_groups g
                LEFT JOIN stores s ON s.group_id = g.id
                LEFT JOIN products p ON p.group_id = g.id
                LEFT JOIN orders o ON o.group_id = g.id
                GROUP BY g.id
                ORDER BY g.created_at DESC
                """);
    }

    public Map<String, Object> groupAdminStats(long telegramGroupId, long ownerTelegramId) {
        assertGroupOwner(telegramGroupId, ownerTelegramId);
        return jdbc.queryForMap("""
                SELECT
                  (SELECT COUNT(*) FROM products p
                   WHERE p.group_id = g.id AND p.active = 1
                     AND p.deleted = 0) AS products,
                  (SELECT COUNT(*) FROM stores s
                   WHERE s.group_id = g.id AND s.active = 1) AS sellers,
                  (SELECT COUNT(*) FROM orders o
                   WHERE o.group_id = g.id AND o.status = 'COMPLETED') AS completed_orders,
                  (SELECT COALESCE(SUM(ROUND(
                     o.seller_price_kopecks * g.commission_percent / 100
                   )), 0) FROM orders o
                   WHERE o.group_id = g.id AND o.status = 'COMPLETED')
                    AS group_commission_kopecks
                FROM telegram_groups g
                WHERE g.telegram_group_id = ? AND g.owner_telegram_id = ?
                """, telegramGroupId, ownerTelegramId);
    }

    public Map<String, Object> globalSettings() {
        return jdbc.queryForMap("""
                SELECT bot_commission_percent, default_debt_limit_kopecks
                FROM platform_settings WHERE singleton = 1
                """);
    }

    @Transactional
    public void updateGlobalSettings(double botCommissionPercent, long debtLimitKopecks) {
        jdbc.update("""
                UPDATE platform_settings SET bot_commission_percent = ?,
                  default_debt_limit_kopecks = ?, updated_at = CURRENT_TIMESTAMP
                WHERE singleton = 1
                """, botCommissionPercent, debtLimitKopecks);
        jdbc.update("""
                UPDATE users SET bot_commission_percent = ?, debt_limit_kopecks = ?
                """, botCommissionPercent, debtLimitKopecks);
        jdbc.update("""
                UPDATE users SET seller_blocked = commission_debt_kopecks >= debt_limit_kopecks
                """);
    }

    @Transactional
    public void updateGroupCommission(long telegramGroupId, long ownerTelegramId,
                                      double commissionPercent) {
        int updated = jdbc.update("""
                UPDATE telegram_groups SET commission_percent = ?
                WHERE telegram_group_id = ? AND owner_telegram_id = ?
                """, commissionPercent, telegramGroupId, ownerTelegramId);
        if (updated == 0) throw new IllegalArgumentException("Group owner access required");
    }

    @Transactional
    public void updateGroupAsSuperAdmin(long groupId, double commissionPercent, boolean active) {
        int updated = jdbc.update("""
                UPDATE telegram_groups SET commission_percent = ?, active = ?
                WHERE id = ?
                """, commissionPercent, active, groupId);
        if (updated == 0) throw new IllegalArgumentException("Group not found");
    }

    @Transactional
    public void deactivateProduct(long telegramGroupId, long ownerTelegramId, long productId) {
        int updated = jdbc.update("""
                UPDATE products SET active = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND group_id = (
                  SELECT id FROM telegram_groups
                  WHERE telegram_group_id = ? AND owner_telegram_id = ?
                )
                """, productId, telegramGroupId, ownerTelegramId);
        if (updated == 0) throw new IllegalArgumentException("Product or group owner access not found");
    }

    @Transactional
    public void setGroupSellerBan(long telegramGroupId, long ownerTelegramId,
                                  long sellerTelegramId, boolean banned) {
        Long groupId = jdbc.queryForObject("""
                SELECT id FROM telegram_groups
                WHERE telegram_group_id = ? AND owner_telegram_id = ?
                """, Long.class, telegramGroupId, ownerTelegramId);
        if (groupId == null) throw new IllegalArgumentException("Group owner access required");
        if (banned) {
            jdbc.update("""
                    INSERT INTO group_seller_bans (group_id, seller_telegram_id, reason)
                    VALUES (?, ?, 'Заблокирован владельцем группы')
                    ON CONFLICT (group_id, seller_telegram_id) DO UPDATE SET
                      reason = EXCLUDED.reason
                    """, groupId, sellerTelegramId);
            jdbc.update("""
                    UPDATE products SET active = 0, updated_at = CURRENT_TIMESTAMP
                    WHERE group_id = ? AND store_id IN (
                      SELECT id FROM stores WHERE seller_telegram_id = ?
                    )
                    """, groupId, sellerTelegramId);
        } else {
            jdbc.update("""
                    DELETE FROM group_seller_bans
                    WHERE group_id = ? AND seller_telegram_id = ?
                    """, groupId, sellerTelegramId);
        }
    }

    private void assertGroupOwner(long telegramGroupId, long ownerTelegramId) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM telegram_groups
                WHERE telegram_group_id = ? AND owner_telegram_id = ?
                """, Integer.class, telegramGroupId, ownerTelegramId);
        if (count == null || count == 0) {
            throw new IllegalArgumentException("Group owner access required");
        }
    }

    private void validateActiveGroup(Long groupId) {
        if (groupId == null) return;
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM telegram_groups WHERE id = ? AND active = 1
                """, Integer.class, groupId);
        if (count == null || count == 0) {
            throw new IllegalArgumentException("Selected club is not available");
        }
    }

    private void assertSellerCanTrade(long sellerId, long groupId) {
        Map<String, Object> seller = jdbc.queryForMap("""
                SELECT u.commission_debt_kopecks, u.debt_limit_kopecks, u.globally_banned,
                  EXISTS(SELECT 1 FROM group_seller_bans b
                    WHERE b.group_id = ? AND b.seller_telegram_id = u.telegram_id) AS group_banned
                FROM users u WHERE u.telegram_id = ?
                """, groupId, sellerId);
        long debt = ((Number) seller.get("commission_debt_kopecks")).longValue();
        long limit = ((Number) seller.get("debt_limit_kopecks")).longValue();
        if (asBoolean(seller.get("globally_banned")) ||
                asBoolean(seller.get("group_banned")) || debt >= limit) {
            throw new IllegalStateException("Seller is temporarily not accepting orders");
        }
    }

    private void assertGroupBuySeller(long groupBuyId, long sellerId) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM group_buys gb
                JOIN products p ON p.id = gb.product_id
                JOIN stores s ON s.id = p.store_id
                WHERE gb.id = ? AND s.seller_telegram_id = ?
                """, Integer.class, groupBuyId, sellerId);
        if (count == null || count == 0) throw new IllegalArgumentException("Not a group buy seller");
    }

    private List<Long> participantIds(long groupBuyId) {
        return jdbc.queryForList("""
                SELECT buyer_telegram_id FROM group_buy_reservations
                WHERE group_buy_id = ? AND status <> 'CANCELLED'
                """, Long.class, groupBuyId);
    }

    private void notifyGroupBuySeller(long groupBuyId, String text) {
        Long sellerId = jdbc.queryForObject("""
                SELECT s.seller_telegram_id FROM group_buys gb
                JOIN products p ON p.id = gb.product_id
                JOIN stores s ON s.id = p.store_id WHERE gb.id = ?
                """, Long.class, groupBuyId);
        if (sellerId != null) notifyUser(sellerId, "<b>Групповая закупка</b>\n" + text);
    }

    private void refreshSellerBlock(long sellerId) {
        Map<String, Object> state = jdbc.queryForMap("""
                SELECT commission_debt_kopecks, debt_limit_kopecks, seller_blocked
                FROM users WHERE telegram_id = ?
                """, sellerId);
        long debt = ((Number) state.get("commission_debt_kopecks")).longValue();
        long limit = ((Number) state.get("debt_limit_kopecks")).longValue();
        boolean shouldBlock = MarketplaceRules.debtBlocksSeller(debt, limit);
        jdbc.update("UPDATE users SET seller_blocked = ? WHERE telegram_id = ?", shouldBlock, sellerId);
        if (shouldBlock && !asBoolean(state.get("seller_blocked"))) {
            notifyUser(sellerId, """
                    <b>Лимит задолженности превышен.</b>
                    Публикация объявлений и приём заказов приостановлены до оплаты комиссии.
                    """);
        }
    }

    private void notifyUser(long telegramId, String text) {
        String plain = text.replaceAll("<[^>]+>", "").strip();
        String[] lines = plain.split("\\R", 2);
        String title = lines.length > 0 && !lines[0].isBlank()
                ? lines[0].strip()
                : "REDLINE";
        String body = lines.length > 1 ? lines[1].strip() : title;
        jdbc.update("""
                INSERT INTO notifications
                  (user_telegram_id, type, title, body)
                VALUES (?, 'MARKETPLACE', ?, ?)
                """, telegramId, title, body);
        try {
            telegram.sendMessage(telegramId, text);
        } catch (RuntimeException notificationError) {
            log.warn("Telegram notification to {} failed: {}",
                    telegramId, notificationError.getMessage());
        }
    }

    private void publishProduct(long productId) {
        Map<String, Object> product = jdbc.queryForMap("""
                SELECT g.telegram_group_id, g.shop_thread_id, p.title, p.description, p.stock,
                       CAST(ROUND(p.seller_price_kopecks *
                         (1 + u.bot_commission_percent / 100 + g.commission_percent / 100)) AS INTEGER)
                         AS buyer_price_kopecks,
                       json_extract(p.image_urls, '$[0]') AS image_url
                FROM products p
                JOIN stores s ON s.id = p.store_id
                JOIN users u ON u.telegram_id = s.seller_telegram_id
                JOIN telegram_groups g ON g.id = p.group_id
                WHERE p.id = ?
                """, productId);
        Object image = product.get("image_url");
        if (image == null || String.valueOf(image).isBlank()) return;
        telegram.publishProduct(
                ((Number) product.get("telegram_group_id")).longValue(),
                ((Number) product.get("shop_thread_id")).intValue(),
                productId,
                String.valueOf(product.get("title")),
                String.valueOf(product.get("description")),
                ((Number) product.get("buyer_price_kopecks")).longValue(),
                ((Number) product.get("stock")).intValue(),
                String.valueOf(image)
        );
    }

    private static boolean asBoolean(Object value) {
        if (value instanceof Boolean booleanValue) return booleanValue;
        if (value instanceof Number numberValue) return numberValue.intValue() != 0;
        return value != null && Boolean.parseBoolean(String.valueOf(value));
    }

    public record NewProduct(long groupId, String title, String description, String category,
                             int stock, long sellerPriceKopecks, String kind,
                             String imageUrlsJson, Integer targetCount, Integer collectionDays) {}
    public record UpdateProduct(String title, String description, String category,
                                int stock, long sellerPriceKopecks,
                                String imageUrlsJson) {}
    public record NewStore(long groupId, String name, String description,
                           String paymentDetails) {}
    public record ReservationResult(int reserved, int target, boolean thresholdReached) {}
}
