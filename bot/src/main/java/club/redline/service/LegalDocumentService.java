package club.redline.service;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

@Service
public class LegalDocumentService {
    private static final String PRIVACY_PATH = "legal/privacy-policy.docx";
    private static final String OFFER_PATH = "legal/public-offer-template.docx";
    private static final DateTimeFormatter RUSSIAN_DATE =
            DateTimeFormatter.ofPattern("dd.MM.yyyy");

    public byte[] privacyPolicy() {
        return replaceInDocument(readResource(PRIVACY_PATH), Map.of(
                "[Бот подставляет текущую дату или дату публикации]",
                LocalDate.now().format(RUSSIAN_DATE)
        ));
    }

    public byte[] publicOfferTemplate() {
        String placeholder = "[будет заполнено из профиля продавца]";
        return renderOffer(Map.ofEntries(
                Map.entry("CURRENT_DATE", LocalDate.now().format(RUSSIAN_DATE)),
                Map.entry("SELLER_NAME", placeholder),
                Map.entry("STORE_NAME", placeholder),
                Map.entry("INN", placeholder),
                Map.entry("TELEGRAM", placeholder),
                Map.entry("PHONE_EMAIL", placeholder),
                Map.entry("SETTLEMENT_ACCOUNT", placeholder),
                Map.entry("BANK_NAME", placeholder),
                Map.entry("BIK", placeholder),
                Map.entry("CORRESPONDENT_ACCOUNT", placeholder),
                Map.entry("ADDRESS", placeholder)
        ));
    }

    public byte[] personalizedOffer(Map<String, Object> details) {
        String username = text(details.get("username"));
        String telegram = username.isBlank()
                ? "Telegram ID " + details.get("seller_telegram_id")
                : "@" + username.replaceFirst("^@", "");
        return renderOffer(Map.ofEntries(
                Map.entry("CURRENT_DATE", LocalDate.now().format(RUSSIAN_DATE)),
                Map.entry("SELLER_NAME", text(details.get("offer_seller_name"))),
                Map.entry("STORE_NAME", text(details.get("store_name"))),
                Map.entry("INN", text(details.get("offer_inn"))),
                Map.entry("TELEGRAM", telegram),
                Map.entry("PHONE_EMAIL", text(details.get("phone")) + " / "
                        + text(details.get("offer_email"))),
                Map.entry("SETTLEMENT_ACCOUNT", text(details.get("offer_settlement_account"))),
                Map.entry("BANK_NAME", text(details.get("offer_bank_name"))),
                Map.entry("BIK", text(details.get("offer_bik"))),
                Map.entry("CORRESPONDENT_ACCOUNT", text(details.get("offer_correspondent_account"))),
                Map.entry("ADDRESS", text(details.get("offer_address")))
        ));
    }

    private byte[] renderOffer(Map<String, String> values) {
        Map<String, String> replacements = new java.util.LinkedHashMap<>();
        for (Map.Entry<String, String> value : values.entrySet()) {
            replacements.put("{{" + value.getKey() + "}}", value.getValue());
        }
        return replaceInDocument(readResource(OFFER_PATH), replacements);
    }

    private byte[] replaceInDocument(byte[] template, Map<String, String> replacements) {
        try (ZipInputStream input = new ZipInputStream(new ByteArrayInputStream(template));
             ByteArrayOutputStream buffer = new ByteArrayOutputStream();
             ZipOutputStream output = new ZipOutputStream(buffer)) {
            ZipEntry entry;
            while ((entry = input.getNextEntry()) != null) {
                output.putNextEntry(new ZipEntry(entry.getName()));
                byte[] content = input.readAllBytes();
                if ("word/document.xml".equals(entry.getName())) {
                    String xml = new String(content, StandardCharsets.UTF_8);
                    for (Map.Entry<String, String> value : replacements.entrySet()) {
                        xml = xml.replace(value.getKey(), escapeXml(value.getValue()));
                    }
                    content = xml.getBytes(StandardCharsets.UTF_8);
                }
                output.write(content);
                output.closeEntry();
            }
            output.finish();
            return buffer.toByteArray();
        } catch (IOException error) {
            throw new IllegalStateException("Не удалось сформировать публичную оферту", error);
        }
    }

    private byte[] readResource(String path) {
        try (var input = new ClassPathResource(path).getInputStream()) {
            return input.readAllBytes();
        } catch (IOException error) {
            throw new IllegalStateException("Юридический документ недоступен", error);
        }
    }

    private String text(Object value) {
        return value == null ? "" : String.valueOf(value).strip();
    }

    private String escapeXml(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}
