package club.redline.service;

import club.redline.config.RedlineProperties;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class TelegramApiClient {
    private final RestClient client;
    private final RedlineProperties properties;

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
        call("sendMessage", Map.of(
                "chat_id", chatId,
                "text", text,
                "parse_mode", "HTML",
                "reply_markup", Map.of(
                        "inline_keyboard", List.of(List.of(Map.of(
                                "text", "Открыть REDLINE CLUB",
                                "web_app", Map.of("url", properties.telegram().miniAppUrl())
                        )))
                )
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

    public void publishProduct(long groupId, int threadId, long productId, String title,
                               String description, long priceKopecks, int stock, String imageUrl) {
        String caption = """
                <b>%s</b>
                %s

                <b>%s ₽</b> · В наличии: %d
                """.formatted(title, description, priceKopecks / 100, stock);
        call("sendPhoto", Map.of(
                "chat_id", groupId,
                "message_thread_id", threadId,
                "photo", imageUrl,
                "caption", caption,
                "parse_mode", "HTML",
                "reply_markup", Map.of(
                        "inline_keyboard", List.of(List.of(Map.of(
                                "text", "Подробнее",
                                "web_app", Map.of(
                                        "url", properties.telegram().miniAppUrl() +
                                                "?product=" + productId + "&group=" + groupId
                                )
                        )))
                )
        ));
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
