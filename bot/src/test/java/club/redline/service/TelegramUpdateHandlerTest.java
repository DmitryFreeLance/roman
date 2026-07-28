package club.redline.service;

import club.redline.config.RedlineProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.jdbc.datasource.init.DatabasePopulatorUtils;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.web.client.RestClient;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TelegramUpdateHandlerTest {
    @TempDir
    Path uploadDirectory;

    private final ObjectMapper json = new ObjectMapper();
    private final SingleConnectionDataSource dataSource =
            new SingleConnectionDataSource("jdbc:sqlite::memory:", true);
    private RecordingTelegram telegram;
    private MarketplaceService marketplace;
    private TelegramUpdateHandler handler;

    @BeforeEach
    void setUp() {
        DatabasePopulatorUtils.execute(
                new ResourceDatabasePopulator(
                        new ClassPathResource("db/schema-sqlite.sql")
                ),
                dataSource
        );
        RedlineProperties properties = new RedlineProperties(
                new RedlineProperties.Telegram(
                        "", "https://example.test/redlineclub/", 50
                ),
                new RedlineProperties.Marketplace(1L, 5.0, 50_000L),
                new RedlineProperties.Storage(
                        uploadDirectory.toString(),
                        "https://example.test/redlineclub-api/"
                )
        );
        telegram = new RecordingTelegram(properties);
        marketplace = new MarketplaceService(
                new org.springframework.jdbc.core.JdbcTemplate(dataSource),
                telegram,
                properties
        );
        handler = new TelegramUpdateHandler(
                telegram,
                marketplace,
                new ImageStorageService(properties)
        );
    }

    @AfterEach
    void closeConnection() {
        dataSource.destroy();
    }

    @Test
    void offersClearConfirmationOnlyToSuperAdminInPrivateChat() throws Exception {
        handler.handle(update("""
                {
                  "message": {
                    "text": "/clear",
                    "from": {"id": 1},
                    "chat": {"id": 1, "type": "private"}
                  }
                }
                """));

        assertThat(telegram.clearConfirmationChatId).isEqualTo(1L);
    }

    @Test
    void rejectsClearCommandFromRegularUser() throws Exception {
        handler.handle(update("""
                {
                  "message": {
                    "text": "/clear",
                    "from": {"id": 2},
                    "chat": {"id": 2, "type": "private"}
                  }
                }
                """));

        assertThat(telegram.clearConfirmationChatId).isNull();
        assertThat(telegram.messages).anySatisfy(message ->
                assertThat(message).contains("Доступ запрещён"));
    }

    @Test
    void opensProductDiscussionFromTelegramGroupButton() throws Exception {
        handler.handle(update("""
                {
                  "message": {
                    "text": "/start discussion_42_-100123",
                    "from": {"id": 2},
                    "chat": {"id": 2, "type": "private"}
                  }
                }
                """));

        assertThat(telegram.miniAppQuery)
                .isEqualTo("product=42&group=-100123&discussion=1");
    }

    @Test
    void clearsMarketplaceAfterExplicitConfirmation() throws Exception {
        marketplace.registerGroup(-100123L, "Test club", 1L, 7);

        handler.handle(update("""
                {
                  "callback_query": {
                    "id": "callback-1",
                    "data": "clear_marketplace_confirm",
                    "from": {"id": 1},
                    "message": {
                      "message_id": 15,
                      "chat": {"id": 1, "type": "private"}
                    }
                  }
                }
                """));

        assertThat(telegram.removedKeyboard).isEqualTo("1:15");
        assertThat(telegram.deletedTopics).containsExactly("-100123:7");
        assertThat(marketplace.clubTopics()).singleElement()
                .satisfies(topic -> assertThat(topic.threadId()).isEqualTo(1));
        assertThat(telegram.messages).anySatisfy(message ->
                assertThat(message).contains("Очистка REDLINE завершена"));
    }

    private JsonNode update(String value) throws Exception {
        return json.readTree(value);
    }

    private static class RecordingTelegram extends TelegramApiClient {
        private Long clearConfirmationChatId;
        private String removedKeyboard;
        private String miniAppQuery;
        private final List<String> messages = new ArrayList<>();
        private final List<String> deletedTopics = new ArrayList<>();

        RecordingTelegram(RedlineProperties properties) {
            super(RestClient.builder(), properties);
        }

        @Override
        public void sendClearConfirmation(long chatId) {
            clearConfirmationChatId = chatId;
        }

        @Override
        public void sendMessage(long chatId, String text) {
            messages.add(text);
        }

        @Override
        public void sendMiniAppButton(long chatId, String text, String query) {
            miniAppQuery = query;
        }

        @Override
        public void answerCallbackQuery(String callbackQueryId, String text) {
            // The test only needs to verify the destructive action and response.
        }

        @Override
        public void removeInlineKeyboard(long chatId, long messageId) {
            removedKeyboard = chatId + ":" + messageId;
        }

        @Override
        public int createShopTopic(long groupId) {
            return 1;
        }

        @Override
        public boolean deleteForumTopic(long groupId, int threadId) {
            deletedTopics.add(groupId + ":" + threadId);
            return true;
        }
    }
}
