import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/client.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  late Future<List<dynamic>> _tickets = ApiClient.instance.myTickets();

  static const _faqs = [
    ('How do I cancel a booking?', 'Open the booking under My Bookings and tap Cancel. Free until 2 hours before the slot.'),
    ('When do I pay?', 'After the service is completed — UPI, card or cash.'),
    ('What if the professional doesn\'t arrive?', 'You get an automatic re-assignment or full refund of any advance.'),
    ('Are prices fixed?', 'Catalog services have fixed prices. Diagnostic jobs show a visit charge; the final quote is approved by you before work starts.'),
  ];

  void _refresh() => setState(() => _tickets = ApiClient.instance.myTickets());

  Future<void> _raiseComplaint() async {
    final subject = TextEditingController();
    final message = TextEditingController();
    var priority = 'MEDIUM';
    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Raise a complaint'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: subject,
                decoration:
                    const InputDecoration(labelText: 'Subject', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: message,
                maxLines: 3,
                decoration: const InputDecoration(
                    labelText: 'Describe the issue', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'LOW', label: Text('Low')),
                  ButtonSegment(value: 'MEDIUM', label: Text('Medium')),
                  ButtonSegment(value: 'HIGH', label: Text('High')),
                ],
                selected: {priority},
                onSelectionChanged: (s) => setDialogState(() => priority = s.first),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            FilledButton(
              style: FilledButton.styleFrom(minimumSize: const Size(0, 40)),
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
    if (submitted == true) {
      try {
        await ApiClient.instance
            .createTicket(subject.text.trim(), message.text.trim(), priority: priority);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Complaint registered — we\'ll reply within 24 hours')),
          );
        }
        _refresh();
      } on ApiException catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
        }
      }
    }
  }

  (Color, String) _ticketBadge(String status) => switch (status) {
        'RESOLVED' => (Colors.green, 'Resolved'),
        'PENDING' => (Colors.orange, 'In progress'),
        _ => (Colors.red, 'Open'),
      };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Support', style: TextStyle(fontWeight: FontWeight.w700))),
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Card(
              child: ListTile(
                leading: Icon(Icons.report_problem_outlined,
                    color: Theme.of(context).colorScheme.primary),
                title:
                    const Text('Raise a complaint', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('We reply within 24 hours'),
                trailing: const Icon(Icons.chevron_right),
                onTap: _raiseComplaint,
              ),
            ),
            const SizedBox(height: 10),
            Card(
              child: ListTile(
                leading: const Icon(Icons.phone_rounded, color: Colors.green),
                title: const Text('Call support', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('8 AM – 10 PM, all days'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => launchUrl(Uri.parse('tel:+918000012345')),
              ),
            ),
            const SizedBox(height: 24),
            FutureBuilder<List<dynamic>>(
              future: _tickets,
              builder: (context, snapshot) {
                final tickets = snapshot.data ?? [];
                if (tickets.isEmpty) return const SizedBox.shrink();
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('My complaints', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    for (final t in tickets.cast<Map<String, dynamic>>()) ...[
                      Builder(builder: (context) {
                        final (color, label) = _ticketBadge(t['status'] as String);
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            title: Text(t['subject'] as String,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600, fontSize: 14)),
                            subtitle: Text(t['message'] as String,
                                maxLines: 1, overflow: TextOverflow.ellipsis),
                            trailing: Container(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(label,
                                  style: TextStyle(
                                      color: color,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700)),
                            ),
                          ),
                        );
                      }),
                    ],
                    const SizedBox(height: 16),
                  ],
                );
              },
            ),
            Text('Frequently asked', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            for (final (q, a) in _faqs)
              Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ExpansionTile(
                  shape: const Border(),
                  title: Text(q, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  children: [Text(a, style: TextStyle(color: Colors.grey.shade700))],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
