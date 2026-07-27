package club.redline.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
public class TelegramLongPollingRunner implements SmartLifecycle {
    private static final Logger log = LoggerFactory.getLogger(TelegramLongPollingRunner.class);

    private final TelegramApiClient telegram;
    private final TelegramUpdateHandler updateHandler;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private volatile Thread pollingThread;

    public TelegramLongPollingRunner(TelegramApiClient telegram,
                                     TelegramUpdateHandler updateHandler) {
        this.telegram = telegram;
        this.updateHandler = updateHandler;
    }

    @Override
    public void start() {
        if (!telegram.isConfigured()) {
            log.warn("TELEGRAM_BOT_TOKEN is empty; long polling is disabled");
            return;
        }
        if (!running.compareAndSet(false, true)) return;
        telegram.deleteWebhook();
        pollingThread = Thread.ofVirtual()
                .name("telegram-long-polling")
                .start(this::poll);
        log.info("Telegram long polling started");
    }

    private void poll() {
        long offset = 0;
        while (running.get() && !Thread.currentThread().isInterrupted()) {
            try {
                List<JsonNode> updates = telegram.getUpdates(offset);
                for (JsonNode update : updates) {
                    long updateId = update.path("update_id").asLong();
                    try {
                        updateHandler.handle(update);
                    } catch (Exception error) {
                        log.error("Failed to process Telegram update {}", updateId, error);
                    } finally {
                        offset = Math.max(offset, updateId + 1);
                    }
                }
            } catch (Exception error) {
                if (!running.get()) break;
                log.warn("Telegram long polling failed; retrying in 3 seconds: {}",
                        error.getMessage());
                try {
                    Thread.sleep(3_000);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
        log.info("Telegram long polling stopped");
    }

    @Override
    public void stop() {
        running.set(false);
        Thread thread = pollingThread;
        if (thread != null) thread.interrupt();
    }

    @Override
    public boolean isRunning() {
        return running.get();
    }

    @Override
    public boolean isAutoStartup() {
        return true;
    }

    @Override
    public int getPhase() {
        return Integer.MAX_VALUE;
    }
}
