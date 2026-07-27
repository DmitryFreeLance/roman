package club.redline.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class MarketplaceRules {
    private MarketplaceRules() {}

    public static long buyerPrice(long sellerPriceKopecks,
                                  BigDecimal botCommissionPercent,
                                  BigDecimal groupCommissionPercent) {
        BigDecimal multiplier = BigDecimal.ONE
                .add(botCommissionPercent.movePointLeft(2))
                .add(groupCommissionPercent.movePointLeft(2));
        return BigDecimal.valueOf(sellerPriceKopecks)
                .multiply(multiplier)
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();
    }

    public static boolean debtBlocksSeller(long debtKopecks, long limitKopecks) {
        return debtKopecks >= limitKopecks;
    }

    public static boolean groupBuyThresholdReached(int activeReservations, int targetCount) {
        if (targetCount < 2) throw new IllegalArgumentException("Target must be at least 2");
        return activeReservations >= targetCount;
    }
}
