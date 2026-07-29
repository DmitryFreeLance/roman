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
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
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
        byte[] sourceBytes = file.getBytes();
        BufferedImage source;
        try (InputStream input = new ByteArrayInputStream(sourceBytes)) {
            source = ImageIO.read(input);
        }
        if (source == null) return false;
        BufferedImage oriented = applyExifOrientation(
                source,
                readExifOrientation(sourceBytes)
        );
        writeJpeg(renderScaled(oriented), target);
        return true;
    }

    private BufferedImage applyExifOrientation(BufferedImage source, int orientation) {
        if (orientation < 2 || orientation > 8) return source;
        int width = source.getWidth();
        int height = source.getHeight();
        boolean swapEdges = orientation >= 5;
        BufferedImage oriented = new BufferedImage(
                swapEdges ? height : width,
                swapEdges ? width : height,
                source.getColorModel().hasAlpha()
                        ? BufferedImage.TYPE_INT_ARGB
                        : BufferedImage.TYPE_INT_RGB
        );
        AffineTransform transform = switch (orientation) {
            case 2 -> new AffineTransform(-1, 0, 0, 1, width, 0);
            case 3 -> new AffineTransform(-1, 0, 0, -1, width, height);
            case 4 -> new AffineTransform(1, 0, 0, -1, 0, height);
            case 5 -> new AffineTransform(0, 1, 1, 0, 0, 0);
            case 6 -> new AffineTransform(0, 1, -1, 0, height, 0);
            case 7 -> new AffineTransform(0, -1, -1, 0, height, width);
            case 8 -> new AffineTransform(0, -1, 1, 0, 0, width);
            default -> new AffineTransform();
        };
        Graphics2D graphics = oriented.createGraphics();
        try {
            graphics.setRenderingHint(
                    RenderingHints.KEY_INTERPOLATION,
                    RenderingHints.VALUE_INTERPOLATION_BICUBIC
            );
            graphics.drawImage(source, transform, null);
        } finally {
            graphics.dispose();
        }
        return oriented;
    }

    private int readExifOrientation(byte[] image) {
        if (image.length < 4
                || (image[0] & 0xff) != 0xff
                || (image[1] & 0xff) != 0xd8) {
            return 1;
        }
        int markerOffset = 2;
        while (markerOffset + 4 <= image.length) {
            if ((image[markerOffset] & 0xff) != 0xff) return 1;
            int marker = image[markerOffset + 1] & 0xff;
            markerOffset += 2;
            if (marker == 0xd9 || marker == 0xda) return 1;
            if (marker == 0x01 || marker >= 0xd0 && marker <= 0xd7) {
                continue;
            }
            if (markerOffset + 2 > image.length) return 1;
            int segmentLength = readUnsignedShort(image, markerOffset, false);
            if (segmentLength < 2 || markerOffset + segmentLength > image.length) {
                return 1;
            }
            int payloadOffset = markerOffset + 2;
            if (marker == 0xe1
                    && segmentLength >= 10
                    && matchesExifHeader(image, payloadOffset)) {
                return readTiffOrientation(
                        image,
                        payloadOffset + 6,
                        markerOffset + segmentLength
                );
            }
            markerOffset += segmentLength;
        }
        return 1;
    }

    private boolean matchesExifHeader(byte[] image, int offset) {
        return offset + 6 <= image.length
                && image[offset] == 'E'
                && image[offset + 1] == 'x'
                && image[offset + 2] == 'i'
                && image[offset + 3] == 'f'
                && image[offset + 4] == 0
                && image[offset + 5] == 0;
    }

    private int readTiffOrientation(byte[] image, int tiffOffset, int segmentEnd) {
        if (tiffOffset + 8 > segmentEnd) return 1;
        boolean littleEndian;
        if (image[tiffOffset] == 'I' && image[tiffOffset + 1] == 'I') {
            littleEndian = true;
        } else if (image[tiffOffset] == 'M' && image[tiffOffset + 1] == 'M') {
            littleEndian = false;
        } else {
            return 1;
        }
        if (readUnsignedShort(image, tiffOffset + 2, littleEndian) != 42) return 1;
        long firstIfdOffset = readUnsignedInt(image, tiffOffset + 4, littleEndian);
        long ifdPosition = (long) tiffOffset + firstIfdOffset;
        if (ifdPosition < tiffOffset || ifdPosition + 2 > segmentEnd) return 1;
        int entries = readUnsignedShort(image, (int) ifdPosition, littleEndian);
        int entryOffset = (int) ifdPosition + 2;
        for (int index = 0; index < entries; index++) {
            int current = entryOffset + index * 12;
            if (current + 12 > segmentEnd) return 1;
            if (readUnsignedShort(image, current, littleEndian) == 0x0112) {
                int orientation = readUnsignedShort(
                        image,
                        current + 8,
                        littleEndian
                );
                return orientation >= 1 && orientation <= 8 ? orientation : 1;
            }
        }
        return 1;
    }

    private int readUnsignedShort(byte[] bytes, int offset, boolean littleEndian) {
        if (littleEndian) {
            return (bytes[offset] & 0xff) | (bytes[offset + 1] & 0xff) << 8;
        }
        return (bytes[offset] & 0xff) << 8 | bytes[offset + 1] & 0xff;
    }

    private long readUnsignedInt(byte[] bytes, int offset, boolean littleEndian) {
        if (littleEndian) {
            return (long) (bytes[offset] & 0xff)
                    | (long) (bytes[offset + 1] & 0xff) << 8
                    | (long) (bytes[offset + 2] & 0xff) << 16
                    | (long) (bytes[offset + 3] & 0xff) << 24;
        }
        return (long) (bytes[offset] & 0xff) << 24
                | (long) (bytes[offset + 1] & 0xff) << 16
                | (long) (bytes[offset + 2] & 0xff) << 8
                | (long) (bytes[offset + 3] & 0xff);
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

    public int clearAll() {
        if (!Files.isDirectory(uploadDirectory)) return 0;
        try (var files = Files.list(uploadDirectory)) {
            int deleted = 0;
            for (Path file : files.filter(Files::isRegularFile).toList()) {
                if (Files.deleteIfExists(file)) deleted++;
            }
            return deleted;
        } catch (IOException error) {
            throw new IllegalStateException("Unable to clear uploaded images", error);
        }
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
            byte[] sourceBytes = Files.readAllBytes(source);
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(sourceBytes));
            if (image == null) return;
            BufferedImage resized = renderScaled(
                    applyExifOrientation(image, readExifOrientation(sourceBytes))
            );
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
