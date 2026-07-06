/// Job as the provider sees it, mapped from the API booking JSON.
class ProviderJob {
  const ProviderJob({
    required this.id,
    required this.serviceNames,
    required this.emoji,
    required this.customerName,
    required this.address,
    required this.date,
    required this.timeSlot,
    required this.amount,
    required this.status,
  });

  factory ProviderJob.fromJson(Map<String, dynamic> json) {
    final services = (json['services'] as List).cast<Map<String, dynamic>>();
    final firstId = services.isEmpty ? '' : services.first['id'] as String;
    return ProviderJob(
      id: json['id'] as String,
      serviceNames: [for (final s in services) s['name'] as String],
      emoji: firstId.startsWith('el-')
          ? '⚡'
          : firstId.startsWith('ac-')
              ? '❄️'
              : firstId.startsWith('cl-')
                  ? '🧹'
                  : '🧾',
      customerName:
          (json['customer'] as Map<String, dynamic>?)?['name'] as String? ?? 'Customer',
      address: json['address'] as String,
      date: DateTime.parse(json['date'] as String),
      timeSlot: json['timeSlot'] as String,
      amount: json['amount'] as int,
      status: json['status'] as String,
    );
  }

  final String id;
  final List<String> serviceNames;
  final String emoji;
  final String customerName;
  final String address;
  final DateTime date;
  final String timeSlot;
  final int amount;
  final String status; // API status string: ASSIGNED, ON_THE_WAY, …

  /// Provider payout estimate (80% after platform commission).
  int get earnings => (amount * 0.8).round();

  String? get nextStatus => switch (status) {
        'ASSIGNED' => 'ON_THE_WAY',
        'ON_THE_WAY' => 'IN_PROGRESS',
        'IN_PROGRESS' => 'COMPLETED',
        _ => null,
      };

  String? get nextActionLabel => switch (status) {
        'ASSIGNED' => 'Start — On my way',
        'ON_THE_WAY' => 'Arrived — Start job',
        'IN_PROGRESS' => 'Complete job',
        _ => null,
      };

  bool get canCancel => status == 'ASSIGNED' || status == 'ON_THE_WAY';
  bool get isDone => status == 'COMPLETED' || status == 'CLOSED';
  bool get isActive => nextStatus != null;
}
