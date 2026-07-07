import 'package:flutter/material.dart';

import '../api/client.dart';
import '../models/models.dart';

class PaymentMethodsScreen extends StatelessWidget {
  const PaymentMethodsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Payment methods', style: TextStyle(fontWeight: FontWeight.w700))),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: Icon(Icons.account_balance_rounded, color: scheme.primary),
                  title: const Text('UPI', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('nayak@upi'),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.green.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text('Default',
                        style: TextStyle(color: Colors.green.shade700, fontSize: 11, fontWeight: FontWeight.w700)),
                  ),
                ),
                const Divider(height: 1, indent: 56),
                ListTile(
                  leading: Icon(Icons.credit_card_rounded, color: scheme.primary),
                  title: const Text('Visa •••• 4242', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Expires 08/28'),
                ),
                const Divider(height: 1, indent: 56),
                const ListTile(
                  leading: Icon(Icons.payments_rounded, color: Colors.green),
                  title: Text('Cash after service', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text('Always available'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Adding payment methods activates with the payments gateway')),
            ),
            icon: const Icon(Icons.add),
            label: const Text('Add payment method'),
          ),
          const SizedBox(height: 12),
          Text(
            'You pay only after the service is completed. UPI, cards and cash are accepted.',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class CouponsScreen extends StatefulWidget {
  const CouponsScreen({super.key});

  @override
  State<CouponsScreen> createState() => _CouponsScreenState();
}

class _CouponsScreenState extends State<CouponsScreen> {
  late final Future<List<Offer>> _offers = _load();

  Future<List<Offer>> _load() async {
    final raw = await ApiClient.instance.coupons();
    return [for (final (i, c) in raw.indexed) Offer.fromCoupon(c as Map<String, dynamic>, i)];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My coupons', style: TextStyle(fontWeight: FontWeight.w700))),
      body: FutureBuilder<List<Offer>>(
        future: _offers,
        builder: (context, snapshot) {
          if (snapshot.hasError) return Center(child: Text(snapshot.error.toString()));
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          final offers = snapshot.data!;
          if (offers.isEmpty) {
            return Center(
              child: Text('No active coupons right now',
                  style: TextStyle(color: Colors.grey.shade600)),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(20),
            itemCount: offers.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (context, i) {
              final offer = offers[i];
              return Card(
                clipBehavior: Clip.antiAlias,
                child: Row(
                  children: [
                    Container(width: 6, height: 96, color: offer.color),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(offer.title,
                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                          const SizedBox(height: 2),
                          Text(offer.subtitle,
                              style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                          const SizedBox(height: 6),
                          Text('Code: ${offer.code}',
                              style: TextStyle(
                                  color: offer.color,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                  letterSpacing: 0.5)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> {
  bool _bookingUpdates = true;
  bool _reminders = true;
  bool _offers = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications', style: TextStyle(fontWeight: FontWeight.w700))),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Card(
            child: Column(
              children: [
                SwitchListTile(
                  value: _bookingUpdates,
                  onChanged: (v) => setState(() => _bookingUpdates = v),
                  title: const Text('Booking updates', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Professional assigned, on the way, job done'),
                ),
                const Divider(height: 1, indent: 16),
                SwitchListTile(
                  value: _reminders,
                  onChanged: (v) => setState(() => _reminders = v),
                  title: const Text('Service reminders', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Reminder before your booked time slot'),
                ),
                const Divider(height: 1, indent: 16),
                SwitchListTile(
                  value: _offers,
                  onChanged: (v) => setState(() => _offers = v),
                  title: const Text('Offers & promotions', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Coupons and seasonal deals'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Push notifications are delivered via Firebase Cloud Messaging once the backend is connected.',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class TermsPrivacyScreen extends StatelessWidget {
  const TermsPrivacyScreen({super.key});

  static const _sections = [
    (
      'Service bookings',
      'Bookings are confirmed once a professional accepts your request. Catalog services have fixed prices; diagnostic services carry a visit charge and the final quote is approved by you before work begins.'
    ),
    (
      'Cancellations & refunds',
      'You can cancel free of charge until 2 hours before the scheduled slot. Later cancellations may incur the visit charge. Refunds for online payments are processed to the original payment method within 5–7 business days.'
    ),
    (
      'Payments',
      'Payment is collected after the service is completed, via UPI, card or cash. Prices shown include applicable taxes unless stated otherwise.'
    ),
    (
      'Your data',
      'We use your address and phone number only to deliver the booked service and to send booking updates. Your data is never sold to third parties. You can request deletion of your account and data from Support.'
    ),
    (
      'Professional conduct',
      'All professionals are background-verified. If anything goes wrong during a service, report it from Support within 48 hours and we will make it right.'
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Terms & privacy', style: TextStyle(fontWeight: FontWeight.w700))),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          for (final (title, body) in _sections) ...[
            Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 6),
            Text(body, style: TextStyle(color: Colors.grey.shade700, height: 1.45)),
            const SizedBox(height: 20),
          ],
          Text('Last updated: 5 July 2026 · HomeFlow v0.1.0',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 12), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

Future<void> showLogoutDialog(BuildContext context) {
  return showDialog(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Log out?'),
      content: const Text('You will need to verify your phone number again to log back in.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: Colors.red, minimumSize: const Size(0, 40)),
          onPressed: () {
            Navigator.pop(context);
            // Auth gate listens to ApiClient and returns to the login screen.
            ApiClient.instance.logout();
          },
          child: const Text('Log out'),
        ),
      ],
    ),
  );
}
