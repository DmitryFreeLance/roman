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
        if (!columns.contains("selected_group_id")) {
            jdbc.execute("ALTER TABLE users ADD COLUMN selected_group_id INTEGER");
        }
        if (!columns.contains("super_admin")) {
            jdbc.execute("ALTER TABLE users ADD COLUMN super_admin INTEGER NOT NULL DEFAULT 0");
        }
    }

    private void ensureStoreColumns(JdbcTemplate jdbc) {
        Set<String> columns = columns(jdbc, "stores");
        if (!columns.contains("payment_details")) {
            jdbc.execute("ALTER TABLE stores ADD COLUMN payment_details TEXT");
        }
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

    private void ensureProductColumns(JdbcTemplate jdbc) {
        Set<String> columns = columns(jdbc, "products");
        if (!columns.contains("deleted")) {
            jdbc.execute("ALTER TABLE products ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0");
        }
    }

    private void ensureGroupColumns(JdbcTemplate jdbc) {
        Set<String> columns = columns(jdbc, "telegram_groups");
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
    }

    private void ensureFinancialColumns(JdbcTemplate jdbc) {
        Set<String> platformColumns = columns(jdbc, "platform_settings");
        if (!platformColumns.contains("payment_details")) {
            jdbc.execute("ALTER TABLE platform_settings ADD COLUMN payment_details TEXT NOT NULL DEFAULT ''");
        }
        Set<String> orderColumns = columns(jdbc, "orders");
        if (!orderColumns.contains("platform_commission_kopecks")) {
            jdbc.execute("ALTER TABLE orders ADD COLUMN platform_commission_kopecks INTEGER NOT NULL DEFAULT 0");
        }
        if (!orderColumns.contains("group_commission_kopecks")) {
            jdbc.execute("ALTER TABLE orders ADD COLUMN group_commission_kopecks INTEGER NOT NULL DEFAULT 0");
        }
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
