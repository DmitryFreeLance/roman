package club.redline.service;

import club.redline.config.RedlineProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
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

    @Test
    void appliesExifOrientationBeforeSavingJpeg() throws Exception {
        ImageStorageService storage = new ImageStorageService(properties());
        BufferedImage source = new BufferedImage(3, 2, BufferedImage.TYPE_INT_RGB);
        source.setRGB(0, 0, Color.RED.getRGB());
        source.setRGB(2, 1, Color.BLUE.getRGB());
        ByteArrayOutputStream jpeg = new ByteArrayOutputStream();
        ImageIO.write(source, "jpeg", jpeg);
        MockMultipartFile image = new MockMultipartFile(
                "file",
                "phone-photo.jpg",
                "image/jpeg",
                withExifOrientation(jpeg.toByteArray(), 6)
        );

        storage.store(image);

        try (var files = Files.list(uploadDirectory)) {
            BufferedImage saved = ImageIO.read(files.findFirst().orElseThrow().toFile());
            assertThat(saved.getWidth()).isEqualTo(2);
            assertThat(saved.getHeight()).isEqualTo(3);
        }
    }

    private RedlineProperties properties() {
        return new RedlineProperties(
                new RedlineProperties.Telegram("", "https://example.test/redlineclub/", 50),
                new RedlineProperties.Marketplace(1L, 5.0, 50_000L),
                new RedlineProperties.Storage(
                        uploadDirectory.toString(),
                        "https://example.test/redlineclub-api/"
                )
        );
    }

    private byte[] withExifOrientation(byte[] jpeg, int orientation) throws Exception {
        ByteArrayOutputStream result = new ByteArrayOutputStream();
        result.write(jpeg, 0, 2);
        result.write(new byte[]{
                (byte) 0xff, (byte) 0xe1, 0, 34,
                'E', 'x', 'i', 'f', 0, 0,
                'I', 'I', 42, 0, 8, 0, 0, 0,
                1, 0,
                18, 1, 3, 0, 1, 0, 0, 0,
                (byte) orientation, 0, 0, 0,
                0, 0, 0, 0
        });
        result.write(jpeg, 2, jpeg.length - 2);
        return result.toByteArray();
    }
}
