package club.redline.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "redline")
public record RedlineProperties(
        Telegram telegram,
        Marketplace marketplace,
        Storage storage
) {
    public record Telegram(
            String token,
            String miniAppUrl,
            int pollingTimeoutSeconds
    ) {}

    public record Marketplace(
            long superAdminTelegramId,
            double botCommissionPercent,
            long defaultDebtLimitKopecks
    ) {}

    public record Storage(
            String uploadDir,
            String publicApiUrl
    ) {}
}
