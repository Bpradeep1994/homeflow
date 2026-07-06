import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../api/client.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late Future<Map<String, dynamic>?> _profile = ApiClient.instance.profile();

  void _refresh() => setState(() => _profile = ApiClient.instance.profile());

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _patch(Map<String, dynamic> patch, String successMessage) async {
    try {
      await ApiClient.instance.updateProfile(patch);
      _toast(successMessage);
    } on ApiException catch (e) {
      _toast(e.message);
    }
    _refresh();
  }

  Future<void> _changePhoto() async {
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    final url =
        await ApiClient.instance.uploadBytes(bytes, picked.name, picked.mimeType ?? 'image/jpeg');
    await _patch({'photoUrl': url}, 'Profile photo updated');
  }

  Future<void> _editWorkingHours(Map<String, dynamic> profile) async {
    TimeOfDay parse(String s) =>
        TimeOfDay(hour: int.parse(s.split(':')[0]), minute: int.parse(s.split(':')[1]));
    String fmt(TimeOfDay t) =>
        '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

    final start = await showTimePicker(
      context: context,
      initialTime: parse(profile['workingStart'] as String? ?? '08:00'),
      helpText: 'Working hours — start',
    );
    if (start == null || !mounted) return;
    final end = await showTimePicker(
      context: context,
      initialTime: parse(profile['workingEnd'] as String? ?? '20:00'),
      helpText: 'Working hours — end',
    );
    if (end == null) return;
    await _patch(
      {'workingStart': fmt(start), 'workingEnd': fmt(end)},
      'Working hours: ${fmt(start)} – ${fmt(end)}',
    );
  }

  Future<void> _addHoliday(Map<String, dynamic> profile) async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
      helpText: 'Add a holiday',
    );
    if (date == null) return;
    final iso =
        '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    final holidays = [...(profile['holidays'] as List).cast<String>()];
    if (!holidays.contains(iso)) holidays.add(iso);
    await _patch({'holidays': holidays}, 'Holiday added — no offers on $iso');
  }

  Future<void> _removeHoliday(Map<String, dynamic> profile, String iso) async {
    final holidays = [...(profile['holidays'] as List).cast<String>()]..remove(iso);
    await _patch({'holidays': holidays}, 'Holiday removed');
  }

  Future<void> _addCertificate(Map<String, dynamic> profile) async {
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    final url =
        await ApiClient.instance.uploadBytes(bytes, picked.name, picked.mimeType ?? 'image/jpeg');
    final certs = [...(profile['certificates'] as List).cast<String>(), url];
    await _patch({'certificates': certs}, 'Certificate added');
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final user = ApiClient.instance.currentUser;
    final name = user?['name'] as String? ?? 'Professional';
    return Scaffold(
      appBar: AppBar(title: const Text('Profile', style: TextStyle(fontWeight: FontWeight.w700))),
      body: FutureBuilder<Map<String, dynamic>?>(
        future: _profile,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          final profile = snapshot.data;
          final verified = profile?['verificationStatus'] == 'APPROVED';
          final photoUrl = profile?['photoUrl'] as String?;
          return RefreshIndicator(
            onRefresh: () async => _refresh(),
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        InkWell(
                          borderRadius: BorderRadius.circular(32),
                          onTap: profile == null ? null : _changePhoto,
                          child: CircleAvatar(
                            radius: 28,
                            backgroundColor: scheme.primaryContainer,
                            backgroundImage: photoUrl == null
                                ? null
                                : NetworkImage('${ApiClient.baseUrl}$photoUrl'),
                            child: photoUrl == null
                                ? Text(name[0].toUpperCase(),
                                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700))
                                : null,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(name,
                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
                              const SizedBox(height: 2),
                              Text(
                                profile == null
                                    ? 'No profile yet'
                                    : '${(profile['services'] as List).join(', ')} · ${profile['city'] ?? ''}',
                                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                              ),
                              const SizedBox(height: 6),
                              if (profile != null)
                                Row(
                                  children: [
                                    Icon(Icons.star_rounded, color: Colors.amber.shade600, size: 18),
                                    Text(' ${profile['rating']}',
                                        style: const TextStyle(fontWeight: FontWeight.w700)),
                                    Text(
                                        '  ·  ${profile['jobsDone']} jobs · ${profile['experienceYears']} yrs exp',
                                        style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                                  ],
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                if (profile != null) ...[
                  Card(
                    child: ListTile(
                      leading: Icon(
                        verified ? Icons.verified_rounded : Icons.hourglass_top_rounded,
                        color: verified ? Colors.green.shade600 : Colors.orange,
                      ),
                      title: const Text('Verification', style: TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text(verified
                          ? 'ID & background check complete'
                          : 'Status: ${profile['verificationStatus']}'),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: verified ? Colors.green.shade50 : Colors.orange.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(verified ? 'Verified' : (profile['verificationStatus'] as String),
                            style: TextStyle(
                                color: verified ? Colors.green.shade700 : Colors.orange.shade800,
                                fontSize: 11,
                                fontWeight: FontWeight.w700)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Schedule
                  Card(
                    child: Column(
                      children: [
                        ListTile(
                          leading: Icon(Icons.schedule_rounded, color: scheme.primary),
                          title: const Text('Working hours',
                              style: TextStyle(fontWeight: FontWeight.w600)),
                          subtitle:
                              Text('${profile['workingStart']} – ${profile['workingEnd']}'),
                          trailing: const Icon(Icons.edit_outlined, size: 18, color: Colors.grey),
                          onTap: () => _editWorkingHours(profile),
                        ),
                        const Divider(height: 1, indent: 56),
                        ListTile(
                          leading: Icon(Icons.beach_access_rounded, color: scheme.primary),
                          title:
                              const Text('Holidays', style: TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: (profile['holidays'] as List).isEmpty
                              ? const Text('None planned')
                              : Wrap(
                                  spacing: 6,
                                  runSpacing: 4,
                                  children: [
                                    for (final h in (profile['holidays'] as List).cast<String>())
                                      InputChip(
                                        label: Text(h, style: const TextStyle(fontSize: 12)),
                                        onDeleted: () => _removeHoliday(profile, h),
                                      ),
                                  ],
                                ),
                          trailing: const Icon(Icons.add, size: 20, color: Colors.grey),
                          onTap: () => _addHoliday(profile),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Card(
                    child: Column(
                      children: [
                        ListTile(
                          leading: Icon(Icons.workspace_premium_outlined, color: scheme.primary),
                          title: const Text('Certificates',
                              style: TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text(
                              '${(profile['certificates'] as List).length} uploaded — tap to add'),
                          onTap: () => _addCertificate(profile),
                        ),
                        const Divider(height: 1, indent: 56),
                        ListTile(
                          leading: Icon(Icons.map_outlined, color: scheme.primary),
                          title: const Text('Service areas',
                              style: TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text((profile['serviceAreas'] as List).join(', ')),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.logout, color: Colors.red),
                    title: const Text('Log out',
                        style: TextStyle(fontWeight: FontWeight.w500, color: Colors.red)),
                    onTap: () => ApiClient.instance.logout(),
                  ),
                ),
                const SizedBox(height: 16),
                Center(
                  child: Text('HomeFlow Pro v0.1.0',
                      style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
