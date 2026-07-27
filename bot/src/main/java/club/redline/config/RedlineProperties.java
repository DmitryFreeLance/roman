package club.redline.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "redline")
public record RedlineProperties(
        Telegram telegram,
        Marketplace marketplace
) {
    public record Telegram(
            String token,
            String webhookSecret,
            String miniAppUrl,
            String publicBaseUrl
    ) {}

    public record Marketplace(
            long superAdminTelegramId,
            double botCommissionPercent,
            long defaultDebtLimitKopecks
    ) {}
}
