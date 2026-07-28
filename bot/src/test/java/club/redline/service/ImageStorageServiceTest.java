package club.redline.service;

import club.redline.config.RedlineProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class ImageStorageServiceTest {
    @TempDir
    Path uploadDirectory;

    @Test
    void storesImageInPersistentDirectoryAndReturnsPublicUrl() throws Exception {
        RedlineProperties properties = new RedlineProperties(
                new RedlineProperties.Telegram("", "https://example.test/redlineclub/", 50),
                new RedlineProperties.Marketplace(1L, 5.0, 50_000L),
                new RedlineProperties.Storage(
                        uploadDirectory.toString(),
                        "https://example.test/redlineclub-api/"
                )
        );
        ImageStorageService storage = new ImageStorageService(properties);
        MockMultipartFile image = new MockMultipartFile(
                "file", "wheel.png", "image/png", new byte[]{1, 2, 3, 4}
        );

        String url = storage.store(image);

        assertThat(url).startsWith("https://example.test/redlineclub-api/uploads/");
        try (var files = Files.list(uploadDirectory)) {
            assertThat(files.toList()).singleElement()
                    .satisfies(file -> assertThat(Files.readAllBytes(file))
                            .containsExactly(1, 2, 3, 4));
        }

        assertThat(storage.clearAll()).isEqualTo(1);
        try (var files = Files.list(uploadDirectory)) {
            assertThat(files.toList()).isEmpty();
        }
    }
}
