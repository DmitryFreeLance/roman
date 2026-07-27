package club.redline.service;

import club.redline.config.RedlineProperties;
import club.redline.security.TelegramInitDataVerifier.TelegramUser;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Service
public class MarketplaceService {
    private final JdbcTemplate jdbc;
    private final TelegramApiClient telegram;
    private final RedlineProperties properties;

    public MarketplaceService(JdbcTemplate jdbc, TelegramApiClient telegram, RedlineProperties properties) {
        this.jdbc = jdbc;
        this.telegram = telegram;
        this.properties = properties;
    }

    @Transactional
    public void upsertUser(TelegramUser user) {
        jdbc.update("""
                INSERT INTO users (telegram_id, username, first_name, last_name)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (telegram_id) DO UPDATE SET
                  username = EXCLUDED.username,
                  first_name = EXCLUDED.first_name,
                  last_name = EXCLUDED.last_name,
                  updated_at = now()
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
                  active = true
                """, groupId, title, ownerTelegramId, shopThreadId);
    }

    public List<Map<String, Object>> catalog(long telegramGroupId) {
        return jdbc.queryForList("""
                SELECT p.id, p.title, p.description, p.category, p.stock, p.kind,
                       p.seller_price_kopecks,
                       ROUND(p.seller_price_kopecks *
                         (1 + s.bot_commission_percent / 100 + g.commission_percent / 100))::bigint
                         AS buyer_price_kopecks,
                       p.image_urls, st.name AS store_name,
                       COALESCE(AVG(r.rating), 0) AS rating,
                       COUNT(r.id) AS review_count,
                       gb.target_count, gb.status AS group_buy_status, gb.payment_deadline,
                       COUNT(gbr.id) FILTER (WHERE gbr.status <> 'CANCELLED') AS reserved_count
                FROM products p
                JOIN stores st ON st.id = p.store_id
                JOIN users s ON s.telegram_id = st.seller_telegram_id
                JOIN telegram_groups g ON g.id = p.group_id
                LEFT JOIN reviews r ON r.product_id = p.id
                LEFT JOIN group_buys gb ON gb.product_id = p.id
                LEFT JOIN group_buy_reservations gbr ON gbr.group_buy_id = gb.id
                WHERE g.telegram_group_id = ? AND p.active = true
                  AND s.globally_banned = false
                  AND NOT EXISTS (
                    SELECT 1 FROM group_seller_bans b
                    WHERE b.group_id = g.id AND b.seller_telegram_id = st.seller_telegram_id
                  )
                GROUP BY p.id, s.bot_commission_percent, g.commission_percent, st.name,
                         gb.target_count, gb.status, gb.payment_deadline
                ORDER BY p.created_at DESC
                """, telegramGroupId);
    }

    @Transactional
    public long createProduct(long sellerTelegramId, NewProduct input) {
        assertSellerCanTrade(sellerTelegramId, input.groupId());
        Long storeId = jdbc.queryForObject("""
                SELECT id FROM stores WHERE seller_telegram_id = ? AND group_id = ?
                """, Long.class, sellerTelegramId, input.groupId());
        Long productId = jdbc.queryForObject("""
                INSERT INTO products
                  (store_id, group_id, title, description, category, stock, seller_price_kopecks,
                   kind, image_urls)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?::product_kind, ?::jsonb)
                RETURNING id
                """, Long.class, storeId, input.groupId(), input.title(), input.description(),
                input.category(), input.stock(), input.sellerPriceKopecks(), input.kind(),
                input.imageUrlsJson());
        if ("GROUP_BUY".equals(input.kind())) {
            jdbc.update("""
                    INSERT INTO group_buys (product_id, target_count, collection_deadline)
                    VALUES (?, ?, ?)
                    """, productId, input.targetCount(),
                    Timestamp.from(Instant.now().plus(input.collectionDays(), ChronoUnit.DAYS)));
        }
        publishProduct(productId);
        return productId;
    }

