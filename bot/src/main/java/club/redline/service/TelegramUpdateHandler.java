package club.redline.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
public class TelegramUpdateHandler {
    private static final Pattern PRODUCT_START =
            Pattern.compile("^/start\\s+product_(\\d+)_(-?\\d+)$");
    private static final Pattern CLEAR_COMMAND =
            Pattern.compile("^/clear(?:@\\w+)?$", Pattern.CASE_INSENSITIVE);
    private static final String CLEAR_CONFIRM = "clear_marketplace_confirm";
    private static final String CLEAR_CANCEL = "clear_marketplace_cancel";
    private final TelegramApiClient telegram;
    private final MarketplaceService marketplace;
    private final ImageStorageService images;
    private final AtomicBoolean clearing = new AtomicBoolean(false);

    public TelegramUpdateHandler(TelegramApiClient telegram, MarketplaceService marketplace,
                                 ImageStorageService images) {
        this.telegram = telegram;
        this.marketplace = marketplace;
        this.images = images;
    }

    public void handle(JsonNode update) {
        JsonNode memberUpdate = update.path("my_chat_member");
        if (!memberUpdate.isMissingNode()) {
            handleMembership(memberUpdate);
            return;
        }
        JsonNode callbackQuery = update.path("callback_query");
        if (!callbackQuery.isMissingNode()) {
            handleCallback(callbackQuery);
            return;
        }
        JsonNode message = update.path("message");
        String text = message.path("text").asText("");
        if (CLEAR_COMMAND.matcher(text.strip()).matches()) {
            handleClearCommand(message);
            return;
        }
        if (text.startsWith("/start")) {
            long chatId = message.path("chat").path("id").asLong();
            if (!"private".equals(message.path("chat").path("type").asText())) {
                telegram.sendMessage(chatId, """
                        <b>REDLINE работает через Mini App.</b>
                        Откройте личный чат с ботом и нажмите «Запустить».

                        В приложении доступны каталог клуба, сведения о продавцах,
                        обычные покупки, групповые бронирования, статусы оплаты и
                        доставки, оценки и обращения в модерацию.
                        """);
                return;
            }
            Matcher productStart = PRODUCT_START.matcher(text);
            String query = productStart.matches()
                    ? "product=" + productStart.group(1) + "&group=" + productStart.group(2)
                    : "";
            telegram.sendMiniAppButton(chatId, """
                    <b>REDLINE CLUB</b>
                    Маркетплейс вашего клуба: товары, магазины продавцов, групповые
                    закупки, статусы оплаты и поставки.

                    Бот будет присылать подробные уведомления по каждому важному
                    этапу сделки и решениям модерации.
                    """, query);
        }
    }

    private void handleClearCommand(JsonNode message) {
        long chatId = message.path("chat").path("id").asLong();
        long userId = message.path("from").path("id").asLong();
        if (!"private".equals(message.path("chat").path("type").asText())) {
            telegram.sendMessage(chatId,
                    "Команда <b>/clear</b> доступна только в личном чате с ботом.");
            return;
        }
        if (!marketplace.isSuperAdmin(userId)) {
            telegram.sendMessage(chatId,
                    "<b>Доступ запрещён.</b> Очистку может запускать только супер-администратор.");
            return;
        }
        telegram.sendClearConfirmation(chatId);
    }

    private void handleCallback(JsonNode callback) {
        String data = callback.path("data").asText("");
        if (!CLEAR_CONFIRM.equals(data) && !CLEAR_CANCEL.equals(data)) return;

        String callbackId = callback.path("id").asText();
        long userId = callback.path("from").path("id").asLong();
        JsonNode message = callback.path("message");
        long chatId = message.path("chat").path("id").asLong();
        long messageId = message.path("message_id").asLong();

        if (!marketplace.isSuperAdmin(userId)) {
            telegram.answerCallbackQuery(callbackId, "Недостаточно прав");
            return;
        }
        if (CLEAR_CANCEL.equals(data)) {
            telegram.answerCallbackQuery(callbackId, "Очистка отменена");
            telegram.removeInlineKeyboard(chatId, messageId);
            return;
        }
        if (!clearing.compareAndSet(false, true)) {
            telegram.answerCallbackQuery(callbackId, "Очистка уже выполняется");
            return;
        }

        telegram.answerCallbackQuery(callbackId, "Начинаю очистку");
        telegram.removeInlineKeyboard(chatId, messageId);
        try {
            int resetTopics = 0;
            int failedTopics = 0;
            for (MarketplaceService.ClubTopic topic : marketplace.clubTopics()) {
                try {
                    int newThreadId = telegram.createShopTopic(topic.telegramGroupId());
                    boolean oldTopicDeleted = telegram.deleteForumTopic(
                            topic.telegramGroupId(), topic.threadId()
                    );
                    marketplace.updateClubShopThread(
                            topic.telegramGroupId(), newThreadId
                    );
                    if (oldTopicDeleted) resetTopics++;
                    else failedTopics++;
                } catch (RuntimeException topicError) {
                    failedTopics++;
                }
            }

            MarketplaceService.ClearResult result = marketplace.clearMarketplaceData();
            int deletedImages = images.clearAll();
            telegram.sendMessage(chatId, """
                    <b>Очистка REDLINE завершена</b>

                    Удалено магазинов: <b>%d</b>
                    Удалено объявлений: <b>%d</b>
                    Удалено обычных заказов: <b>%d</b>
                    Удалено групповых закупок: <b>%d</b>
                    Удалено загруженных изображений: <b>%d</b>
                    Очищено тем «Магазин»: <b>%d</b>
                    Не удалось очистить тем: <b>%d</b>

                    Клубы, пользователи, права супер-администраторов и базовые
                    категории сохранены.
                    """.formatted(
                    result.stores(), result.products(), result.orders(),
                    result.groupBuys(), deletedImages, resetTopics, failedTopics
            ));
        } catch (RuntimeException error) {
            telegram.sendMessage(chatId, """
                    <b>Очистка не завершена</b>
                    Произошла ошибка, поэтому часть операций могла уже выполниться.
                    Проверьте журналы сервера и повторите /clear: повторная очистка
                    безопасна.
                    """);
        } finally {
            clearing.set(false);
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
                """
                <b>REDLINE подключён к группе</b>
                Тема «Магазин» создана автоматически.

                Владелец группы может открыть Mini App, настроить комиссию и лимиты,
                управлять продавцами и объявлениями. Новые объявления будут
                публиковаться в теме «Магазин» со ссылкой на карточку товара.
                """);
    }
}
