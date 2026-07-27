package club.redline.service;

import club.redline.config.RedlineProperties;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

@Service
public class ImageStorageService implements ApplicationRunner {
    private static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024;
    private static final int MAX_IMAGE_EDGE = 1600;
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp"
    );

    private final Path uploadDirectory;
    private final String publicApiUrl;

    public ImageStorageService(RedlineProperties properties) {
        this.uploadDirectory = Path.of(properties.storage().uploadDir()).toAbsolutePath().normalize();
        this.publicApiUrl = withTrailingSlash(properties.storage().publicApiUrl());
    }

    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file is required");
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new IllegalArgumentException("Image must not exceed 10 MB");
        }
        String extension = EXTENSIONS.get(file.getContentType());
        if (extension == null) {
            throw new IllegalArgumentException("Only JPG, PNG and WEBP images are supported");
        }

        boolean canOptimize = !"image/webp".equals(file.getContentType());
        String fileName = UUID.randomUUID() + (canOptimize ? ".jpg" : extension);
        Path target = uploadDirectory.resolve(fileName).normalize();
        if (!target.getParent().equals(uploadDirectory)) {
            throw new IllegalArgumentException("Invalid image path");
        }
        try {
            Files.createDirectories(uploadDirectory);
            if (!canOptimize || !writeOptimizedJpeg(file, target)) {
                try (var input = file.getInputStream()) {
                    Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
                }
            }
        } catch (IOException error) {
            throw new IllegalStateException("Unable to store image", error);
        }
        return publicApiUrl + "uploads/" + fileName;
    }

    private boolean writeOptimizedJpeg(MultipartFile file, Path target) throws IOException {
        BufferedImage source;
        try (InputStream input = file.getInputStream()) {
            source = ImageIO.read(input);
        }
        if (source == null) return false;
        writeJpeg(renderScaled(source), target);
        return true;
    }

    private BufferedImage renderScaled(BufferedImage source) {
        double scale = Math.min(
                1.0,
                (double) MAX_IMAGE_EDGE / Math.max(source.getWidth(), source.getHeight())
        );
        int width = Math.max(1, (int) Math.round(source.getWidth() * scale));
        int height = Math.max(1, (int) Math.round(source.getHeight() * scale));
        BufferedImage rendered = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = rendered.createGraphics();
        try {
            graphics.setColor(new Color(18, 18, 18));
            graphics.fillRect(0, 0, width, height);
            graphics.setRenderingHint(
                    RenderingHints.KEY_INTERPOLATION,
                    RenderingHints.VALUE_INTERPOLATION_BICUBIC
            );
            graphics.setRenderingHint(
                    RenderingHints.KEY_RENDERING,
                    RenderingHints.VALUE_RENDER_QUALITY
            );
            graphics.drawImage(source, 0, 0, width, height, null);
        } finally {
            graphics.dispose();
        }
        return rendered;
    }

    private void writeJpeg(BufferedImage rendered, Path target) throws IOException {
        var writers = ImageIO.getImageWritersByFormatName("jpeg");
        if (!writers.hasNext()) throw new IOException("JPEG writer is unavailable");
        var writer = writers.next();
        try (var output = ImageIO.createImageOutputStream(target.toFile())) {
            writer.setOutput(output);
            ImageWriteParam parameters = writer.getDefaultWriteParam();
            if (parameters.canWriteCompressed()) {
                parameters.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                parameters.setCompressionQuality(0.82f);
            }
            writer.write(null, new IIOImage(rendered, null, null), parameters);
        } finally {
            writer.dispose();
        }
    }

    public Path uploadDirectory() {
        return uploadDirectory;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!Files.isDirectory(uploadDirectory)) return;
        try (var files = Files.list(uploadDirectory)) {
            files.filter(Files::isRegularFile).forEach(this::optimizeExistingImage);
        } catch (IOException ignored) {
            // A failed maintenance pass must not prevent the bot from starting.
        }
    }

    private void optimizeExistingImage(Path source) {
        String name = source.getFileName().toString().toLowerCase();
        boolean jpeg = name.endsWith(".jpg") || name.endsWith(".jpeg");
        boolean png = name.endsWith(".png");
        if (!jpeg && !png) return;
        try {
            if (Files.size(source) < 600_000) return;
            BufferedImage image = ImageIO.read(source.toFile());
            if (image == null) return;
            BufferedImage resized = renderScaled(image);
            Path temporary = Files.createTempFile(uploadDirectory, "optimized-", ".tmp");
            try {
                if (jpeg) {
                    writeJpeg(resized, temporary);
                } else {
                    ImageIO.write(resized, "png", temporary.toFile());
                }
                if (Files.size(temporary) < Files.size(source)) {
                    try {
                        Files.move(
                                temporary, source,
                                StandardCopyOption.REPLACE_EXISTING,
                                StandardCopyOption.ATOMIC_MOVE
                        );
                    } catch (AtomicMoveNotSupportedException unsupported) {
                        Files.move(temporary, source, StandardCopyOption.REPLACE_EXISTING);
                    }
                }
            } finally {
                Files.deleteIfExists(temporary);
            }
        } catch (IOException ignored) {
            // Leave the original image untouched when optimization is unavailable.
        }
    }

    private static String withTrailingSlash(String value) {
        return value.endsWith("/") ? value : value + "/";
    }
}
