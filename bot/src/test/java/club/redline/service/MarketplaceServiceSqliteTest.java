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
        marketplace.createCategory("Brakes");
        marketplace.registerGroup(-100123L, "REDLINE Test", sellerId, 7);

        Long groupId = jdbc.queryForObject(
                "SELECT id FROM telegram_groups WHERE telegram_group_id = ?",
                Long.class, -100123L
        );
        marketplace.createStore(sellerId, new MarketplaceService.NewStore(
                groupId, "Garage", "Test store", "+70000000000 / карта 0000"
        ));
        long productId = marketplace.createProduct(sellerId, new MarketplaceService.NewProduct(
                groupId, "Brake kit", "Track brake kit", "Brakes",
                10, 100_000L, "GROUP_BUY", "[]", 2, 7
        ));
        Long groupBuyId = jdbc.queryForObject(
                "SELECT id FROM group_buys WHERE product_id = ?", Long.class, productId
        );

        assertThat(marketplace.reserve(groupBuyId, firstBuyerId, "+70000000001")
                .thresholdReached()).isFalse();
        assertThat(marketplace.reserve(groupBuyId, secondBuyerId, "+70000000002")
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
                        groupId, "Brake fluid", "Racing fluid", "Brakes",
                        3, 100_000L, "REGULAR", "[]", null, null
                )
        );
        assertThat(marketplace.sellerProducts(sellerId, -100123L)).hasSize(2);

        long orderId = marketplace.createOrder(firstBuyerId, regularProductId);
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

        marketplace.advanceOrder(orderId, firstBuyerId, "PAID");
        marketplace.advanceOrder(orderId, sellerId, "SHIPPED");
        marketplace.advanceOrder(orderId, firstBuyerId, "COMPLETED");

        assertThat(jdbc.queryForObject(
                "SELECT status FROM orders WHERE id = ?", String.class, orderId
        )).isEqualTo("COMPLETED");
        assertThat(marketplace.notifications(sellerId)).isNotEmpty();

        long cancelledOrderId = marketplace.createOrder(secondBuyerId, regularProductId);
        marketplace.advanceOrder(cancelledOrderId, secondBuyerId, "CANCELLED");
        assertThat(jdbc.queryForObject(
                "SELECT stock FROM products WHERE id = ?", Integer.class, regularProductId
        )).isEqualTo(2);

        marketplace.updateSellerProduct(
                sellerId,
                regularProductId,
                new MarketplaceService.UpdateProduct(
                        "Brake fluid Pro", "Updated fluid", "Brakes",
                        4, 120_000L, "[]"
                )
        );
        assertThat(marketplace.sellerProducts(sellerId, -100123L))
                .anySatisfy(row ->
                        assertThat(row.get("title")).isEqualTo("Brake fluid Pro"));
        assertThat(jdbc.queryForObject(
                "SELECT commission_debt_kopecks FROM users WHERE telegram_id = ?",
                Long.class, sellerId
        )).isEqualTo(8_500L);

        marketplace.setSellerProductActive(sellerId, regularProductId, false);
        assertThat(marketplace.sellerProducts(sellerId, -100123L))
                .filteredOn(row -> ((Number) row.get("id")).longValue() == regularProductId)
                .singleElement()
                .satisfies(row -> assertThat(row.get("active")).isEqualTo(0));
        marketplace.deleteSellerProduct(sellerId, regularProductId);
        assertThat(marketplace.sellerProducts(sellerId, -100123L)).hasSize(1);

        marketplace.updateGlobalSettings(0, 50_000L);
        assertThat(((Number) marketplace.globalSettings()
                .get("bot_commission_percent")).doubleValue()).isZero();

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
    }
}
