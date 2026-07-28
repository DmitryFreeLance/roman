package club.redline.service;

import club.redline.config.RedlineProperties;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Component
public class TelegramApiClient {
    private final RestClient client;
    private final RedlineProperties properties;
    private volatile String botUsername;

    public TelegramApiClient(RestClient.Builder builder, RedlineProperties properties) {
        this.properties = properties;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(10_000);
        requestFactory.setReadTimeout((properties.telegram().pollingTimeoutSeconds() + 15) * 1_000);
        this.client = builder
                .baseUrl("https://api.telegram.org/bot" + properties.telegram().token())
                .requestFactory(requestFactory)
                .build();
    }

    public JsonNode call(String method, Object payload) {
        JsonNode response = client.post()
                .uri("/" + method)
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(JsonNode.class);
        if (response == null || !response.path("ok").asBoolean()) {
            throw new IllegalStateException("Telegram API call failed: " + method);
        }
        return response.path("result");
    }

    public void sendMessage(long chatId, String text) {
        call("sendMessage", Map.of(
                "chat_id", chatId,
                "text", text,
                "parse_mode", "HTML"
        ));
    }

    public void sendMiniAppButton(long chatId, String text) {
        sendMiniAppButton(chatId, text, "");
    }

    public void sendMiniAppButton(long chatId, String text, String query) {
        String separator = properties.telegram().miniAppUrl().contains("?") ? "&" : "?";
        String targetUrl = properties.telegram().miniAppUrl() +
                (query == null || query.isBlank() ? "" : separator + query);
        call("sendMessage", Map.of(
                "chat_id", chatId,
                "text", text,
                "parse_mode", "HTML",
                "reply_markup", Map.of(
                        "inline_keyboard", List.of(List.of(Map.of(
                                "text", "Открыть REDLINE CLUB",
                                "web_app", Map.of("url", targetUrl)
                        )))
                )
        ));
    }

    public void sendClearConfirmation(long chatId) {
        call("sendMessage", Map.of(
                "chat_id", chatId,
                "text", """
                        <b>Полная очистка данных REDLINE</b>

                        Будут удалены магазины, объявления, групповые закупки,
                        заказы, «Мои покупки», обсуждения товаров, отзывы,
                        жалобы, уведомления,
                        комиссионные операции и загруженные фотографии.

                        Клубы, пользователи, супер-администраторы и базовые
                        категории сохранятся. Объявления в темах «Магазин»
                        также будут удалены.
                        """,
                "parse_mode", "HTML",
                "reply_markup", Map.of(
                        "inline_keyboard", List.of(List.of(
                                Map.of(
                                        "text", "Удалить все данные",
                                        "callback_data", "clear_marketplace_confirm"
                                ),
                                Map.of(
                                        "text", "Отмена",
                                        "callback_data", "clear_marketplace_cancel"
                                )
                        ))
                )
        ));
    }

    public void answerCallbackQuery(String callbackQueryId, String text) {
        call("answerCallbackQuery", Map.of(
                "callback_query_id", callbackQueryId,
                "text", text
        ));
    }

    public void removeInlineKeyboard(long chatId, long messageId) {
        call("editMessageReplyMarkup", Map.of(
                "chat_id", chatId,
                "message_id", messageId,
                "reply_markup", Map.of("inline_keyboard", List.of())
        ));
    }

    public int createShopTopic(long groupId) {
        JsonNode result = call("createForumTopic", Map.of(
                "chat_id", groupId,
                "name", "Магазин",
                "icon_color", 16478047
        ));
        return result.path("message_thread_id").asInt();
    }

    public boolean deleteForumTopic(long groupId, int threadId) {
        try {
            call("deleteForumTopic", Map.of(
                    "chat_id", groupId,
                    "message_thread_id", threadId
            ));
            return true;
        } catch (RuntimeException error) {
            return false;
        }
    }

    public void publishProduct(long groupId, int threadId, long productId, String title,
                               String description, long priceKopecks, int stock, String imageUrl) {
        String caption = """
                <b>%s</b>
                Товар: <b>#%d</b>

                %s

                Цена для покупателя: <b>%s</b>
                В наличии: <b>%d шт.</b>

                В карточке товара доступны сведения о продавце, рейтинг,
                доступные цвета, обсуждение, условия покупки или бронирования
                и итоговые действия по сделке.
                """.formatted(
                escapeHtml(title),
                productId,
                escapeHtml(abbreviate(description, 500)),
                String.format(Locale.forLanguageTag("ru"), "%,d ₽",
                        Math.round(priceKopecks / 100.0)),
                stock
        );
        call("sendPhoto", Map.of(
                "chat_id", groupId,
                "message_thread_id", threadId,
                "photo", imageUrl,
                "caption", caption,
                "parse_mode", "HTML",
                "reply_markup", Map.of(
                        "inline_keyboard", List.of(List.of(
                                Map.of(
                                        "text", "Открыть товар",
                                        "url", productStartLink(productId, groupId, false)
                                ),
                                Map.of(
                                        "text", "Обсудить",
                                        "url", productStartLink(productId, groupId, true)
                                )
                        ))
                )
        ));
    }

    private static String escapeHtml(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }

    private static String abbreviate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) return value;
        return value.substring(0, Math.max(0, maxLength - 1)).stripTrailing() + "…";
    }

    private String productStartLink(long productId, long groupId,
                                    boolean discussion) {
        String username = botUsername;
        if (username == null || username.isBlank()) {
            username = call("getMe", Map.of()).path("username").asText();
            botUsername = username;
        }
        String payload = discussion ? "discussion_" : "product_";
        return "https://t.me/" + username + "?start="
                + payload + productId + "_" + groupId;
    }

    public List<JsonNode> getUpdates(long offset) {
        JsonNode result = call("getUpdates", Map.of(
                "offset", offset,
                "timeout", properties.telegram().pollingTimeoutSeconds(),
                "allowed_updates", List.of("message", "callback_query", "my_chat_member")
        ));
        List<JsonNode> updates = new ArrayList<>();
        result.forEach(updates::add);
        return updates;
    }

    public void deleteWebhook() {
        call("deleteWebhook", Map.of("drop_pending_updates", false));
    }

    public boolean isConfigured() {
        return properties.telegram().token() != null &&
                !properties.telegram().token().isBlank();
    }
}
