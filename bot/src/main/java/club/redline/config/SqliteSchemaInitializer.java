package club.redline.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.DatabasePopulatorUtils;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SqliteSchemaInitializer implements ApplicationRunner {
    private final DataSource dataSource;
    private final RedlineProperties properties;

    public SqliteSchemaInitializer(DataSource dataSource, RedlineProperties properties) {
        this.dataSource = dataSource;
        this.properties = properties;
    }

    @Override
    public void run(ApplicationArguments args) {
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
        populator.setContinueOnError(false);
        populator.addScript(new ClassPathResource("db/schema-sqlite.sql"));
        DatabasePopulatorUtils.execute(populator, dataSource);

        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        ensureUserProfileColumns(jdbc);
        ensureStoreColumns(jdbc);
        ensureProductColumns(jdbc);
        ensureGroupColumns(jdbc);
        ensureFinancialColumns(jdbc);

        RedlineProperties.Marketplace marketplace = properties.marketplace();
        jdbc.update("""
                UPDATE platform_settings
                SET bot_commission_percent = ?,
                    default_debt_limit_kopecks = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE singleton = 1
                  AND NOT EXISTS (SELECT 1 FROM users)
                  AND NOT EXISTS (SELECT 1 FROM telegram_groups)
                """, marketplace.botCommissionPercent(),
                marketplace.defaultDebtLimitKopecks());
    }

    private void ensureUserProfileColumns(JdbcTemplate jdbc) {
        Set<String> columns = columns(jdbc, "users");
        if (!columns.contains("display_name")) {
            jdbc.execute("ALTER TABLE users ADD COLUMN display_name TEXT");
        }
        if (!columns.contains("phone")) {
            jdbc.execute("ALTER TABLE users ADD COLUMN phone TEXT");
        }
        if (!columns.contains("registered")) {
            jdbc.execute("ALTER TABLE users ADD COLUMN registered INTEGER NOT NULL DEFAULT 0");
        }
        if (!columns.contains("privacy_accepted_at")) {
            jdbc.execute("ALTER TABLE users ADD COLUMN privacy_accepted_at TEXT");
        }
        if (!columns.contains("selected_group_id")) {
            jdbc.execute("ALTER TABLE users ADD COLUMN selected_group_id INTEGER");
        }
        if (!columns.contains("super_admin")) {
            jdbc.execute("ALTER TABLE users ADD COLUMN super_admin INTEGER NOT NULL DEFAULT 0");
        }
    }

    private void ensureStoreColumns(JdbcTemplate jdbc) {
        Set<String> columns = columns(jdbc, "stores");
        if (!columns.contains("image_url")) {
            jdbc.execute("ALTER TABLE stores ADD COLUMN image_url TEXT");
        }
        if (!columns.contains("payment_details")) {
            jdbc.execute("ALTER TABLE stores ADD COLUMN payment_details TEXT");
        }
        if (!columns.contains("payment_bank")) {
            jdbc.execute("ALTER TABLE stores ADD COLUMN payment_bank TEXT");
        }
        if (!columns.contains("payment_recipient_name")) {
            jdbc.execute("ALTER TABLE stores ADD COLUMN payment_recipient_name TEXT");
        }
        if (!columns.contains("payment_sbp_link")) {
            jdbc.execute("ALTER TABLE stores ADD COLUMN payment_sbp_link TEXT");
        }
        addTextColumn(jdbc, columns, "stores", "offer_seller_name");
        addTextColumn(jdbc, columns, "stores", "offer_inn");
        addTextColumn(jdbc, columns, "stores", "offer_email");
        addTextColumn(jdbc, columns, "stores", "offer_address");
        addTextColumn(jdbc, columns, "stores", "offer_settlement_account");
        addTextColumn(jdbc, columns, "stores", "offer_bank_name");
        addTextColumn(jdbc, columns, "stores", "offer_bik");
        addTextColumn(jdbc, columns, "stores", "offer_correspondent_account");
        addTextColumn(jdbc, columns, "stores", "offer_accepted_at");
        jdbc.update("""
                UPDATE stores
                SET payment_details = COALESCE(
                  NULLIF(payment_details, ''),
                  NULLIF(payment_card, ''),
                  NULLIF(payment_phone, '')
                )
                WHERE payment_details IS NULL OR payment_details = ''
                """);
    }

    private void addTextColumn(JdbcTemplate jdbc, Set<String> columns,
                               String table, String column) {
        if (!columns.contains(column)) {
            jdbc.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " TEXT");
        }
    }

    private void ensureProductColumns(JdbcTemplate jdbc) {
        Set<String> columns = columns(jdbc, "products");
        if (!columns.contains("deleted")) {
            jdbc.execute("ALTER TABLE products ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0");
        }
        if (!columns.contains("specifications")) {
            jdbc.execute("ALTER TABLE products ADD COLUMN specifications TEXT NOT NULL DEFAULT ''");
        }
        if (!columns.contains("color_variants")) {
            jdbc.execute("ALTER TABLE products ADD COLUMN color_variants TEXT NOT NULL DEFAULT '[]'");
        }
    }

    private void ensureGroupColumns(JdbcTemplate jdbc) {
        Set<String> columns = columns(jdbc, "telegram_groups");
        if (!columns.contains("image_url")) {
            jdbc.execute("ALTER TABLE telegram_groups ADD COLUMN image_url TEXT");
        }
        if (!columns.contains("debt_limit_kopecks")) {
            jdbc.execute("""
                    ALTER TABLE telegram_groups
                    ADD COLUMN debt_limit_kopecks INTEGER NOT NULL DEFAULT 50000
                    """);
            jdbc.update("""
                    UPDATE telegram_groups
                    SET debt_limit_kopecks = (
                      SELECT default_debt_limit_kopecks
                      FROM platform_settings WHERE singleton = 1
                    )
                    """);
        }
        if (!columns.contains("payment_details")) {
            jdbc.execute("ALTER TABLE telegram_groups ADD COLUMN payment_details TEXT NOT NULL DEFAULT ''");
        }
        if (!columns.contains("payment_bank")) {
            jdbc.execute("ALTER TABLE telegram_groups ADD COLUMN payment_bank TEXT");
        }
        if (!columns.contains("payment_phone")) {
            jdbc.execute("ALTER TABLE telegram_groups ADD COLUMN payment_phone TEXT");
        }
        if (!columns.contains("payment_recipient_name")) {
            jdbc.execute("ALTER TABLE telegram_groups ADD COLUMN payment_recipient_name TEXT");
        }
        if (!columns.contains("payment_sbp_link")) {
            jdbc.execute("ALTER TABLE telegram_groups ADD COLUMN payment_sbp_link TEXT");
        }
    }

    private void ensureFinancialColumns(JdbcTemplate jdbc) {
        Set<String> sellerFinanceColumns = columns(jdbc, "seller_group_finance");
        if (!sellerFinanceColumns.contains("verified_seller")) {
            jdbc.execute("""
                    ALTER TABLE seller_group_finance
                    ADD COLUMN verified_seller INTEGER NOT NULL DEFAULT 0
                      CHECK (verified_seller IN (0, 1))
                    """);
        }
        Set<String> platformColumns = columns(jdbc, "platform_settings");
        if (!platformColumns.contains("payment_details")) {
            jdbc.execute("ALTER TABLE platform_settings ADD COLUMN payment_details TEXT NOT NULL DEFAULT ''");
        }
        if (!platformColumns.contains("payment_bank")) {
            jdbc.execute("ALTER TABLE platform_settings ADD COLUMN payment_bank TEXT");
        }
        if (!platformColumns.contains("payment_phone")) {
            jdbc.execute("ALTER TABLE platform_settings ADD COLUMN payment_phone TEXT");
        }
        if (!platformColumns.contains("payment_recipient_name")) {
            jdbc.execute("ALTER TABLE platform_settings ADD COLUMN payment_recipient_name TEXT");
        }
        if (!platformColumns.contains("payment_sbp_link")) {
            jdbc.execute("ALTER TABLE platform_settings ADD COLUMN payment_sbp_link TEXT");
        }
        Set<String> orderColumns = columns(jdbc, "orders");
        if (!orderColumns.contains("platform_commission_kopecks")) {
            jdbc.execute("ALTER TABLE orders ADD COLUMN platform_commission_kopecks INTEGER NOT NULL DEFAULT 0");
        }
        if (!orderColumns.contains("group_commission_kopecks")) {
            jdbc.execute("ALTER TABLE orders ADD COLUMN group_commission_kopecks INTEGER NOT NULL DEFAULT 0");
        }
        if (!orderColumns.contains("quantity")) {
            jdbc.execute("ALTER TABLE orders ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1");
        }
        if (!orderColumns.contains("client_request_id")) {
            jdbc.execute("ALTER TABLE orders ADD COLUMN client_request_id TEXT");
        }
        if (!orderColumns.contains("selected_color_key")) {
            jdbc.execute("ALTER TABLE orders ADD COLUMN selected_color_key TEXT");
        }
        if (!orderColumns.contains("selected_color_name")) {
            jdbc.execute("ALTER TABLE orders ADD COLUMN selected_color_name TEXT");
        }
        if (!orderColumns.contains("fulfillment_details")) {
            jdbc.execute("""
                    ALTER TABLE orders
                    ADD COLUMN fulfillment_details TEXT NOT NULL DEFAULT ''
                    """);
        }
        Set<String> reservationColumns = columns(jdbc, "group_buy_reservations");
        if (!reservationColumns.contains("selected_color_key")) {
            jdbc.execute("ALTER TABLE group_buy_reservations ADD COLUMN selected_color_key TEXT");
        }
        if (!reservationColumns.contains("selected_color_name")) {
            jdbc.execute("ALTER TABLE group_buy_reservations ADD COLUMN selected_color_name TEXT");
        }
        jdbc.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS orders_buyer_request_idx
                ON orders(buyer_telegram_id, client_request_id)
                WHERE client_request_id IS NOT NULL
                """);
        jdbc.update("""
                INSERT INTO seller_group_finance
                  (group_id, seller_telegram_id, commission_percent, debt_limit_kopecks)
                SELECT st.group_id, st.seller_telegram_id,
                       g.commission_percent, g.debt_limit_kopecks
                FROM stores st
                JOIN telegram_groups g ON g.id = st.group_id
                ON CONFLICT (group_id, seller_telegram_id) DO NOTHING
                """);
    }

    private Set<String> columns(JdbcTemplate jdbc, String table) {
        return jdbc.queryForList("PRAGMA table_info(" + table + ")").stream()
                .map(row -> String.valueOf(row.get("name")))
                .collect(Collectors.toSet());
    }
}
