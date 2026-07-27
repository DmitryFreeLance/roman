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
                groupId, "Garage", "Test store", "+70000000000", "0000"
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
    }
}