    @Transactional
    public long createStore(long sellerTelegramId, NewStore input) {
        Long storeId = jdbc.queryForObject("""
                INSERT INTO stores
                  (group_id, seller_telegram_id, name, description, payment_phone, payment_card)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (group_id, seller_telegram_id) DO UPDATE SET
                  name = EXCLUDED.name,
                  description = EXCLUDED.description,
                  payment_phone = EXCLUDED.payment_phone,
                  payment_card = EXCLUDED.payment_card,
                  active = true
                RETURNING id
                """, Long.class, input.groupId(), sellerTelegramId, input.name(),
                input.description(), input.paymentPhone(), input.paymentCard());
        return storeId;
    }

    @Transactional
    public ReservationResult reserve(long groupBuyId, long buyerTelegramId, String phone) {
        Map<String, Object> groupBuy = jdbc.queryForMap("""
                SELECT gb.target_count, gb.status, p.stock
                FROM group_buys gb JOIN products p ON p.id = gb.product_id
                WHERE gb.id = ? FOR UPDATE
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
                    UPDATE group_buys SET status = 'PRICE_CONFIRMATION', updated_at = now()
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
                    payment_deadline = ?, updated_at = now()
                WHERE id = ? AND status = 'PRICE_CONFIRMATION'
                """, finalPriceKopecks, Timestamp.from(deadline), groupBuyId);
        List<Long> buyers = participantIds(groupBuyId);
        buyers.forEach(id -> telegram.sendMessage(id, """
                <b>Закупка собрана!</b>
                Актуальная цена: <b>%d ₽</b>.
                Оплатите продавцу до %s и нажмите «Я оплатил» в разделе покупок.
                """.formatted(finalPriceKopecks / 100, deadline)));
    }

    @Transactional
    public void markGroupBuyPaid(long groupBuyId, long buyerTelegramId) {
        int updated = jdbc.update("""
                UPDATE group_buy_reservations SET status = 'PAID', paid_at = now()
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
                UPDATE group_buys SET status = 'FORMED', formed_at = now(), updated_at = now()
                WHERE id = ? AND status = 'AWAITING_PAYMENT'
                """, groupBuyId);
        participantIds(groupBuyId).forEach(id -> telegram.sendMessage(id,
                "<b>Закупка сформирована.</b>\nОплата подтверждена. Ожидайте информацию о поставке."));
    }

    @Transactional
    public void updateDelivery(long groupBuyId, long sellerTelegramId, Instant from,
                               Instant to, String note) {
        assertGroupBuySeller(groupBuyId, sellerTelegramId);
        jdbc.update("""
                UPDATE group_buys SET status = 'IN_DELIVERY', delivery_from = ?,
                  delivery_to = ?, delivery_note = ?, updated_at = now()
                WHERE id = ? AND status IN ('FORMED', 'IN_DELIVERY')
                """, Timestamp.from(from), Timestamp.from(to), note, groupBuyId);
        participantIds(groupBuyId).forEach(id -> telegram.sendMessage(id, """
                <b>Новый ориентир поставки</b>
                %s — %s
                %s
                """.formatted(from, to, note)));
    }

    @Transactional
    public long createOrder(long buyerTelegramId, long productId) {
        Map<String, Object> product = jdbc.queryForMap("""
                SELECT p.id, p.stock, p.seller_price_kopecks, p.group_id,
                       st.seller_telegram_id, u.bot_commission_percent,
                       g.commission_percent
                FROM products p
                JOIN stores st ON st.id = p.store_id
                JOIN users u ON u.telegram_id = st.seller_telegram_id
                JOIN telegram_groups g ON g.id = p.group_id
                WHERE p.id = ? FOR UPDATE
                """, productId);
        long sellerId = ((Number) product.get("seller_telegram_id")).longValue();
        long groupId = ((Number) product.get("group_id")).longValue();
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
        telegram.sendMessage(sellerId, "<b>Новый заказ.</b>\nПокупатель ожидает реквизиты.");
        return orderId;
    }

