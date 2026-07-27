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
        Set<String> columns = jdbc.queryForList("PRAGMA table_info(users)").stream()
                .map(row -> String.valueOf(row.get("name")))
                .collect(Collectors.toSet());
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
    }
}
