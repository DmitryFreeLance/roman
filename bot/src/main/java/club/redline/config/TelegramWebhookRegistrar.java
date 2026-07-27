package club.redline.config;

import club.redline.service.TelegramApiClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class TelegramWebhookRegistrar {
    private static final Logger log = LoggerFactory.getLogger(TelegramWebhookRegistrar.class);
    private final TelegramApiClient telegram;
    private final RedlineProperties properties;

    public TelegramWebhookRegistrar(TelegramApiClient telegram, RedlineProperties properties) {
        this.telegram = telegram;
        this.properties = properties;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void register() {
        String token = properties.telegram().token();
        String baseUrl = properties.telegram().publicBaseUrl();
        if (token == null || token.isBlank() || baseUrl == null ||
                !baseUrl.startsWith("https://")) {
            log.info("Telegram webhook registration skipped until production HTTPS settings are provided");
            return;
        }
        telegram.setWebhook();
        log.info("Telegram webhook registered");
    }
}
