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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
        marketplace.registerProfile(firstBuyerId, "Buyer One", "80000000001");
        marketplace.registerProfile(secondBuyerId, "Buyer Two", "+70000000002");
        assertThat(jdbc.queryForObject(
                "SELECT phone FROM users WHERE telegram_id = ?",
                String.class, firstBuyerId
        )).isEqualTo("+70000000001");
        marketplace.registerGroup(-100123L, "REDLINE Test", sellerId, 7);
        marketplace.updateGroupImage(
                -100123L, sellerId, "https://example.test/club.jpg"
        );
        marketplace.updateGroupCommission(
                -100123L, sellerId, 3.5, "TBANK", "89990000001",
                "Администратор клуба А.",
                "https://qr.nspk.ru/AS40003P3RH0LJ2A9ROO038L6NT5RU1M"
        );
        assertThat(marketplace.availableGroups()).singleElement()
                .satisfies(row -> assertThat(row.get("image_url"))
                        .isEqualTo("https://example.test/club.jpg"));
        assertThat(marketplace.groupAdminStats(-100123L, sellerId)
                .get("payment_phone")).isEqualTo("+79990000001");

        Long groupId = jdbc.queryForObject(
                "SELECT id FROM telegram_groups WHERE telegram_group_id = ?",
                Long.class, -100123L
        );
        marketplace.createStore(sellerId, new MarketplaceService.NewStore(
                groupId, "Garage", "Test store",
                "https://example.test/store.jpg",
                "SBER", "+7 000 000-00-00", "Иван Иванович И.",
                "https://qr.nspk.ru/AS10003P3RH0LJ2A9ROO038L6NT5RU1M"
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
                "https://example.test/store-profile.jpg",
                "TBANK", "+7 999 000-00-00", "Пётр Петрович П.",
                "https://qr.nspk.ru/AS20003P3RH0LJ2A9ROO038L6NT5RU1M"
        );
        assertThat(marketplace.myStore(sellerId, -100123L).get("image_url"))
                .isEqualTo("https://example.test/store-profile.jpg");
        assertThat(marketplace.myStore(sellerId, -100123L).get("name"))
                .isEqualTo("Garage Pro");
        assertThat(marketplace.sellerProfile(sellerId, -100123L)
                .get("payment_bank")).isEqualTo("TBANK");
        assertThat(marketplace.sellerProfile(sellerId, -100123L)
                .get("payment_phone")).isEqualTo("+79990000000");
        assertThat(marketplace.sellerProfile(sellerId, -100123L)
                .get("payment_recipient_name")).isEqualTo("Пётр Петрович П.");
        assertThat(marketplace.sellerProfile(sellerId, -100123L)
                .get("payment_sbp_link")).isEqualTo(
                        "https://qr.nspk.ru/AS20003P3RH0LJ2A9ROO038L6NT5RU1M"
                );
        Long groupBuyId = jdbc.queryForObject(
                "SELECT id FROM group_buys WHERE product_id = ?", Long.class, productId
        );

        assertThat(marketplace.reserve(groupBuyId, firstBuyerId, "+70000000001", "black")
                .thresholdReached()).isFalse();
        assertThat(marketplace.reserve(groupBuyId, secondBuyerId, "+70000000002", "blue")
                .thresholdReached()).isTrue();
        assertThat(marketplace.cancelReservation(groupBuyId, secondBuyerId).reserved())
                .isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "SELECT status FROM group_buys WHERE id = ?", String.class, groupBuyId
        )).isEqualTo("COLLECTING");
        assertThat(marketplace.updateGroupBuyTarget(groupBuyId, sellerId, 3).target())
                .isEqualTo(3);
        marketplace.updateGroupBuyTarget(groupBuyId, sellerId, 2);
        assertThat(marketplace.reserve(
                groupBuyId, secondBuyerId, "+70000000002", "blue"
        ).thresholdReached()).isTrue();

        marketplace.openPayment(groupBuyId, sellerId, 95_000L, 24);
        assertThat(marketplace.groupBuyPurchases(firstBuyerId, -100123L))
                .singleElement()
                .satisfies(row -> {
                    assertThat(row.get("group_buy_status")).isEqualTo("AWAITING_PAYMENT");
                    assertThat(((Number) row.get("final_price_kopecks")).longValue())
                            .isEqualTo(103_075L);
                    assertThat(row.get("payment_bank")).isEqualTo("TBANK");
                    assertThat(row.get("payment_phone")).isEqualTo("+79990000000");
                    assertThat(row.get("payment_sbp_link")).isEqualTo(
                            "https://qr.nspk.ru/AS20003P3RH0LJ2A9ROO038L6NT5RU1M"
                    );
                    assertThat(row.get("seller_phone")).isEqualTo("+70000000000");
                    assertThat(row.get("payment_recipient_name"))
                            .isEqualTo("Пётр Петрович П.");
                    assertThat(row.get("selected_color_name")).isEqualTo("Чёрный");
                });
        marketplace.markGroupBuyPaid(groupBuyId, firstBuyerId);
        marketplace.markGroupBuyPaid(groupBuyId, secondBuyerId);
        marketplace.confirmGroupBuy(groupBuyId, sellerId);

        assertThat(jdbc.queryForObject(
                "SELECT status FROM group_buys WHERE id = ?", String.class, groupBuyId
        )).isEqualTo("FORMED");
        assertThat(marketplace.groupBuyBuyers(groupBuyId, sellerId)).hasSize(2);
        assertThat(marketplace.catalog(-100123L)).isEmpty();

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
                firstBuyerId, regularProductId, 1, "order-first", null,
                "Самовывоз, телефон +70000000001"
        );
        assertThat(marketplace.createOrder(
                firstBuyerId, regularProductId, 1, "order-first", null,
                "Самовывоз, телефон +70000000001"
        )).isEqualTo(orderId);
        assertThat(marketplace.purchaseOrders(firstBuyerId, -100123L))
                .singleElement()
                .satisfies(row -> {
                    assertThat(((Number) row.get("id")).longValue()).isEqualTo(orderId);
                    assertThat(row.get("payment_bank")).isEqualTo("TBANK");
                    assertThat(row.get("payment_phone")).isEqualTo("+79990000000");
                    assertThat(row.get("payment_sbp_link")).isEqualTo(
                            "https://qr.nspk.ru/AS20003P3RH0LJ2A9ROO038L6NT5RU1M"
                    );
                    assertThat(row.get("seller_phone")).isEqualTo("+70000000000");
                    assertThat(row.get("payment_recipient_name"))
                            .isEqualTo("Пётр Петрович П.");
                    assertThat(row.get("fulfillment_details"))
                            .isEqualTo("Самовывоз, телефон +70000000001");
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
                    assertThat(row.get("target_screen")).isEqualTo("sales");
                    assertThat(String.valueOf(row.get("body")))
                            .contains("Brake fluid", "Заказ: #" + orderId,
                                    "Сумма покупателя");
                });

        marketplace.advanceOrder(orderId, firstBuyerId, "PAID");
        assertThat(marketplace.notifications(sellerId))
                .anySatisfy(row -> {
                    assertThat(row.get("title"))
                            .isEqualTo("Покупатель подтвердил оплату");
                    assertThat(row.get("target_screen")).isEqualTo("sales");
                });
        marketplace.advanceOrder(orderId, sellerId, "SHIPPED");
        assertThat(marketplace.notifications(firstBuyerId))
                .anySatisfy(row -> {
                    assertThat(row.get("title")).isEqualTo("Продавец отправил заказ");
                    assertThat(row.get("target_screen")).isEqualTo("orders");
                });
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
                "СДЭК, пункт выдачи 123",
                java.util.List.of(
                        new MarketplaceService.OrderItem(regularProductId, 1, null),
                        new MarketplaceService.OrderItem(regularProductId, 1, null)
                )
        );
        assertThat(cartOrderIds).hasSize(2);
        assertThat(marketplace.createOrders(
                secondBuyerId,
                "cart-order",
                "СДЭК, пункт выдачи 123",
                java.util.List.of(
                        new MarketplaceService.OrderItem(regularProductId, 1, null),
                        new MarketplaceService.OrderItem(regularProductId, 1, null)
                )
        )).containsExactlyElementsOf(cartOrderIds);
        assertThat(jdbc.queryForObject(
                "SELECT stock FROM products WHERE id = ?", Integer.class, regularProductId
        )).isZero();
        assertThat(marketplace.catalog(-100123L)).isEmpty();
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
        long colorOrderId = marketplace.createOrder(
                secondBuyerId, regularProductId, 2, "color-order", "black",
                "Самовывоз"
        );
        assertThatThrownBy(() -> marketplace.createOrder(
                firstBuyerId, regularProductId, 1, "color-order-overflow", "black",
                "Самовывоз"
        )).hasMessageContaining("Недостаточно выбранного цвета");
        assertThat(marketplace.catalog(-100123L))
                .filteredOn(row ->
                        ((Number) row.get("id")).longValue() == regularProductId)
                .singleElement()
                .satisfies(row -> {
                    assertThat(((Number) row.get("stock")).intValue()).isEqualTo(2);
                    assertThat(String.valueOf(row.get("color_variants")))
                            .contains("\"key\":\"black\"", "\"stock\":0",
                                    "\"key\":\"blue\"", "\"stock\":2");
                });
        marketplace.advanceOrder(
                colorOrderId, secondBuyerId, "CANCELLED"
        );
        assertThat(marketplace.catalog(-100123L))
                .filteredOn(row ->
                        ((Number) row.get("id")).longValue() == regularProductId)
                .singleElement()
                .satisfies(row -> {
                    assertThat(((Number) row.get("stock")).intValue()).isEqualTo(4);
                    assertThat(String.valueOf(row.get("color_variants")))
                            .contains("\"key\":\"black\"", "\"stock\":2");
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
        marketplace.createProduct(
                sellerId,
                new MarketplaceService.NewProduct(
                        groupId, "Brake pads", "Street pads", "Передняя ось",
                        "Brakes", 5, 50_000L, "REGULAR", "[]", "[]", null, null
                )
        );
        jdbc.update(
                "UPDATE stores SET payment_phone = '' WHERE id = ?",
                storeId
        );
        assertThat(marketplace.catalog(-100123L))
                .anySatisfy(row ->
                        assertThat(row.get("seller_phone"))
                                .isEqualTo("+70000000000"));
        assertThat(marketplace.commissionDebts())
                .singleElement()
                .satisfies(row ->
                        assertThat(row.get("phone"))
                                .isEqualTo("+70000000000"));

        marketplace.updateGlobalSettings(
                0, 50_000L, "GAZPROM", "+7 900 000-00-00",
                "Администратор А.",
                "https://c2c.cbrpay.ru/BS1I004GI73TM0HS85T8Q092TI8AK25Q"
        );
        assertThat(((Number) marketplace.globalSettings()
                .get("bot_commission_percent")).doubleValue()).isZero();
        assertThat(marketplace.globalSettings().get("payment_bank"))
                .isEqualTo("GAZPROM");
        assertThat(marketplace.globalSettings().get("payment_phone"))
                .isEqualTo("+79000000000");
        assertThat(marketplace.globalSettings().get("payment_sbp_link"))
                .isEqualTo("https://c2c.cbrpay.ru/BS1I004GI73TM0HS85T8Q092TI8AK25Q");

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
        long supportId = marketplace.submitSupportRequest(
                firstBuyerId, "На экране корзины не помещается длинный адрес"
        );
        assertThat(marketplace.supportRequests())
                .singleElement()
                .satisfies(row -> {
                    assertThat(((Number) row.get("id")).longValue())
                            .isEqualTo(supportId);
                    assertThat(row.get("status")).isEqualTo("PENDING");
                    assertThat(row.get("message")).asString()
                            .contains("экране корзины");
                });
        marketplace.resolveSupportRequest(supportId, 1L);
        assertThat(marketplace.supportRequests())
                .singleElement()
                .satisfies(row -> assertThat(row.get("status"))
                        .isEqualTo("RESOLVED"));
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
                            .contains("Мои заказы", "подтверждение платежа");
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
        assertThat(cleared.products()).isEqualTo(3);
        assertThat(cleared.orders()).isEqualTo(4);
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
