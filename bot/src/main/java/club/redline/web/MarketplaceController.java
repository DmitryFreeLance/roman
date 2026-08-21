package club.redline.web;

import club.redline.security.TelegramInitDataVerifier;
import club.redline.security.TelegramInitDataVerifier.TelegramUser;
import club.redline.service.MarketplaceService;
import club.redline.service.ImageStorageService;
import club.redline.service.LegalDocumentService;
import club.redline.service.MarketplaceService.NewProduct;
import club.redline.service.MarketplaceService.NewStore;
import club.redline.service.MarketplaceService.ReservationResult;
import club.redline.service.MarketplaceService.UpdateProduct;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
    private final ImageStorageService images;
    private final LegalDocumentService legalDocuments;

    public MarketplaceController(MarketplaceService marketplace, TelegramInitDataVerifier verifier,
                                 ImageStorageService images,
                                 LegalDocumentService legalDocuments) {
        this.marketplace = marketplace;
        this.verifier = verifier;
        this.images = images;
        this.legalDocuments = legalDocuments;
    }

    @GetMapping("/me")
    public Map<String, Object> me(
            @RequestHeader("X-Telegram-Init-Data") String initData) {
        TelegramUser user = authenticated(initData);
        Map<String, Object> profile = new java.util.LinkedHashMap<>(
                marketplace.profile(user.id())
        );
        profile.put("super_admin", marketplace.isSuperAdmin(user.id()));
        return profile;
    }

    @GetMapping("/me/finance/{telegramGroupId}")
    public Map<String, Object> sellerFinance(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long telegramGroupId) {
        return marketplace.sellerFinance(
                registered(initData).id(), telegramGroupId
        );
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void register(@RequestHeader("X-Telegram-Init-Data") String initData,
                         @Valid @RequestBody RegistrationRequest request) {
        TelegramUser user = authenticated(initData);
        marketplace.registerProfile(
                user.id(), request.displayName(), request.phone(), request.groupId(),
                request.privacyAccepted()
        );
    }

    @GetMapping("/legal/privacy-policy")
    public ResponseEntity<byte[]> privacyPolicy() {
        return document(legalDocuments.privacyPolicy(),
                "Политика_конфиденциальности.docx");
    }

    @GetMapping("/legal/privacy-policy-view")
    public Map<String, String> privacyPolicyView() {
        return Map.of(
                "title", "REDLINE CLUB",
                "content", legalDocuments.privacyPolicyText()
        );
    }

    @GetMapping("/legal/public-offer-template")
    public ResponseEntity<byte[]> publicOfferTemplate(
            @RequestHeader("X-Telegram-Init-Data") String initData) {
        registered(initData);
        return document(legalDocuments.publicOfferTemplate(),
                "Публичная_оферта_шаблон.docx");
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

    @GetMapping("/me/favorites")
    public List<Long> favorites(
            @RequestHeader("X-Telegram-Init-Data") String initData) {
        return marketplace.favorites(registered(initData).id());
    }

    @PutMapping("/me/favorites/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setFavorite(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long productId,
            @RequestBody FavoriteRequest request) {
        marketplace.setFavorite(
                registered(initData).id(), productId, request.favorite()
        );
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
    public List<Map<String, Object>> catalog(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long groupId) {
        return marketplace.catalog(groupId, registered(initData).id());
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> createProduct(@RequestHeader("X-Telegram-Init-Data") String initData,
                                           @Valid @RequestBody CreateProductRequest request) {
        TelegramUser user = registered(initData);
        long id = marketplace.createProduct(user.id(), new NewProduct(
                request.groupId(), request.title(), request.description(),
                request.specifications(), request.category(),
                request.stock(), request.sellerPriceKopecks(), request.kind(),
                request.imageUrlsJson(), request.colorVariantsJson(),
                request.targetCount(), request.collectionDays()
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

    @PutMapping("/products/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateProduct(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long productId,
            @Valid @RequestBody UpdateProductRequest request) {
        marketplace.updateSellerProduct(registered(initData).id(), productId,
                new UpdateProduct(
                        request.title(), request.description(), request.specifications(),
                        request.category(),
                        request.stock(), request.sellerPriceKopecks(),
                        request.imageUrlsJson(), request.colorVariantsJson()
                ));
    }

    @DeleteMapping("/products/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProduct(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long productId) {
        marketplace.deleteSellerProduct(registered(initData).id(), productId);
    }

    @GetMapping("/groups/{telegramGroupId}/my-store")
    public Map<String, Object> myStore(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long telegramGroupId) {
        return marketplace.myStore(registered(initData).id(), telegramGroupId);
    }

    @GetMapping("/me/seller-profile/{telegramGroupId}")
    public Map<String, Object> sellerProfile(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long telegramGroupId) {
        return marketplace.sellerProfile(
                registered(initData).id(), telegramGroupId
        );
    }

    @PostMapping("/stores")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> createStore(@RequestHeader("X-Telegram-Init-Data") String initData,
                                         @Valid @RequestBody CreateStoreRequest request) {
        TelegramUser user = registered(initData);
        long id = marketplace.createStore(user.id(), new NewStore(
                request.groupId(), request.name(), request.description(),
                request.imageUrl(), request.paymentBank(),
                request.paymentPhone(), request.paymentRecipientName(),
                request.paymentSbpLink(), request.offerSellerName(),
                request.offerInn(), request.offerEmail(), request.offerAddress(),
                request.offerSettlementAccount(), request.offerBankName(),
                request.offerBik(), request.offerCorrespondentAccount()
        ));
        return Map.of("id", id);
    }

    @PutMapping("/stores/{storeId}/image")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateStoreImage(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long storeId,
            @Valid @RequestBody StoreImageRequest request) {
        marketplace.updateStoreImage(
                registered(initData).id(), storeId, request.imageUrl()
        );
    }

    @PutMapping("/stores/{storeId}/profile")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateStoreProfile(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long storeId,
            @Valid @RequestBody StoreProfileRequest request) {
        marketplace.updateStoreProfile(
                registered(initData).id(), storeId,
                request.name(), request.imageUrl(), request.paymentBank(),
                request.paymentPhone(), request.paymentRecipientName(),
                request.paymentSbpLink(), request.offerSellerName(),
                request.offerInn(), request.offerEmail(), request.offerAddress(),
                request.offerSettlementAccount(), request.offerBankName(),
                request.offerBik(), request.offerCorrespondentAccount()
        );
    }

    @GetMapping("/stores/{storeId}/offer")
    public ResponseEntity<byte[]> storeOffer(@PathVariable long storeId) {
        Map<String, Object> details = marketplace.storeOfferDetails(storeId);
        return document(legalDocuments.personalizedOffer(details),
                "Публичная_оферта_магазина.docx");
    }

    @GetMapping("/stores/{storeId}/offer-view")
    public Map<String, String> storeOfferView(@PathVariable long storeId) {
        Map<String, Object> details = marketplace.storeOfferDetails(storeId);
        return Map.of(
                "title", String.valueOf(details.getOrDefault("store_name", "Магазин")),
                "content", legalDocuments.personalizedOfferText(details)
        );
    }

    @PostMapping("/group-buys/{id}/reservations")
    public ReservationResult reserve(@RequestHeader("X-Telegram-Init-Data") String initData,
                                     @PathVariable long id,
                                     @RequestBody ReserveRequest request) {
        TelegramUser user = registered(initData);
        return marketplace.reserve(
                id, user.id(), request.phone(), request.selectedColorKey()
        );
    }

    @DeleteMapping("/group-buys/{id}/reservations/me")
    public ReservationResult cancelReservation(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long id) {
        return marketplace.cancelReservation(id, registered(initData).id());
    }

    @PutMapping("/group-buys/{id}/target")
    public ReservationResult updateGroupBuyTarget(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long id,
            @Valid @RequestBody GroupBuyTargetRequest request) {
        return marketplace.updateGroupBuyTarget(
                id, registered(initData).id(), request.targetCount()
        );
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
                                         @PathVariable long productId,
                                         @Valid @RequestBody CreateOrderRequest request) {
        return Map.of("id", marketplace.createOrder(
                registered(initData).id(), productId,
                request.quantity(), request.requestId(), request.selectedColorKey(),
                request.fulfillmentDetails()
        ));
    }

    @PostMapping("/orders/batch")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createOrders(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @Valid @RequestBody CreateOrdersRequest request) {
        List<MarketplaceService.OrderItem> items = request.items().stream()
                .map(item -> new MarketplaceService.OrderItem(
                        item.productId(), item.quantity(), item.selectedColorKey()
                ))
                .toList();
        return Map.of("ids", marketplace.createOrders(
                registered(initData).id(), request.requestId(),
                request.fulfillmentDetails(), items
        ));
    }

    @GetMapping("/products/{productId}/discussion")
    public List<Map<String, Object>> productDiscussion(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long productId) {
        registered(initData);
        return marketplace.productDiscussion(productId);
    }

    @PostMapping("/products/{productId}/discussion")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> addProductDiscussionMessage(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long productId,
            @Valid @RequestBody DiscussionMessageRequest request) {
        return Map.of("id", marketplace.addProductDiscussionMessage(
                productId, registered(initData).id(), request.body()
        ));
    }

    @GetMapping("/groups/{telegramGroupId}/orders/purchases")
    public List<Map<String, Object>> purchaseOrders(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long telegramGroupId) {
        return marketplace.purchaseOrders(
                registered(initData).id(), telegramGroupId
        );
    }

    @GetMapping("/groups/{telegramGroupId}/group-buys/purchases")
    public List<Map<String, Object>> groupBuyPurchases(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long telegramGroupId) {
        return marketplace.groupBuyPurchases(
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

    @PostMapping("/orders/{id}/reports")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> reportSeller(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long id,
            @Valid @RequestBody SellerReportRequest request) {
        return Map.of("id", marketplace.submitSellerReport(
                registered(initData).id(), id, request.reason()
        ));
    }

    @PostMapping("/orders/{id}/review")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void createReview(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long id,
            @Valid @RequestBody ReviewRequest request) {
        marketplace.createReview(registered(initData).id(), id, request.rating());
    }

    @PostMapping("/group-buys/{id}/reports")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> reportGroupBuySeller(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long id,
            @Valid @RequestBody SellerReportRequest request) {
        return Map.of("id", marketplace.submitGroupBuyReport(
                registered(initData).id(), id, request.reason()
        ));
    }

    @PostMapping("/support")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Long> submitSupportRequest(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @Valid @RequestBody SupportRequest request) {
        return Map.of("id", marketplace.submitSupportRequest(
                registered(initData).id(), request.message()
        ));
    }

    @GetMapping("/me/notifications")
    public List<Map<String, Object>> notifications(
            @RequestHeader("X-Telegram-Init-Data") String initData) {
        return marketplace.notifications(registered(initData).id());
    }

    @PutMapping("/me/notifications/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markNotificationRead(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long id) {
        marketplace.markNotificationRead(registered(initData).id(), id);
    }

    @PutMapping("/me/notifications/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllNotificationsRead(
            @RequestHeader("X-Telegram-Init-Data") String initData) {
        marketplace.markAllNotificationsRead(registered(initData).id());
    }

    @PutMapping("/groups/{telegramGroupId}/commission")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateGroupCommission(@RequestHeader("X-Telegram-Init-Data") String initData,
                                      @PathVariable long telegramGroupId,
                                      @Valid @RequestBody GroupCommissionRequest request) {
        marketplace.updateGroupCommission(
                telegramGroupId, registered(initData).id(),
                request.commissionPercent(), request.paymentBank(),
                request.paymentPhone(), request.paymentRecipientName(),
                request.paymentSbpLink()
        );
    }

    @PutMapping("/groups/{telegramGroupId}/image")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateGroupImage(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long telegramGroupId,
            @Valid @RequestBody GroupImageRequest request) {
        marketplace.updateGroupImage(
                telegramGroupId, registered(initData).id(), request.imageUrl()
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

    @GetMapping("/groups/{telegramGroupId}/admin/seller-finances")
    public List<Map<String, Object>> groupSellerFinances(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long telegramGroupId) {
        return marketplace.groupSellerFinances(
                telegramGroupId, registered(initData).id()
        );
    }

    @PutMapping("/groups/{telegramGroupId}/admin/sellers/{sellerTelegramId}/finance")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateGroupSellerFinance(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long telegramGroupId,
            @PathVariable long sellerTelegramId,
            @Valid @RequestBody GroupSellerFinanceRequest request) {
        marketplace.updateGroupSellerFinance(
                telegramGroupId, registered(initData).id(), sellerTelegramId,
                request.commissionPercent(), request.debtLimitKopecks(),
                request.verifiedSeller()
        );
    }

    @PostMapping("/groups/{telegramGroupId}/admin/sellers/{sellerTelegramId}/repay")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void repayGroupSellerDebt(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long telegramGroupId,
            @PathVariable long sellerTelegramId,
            @Valid @RequestBody RepayDebtRequest request) {
        marketplace.repayGroupSellerDebt(
                telegramGroupId, registered(initData).id(), sellerTelegramId,
                request.amountKopecks()
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

    @PutMapping("/admin/debts/{sellerTelegramId}/settings")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updatePlatformSellerFinance(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long sellerTelegramId,
            @Valid @RequestBody SellerFinanceRequest request) {
        requireSuperAdmin(initData);
        marketplace.updatePlatformSellerFinance(
                sellerTelegramId, request.commissionPercent(),
                request.debtLimitKopecks()
        );
    }

    @GetMapping("/admin/groups")
    public List<Map<String, Object>> groups(
            @RequestHeader("X-Telegram-Init-Data") String initData) {
        requireSuperAdmin(initData);
        return marketplace.groups();
    }

    @GetMapping("/admin/users")
    public List<Map<String, Object>> users(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @RequestParam(defaultValue = "") String query) {
        requireSuperAdmin(initData);
        return marketplace.users(query);
    }

    @PutMapping("/admin/users/{telegramId}/ban")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setUserBan(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long telegramId,
            @RequestBody UserBanRequest request) {
        requireSuperAdmin(initData);
        marketplace.setGlobalUserBan(telegramId, request.banned());
    }

    @PutMapping("/admin/users/{telegramId}/super-admin")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setSuperAdmin(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long telegramId,
            @RequestBody SuperAdminRequest request) {
        requireSuperAdmin(initData);
        marketplace.setSuperAdmin(telegramId, request.enabled());
    }

    @GetMapping("/admin/reports")
    public List<Map<String, Object>> reports(
            @RequestHeader("X-Telegram-Init-Data") String initData) {
        requireSuperAdmin(initData);
        return marketplace.sellerReports();
    }

    @GetMapping("/admin/support")
    public List<Map<String, Object>> supportRequests(
            @RequestHeader("X-Telegram-Init-Data") String initData) {
        requireSuperAdmin(initData);
        return marketplace.supportRequests();
    }

    @PutMapping("/admin/support/{requestId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resolveSupportRequest(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long requestId) {
        marketplace.resolveSupportRequest(
                requestId, requireSuperAdmin(initData).id()
        );
    }

    @PutMapping("/admin/reports/{reportId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resolveReport(
            @RequestHeader("X-Telegram-Init-Data") String initData,
            @PathVariable long reportId,
            @Valid @RequestBody ResolveReportRequest request) {
        TelegramUser admin = requireSuperAdmin(initData);
        marketplace.resolveSellerReport(
                reportId, admin.id(), request.action().toUpperCase()
        );
    }

    @PutMapping("/admin/groups/{groupId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateGroup(@RequestHeader("X-Telegram-Init-Data") String initData,
                            @PathVariable long groupId,
                            @Valid @RequestBody AdminGroupRequest request) {
        requireSuperAdmin(initData);
        marketplace.updateGroupAsSuperAdmin(
                groupId, request.commissionPercent(),
                request.debtLimitKopecks(), request.active()
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
                request.botCommissionPercent(), request.debtLimitKopecks(),
                request.paymentBank(), request.paymentPhone(),
                request.paymentRecipientName(), request.paymentSbpLink()
        );
    }

    private TelegramUser authenticated(String initData) {
        TelegramUser user = verifier.verify(initData);
        marketplace.upsertUser(user);
        return user;
    }

    private TelegramUser requireSuperAdmin(String initData) {
        TelegramUser user = registered(initData);
        if (!marketplace.isSuperAdmin(user.id())) {
            throw new IllegalArgumentException("Super-admin access required");
        }
        return user;
    }

    private TelegramUser registered(String initData) {
        TelegramUser user = authenticated(initData);
        Map<String, Object> profile = marketplace.profile(user.id());
        if (asBoolean(profile.get("globally_banned"))) {
            throw new IllegalArgumentException("Пользователь заблокирован");
        }
        if (!asBoolean(profile.get("registered"))) {
            throw new IllegalArgumentException("Registration is required");
        }
        return user;
    }

    private static boolean asBoolean(Object value) {
        if (value instanceof Boolean booleanValue) return booleanValue;
        if (value instanceof Number numberValue) return numberValue.intValue() != 0;
        return value != null && Boolean.parseBoolean(String.valueOf(value));
    }

    private ResponseEntity<byte[]> document(byte[] content, String filename) {
        String encoded = java.net.URLEncoder.encode(
                filename, java.nio.charset.StandardCharsets.UTF_8
        ).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"redline-document.docx\"; filename*=UTF-8''" + encoded)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header("X-Content-Type-Options", "nosniff")
                .body(content);
    }

    public record RegistrationRequest(@NotBlank String displayName,
                                      @NotBlank String phone,
                                      @Positive Long groupId,
                                      boolean privacyAccepted) {}
    public record CreateProductRequest(
            long groupId,
            @NotBlank String title,
            @NotBlank String description,
            String specifications,
            @NotBlank @Size(max = 80) String category,
            @Positive int stock,
            @Positive long sellerPriceKopecks,
            @NotBlank String kind,
            @NotBlank String imageUrlsJson,
            @NotBlank String colorVariantsJson,
            @Min(2) Integer targetCount,
            @Min(1) @Max(360) Integer collectionDays
    ) {}
    public record CreateStoreRequest(
            long groupId,
            @NotBlank String name,
            String description,
            @NotBlank String imageUrl,
            @NotBlank @Pattern(regexp = "SBER|TBANK|ALFA|VTB|GAZPROM")
            String paymentBank,
            @NotBlank @Size(max = 30) String paymentPhone,
            @NotBlank @Size(min = 3, max = 100) String paymentRecipientName,
            @Size(max = 500) String paymentSbpLink,
            @NotBlank @Size(max = 200) String offerSellerName,
            @NotBlank @Pattern(regexp = "\\d{10}|\\d{12}") String offerInn,
            @NotBlank @Size(max = 254) String offerEmail,
            @NotBlank @Size(max = 500) String offerAddress,
            @NotBlank @Pattern(regexp = "\\d{20}") String offerSettlementAccount,
            @NotBlank @Size(max = 200) String offerBankName,
            @NotBlank @Pattern(regexp = "\\d{9}") String offerBik,
            @NotBlank @Pattern(regexp = "\\d{20}") String offerCorrespondentAccount
    ) {}
    public record StoreImageRequest(@NotBlank String imageUrl) {}
    public record StoreProfileRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank String imageUrl,
            @NotBlank @Pattern(regexp = "SBER|TBANK|ALFA|VTB|GAZPROM")
            String paymentBank,
            @NotBlank @Size(max = 30) String paymentPhone,
            @NotBlank @Size(min = 3, max = 100) String paymentRecipientName,
            @Size(max = 500) String paymentSbpLink,
            @NotBlank @Size(max = 200) String offerSellerName,
            @NotBlank @Pattern(regexp = "\\d{10}|\\d{12}") String offerInn,
            @NotBlank @Size(max = 254) String offerEmail,
            @NotBlank @Size(max = 500) String offerAddress,
            @NotBlank @Pattern(regexp = "\\d{20}") String offerSettlementAccount,
            @NotBlank @Size(max = 200) String offerBankName,
            @NotBlank @Pattern(regexp = "\\d{9}") String offerBik,
            @NotBlank @Pattern(regexp = "\\d{20}") String offerCorrespondentAccount
    ) {}
    public record UpdateProductRequest(
            @NotBlank String title,
            @NotBlank String description,
            String specifications,
            @NotBlank @Size(max = 80) String category,
            @Min(0) int stock,
            @Positive long sellerPriceKopecks,
            @NotBlank String imageUrlsJson,
            @NotBlank String colorVariantsJson
    ) {}
    public record ProductActiveRequest(boolean active) {}
    public record CreateOrderRequest(@Min(1) @Max(99) int quantity,
                                     @NotBlank @Size(max = 100) String requestId,
                                     String selectedColorKey,
                                     @NotBlank @Size(max = 1000)
                                     String fulfillmentDetails) {}
    public record CreateOrdersRequest(
            @NotBlank @Size(max = 80) String requestId,
            @NotBlank @Size(max = 1000) String fulfillmentDetails,
            @NotNull @Size(min = 1, max = 30)
            List<@Valid CreateOrderItemRequest> items
    ) {}
    public record CreateOrderItemRequest(
            @Positive long productId,
            @Min(1) @Max(99) int quantity,
            String selectedColorKey
    ) {}
    public record ReserveRequest(String phone, String selectedColorKey) {}
    public record GroupBuyTargetRequest(@Min(2) @Max(1000) int targetCount) {}
    public record DiscussionMessageRequest(
            @NotBlank @Size(max = 2000) String body
    ) {}
    public record FavoriteRequest(boolean favorite) {}
    public record ReviewRequest(@Min(1) @Max(5) int rating) {}
    public record SellerReportRequest(@NotBlank String reason) {}
    public record SupportRequest(
            @NotBlank @Size(min = 5, max = 2000) String message
    ) {}
    public record OpenPaymentRequest(@Positive long finalPriceKopecks,
                                     @Min(1) @Max(72) int deadlineHours) {}
    public record DeliveryRequest(Instant from, Instant to, @NotBlank String note) {}
    public record GroupCommissionRequest(
            @Min(0) @Max(30) double commissionPercent,
            @NotBlank @Pattern(regexp = "SBER|TBANK|ALFA|VTB|GAZPROM")
            String paymentBank,
            @NotBlank @Size(max = 30) String paymentPhone,
            @NotBlank @Size(min = 3, max = 100) String paymentRecipientName,
            @Size(max = 500) String paymentSbpLink
    ) {}
    public record GroupImageRequest(@NotBlank String imageUrl) {}
    public record AdminGroupRequest(@Min(0) @Max(30) double commissionPercent,
                                    @Positive long debtLimitKopecks,
                                    boolean active) {}
    public record SellerBanRequest(boolean banned) {}
    public record UserBanRequest(boolean banned) {}
    public record SuperAdminRequest(boolean enabled) {}
    public record ResolveReportRequest(@NotBlank String action) {}
    public record RepayDebtRequest(@Positive long amountKopecks) {}
    public record SellerFinanceRequest(@Min(0) @Max(30) double commissionPercent,
                                       @Positive long debtLimitKopecks) {}
    public record GroupSellerFinanceRequest(
            @Min(0) @Max(30) double commissionPercent,
            @Positive long debtLimitKopecks,
            boolean verifiedSeller
    ) {}
    public record GlobalSettingsRequest(
            @Min(0) @Max(30) double botCommissionPercent,
            @Positive long debtLimitKopecks,
            @NotBlank @Pattern(regexp = "SBER|TBANK|ALFA|VTB|GAZPROM")
            String paymentBank,
            @NotBlank @Size(max = 30) String paymentPhone,
            @NotBlank @Size(min = 3, max = 100) String paymentRecipientName,
            @Size(max = 500) String paymentSbpLink
    ) {}
}
