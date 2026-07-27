package club.redline.web;

import club.redline.config.RedlineProperties;
import club.redline.service.MarketplaceService;
import club.redline.service.TelegramApiClient;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/telegram")
public class TelegramWebhookController {
    private final TelegramApiClient telegram;
    private final MarketplaceService marketplace;
    private final RedlineProperties properties;

    public TelegramWebhookController(TelegramApiClient telegram, MarketplaceService marketplace,
                                     RedlineProperties properties) {
        this.telegram = telegram;
        this.marketplace = marketplace;
        this.properties = properties;
    }

    @PostMapping("/webhook/{secret}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void webhook(@PathVariable String secret,
                        @RequestHeader(value = "X-Telegram-Bot-Api-Secret-Token", required = false)
                        String secretHeader,
                        @RequestBody JsonNode update) {
        if (!properties.telegram().webhookSecret().equals(secret) ||
                !properties.telegram().webhookSecret().equals(secretHeader)) {
            throw new UnauthorizedException();
        }
        JsonNode memberUpdate = update.path("my_chat_member");
        if (!memberUpdate.isMissingNode()) {
            handleMembership(memberUpdate);
            return;
        }
        JsonNode message = update.path("message");
        if (message.path("text").asText("").startsWith("/start")) {
            long chatId = message.path("chat").path("id").asLong();
            telegram.sendMiniAppButton(chatId, """
                    <b>REDLINE CLUB</b>
                    Автотовары, проверенные продавцы и групповые закупки вашего клуба.
                    """);
        }
    }

    private void handleMembership(JsonNode update) {
        String status = update.path("new_chat_member").path("status").asText();
        if (!"administrator".equals(status) && !"member".equals(status)) return;
        JsonNode chat = update.path("chat");
        if (!chat.path("is_forum").asBoolean()) {
            telegram.sendMessage(chat.path("id").asLong(),
                    "Для работы REDLINE включите темы в настройках группы.");
            return;
        }
        long groupId = chat.path("id").asLong();
        int threadId = telegram.createShopTopic(groupId);
        long ownerId = update.path("from").path("id").asLong();
        marketplace.registerGroup(groupId, chat.path("title").asText("Автоклуб"), ownerId, threadId);
        telegram.sendMessage(groupId,
                "<b>REDLINE подключён.</b>\nТема «Магазин» создана. Откройте Mini App для настройки.");
    }

    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    private static class UnauthorizedException extends RuntimeException {}
}
