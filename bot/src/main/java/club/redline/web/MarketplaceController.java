package club.redline.web;

import club.redline.config.RedlineProperties;
import club.redline.security.TelegramInitDataVerifier;
import club.redline.security.TelegramInitDataVerifier.TelegramUser;
import club.redline.service.MarketplaceService;
import club.redline.service.ImageStorageService;
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
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class MarketplaceController {
    private final MarketplaceService marketplace;
    private final TelegramInitDataVerifier verifier;
    private final RedlineProperties properties;
    private final ImageStorageService images;

    public MarketplaceController(MarketplaceService marketplace, TelegramInitDataVerifier verifier,
                                 RedlineProperties properties, ImageStorageService images) {
        this.marketplace = marketplace;
        this.verifier = verifier;
        this.properties = properties;
        this.images = images;
    }

    @GetMapping("/me")
    public Map<String, Object> me(
            @RequestHeader("X-Telegram-Init-Data") String initData) {
        TelegramUser user = authenticated(initData);
        Map<String, Object> profile = new java.util.LinkedHashMap<>(
                marketplace.profile(user.id())
        );
        profile.put("super_admin",
                user.id() == properties.marketplace().superAdminTelegramId());
        return profile;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void register(@RequestHeader("X-Telegram-Init-Data") String initData,
                         @Valid @RequestBody RegistrationRequest request) {
        TelegramUser user = authenticated(initData);
        marketplace.registerProfile(
                user.id(), request.displayName(), request.phone(), request.groupId()
        );
    }

    @PutMapping("/me/group/{groupId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void selectGroup(@RequestHeader("X-Telegram-Init-Data") String initData,
                            @PathVariable @Positive long groupId) {
        marketplace.selectGroup(registered(initData).id(), groupId);
    }

    @GetMapping("/groups")
    public List<Map<String, Object>> availableGroups(
            @RequestHeader("X-Telegram-Init-Data") String initData) {
        authenticated(initData);
        return marketplace.availableGroups();
    }

    @GetMapping("/categories")
    public List<Map<String, Object>> categories() {
        return marketplace.categories();
    }

    @PostMapping(value = "/uploads", consumes = "multipart/form-data")
    public Map<String, String> upload(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @RequestPart("file") MultipartFile file) {
        TelegramUser user = authenticated(initData);
        if (!asBoolean(marketplace.profile(user.id()).get("registered"))) {
            throw new IllegalArgumentException("Registration is required");
        }
        return Map.of("url", images.store(file));
    }

    @GetMapping("/groups/{groupId}/catalog")
    public List<Map<String, Object>> catalog(@PathVariable long groupId) {
        return marketplace.catalog(groupId);
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> createProduct(@RequestHeader("X-Telegram-Init-Data") String initData,
                                           @Valid @RequestBody CreateProductRequest request) {
        TelegramUser user = registered(initData);
        long id = marketplace.createProduct(user.id(), new NewProduct(
                request.groupId(), request.title(), request.description(), request.category(),
                request.stock(), request.sellerPriceKopecks(), request.kind(),
                request.imageUrlsJson(), request.targetCount(), request.collectionDays()
        ));
        return Map.of("id", id);
    }

    @GetMapping("/groups/{telegramGroupId}/my-products")
    public List<Map<String, Object>> myProducts(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long telegramGroupId) {
        return marketplace.sellerProducts(
                registered(initData).id(), telegramGroupId
        );
    }

    @PutMapping("/products/{productId}/active")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setProductActive(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long productId,
            @RequestBody ProductActiveRequest request) {
        marketplace.setSellerProductActive(
                registered(initData).id(), productId, request.active()
        );
    }

    @PostMapping("/stores")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> createStore(@RequestHeader("X-Telegram-Init-Data") String initData,
                                         @Valid @RequestBody CreateStoreRequest request) {
        TelegramUser user = registered(initData);
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
        TelegramUser user = registered(initData);
        return marketplace.reserve(id, user.id(), request.phone());
    }

    @PostMapping("/group-buys/{id}/open-payment")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void openPayment(@RequestHeader("X-Telegram-Init-Data") String initData,
                            @PathVariable long id,
                            @Valid @RequestBody OpenPaymentRequest request) {
        TelegramUser user = registered(initData);
        marketplace.openPayment(id, user.id(), request.finalPriceKopecks(), request.deadlineHours());
    }

    @PostMapping("/group-buys/{id}/paid")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markPaid(@RequestHeader("X-Telegram-Init-Data") String initData,
                         @PathVariable long id) {
        marketplace.markGroupBuyPaid(id, registered(initData).id());
    }

    @PostMapping("/group-buys/{id}/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirm(@RequestHeader("X-Telegram-Init-Data") String initData,
                        @PathVariable long id) {
        marketplace.confirmGroupBuy(id, registered(initData).id());
    }

    @PutMapping("/group-buys/{id}/delivery")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateDelivery(@RequestHeader("X-Telegram-Init-Data") String initData,
                               @PathVariable long id,
                               @Valid @RequestBody DeliveryRequest request) {
        marketplace.updateDelivery(id, registered(initData).id(),
                request.from(), request.to(), request.note());
    }

    @GetMapping("/group-buys/{id}/buyers")
    public List<Map<String, Object>> buyers(@RequestHeader("X-Telegram-Init-Data") String initData,
                                            @PathVariable long id) {
        return marketplace.groupBuyBuyers(id, registered(initData).id());
    }

    @PostMapping("/products/{productId}/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> createOrder(@RequestHeader("X-Telegram-Init-Data") String initData,
                                         @PathVariable long productId) {
        return Map.of("id", marketplace.createOrder(registered(initData).id(), productId));
    }

    @GetMapping("/groups/{telegramGroupId}/orders/purchases")
    public List<Map<String, Object>> purchaseOrders(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long telegramGroupId) {
        return marketplace.purchaseOrders(
                registered(initData).id(), telegramGroupId
        );
    }

    @GetMapping("/groups/{telegramGroupId}/orders/sales")
    public List<Map<String, Object>> salesOrders(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long telegramGroupId) {
        return marketplace.salesOrders(
                registered(initData).id(), telegramGroupId
        );
    }

    @PostMapping("/orders/{id}/status/{status}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void advanceOrder(@RequestHeader("X-Telegram-Init-Data") String initData,
                             @PathVariable long id, @PathVariable String status) {
        marketplace.advanceOrder(id, registered(initData).id(), status.toUpperCase());
    }

    @PutMapping("/groups/{telegramGroupId}/commission")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateGroupCommission(@RequestHeader("X-Telegram-Init-Data") String initData,
                                      @PathVariable long telegramGroupId,
                                      @Valid @RequestBody GroupCommissionRequest request) {
        marketplace.updateGroupCommission(
                telegramGroupId, registered(initData).id(), request.commissionPercent()
        );
    }

    @GetMapping("/groups/{telegramGroupId}/admin/stats")
    public Map<String, Object> groupAdminStats(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long telegramGroupId) {
        return marketplace.groupAdminStats(
                telegramGroupId, registered(initData).id()
        );
    }

    @DeleteMapping("/groups/{telegramGroupId}/products/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivateProduct(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long telegramGroupId,
            @PathVariable long productId) {
        marketplace.deactivateProduct(
                telegramGroupId, registered(initData).id(), productId
        );
    }

    @PutMapping("/groups/{telegramGroupId}/sellers/{sellerTelegramId}/ban")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setGroupSellerBan(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long telegramGroupId,
            @PathVariable long sellerTelegramId,
            @RequestBody SellerBanRequest request) {
        marketplace.setGroupSellerBan(
                telegramGroupId, registered(initData).id(),
                sellerTelegramId, request.banned()
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

    @PutMapping("/admin/groups/{groupId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateGroup(@RequestHeader("X-Telegram-Init-Data") String initData,
                            @PathVariable long groupId,
                            @Valid @RequestBody AdminGroupRequest request) {
        requireSuperAdmin(initData);
        marketplace.updateGroupAsSuperAdmin(
                groupId, request.commissionPercent(), request.active()
        );
    }

    @GetMapping("/admin/settings")
    public Map<String, Object> settings(
            @RequestHeader("X-Telegram-Init-Data") String initData) {
        requireSuperAdmin(initData);
        return marketplace.globalSettings();
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

    @PostMapping("/admin/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> createCategory(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @Valid @RequestBody CategoryRequest request) {
        requireSuperAdmin(initData);
        return Map.of("id", marketplace.createCategory(request.name()));
    }

    @DeleteMapping("/admin/categories/{categoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long categoryId) {
        requireSuperAdmin(initData);
        marketplace.deleteCategory(categoryId);
    }

    private TelegramUser authenticated(String initData) {
        TelegramUser user = verifier.verify(initData);
        marketplace.upsertUser(user);
        return user;
    }

    private TelegramUser requireSuperAdmin(String initData) {
        TelegramUser user = registered(initData);
        if (user.id() != properties.marketplace().superAdminTelegramId()) {
            throw new IllegalArgumentException("Super-admin access required");
        }
        return user;
    }

    private TelegramUser registered(String initData) {
        TelegramUser user = authenticated(initData);
        if (!asBoolean(marketplace.profile(user.id()).get("registered"))) {
            throw new IllegalArgumentException("Registration is required");
        }
        return user;
    }

    private static boolean asBoolean(Object value) {
        if (value instanceof Boolean booleanValue) return booleanValue;
        if (value instanceof Number numberValue) return numberValue.intValue() != 0;
        return value != null && Boolean.parseBoolean(String.valueOf(value));
    }

    public record RegistrationRequest(@NotBlank String displayName,
                                      @NotBlank String phone,
                                      @Positive Long groupId) {}
    public record CategoryRequest(@NotBlank String name) {}
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
    public record ProductActiveRequest(boolean active) {}
    public record ReserveRequest(String phone) {}
    public record OpenPaymentRequest(@Positive long finalPriceKopecks,
                                     @Min(1) @Max(72) int deadlineHours) {}
    public record DeliveryRequest(Instant from, Instant to, @NotBlank String note) {}
    public record GroupCommissionRequest(@Min(0) @Max(30) double commissionPercent) {}
    public record AdminGroupRequest(@Min(0) @Max(30) double commissionPercent,
                                    boolean active) {}
    public record SellerBanRequest(boolean banned) {}
    public record RepayDebtRequest(@Positive long amountKopecks) {}
    public record GlobalSettingsRequest(@Min(0) @Max(30) double botCommissionPercent,
                                        @Positive long debtLimitKopecks) {}
}
