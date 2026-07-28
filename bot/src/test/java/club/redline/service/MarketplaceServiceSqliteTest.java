package club.redline.service;

import club.redline.config.RedlineProperties;
import club.redline.security.TelegramInitDataVerifier.TelegramUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.jdbc.datasource.init.DatabasePopulatorUtils;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;

class MarketplaceServiceSqliteTest {
    private final SingleConnectionDataSource dataSource =
            new SingleConnectionDataSource("jdbc:sqlite::memory:", true);
    private JdbcTemplate jdbc;
    private MarketplaceService marketplace;

    @BeforeEach
    void setUp() {
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator(
                new ClassPathResource("db/schema-sqlite.sql")
        );
        DatabasePopulatorUtils.execute(populator, dataSource);
        jdbc = new JdbcTemplate(dataSource);
        RedlineProperties properties = new RedlineProperties(
                new RedlineProperties.Telegram("", "https://example.test/redlineclub/", 50),
                new RedlineProperties.Marketplace(1L, 5.0, 50_000L),
                new RedlineProperties.Storage(
                        "/tmp/redline-test-uploads",
                        "https://example.test/redlineclub-api/"
                )
        );
        TelegramApiClient telegram = new TelegramApiClient(RestClient.builder(), properties) {
            @Override
            public void sendMessage(long chatId, String text) {
                // Network calls are intentionally suppressed in this SQLite integration test.
            }

            @Override
            public void publishProduct(long groupId, int threadId, long productId,
                                       String title, String description,
                                       long priceKopecks, int stock, String imageUrl) {
                // Product publication is covered separately from database behavior.
            }
        };
        marketplace = new MarketplaceService(jdbc, telegram, properties);
    }

    @AfterEach
    void closeConnection() {
        dataSource.destroy();
    }

