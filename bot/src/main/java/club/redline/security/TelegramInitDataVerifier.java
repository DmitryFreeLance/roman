package club.redline.security;

import club.redline.config.RedlineProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class TelegramInitDataVerifier {
    private final RedlineProperties properties;
    private final ObjectMapper objectMapper;

    public TelegramInitDataVerifier(RedlineProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public TelegramUser verify(String initData) {
        if (initData == null || initData.isBlank()) {
            throw new IllegalArgumentException("Telegram initData is required");
        }
        Map<String, String> values = Arrays.stream(initData.split("&"))
                .map(part -> part.split("=", 2))
                .collect(Collectors.toMap(
                        pair -> decode(pair[0]),
                        pair -> pair.length > 1 ? decode(pair[1]) : ""
                ));
        String receivedHash = values.remove("hash");
        if (receivedHash == null) {
            throw new IllegalArgumentException("Telegram hash is missing");
        }
        long authDate = Long.parseLong(values.getOrDefault("auth_date", "0"));
        if (Instant.now().getEpochSecond() - authDate > 86_400) {
            throw new IllegalArgumentException("Telegram initData has expired");
        }
        String dataCheckString = values.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .collect(Collectors.joining("\n"));
        byte[] secretKey = hmacSha256("WebAppData".getBytes(StandardCharsets.UTF_8),
                properties.telegram().token().getBytes(StandardCharsets.UTF_8));
        String expectedHash = HexFormat.of().formatHex(
                hmacSha256(secretKey, dataCheckString.getBytes(StandardCharsets.UTF_8))
        );
        if (!MessageDigest.isEqual(expectedHash.getBytes(StandardCharsets.UTF_8),
                receivedHash.getBytes(StandardCharsets.UTF_8))) {
            throw new IllegalArgumentException("Invalid Telegram signature");
        }
        try {
            JsonNode user = objectMapper.readTree(values.get("user"));
            return new TelegramUser(
                    user.path("id").asLong(),
                    user.path("username").asText(null),
                    user.path("first_name").asText("Участник"),
                    user.path("last_name").asText(null)
            );
        } catch (Exception error) {
            throw new IllegalArgumentException("Invalid Telegram user payload", error);
        }
    }

    private static byte[] hmacSha256(byte[] key, byte[] value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(value);
        } catch (Exception error) {
            throw new IllegalStateException("Unable to validate Telegram signature", error);
        }
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    public record TelegramUser(long id, String username, String firstName, String lastName) {}
}