    @Transactional
    public void advanceOrder(long orderId, long actorTelegramId, String targetStatus) {
        Map<String, Object> order = jdbc.queryForMap("""
                SELECT buyer_telegram_id, seller_telegram_id, status, commission_kopecks
                FROM orders WHERE id = ? FOR UPDATE
                """, orderId);
        String current = String.valueOf(order.get("status"));
        long buyer = ((Number) order.get("buyer_telegram_id")).longValue();
        long seller = ((Number) order.get("seller_telegram_id")).longValue();
        boolean valid = switch (targetStatus) {
            case "PAID" -> actorTelegramId == buyer && "AWAITING_PAYMENT".equals(current);
            case "SHIPPED" -> actorTelegramId == seller && "PAID".equals(current);
            case "COMPLETED" -> actorTelegramId == buyer && "SHIPPED".equals(current);
            default -> false;
        };
        if (!valid) throw new IllegalStateException("Invalid order status transition");
        jdbc.update("UPDATE orders SET status = ?::order_status, updated_at = now() WHERE id = ?",
                targetStatus, orderId);
        if ("COMPLETED".equals(targetStatus)) {
            long commission = ((Number) order.get("commission_kopecks")).longValue();
            jdbc.update("""
                    UPDATE users SET commission_debt_kopecks = commission_debt_kopecks + ?
                    WHERE telegram_id = ?
                    """, commission, seller);
            refreshSellerBlock(seller);
        }
    }

    @Transactional
    public void repayDebt(long sellerTelegramId, long amountKopecks, long adminTelegramId) {
        jdbc.update("""
                UPDATE users SET commission_debt_kopecks =
                  GREATEST(0, commission_debt_kopecks - ?)
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

    private void assertSellerCanTrade(long sellerId, long groupId) {
        Map<String, Object> seller = jdbc.queryForMap("""
                SELECT u.commission_debt_kopecks, u.debt_limit_kopecks, u.globally_banned,
                  EXISTS(SELECT 1 FROM group_seller_bans b
                    WHERE b.group_id = ? AND b.seller_telegram_id = u.telegram_id) AS group_banned
                FROM users u WHERE u.telegram_id = ?
                """, groupId, sellerId);
        long debt = ((Number) seller.get("commission_debt_kopecks")).longValue();
        long limit = ((Number) seller.get("debt_limit_kopecks")).longValue();
        if (Boolean.TRUE.equals(seller.get("globally_banned")) ||
                Boolean.TRUE.equals(seller.get("group_banned")) || debt >= limit) {
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
        if (sellerId != null) telegram.sendMessage(sellerId, "<b>Групповая закупка</b>\n" + text);
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
        if (shouldBlock && !Boolean.TRUE.equals(state.get("seller_blocked"))) {
            telegram.sendMessage(sellerId, """
                    <b>Лимит задолженности превышен.</b>
                    Публикация объявлений и приём заказов приостановлены до оплаты комиссии.
                    """);
        }
    }

    private void publishProduct(long productId) {
        Map<String, Object> product = jdbc.queryForMap("""
                SELECT g.telegram_group_id, g.shop_thread_id, p.title, p.description, p.stock,
                       ROUND(p.seller_price_kopecks *
                         (1 + u.bot_commission_percent / 100 + g.commission_percent / 100))::bigint
                         AS buyer_price_kopecks,
                       p.image_urls #>> '{0}' AS image_url
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

    public record NewProduct(long groupId, String title, String description, String category,
                             int stock, long sellerPriceKopecks, String kind,
                             String imageUrlsJson, Integer targetCount, Integer collectionDays) {}
    public record NewStore(long groupId, String name, String description,
                           String paymentPhone, String paymentCard) {}
    public record ReservationResult(int reserved, int target, boolean thresholdReached) {}
}
