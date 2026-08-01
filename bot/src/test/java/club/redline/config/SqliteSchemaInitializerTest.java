package club.redline.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.jdbc.datasource.init.DatabasePopulatorUtils;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;

import static org.assertj.core.api.Assertions.assertThat;

class SqliteSchemaInitializerTest {
    private final SingleConnectionDataSource dataSource =
            new SingleConnectionDataSource("jdbc:sqlite::memory:", true);

    @AfterEach
    void closeConnection() {
        dataSource.destroy();
    }

    @Test
    void createsSchemaIdempotentlyAndEnablesForeignKeys() {
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator(
                new ClassPathResource("db/schema-sqlite.sql")
        );
        DatabasePopulatorUtils.execute(populator, dataSource);
        DatabasePopulatorUtils.execute(populator, dataSource);

        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        Integer foreignKeys = jdbc.queryForObject("PRAGMA foreign_keys", Integer.class);
        Integer tables = jdbc.queryForObject("""
                SELECT COUNT(*) FROM sqlite_master
                WHERE type = 'table' AND name IN (
                  'users', 'telegram_groups', 'stores', 'products',
                  'group_buys', 'group_buy_reservations', 'orders', 'reviews',
                  'notifications', 'seller_reports', 'favorites',
                  'product_discussion_messages', 'support_requests'
                )
                """, Integer.class);
        Integer settings = jdbc.queryForObject(
                "SELECT COUNT(*) FROM platform_settings", Integer.class
        );
        Integer businessRows = jdbc.queryForObject("""
                SELECT
                  (SELECT COUNT(*) FROM users) +
                  (SELECT COUNT(*) FROM telegram_groups) +
                  (SELECT COUNT(*) FROM categories) +
                  (SELECT COUNT(*) FROM products)
                """, Integer.class);

        assertThat(foreignKeys).isEqualTo(1);
        assertThat(tables).isEqualTo(13);
        assertThat(settings).isEqualTo(1);
        assertThat(businessRows).isEqualTo(9);
        assertThat(jdbc.queryForList(
                "SELECT name FROM categories ORDER BY sort_order",
                String.class
        )).contains("Колодки", "Масла и автохимия", "Тормоза");
        assertThat(jdbc.queryForList(
                "PRAGMA table_info(stores)"
        )).extracting(row -> String.valueOf(row.get("name")))
                .contains("payment_bank", "payment_phone",
                        "payment_recipient_name", "payment_sbp_link");
        assertThat(jdbc.queryForList(
                "PRAGMA table_info(telegram_groups)"
        )).extracting(row -> String.valueOf(row.get("name")))
                .contains("image_url", "payment_bank", "payment_phone",
                        "payment_recipient_name", "payment_sbp_link");
        assertThat(jdbc.queryForList(
                "PRAGMA table_info(orders)"
        )).extracting(row -> String.valueOf(row.get("name")))
                .contains("fulfillment_details");
        assertThat(jdbc.queryForList(
                "PRAGMA table_info(platform_settings)"
        )).extracting(row -> String.valueOf(row.get("name")))
                .contains("payment_bank", "payment_phone",
                        "payment_recipient_name", "payment_sbp_link");
    }
}
