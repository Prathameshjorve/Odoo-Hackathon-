class BaseRefundCalculator {
  getRules(policy) {
    if (!policy) {
      return [];
    }

    if (Array.isArray(policy.rules) && policy.rules.length > 0) {
      return [...policy.rules].sort((left, right) => Number(right.hoursBefore) - Number(left.hoursBefore));
    }

    const fallbackRules = [];
    if (Number.isFinite(Number(policy.fullRefundHours))) {
      fallbackRules.push({ hoursBefore: Number(policy.fullRefundHours), percentage: 100, fee: Number(policy.globalProcessingFee || policy.processingFee || 0) });
    }
    if (Number.isFinite(Number(policy.partialRefundHours))) {
      fallbackRules.push({ hoursBefore: Number(policy.partialRefundHours), percentage: Number(policy.partialRefundPercent || 50), fee: Number(policy.globalProcessingFee || policy.processingFee || 0) });
    }
    fallbackRules.push({ hoursBefore: 0, percentage: 0, fee: Number(policy.globalProcessingFee || policy.processingFee || 0) });
    return fallbackRules.sort((left, right) => Number(right.hoursBefore) - Number(left.hoursBefore));
  }

  calculate(booking, policy, currentTime = new Date()) {
    const originalAmount = Number(booking.amountPaid || booking.totalAmount || booking.price || 0);
    const startTime = new Date(booking.startTime);
    const hoursBefore = Math.max(0, (startTime.getTime() - new Date(currentTime).getTime()) / (1000 * 60 * 60));
    const special = this.resolveSpecialRules(booking, policy, hoursBefore, originalAmount);
    if (special) {
      return special;
    }

    const rules = this.getRules(policy);
    const matchedRule = rules.find((rule) => hoursBefore >= Number(rule.hoursBefore || 0)) || rules[rules.length - 1] || { percentage: 0, fee: 0, hoursBefore: 0 };
    const percentage = Number(matchedRule.percentage ?? matchedRule.refundPercentage ?? 0);
    const fee = Number(matchedRule.fee ?? policy.globalProcessingFee ?? policy.processingFee ?? 0);
    const refundAmount = Math.max(0, Math.round((originalAmount * percentage) / 100) - fee);
    return {
      refundAmount,
      originalAmount,
      processingFee: fee,
      refundType: percentage >= 100 ? 'FULL' : percentage > 0 ? 'PARTIAL' : 'CUSTOM',
      rule: matchedRule,
      hoursBefore,
    };
  }

  resolveSpecialRules(booking, policy, hoursBefore, originalAmount) {
    const specialRules = policy && policy.specialRules ? policy.specialRules : null;
    if (!specialRules || typeof specialRules !== 'object') {
      return null;
    }

    const bookingFlags = {
      vip: Boolean(booking.metadata?.vip || booking.isVip),
      group: Number(booking.numberOfSlots || 1) > 1 || Boolean(booking.metadata?.groupBooking),
      peak: Boolean(booking.metadata?.peakHour),
    };

    const key = bookingFlags.vip ? 'vip' : bookingFlags.group ? 'group' : bookingFlags.peak ? 'peak' : null;
    if (!key || !specialRules[key]) {
      return null;
    }

    const rule = specialRules[key];
    const percentage = Number(rule.percentage ?? 0);
    const fee = Number(rule.fee ?? policy.globalProcessingFee ?? 0);
    const refundAmount = Math.max(0, Math.round((originalAmount * percentage) / 100) - fee);

    return {
      refundAmount,
      originalAmount,
      processingFee: fee,
      refundType: percentage >= 100 ? 'FULL' : percentage > 0 ? 'PARTIAL' : 'CUSTOM',
      rule: { ...rule, specialRule: key },
      hoursBefore,
    };
  }
}

class FullRefundCalculator extends BaseRefundCalculator {}
class PartialRefundCalculator extends BaseRefundCalculator {}
class CustomRefundCalculator extends BaseRefundCalculator {}

class RefundCalculatorFactory {
  static getCalculator(bookingType) {
    switch (String(bookingType || '').toUpperCase()) {
      case 'FULL':
        return new FullRefundCalculator();
      case 'PARTIAL':
        return new PartialRefundCalculator();
      case 'CUSTOM':
        return new CustomRefundCalculator();
      default:
        return new BaseRefundCalculator();
    }
  }
}

module.exports = {
  BaseRefundCalculator,
  FullRefundCalculator,
  PartialRefundCalculator,
  CustomRefundCalculator,
  RefundCalculatorFactory,
};
