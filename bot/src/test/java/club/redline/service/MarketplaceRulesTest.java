package club.redline.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MarketplaceRulesTest {
    @Test
    void calculatesBuyerPriceWithBotAndGroupCommissions() {
        long price = MarketplaceRules.buyerPrice(
                100_000,
                new BigDecimal("5.0"),
                new BigDecimal("3.5")
        );
        assertThat(price).isEqualTo(108_500);
    }

    @Test
    void blocksSellerAtTheLimitAndAbove() {
        assertThat(MarketplaceRules.debtBlocksSeller(49_999, 50_000)).isFalse();
        assertThat(MarketplaceRules.debtBlocksSeller(50_000, 50_000)).isTrue();
        assertThat(MarketplaceRules.debtBlocksSeller(62_000, 50_000)).isTrue();
    }

    @Test
    void activatesGroupBuyOnlyWhenTargetIsReached() {
        assertThat(MarketplaceRules.groupBuyThresholdReached(9, 10)).isFalse();
        assertThat(MarketplaceRules.groupBuyThresholdReached(10, 10)).isTrue();
        assertThat(MarketplaceRules.groupBuyThresholdReached(12, 10)).isTrue();
        assertThatThrownBy(() -> MarketplaceRules.groupBuyThresholdReached(1, 1))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
