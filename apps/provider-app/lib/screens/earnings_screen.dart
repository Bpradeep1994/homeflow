import 'package:flutter/material.dart';

import '../api/client.dart';
import '../theme.dart';

class EarningsScreen extends StatefulWidget {
  const EarningsScreen({super.key});

  @override
  State<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends State<EarningsScreen> {
  late Future<Map<String, dynamic>> _payouts = ApiClient.instance.payouts();

  void _refresh() => setState(() => _payouts = ApiClient.instance.payouts());

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Earnings', style: TextStyle(fontWeight: FontWeight.w700))),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _payouts,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(child: Text(snapshot.error.toString()));
          }
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          final p = snapshot.data!;
          final payments = (p['payments'] as List).cast<Map<String, dynamic>>();
          return RefreshIndicator(
            onRefresh: () async => _refresh(),
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient:
                        LinearGradient(colors: [scheme.primary, scheme.primary.withValues(alpha: 0.8)]),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Total Earnings', style: TextStyle(color: Colors.white70, fontSize: 13)),
                      const SizedBox(height: 4),
                      Text(formatRupees(p['totalEarned'] as int),
                          style: const TextStyle(
                              color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 10,
                        runSpacing: 8,
                        children: [
                          _pill('Today', formatRupees(p['today'] as int)),
                          _pill('This week', formatRupees(p['thisWeek'] as int)),
                          _pill('This month', formatRupees(p['thisMonth'] as int)),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _SettleCard(
                        label: 'Pending settlement',
                        value: formatRupees(p['pendingSettlement'] as int),
                        hint: 'settles Monday',
                        color: Colors.orange,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _SettleCard(
                        label: 'Settled to bank',
                        value: formatRupees(p['settled'] as int),
                        hint: 'all time',
                        color: Colors.green,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Text('Payout history', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                if (payments.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Text('Complete jobs to start earning',
                          style: TextStyle(color: Colors.grey.shade600)),
                    ),
                  )
                else
                  Card(
                    child: Column(
                      children: [
                        for (final (i, pay) in payments.indexed) ...[
                          ListTile(
                            leading: CircleAvatar(
                              backgroundColor:
                                  pay['settledAt'] != null ? Colors.green.shade50 : Colors.orange.shade50,
                              child: Icon(
                                pay['settledAt'] != null ? Icons.check_rounded : Icons.schedule,
                                color: pay['settledAt'] != null
                                    ? Colors.green.shade700
                                    : Colors.orange.shade700,
                                size: 20,
                              ),
                            ),
                            title: Text(
                                (pay['booking'] as Map<String, dynamic>)['id'] as String,
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                            subtitle: Text(pay['settledAt'] != null
                                ? 'Settled · ${pay['method']}'
                                : 'Awaiting Monday settlement · ${pay['method']}'),
                            trailing: Text('+ ${formatRupees(pay['payout'] as int)}',
                                style: TextStyle(
                                    color: Colors.green.shade700,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14)),
                          ),
                          if (i < payments.length - 1) const Divider(height: 1, indent: 72),
                        ],
                      ],
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _pill(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text('$label: $value',
          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
    );
  }
}

class _SettleCard extends StatelessWidget {
  const _SettleCard({required this.label, required this.value, required this.hint, required this.color});

  final String label;
  final String value;
  final String hint;
  final MaterialColor color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
            const SizedBox(height: 4),
            Text(value,
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18, color: color.shade700)),
            Text(hint, style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
          ],
        ),
      ),
    );
  }
}