    @Test
    void completesGroupBuyWorkflowOnSqlite() {
        long sellerId = 101L;
        long firstBuyerId = 201L;
        long secondBuyerId = 202L;
        marketplace.upsertUser(new TelegramUser(1L, "admin", "Admin", null));
        marketplace.upsertUser(new TelegramUser(sellerId, "seller", "Seller", null));
        marketplace.upsertUser(new TelegramUser(firstBuyerId, "buyer1", "Buyer", "One"));
        marketplace.upsertUser(new TelegramUser(secondBuyerId, "buyer2", "Buyer", "Two"));
        marketplace.registerProfile(sellerId, "Seller", "+70000000000");
        marketplace.registerProfile(firstBuyerId, "Buyer One", "+70000000001");
        marketplace.registerProfile(secondBuyerId, "Buyer Two", "+70000000002");
        marketplace.registerGroup(-100123L, "REDLINE Test", sellerId, 7);

        Long groupId = jdbc.queryForObject(
                "SELECT id FROM telegram_groups WHERE telegram_group_id = ?",
                Long.class, -100123L
        );
        marketplace.createStore(sellerId, new MarketplaceService.NewStore(
                groupId, "Garage", "Test store",
                "https://example.test/store.jpg",
                "+70000000000 / карта 0000"
        ));
        long productId = marketplace.createProduct(sellerId, new MarketplaceService.NewProduct(
                groupId, "Brake kit", "Track brake kit", "Комплект на одну ось", "Brakes",
                10, 100_000L, "GROUP_BUY",
                "[\"https://example.test/black-kit.jpg\",\"https://example.test/blue-kit.jpg\"]",
                """
                [
                  {"key":"black","name":"Чёрный","hex":"#111111",
                   "images":["https://example.test/black-kit.jpg"]},
                  {"key":"blue","name":"Синий","hex":"#246bdb",
                   "images":["https://example.test/blue-kit.jpg"]}
                ]
                """,
                2, 7
        ));
        assertThat(marketplace.categories())
                .anySatisfy(row -> assertThat(row.get("name")).isEqualTo("Brakes"));
        assertThat(marketplace.myStore(sellerId, -100123L).get("image_url"))
                .isEqualTo("https://example.test/store.jpg");
        assertThat(marketplace.catalog(-100123L))
                .singleElement()
                .satisfies(row -> assertThat(row.get("store_image_url"))
                        .isEqualTo("https://example.test/store.jpg"));
        Long storeId = jdbc.queryForObject("""
                SELECT id FROM stores
                WHERE group_id = ? AND seller_telegram_id = ?
                """, Long.class, groupId, sellerId);
        marketplace.updateStoreImage(
                sellerId, storeId, "https://example.test/store-updated.jpg"
        );
        marketplace.updateStoreProfile(
                sellerId, storeId, "Garage Pro",
                "https://example.test/store-profile.jpg"
        );
        assertThat(marketplace.myStore(sellerId, -100123L).get("image_url"))
                .isEqualTo("https://example.test/store-profile.jpg");
        assertThat(marketplace.myStore(sellerId, -100123L).get("name"))
                .isEqualTo("Garage Pro");
        Long groupBuyId = jdbc.queryForObject(
                "SELECT id FROM group_buys WHERE product_id = ?", Long.class, productId
        );

        assertThat(marketplace.reserve(groupBuyId, firstBuyerId, "+70000000001", "black")
                .thresholdReached()).isFalse();
        assertThat(marketplace.reserve(groupBuyId, secondBuyerId, "+70000000002", "blue")
                .thresholdReached()).isTrue();

        marketplace.openPayment(groupBuyId, sellerId, 95_000L, 24);
        assertThat(marketplace.groupBuyPurchases(firstBuyerId, -100123L))
                .singleElement()
                .satisfies(row -> {
                    assertThat(row.get("group_buy_status")).isEqualTo("AWAITING_PAYMENT");
                    assertThat(((Number) row.get("final_price_kopecks")).longValue())
                            .isEqualTo(103_075L);
                    assertThat(row.get("payment_details"))
                            .isEqualTo("+70000000000 / карта 0000");
                    assertThat(row.get("selected_color_name")).isEqualTo("Чёрный");
                });
        marketplace.markGroupBuyPaid(groupBuyId, firstBuyerId);
        marketplace.markGroupBuyPaid(groupBuyId, secondBuyerId);
        marketplace.confirmGroupBuy(groupBuyId, sellerId);

        assertThat(jdbc.queryForObject(
                "SELECT status FROM group_buys WHERE id = ?", String.class, groupBuyId
        )).isEqualTo("FORMED");
        assertThat(marketplace.groupBuyBuyers(groupBuyId, sellerId)).hasSize(2);
        assertThat(marketplace.catalog(-100123L)).singleElement()
                .satisfies(row -> assertThat(
                        ((Number) row.get("reserved_count")).intValue()
                ).isEqualTo(2));

        long regularProductId = marketplace.createProduct(
                sellerId,
                new MarketplaceService.NewProduct(
                        groupId, "Brake fluid", "Racing fluid", "DOT 4, 1 л", "Brakes",
                        3, 100_000L, "REGULAR", "[]", "[]", null, null
                )
        );
        assertThat(marketplace.sellerProducts(sellerId, -100123L)).hasSize(2);
        marketplace.setFavorite(firstBuyerId, regularProductId, true);
        assertThat(marketplace.favorites(firstBuyerId))
                .containsExactly(regularProductId);

        long orderId = marketplace.createOrder(
                firstBuyerId, regularProductId, 1, "order-first", null
        );
        assertThat(marketplace.createOrder(
                firstBuyerId, regularProductId, 1, "order-first", null
        )).isEqualTo(orderId);
        assertThat(marketplace.purchaseOrders(firstBuyerId, -100123L))
                .singleElement()
                .satisfies(row -> {
                    assertThat(((Number) row.get("id")).longValue()).isEqualTo(orderId);
                    assertThat(row.get("payment_details"))
                            .isEqualTo("+70000000000 / карта 0000");
                });
        assertThat(marketplace.salesOrders(sellerId, -100123L))
                .singleElement()
                .satisfies(row -> {
                    assertThat(((Number) row.get("id")).longValue()).isEqualTo(orderId);
                    assertThat(row.get("buyer_phone")).isEqualTo("+70000000001");
                });
        assertThat(marketplace.notifications(sellerId))
                .anySatisfy(row -> {
                    assertThat(row.get("title")).isEqualTo("Новый заказ");
                    assertThat(String.valueOf(row.get("body")))
                            .contains("Brake fluid", "Заказ: #" + orderId,
                                    "Сумма покупателя");
                });

        marketplace.advanceOrder(orderId, firstBuyerId, "PAID");
        marketplace.advanceOrder(orderId, sellerId, "SHIPPED");
        marketplace.advanceOrder(orderId, firstBuyerId, "COMPLETED");
        marketplace.createReview(firstBuyerId, orderId, 5);
        marketplace.createReview(firstBuyerId, orderId, 5);

        assertThat(jdbc.queryForObject(
                "SELECT status FROM orders WHERE id = ?", String.class, orderId
        )).isEqualTo("COMPLETED");
        assertThat(marketplace.purchaseOrders(firstBuyerId, -100123L))
                .singleElement()
                .satisfies(row ->
                        assertThat(((Number) row.get("review_rating")).intValue())
                                .isEqualTo(5));
        assertThat(marketplace.catalog(-100123L))
                .filteredOn(row ->
                        ((Number) row.get("id")).longValue() == regularProductId)
                .singleElement()
                .satisfies(row -> {
                    assertThat(((Number) row.get("rating")).doubleValue())
                            .isEqualTo(5.0);
                    assertThat(((Number) row.get("store_rating")).doubleValue())
                            .isEqualTo(5.0);
                });
        assertThat(marketplace.notifications(sellerId)).isNotEmpty();

        var cartOrderIds = marketplace.createOrders(
                secondBuyerId,
                "cart-order",
                java.util.List.of(
                        new MarketplaceService.OrderItem(regularProductId, 1, null),
                        new MarketplaceService.OrderItem(regularProductId, 1, null)
                )
        );
        assertThat(cartOrderIds).hasSize(2);
        assertThat(marketplace.createOrders(
                secondBuyerId,
                "cart-order",
                java.util.List.of(
                        new MarketplaceService.OrderItem(regularProductId, 1, null),
                        new MarketplaceService.OrderItem(regularProductId, 1, null)
                )
        )).containsExactlyElementsOf(cartOrderIds);
        assertThat(jdbc.queryForObject(
                "SELECT stock FROM products WHERE id = ?", Integer.class, regularProductId
        )).isZero();
        cartOrderIds.forEach(id ->
                marketplace.advanceOrder(id, secondBuyerId, "CANCELLED")
        );
        assertThat(jdbc.queryForObject(
                "SELECT stock FROM products WHERE id = ?", Integer.class, regularProductId
        )).isEqualTo(2);

        marketplace.updateSellerProduct(
                sellerId,
                regularProductId,
                new MarketplaceService.UpdateProduct(
                        "Brake fluid Pro", "Updated fluid", "DOT 4, 1 л", "Track brakes",
                        4, 120_000L,
                        "[\"https://example.test/black.jpg\",\"https://example.test/blue.jpg\"]",
                        """
                        [
                          {"key":"black","name":"Чёрный","hex":"#111111",
                           "images":["https://example.test/black.jpg"]},
                          {"key":"blue","name":"Синий","hex":"#246bdb",
                           "images":["https://example.test/blue.jpg"]}
                        ]
                        """
                )
        );
        assertThat(marketplace.sellerProducts(sellerId, -100123L))
                .anySatisfy(row -> {
                    assertThat(row.get("title")).isEqualTo("Brake fluid Pro");
                    assertThat(String.valueOf(row.get("color_variants")))
                            .contains("\"black\"", "\"blue\"");
                });
        assertThat(marketplace.categories())
                .anySatisfy(row -> assertThat(row.get("name")).isEqualTo("Track brakes"));
        assertThat(jdbc.queryForObject(
                "SELECT commission_debt_kopecks FROM users WHERE telegram_id = ?",
                Long.class, sellerId
        )).isEqualTo(14_500L);
        assertThat(jdbc.queryForObject("""
                SELECT commission_debt_kopecks FROM seller_group_finance
                WHERE group_id = ? AND seller_telegram_id = ?
                """, Long.class, groupId, sellerId)).isEqualTo(10_150L);
        assertThat(marketplace.sellerProfile(sellerId, -100123L))
                .satisfies(profile -> {
                    assertThat(profile.get("has_store")).isEqualTo(true);
                    assertThat(((Number) profile.get("listing_count")).intValue())
                            .isEqualTo(2);
                    assertThat(((Number) profile.get("completed_sales")).intValue())
                            .isEqualTo(1);
                    assertThat(((Number) profile.get("sold_units")).intValue())
                            .isEqualTo(1);
                    assertThat(((Number) profile.get("rating")).doubleValue())
                            .isEqualTo(5.0);
                });

        long discussionMessageId = marketplace.addProductDiscussionMessage(
                regularProductId, firstBuyerId, "Подойдёт ли для зимы?"
        );
        assertThat(discussionMessageId).isPositive();
        assertThat(marketplace.productDiscussion(regularProductId))
                .singleElement()
                .satisfies(row -> {
                    assertThat(row.get("body")).isEqualTo("Подойдёт ли для зимы?");
                    assertThat(((Number) row.get("author_telegram_id")).longValue())
                            .isEqualTo(firstBuyerId);
                });

        marketplace.setSellerProductActive(sellerId, regularProductId, false);
        assertThat(marketplace.sellerProducts(sellerId, -100123L))
                .filteredOn(row -> ((Number) row.get("id")).longValue() == regularProductId)
                .singleElement()
                .satisfies(row -> assertThat(row.get("active")).isEqualTo(0));
        marketplace.deleteSellerProduct(sellerId, regularProductId);
        assertThat(marketplace.sellerProducts(sellerId, -100123L)).hasSize(1);

        marketplace.updateGlobalSettings(0, 50_000L, "СБП +7 900 000-00-00");
        assertThat(((Number) marketplace.globalSettings()
                .get("bot_commission_percent")).doubleValue()).isZero();
        assertThat(marketplace.globalSettings().get("payment_details"))
                .isEqualTo("СБП +7 900 000-00-00");

        long reportId = marketplace.submitSellerReport(
                firstBuyerId, orderId, "Продавец долго не отвечал"
        );
        assertThat(marketplace.sellerReports())
                .singleElement()
                .satisfies(row -> assertThat(
                        ((Number) row.get("id")).longValue()
                ).isEqualTo(reportId));
        marketplace.resolveSellerReport(reportId, 1L, "DISMISS");
        assertThat(marketplace.sellerReports())
                .singleElement()
                .satisfies(row -> assertThat(row.get("status")).isEqualTo("DISMISSED"));
        assertThat(marketplace.users("seller"))
                .anySatisfy(row ->
                        assertThat(((Number) row.get("telegram_id")).longValue())
                                .isEqualTo(sellerId));
        marketplace.updateGroupAsSuperAdmin(groupId, 4.5, 75_000L, true);
        assertThat(marketplace.groups())
                .singleElement()
                .satisfies(row -> {
                    assertThat(((Number) row.get("commission_percent")).doubleValue())
                            .isEqualTo(4.5);
                    assertThat(((Number) row.get("debt_limit_kopecks")).longValue())
                            .isEqualTo(75_000L);
                });
        long groupReportId = marketplace.submitGroupBuyReport(
                firstBuyerId, groupBuyId, "Не сообщили точную дату доставки"
        );
        assertThat(marketplace.sellerReports())
                .anySatisfy(row -> {
                    assertThat(((Number) row.get("id")).longValue())
                            .isEqualTo(groupReportId);
                    assertThat(((Number) row.get("group_buy_id")).longValue())
                            .isEqualTo(groupBuyId);
                });

        assertThat(marketplace.purchaseOrders(firstBuyerId, -100123L)).isNotEmpty();
        assertThat(marketplace.groupBuyPurchases(firstBuyerId, -100123L)).isNotEmpty();
        marketplace.setGlobalUserBan(sellerId, true);
        assertThat(marketplace.catalog(-100123L)).isEmpty();
        assertThat(marketplace.purchaseOrders(firstBuyerId, -100123L)).isEmpty();
        assertThat(marketplace.groupBuyPurchases(firstBuyerId, -100123L)).isEmpty();
        assertThat(marketplace.notifications(firstBuyerId))
                .anySatisfy(row -> {
                    assertThat(row.get("title"))
                            .isEqualTo("Продавец заблокирован модерацией");
                    assertThat(String.valueOf(row.get("body")))
                            .contains("Мои покупки", "подтверждение платежа");
                });

        marketplace.setGlobalUserBan(sellerId, false);
        assertThat(marketplace.catalog(-100123L)).isNotEmpty();
        assertThat(marketplace.purchaseOrders(firstBuyerId, -100123L)).isNotEmpty();
        assertThat(marketplace.groupBuyPurchases(firstBuyerId, -100123L)).isNotEmpty();
        marketplace.setGroupSellerBan(-100123L, sellerId, sellerId, true);
        assertThat(marketplace.purchaseOrders(firstBuyerId, -100123L)).isEmpty();
        assertThat(marketplace.groupBuyPurchases(firstBuyerId, -100123L)).isEmpty();
        marketplace.setGroupSellerBan(-100123L, sellerId, sellerId, false);
        assertThat(marketplace.catalog(-100123L)).isNotEmpty();

        marketplace.updatePlatformSellerFinance(sellerId, 5.0, 10_000L);
        assertThat(marketplace.catalog(-100123L)).isEmpty();
        marketplace.updatePlatformSellerFinance(sellerId, 5.0, 50_000L);
        assertThat(marketplace.catalog(-100123L)).isNotEmpty();

        marketplace.updateGroupSellerFinance(
                -100123L, sellerId, sellerId, 3.5, 10_000L
        );
        assertThat(marketplace.catalog(-100123L)).isEmpty();
        marketplace.repayGroupSellerDebt(
                -100123L, sellerId, sellerId, 10_150L
        );
        assertThat(marketplace.catalog(-100123L)).isNotEmpty();

        marketplace.setSuperAdmin(firstBuyerId, true);
        assertThat(marketplace.isSuperAdmin(firstBuyerId)).isTrue();

        MarketplaceService.ClearResult cleared = marketplace.clearMarketplaceData();
        assertThat(cleared.stores()).isEqualTo(1);
        assertThat(cleared.products()).isEqualTo(2);
        assertThat(cleared.orders()).isEqualTo(3);
        assertThat(cleared.groupBuys()).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM telegram_groups", Integer.class
        )).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM users", Integer.class
        )).isEqualTo(4);
        assertThat(marketplace.isSuperAdmin(firstBuyerId)).isTrue();
        assertThat(marketplace.catalog(-100123L)).isEmpty();
        assertThat(marketplace.purchaseOrders(firstBuyerId, -100123L)).isEmpty();
        assertThat(marketplace.notifications(firstBuyerId)).isEmpty();
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM product_discussion_messages", Integer.class
        )).isZero();
        assertThat(marketplace.categories())
                .extracting(row -> String.valueOf(row.get("name")))
                .contains("Колодки", "Масла и автохимия", "Тормоза")
                .doesNotContain("Track brakes", "Brakes");
    }
}
