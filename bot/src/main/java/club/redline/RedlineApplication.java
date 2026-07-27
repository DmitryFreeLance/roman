package club.redline;

import club.redline.config.RedlineProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(RedlineProperties.class)
public class RedlineApplication {
    public static void main(String[] args) {
        SpringApplication.run(RedlineApplication.class, args);
    }
}
