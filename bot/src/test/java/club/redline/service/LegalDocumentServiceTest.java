package club.redline.service;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.zip.ZipInputStream;

import static org.assertj.core.api.Assertions.assertThat;

class LegalDocumentServiceTest {
    private final LegalDocumentService documents = new LegalDocumentService();

    @Test
    void substitutesPrivacyDateAndPersonalizedOfferDetails() throws Exception {
        String privacyXml = documentXml(documents.privacyPolicy());
        assertThat(privacyXml)
                .doesNotContain("[Бот подставляет текущую дату")
                .contains("Дата вступления в силу:");
        assertThat(documents.privacyPolicyText())
                .contains("Политика в отношении обработки персональных данных",
                        "персональных данных");

        Map<String, Object> offerDetails = Map.ofEntries(
                Map.entry("seller_telegram_id", 101L),
                Map.entry("username", "seller"),
                Map.entry("phone", "+79990000000"),
                Map.entry("store_name", "Garage"),
                Map.entry("offer_seller_name", "ИП Иванов Иван Иванович"),
                Map.entry("offer_inn", "770000000000"),
                Map.entry("offer_email", "seller@example.test"),
                Map.entry("offer_address", "г. Москва"),
                Map.entry("offer_settlement_account", "40802810000000000001"),
                Map.entry("offer_bank_name", "Тестовый банк"),
                Map.entry("offer_bik", "044525000"),
                Map.entry("offer_correspondent_account", "30101810000000000001")
        );
        String offerXml = documentXml(documents.personalizedOffer(offerDetails));
        assertThat(offerXml)
                .doesNotContain("{{")
                .contains("ИП Иванов Иван Иванович", "Garage", "@seller",
                        "40802810000000000001", "seller@example.test");

        assertThat(documents.personalizedOfferText(offerDetails))
                .contains("Публичная оферта", "ИП Иванов Иван Иванович", "Garage",
                        "40802810000000000001", "seller@example.test")
                .doesNotContain("{{");
    }

    private String documentXml(byte[] docx) throws Exception {
        try (ZipInputStream input = new ZipInputStream(new ByteArrayInputStream(docx))) {
            for (var entry = input.getNextEntry(); entry != null; entry = input.getNextEntry()) {
                if ("word/document.xml".equals(entry.getName())) {
                    return new String(input.readAllBytes(), StandardCharsets.UTF_8);
                }
            }
        }
        throw new IllegalStateException("word/document.xml not found");
    }
}
