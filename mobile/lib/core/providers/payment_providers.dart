import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models.dart';
import '../database/database_helper.dart';
import '../services/connectivity_service.dart';
import '../../payments/payment_service.dart';

/// Payment service provider
final paymentServiceProvider = Provider<PaymentService>((ref) {
  return PaymentService();
});

/// Database helper provider
final databaseHelperProvider = Provider<DatabaseHelper>((ref) {
  return DatabaseHelper.instance;
});

/// Payments provider with offline support
final paymentsProvider = FutureProvider.autoDispose<List<Payment>>((ref) async {
  final paymentService = ref.watch(paymentServiceProvider);
  final dbHelper = ref.watch(databaseHelperProvider);
  final connectivityService = ref.watch(connectivityServiceProvider);

  final isConnected = await connectivityService.isConnected();

  if (isConnected) {
    try {
      // Fetch from API
      final payments = await paymentService.getPayments();

      // Save to local database
      await dbHelper.insertPayments(payments);
      await dbHelper.updateSyncMetadata('payments', DateTime.now());

      return payments;
    } catch (e) {
      // If API fails, fallback to local database
      return await dbHelper.getPayments();
    }
  } else {
    // Offline mode: load from local database
    return await dbHelper.getPayments();
  }
});

/// Payment overview provider for payment cards screen
final paymentOverviewProvider = FutureProvider.autoDispose<PaymentOverview>((
  ref,
) async {
  final paymentService = ref.watch(paymentServiceProvider);
  final connectivityService = ref.watch(connectivityServiceProvider);
  final isConnected = await connectivityService.isConnected();

  if (!isConnected) {
    // Offline fallback from local cache.
    final cached = await ref.watch(databaseHelperProvider).getPayments();
    final paid = cached.where((p) => p.isPaid || p.isValidated).toList()
      ..sort((a, b) => b.dueDate.compareTo(a.dueDate));

    final now = DateTime.now();
    final nextMonthStart = DateTime(now.year, now.month + 1, 1);
    final nextMonthEnd = DateTime(now.year, now.month + 2, 0, 23, 59, 59);
    Payment? upcoming;
    for (final p in cached) {
      final due = p.dueDate;
      final isPaid = p.isPaid || p.isValidated;
      if (!isPaid &&
          !due.isBefore(nextMonthStart) &&
          !due.isAfter(nextMonthEnd)) {
        upcoming = p;
        break;
      }
    }

    return PaymentOverview(
      paidPayments: paid,
      upcomingNextMonth: upcoming,
      nextMonthLabel:
          '${nextMonthStart.year}-${nextMonthStart.month.toString().padLeft(2, '0')}',
    );
  }

  final overview = await paymentService.getPaymentOverview();
  return overview;
});

/// Provider to refresh payments
final refreshPaymentsProvider = Provider<Future<void> Function()>((ref) {
  return () async {
    ref.invalidate(paymentsProvider);
    ref.invalidate(paymentOverviewProvider);
  };
});

/// Payment statistics provider
final paymentStatsProvider = Provider<PaymentStats>((ref) {
  final paymentsAsync = ref.watch(paymentsProvider);

  return paymentsAsync.when(
    data: (payments) {
      final unpaid = payments.where((p) => !p.isPaid).length;
      final pending = payments.where((p) => p.isPendingValidation).length;
      final total = payments.fold<double>(
        0,
        (sum, p) => sum + p.amount + p.lateFee,
      );
      final paid = payments.fold<double>(
        0,
        (sum, p) => sum + (p.isPaid ? p.amount + p.lateFee : 0),
      );

      return PaymentStats(
        unpaidCount: unpaid,
        pendingCount: pending,
        totalAmount: total,
        paidAmount: paid,
      );
    },
    loading: () => PaymentStats.empty(),
    error: (error, stackTrace) => PaymentStats.empty(),
  );
});

/// Payment stats model
class PaymentStats {
  final int unpaidCount;
  final int pendingCount;
  final double totalAmount;
  final double paidAmount;

  PaymentStats({
    required this.unpaidCount,
    required this.pendingCount,
    required this.totalAmount,
    required this.paidAmount,
  });

  factory PaymentStats.empty() {
    return PaymentStats(
      unpaidCount: 0,
      pendingCount: 0,
      totalAmount: 0,
      paidAmount: 0,
    );
  }

  double get remainingAmount => totalAmount - paidAmount;
  double get paidPercentage =>
      totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
}
