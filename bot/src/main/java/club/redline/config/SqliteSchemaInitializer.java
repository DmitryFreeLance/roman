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

        RedlineProperties.Marketplace marketplace = properties.marketplace();
        new JdbcTemplate(dataSource).update("""
                UPDATE platform_settings
                SET bot_commission_percent = ?,
                    default_debt_limit_kopecks = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE singleton = 1
                """, marketplace.botCommissionPercent(),
                marketplace.defaultDebtLimitKopecks());
    }
}
