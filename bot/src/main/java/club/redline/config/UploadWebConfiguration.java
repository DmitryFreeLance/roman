package club.redline.config;

import club.redline.service.ImageStorageService;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class UploadWebConfiguration implements WebMvcConfigurer {
    private final ImageStorageService storage;

    public UploadWebConfiguration(ImageStorageService storage) {
        this.storage = storage;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(storage.uploadDirectory().toUri().toString())
                .setCachePeriod(31_536_000);
    }
}
