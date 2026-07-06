import 'package:flutter/material.dart';

import '../api/client.dart';
import '../models/models.dart';
import 'booking_flow_screen.dart' show showAddAddressDialog;
import 'profile_pages.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late Future<List<ApiAddress>> _addresses = _load();

  Future<List<ApiAddress>> _load() async {
    final raw = await ApiClient.instance.addresses();
    return [for (final a in raw) ApiAddress.fromJson(a as Map<String, dynamic>)];
  }

  void _refresh() => setState(() => _addresses = _load());

  Future<void> _editProfile() async {
    final user = ApiClient.instance.currentUser;
    final name = TextEditingController(text: user?['name'] as String? ?? '');
    final email = TextEditingController(text: user?['email'] as String? ?? '');
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit profile'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: name,
              decoration: const InputDecoration(labelText: 'Name', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                  labelText: 'Email (for invoices)', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size(0, 40)),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (saved == true) {
      try {
        await ApiClient.instance.updateMe(name: name.text.trim(), email: email.text.trim());
        if (mounted) setState(() {});
      } on ApiException catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final user = ApiClient.instance.currentUser;
    final name = user?['name'] as String? ?? 'HomeFlow user';
    final phone = user?['phone'] as String? ?? '';
    final email = user?['email'] as String?;
    return Scaffold(
      appBar: AppBar(title: const Text('Profile', style: TextStyle(fontWeight: FontWeight.w700))),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Card(
            child: ListTile(
              leading: CircleAvatar(
                radius: 26,
                backgroundColor: scheme.primaryContainer,
                child: Text(name.isEmpty ? '?' : name[0].toUpperCase(),
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              ),
              title: Text(name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              subtitle: Text(email == null ? phone : '$phone · $email'),
              trailing: TextButton(onPressed: _editProfile, child: const Text('Edit')),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: FutureBuilder<List<ApiAddress>>(
              future: _addresses,
              builder: (context, snapshot) {
                final addresses = snapshot.data ?? [];
                return Column(
                  children: [
                    for (final address in addresses) ...[
                      ListTile(
                        leading: Icon(address.icon, color: scheme.primary),
                        title: Text(address.label,
                            style: const TextStyle(fontWeight: FontWeight.w600)),
                        subtitle:
                            Text(address.line, maxLines: 1, overflow: TextOverflow.ellipsis),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline, size: 20, color: Colors.grey),
                          onPressed: () async {
                            await ApiClient.instance.deleteAddress(address.id);
                            _refresh();
                          },
                        ),
                      ),
                      const Divider(height: 1, indent: 56),
                    ],
                    ListTile(
                      leading: Icon(Icons.add_location_alt_outlined, color: scheme.primary),
                      title: const Text('Add address',
                          style: TextStyle(fontWeight: FontWeight.w500)),
                      onTap: () async {
                        final created = await showAddAddressDialog(context);
                        if (created != null) _refresh();
                      },
                    ),
                  ],
                );
              },
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Column(
              children: [
                _item(context, Icons.payment_rounded, 'Payment methods', const PaymentMethodsScreen()),
                const Divider(height: 1, indent: 56),
                _item(context, Icons.local_offer_outlined, 'My coupons', const CouponsScreen()),
                const Divider(height: 1, indent: 56),
                _item(context, Icons.notifications_outlined, 'Notifications', const NotificationSettingsScreen()),
                const Divider(height: 1, indent: 56),
                _item(context, Icons.description_outlined, 'Terms & privacy', const TermsPrivacyScreen()),
                const Divider(height: 1, indent: 56),
                ListTile(
                  leading: const Icon(Icons.logout, color: Colors.red),
                  title: const Text('Log out',
                      style: TextStyle(fontWeight: FontWeight.w500, color: Colors.red)),
                  trailing: const Icon(Icons.chevron_right, color: Colors.grey),
                  onTap: () => showLogoutDialog(context),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Center(child: Text('HomeFlow v0.1.0', style: TextStyle(color: Colors.grey.shade500, fontSize: 12))),
        ],
      ),
    );
  }

  Widget _item(BuildContext context, IconData icon, String label, Widget screen) {
    return ListTile(
      leading: Icon(icon, color: Colors.grey.shade700),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
      trailing: const Icon(Icons.chevron_right, color: Colors.grey),
      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen)),
    );
  }
}
