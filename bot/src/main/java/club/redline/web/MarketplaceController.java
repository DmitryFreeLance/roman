package club.redline.web;

import club.redline.config.RedlineProperties;
import club.redline.security.TelegramInitDataVerifier;
import club.redline.security.TelegramInitDataVerifier.TelegramUser;
import club.redline.service.MarketplaceService;
import club.redline.service.MarketplaceService.NewProduct;
import club.redline.service.MarketplaceService.NewStore;
import club.redline.service.MarketplaceService.ReservationResult;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class MarketplaceController {
    private final MarketplaceService marketplace;
    private final TelegramInitDataVerifier verifier;
    private final RedlineProperties properties;

    public MarketplaceController(MarketplaceService marketplace, TelegramInitDataVerifier verifier,
                                 RedlineProperties properties) {
        this.marketplace = marketplace;
        this.verifier = verifier;
        this.properties = properties;
    }

    @GetMapping("/groups/{groupId}/catalog")
    public List<Map<String, Object>> catalog(@PathVariable long groupId) {
        return marketplace.catalog(groupId);
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> createProduct(@RequestHeader("X-Telegram-Init-Data") String initData,
                                           @Valid @RequestBody CreateProductRequest request) {
        TelegramUser user = authenticated(initData);
        long id = marketplace.createProduct(user.id(), new NewProduct(
                request.groupId(), request.title(), request.description(), request.category(),
                request.stock(), request.sellerPriceKopecks(), request.kind(),
                request.imageUrlsJson(), request.targetCount(), request.collectionDays()
        ));
        return Map.of("id", id);
    }

    @PostMapping("/stores")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> createStore(@RequestHeader("X-Telegram-Init-Data") String initData,
                                         @Valid @RequestBody CreateStoreRequest request) {
        TelegramUser user = authenticated(initData);
        long id = marketplace.createStore(user.id(), new NewStore(
                request.groupId(), request.name(), request.description(),
                request.paymentPhone(), request.paymentCard()
        ));
        return Map.of("id", id);
    }

    @PostMapping("/group-buys/{id}/reservations")
    public ReservationResult reserve(@RequestHeader("X-Telegram-Init-Data") String initData,
                                     @PathVariable long id,
                                     @RequestBody ReserveRequest request) {
        TelegramUser user = authenticated(initData);
        return marketplace.reserve(id, user.id(), request.phone());
    }

    @PostMapping("/group-buys/{id}/open-payment")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void openPayment(@RequestHeader("X-Telegram-Init-Data") String initData,
                            @PathVariable long id,
                            @Valid @RequestBody OpenPaymentRequest request) {
        TelegramUser user = authenticated(initData);
        marketplace.openPayment(id, user.id(), request.finalPriceKopecks(), request.deadlineHours());
    }

    @PostMapping("/group-buys/{id}/paid")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markPaid(@RequestHeader("X-Telegram-Init-Data") String initData,
                         @PathVariable long id) {
        marketplace.markGroupBuyPaid(id, authenticated(initData).id());
    }

    @PostMapping("/group-buys/{id}/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirm(@RequestHeader("X-Telegram-Init-Data") String initData,
                        @PathVariable long id) {
        marketplace.confirmGroupBuy(id, authenticated(initData).id());
    }

    @PutMapping("/group-buys/{id}/delivery")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateDelivery(@RequestHeader("X-Telegram-Init-Data") String initData,
                               @PathVariable long id,
                               @Valid @RequestBody DeliveryRequest request) {
        marketplace.updateDelivery(id, authenticated(initData).id(),
                request.from(), request.to(), request.note());
    }

    @GetMapping("/group-buys/{id}/buyers")
    public List<Map<String, Object>> buyers(@RequestHeader("X-Telegram-Init-Data") String initData,
                                            @PathVariable long id) {
        return marketplace.groupBuyBuyers(id, authenticated(initData).id());
    }

    @PostMapping("/products/{productId}/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> createOrder(@RequestHeader("X-Telegram-Init-Data") String initData,
                                         @PathVariable long productId) {
        return Map.of("id", marketplace.createOrder(authenticated(initData).id(), productId));
    }

    @PostMapping("/orders/{id}/status/{status}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void advanceOrder(@RequestHeader("X-Telegram-Init-Data") String initData,
                             @PathVariable long id, @PathVariable String status) {
        marketplace.advanceOrder(id, authenticated(initData).id(), status.toUpperCase());
    }

    @PutMapping("/groups/{telegramGroupId}/commission")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateGroupCommission(@RequestHeader("X-Telegram-Init-Data") String initData,
                                      @PathVariable long telegramGroupId,
                                      @Valid @RequestBody GroupCommissionRequest request) {
        marketplace.updateGroupCommission(
                telegramGroupId, authenticated(initData).id(), request.commissionPercent()
        );
    }

    @GetMapping("/admin/debts")
    public List<Map<String, Object>> debts(
            @RequestHeader("X-Telegram-Init-Data") String initData) {
        requireSuperAdmin(initData);
        return marketplace.commissionDebts();
    }

    @PostMapping("/admin/debts/{sellerTelegramId}/repay")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void repayDebt(@RequestHeader("X-Telegram-Init-Data") String initData,
                          @PathVariable long sellerTelegramId,
                          @Valid @RequestBody RepayDebtRequest request) {
        TelegramUser admin = requireSuperAdmin(initData);
        marketplace.repayDebt(sellerTelegramId, request.amountKopecks(), admin.id());
    }

    @GetMapping("/admin/groups")
    public List<Map<String, Object>> groups(
            @RequestHeader("X-Telegram-Init-Data") String initData) {
        requireSuperAdmin(initData);
        return marketplace.groups();
    }

    @PutMapping("/admin/settings")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateSettings(@RequestHeader("X-Telegram-Init-Data") String initData,
                               @Valid @RequestBody GlobalSettingsRequest request) {
        requireSuperAdmin(initData);
        marketplace.updateGlobalSettings(
                request.botCommissionPercent(), request.debtLimitKopecks()
        );
    }

    private TelegramUser authenticated(String initData) {
        TelegramUser user = verifier.verify(initData);
        marketplace.upsertUser(user);
        return user;
    }

    private TelegramUser requireSuperAdmin(String initData) {
        TelegramUser user = authenticated(initData);
        if (user.id() != properties.marketplace().superAdminTelegramId()) {
            throw new IllegalArgumentException("Super-admin access required");
        }
        return user;
    }

    public record CreateProductRequest(
            long groupId,
            @NotBlank String title,
            @NotBlank String description,
            @NotBlank String category,
            @Positive int stock,
            @Positive long sellerPriceKopecks,
            @NotBlank String kind,
            @NotBlank String imageUrlsJson,
            @Min(2) Integer targetCount,
            @Min(1) @Max(60) Integer collectionDays
    ) {}
    public record CreateStoreRequest(
            long groupId,
            @NotBlank String name,
            String description,
            String paymentPhone,
            String paymentCard
    ) {}
    public record ReserveRequest(String phone) {}
    public record OpenPaymentRequest(@Positive long finalPriceKopecks,
                                     @Min(1) @Max(72) int deadlineHours) {}
    public record DeliveryRequest(Instant from, Instant to, @NotBlank String note) {}
    public record GroupCommissionRequest(@Min(0) @Max(30) double commissionPercent) {}
    public record RepayDebtRequest(@Positive long amountKopecks) {}
    public record GlobalSettingsRequest(@Min(0) @Max(30) double botCommissionPercent,
                                        @Positive long debtLimitKopecks) {}
}
