import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../core/models.dart';
import '../core/constants.dart';

class PaymentHistoryChart extends StatelessWidget {
  final List<Payment> payments;

  const PaymentHistoryChart({super.key, required this.payments});

  @override
  Widget build(BuildContext context) {
    if (payments.isEmpty) {
      return const SizedBox(
        height: 200,
        child: Center(child: Text('Aucune donnée de paiement')),
      );
    }

    // Prendre les 6 derniers paiements (ou moins si < 6)
    final recentPayments = payments.length > 6
        ? payments.sublist(payments.length - 6)
        : payments;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Historique des paiements',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        AspectRatio(
          aspectRatio: 1.7,
          child: BarChart(
            BarChartData(
              alignment: BarChartAlignment.spaceAround,
              maxY: _getMaxAmount(recentPayments) * 1.2,
              barTouchData: BarTouchData(
                enabled: true,
                touchTooltipData: BarTouchTooltipData(
                  tooltipBgColor: Colors.blueGrey,
                  getTooltipItem: (group, groupIndex, rod, rodIndex) {
                    return BarTooltipItem(
                      '${rod.toY.toInt()} FCFA',
                      const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    );
                  },
                ),
              ),
              titlesData: FlTitlesData(
                show: true,
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    getTitlesWidget: (value, meta) {
                      final index = value.toInt();
                      if (index < 0 || index >= recentPayments.length) {
                        return const SizedBox.shrink();
                      }
                      final monthStr = recentPayments[index].month.split(
                        ' ',
                      )[0];
                      return SideTitleWidget(
                        axisSide: meta.axisSide,
                        child: Text(
                          monthStr.substring(0, 3),
                          style: const TextStyle(
                            fontSize: 10,
                            color: Colors.grey,
                          ),
                        ),
                      );
                    },
                    reservedSize: 30,
                  ),
                ),
                leftTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                rightTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
                topTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false),
                ),
              ),
              gridData: const FlGridData(show: false),
              borderData: FlBorderData(show: false),
              barGroups: recentPayments.asMap().entries.map((entry) {
                final index = entry.key;
                final payment = entry.value;
                return BarChartGroupData(
                  x: index,
                  barRods: [
                    BarChartRodData(
                      toY: payment.amountPaid > 0 ? payment.amountPaid : payment.amount,
                      color: payment.isPaid
                          ? const Color(AppColors.accent)
                          : Colors.orange,
                      width: 16,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(4),
                        topRight: Radius.circular(4),
                      ),
                    ),
                  ],
                );
              }).toList(),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildLegendItem('Payé', const Color(AppColors.accent)),
            const SizedBox(width: 20),
            _buildLegendItem('À payer', Colors.orange),
          ],
        ),
      ],
    );
  }

  double _getMaxAmount(List<Payment> payments) {
    if (payments.isEmpty) return 100;
    return payments
        .map((p) => p.amountPaid > 0 ? p.amountPaid : p.amount)
        .reduce((a, b) => a > b ? a : b);
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }
}
