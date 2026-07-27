package club.redline.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

@Component
public class TelegramUpdateHandler {
    private final TelegramApiClient telegram;
    private final MarketplaceService marketplace;

    public TelegramUpdateHandler(TelegramApiClient telegram, MarketplaceService marketplace) {
        this.telegram = telegram;
        this.marketplace = marketplace;
    }

    public void handle(JsonNode update) {
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
        marketplace.registerGroup(
                groupId,
                chat.path("title").asText("Автоклуб"),
                ownerId,
                threadId
        );
        telegram.sendMessage(groupId,
                "<b>REDLINE подключён.</b>\nТема «Магазин» создана. Откройте Mini App для настройки.");
    }
}
