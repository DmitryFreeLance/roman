package club.redline.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class TelegramUpdateHandler {
    private static final Pattern PRODUCT_START =
            Pattern.compile("^/start\\s+product_(\\d+)_(-?\\d+)$");
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
        String text = message.path("text").asText("");
        if (text.startsWith("/start")) {
            long chatId = message.path("chat").path("id").asLong();
            if (!"private".equals(message.path("chat").path("type").asText())) {
                telegram.sendMessage(chatId, """
                        <b>REDLINE работает через Mini App.</b>
                        Откройте личный чат с ботом и нажмите «Запустить».
                        """);
                return;
            }
            Matcher productStart = PRODUCT_START.matcher(text);
            String query = productStart.matches()
                    ? "product=" + productStart.group(1) + "&group=" + productStart.group(2)
                    : "";
            telegram.sendMiniAppButton(chatId, """
                    <b>REDLINE CLUB</b>
                    Автотовары, проверенные продавцы и групповые закупки вашего клуба.
                    """, query);
        }
    }

    private void handleMembership(JsonNode update) {
        String status = update.path("new_chat_member").path("status").asText();
        JsonNode chat = update.path("chat");
        long groupId = chat.path("id").asLong();
        if (!"administrator".equals(status) && !"creator".equals(status)) {
            if ("member".equals(status)) {
                telegram.sendMessage(groupId, """
                        <b>REDLINE пока не подключён.</b>
                        1. Включите «Темы» в настройках группы.
                        2. Назначьте бота администратором.
                        3. Разрешите боту управление темами.
                        """);
            }
            return;
        }
        if ("administrator".equals(status) &&
                !update.path("new_chat_member").path("can_manage_topics").asBoolean()) {
            telegram.sendMessage(groupId, """
                    <b>Не хватает права «Управление темами».</b>
                    Выдайте его боту в настройках администраторов группы.
                    """);
            return;
        }
        if (!chat.path("is_forum").asBoolean()) {
            telegram.sendMessage(groupId,
                    "Для работы REDLINE включите темы в настройках группы.");
            return;
        }
        if (marketplace.groupExists(groupId)) {
            telegram.sendMessage(groupId,
                    "<b>REDLINE уже подключён к этой группе.</b>");
            return;
        }
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
