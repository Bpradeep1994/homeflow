import 'dart:async';

import 'package:flutter/material.dart';

import '../api/client.dart';
import '../models/models.dart';
import '../theme.dart';
import 'incoming_booking_sheet.dart';
import 'verification_screen.dart';
import 'widgets/job_card.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, required this.onNavigateToTab});

  /// Switches the root bottom-nav tab (1 = Jobs, 2 = Earnings).
  final ValueChanged<int> onNavigateToTab;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _profile;
  List<ProviderJob> _jobs = [];
  int _totalEarnings = 0;
  bool _loading = true;
  String? _error;

  Timer? _pollTimer;
  final _seenOffers = <String>{};
  bool _sheetOpen = false;

  @override
  void initState() {
    super.initState();
    _loadAll();
    // Poll for new offers while online. FCM push replaces this later.
    _pollTimer = Timer.periodic(const Duration(seconds: 10), (_) => _pollOffers());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  bool get _online => _profile?['online'] == true;
  bool get _approved => _profile?['verificationStatus'] == 'APPROVED';

  Future<void> _loadAll() async {
    try {
      final profile = await ApiClient.instance.profile();
      List<ProviderJob> jobs = [];
      var earnings = 0;
      if (profile != null && profile['verificationStatus'] == 'APPROVED') {
        final (rawJobs, payouts) =
            await (ApiClient.instance.jobs(), ApiClient.instance.payouts()).wait;
        jobs = [for (final j in rawJobs) ProviderJob.fromJson(j as Map<String, dynamic>)];
        earnings = payouts['totalEarned'] as int;
      }
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _jobs = jobs;
        _totalEarnings = earnings;
        _loading = false;
        _error = null;
      });
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _loading = false;
        });
      }
    }
  }

  Future<void> _pollOffers() async {
    if (!mounted || !_online || !_approved || _sheetOpen) return;
    try {
      final raw = await ApiClient.instance.offers();
      final offers = [for (final o in raw) ProviderJob.fromJson(o as Map<String, dynamic>)];
      final fresh = offers.where((o) => !_seenOffers.contains(o.id)).toList();
      if (fresh.isEmpty || !mounted) return;
      final offer = fresh.first;
      _seenOffers.add(offer.id);
      _sheetOpen = true;
      final accepted = await showIncomingBookingSheet(context, offer);
      _sheetOpen = false;
      if (accepted == true) {
        await ApiClient.instance.acceptOffer(offer.id);
        _toast('Job accepted — see Today\'s schedule');
      } else if (accepted == false) {
        await ApiClient.instance.declineOffer(offer.id);
      }
      await _loadAll();
    } on ApiException catch (e) {
      _sheetOpen = false;
      // Someone else took it first — that's the marketplace working.
      if (e.statusCode == 409) _toast('This booking was taken by another professional');
    }
  }

  void _toast(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    }
  }

  Future<void> _setOnline(bool online) async {
    try {
      await ApiClient.instance.setOnline(online);
      await _loadAll();
      if (online) _pollOffers();
    } on ApiException catch (e) {
      _toast(e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_error!, style: TextStyle(color: Colors.grey.shade600)),
              const SizedBox(height: 8),
              OutlinedButton(onPressed: _loadAll, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }

    final name = ApiClient.instance.currentUser?['name'] as String? ?? 'Professional';
    final todays = _jobs.where((j) => isToday(j.date) && j.isActive).toList();
    final upcoming = _jobs.where((j) => j.date.isAfter(DateTime.now()) && !isToday(j.date) && j.isActive).length;
    final completed = _jobs.where((j) => j.isDone).length;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            Text(
              (_profile?['services'] as List?)?.join(' · ') ?? 'Complete verification to start',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          if (_approved)
            Row(
              children: [
                Text(
                  _online ? 'Online' : 'Offline',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: _online ? Colors.green.shade700 : Colors.grey,
                  ),
                ),
                Switch(value: _online, activeThumbColor: Colors.green, onChanged: _setOnline),
                const SizedBox(width: 8),
              ],
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadAll,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            if (!_approved)
              _VerificationBanner(
                status: _profile?['verificationStatus'] as String? ?? 'NONE',
                onStart: () async {
                  await Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const VerificationScreen()),
                  );
                  _loadAll();
                },
              )
            else ...[
              if (!_online)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.visibility_off_outlined, color: Colors.orange.shade800, size: 20),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Text('You are offline — new bookings are paused. Go online to receive jobs.',
                            style: TextStyle(fontSize: 13)),
                      ),
                    ],
                  ),
                ),
              Row(
                children: [
                  Expanded(
                    child: _StatCard(
                      label: "Today's Jobs",
                      value: '${todays.length}',
                      icon: Icons.today_rounded,
                      color: scheme.primary,
                      onTap: () => widget.onNavigateToTab(1),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatCard(
                      label: 'Upcoming Jobs',
                      value: '$upcoming',
                      icon: Icons.event_rounded,
                      color: const Color(0xFF0891B2),
                      onTap: () => widget.onNavigateToTab(1),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _StatCard(
                      label: 'Completed Jobs',
                      value: '$completed',
                      icon: Icons.task_alt_rounded,
                      color: Colors.green.shade700,
                      onTap: () => widget.onNavigateToTab(1),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StatCard(
                      label: 'Total Earnings',
                      value: formatRupees(_totalEarnings),
                      icon: Icons.currency_rupee_rounded,
                      color: const Color(0xFF7C3AED),
                      onTap: () => widget.onNavigateToTab(2),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Text("Today's schedule", style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 10),
              if (todays.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: Text(
                      _online ? 'No jobs yet — offers pop up here when customers book 🎉' : 'No jobs left today 🎉',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  ),
                )
              else
                for (final job in todays) ...[
                  JobCard(
                    job: job,
                    onAdvance: () async {
                      await ApiClient.instance.updateJobStatus(job.id, job.nextStatus!);
                      _loadAll();
                    },
                    onCancel: () async {
                      await ApiClient.instance.cancelJob(job.id);
                      _toast('Job released — we\'re finding a replacement');
                      _loadAll();
                    },
                  ),
                  const SizedBox(height: 10),
                ],
            ],
          ],
        ),
      ),
    );
  }
}

class _VerificationBanner extends StatelessWidget {
  const _VerificationBanner({required this.status, required this.onStart});

  final String status;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    final (title, body, cta) = switch (status) {
      'PENDING' => (
          'Verification in review ⏳',
          'Our team is checking your documents. You\'ll be notified once approved — usually within 24 hours.',
          null,
        ),
      'REJECTED' => (
          'Verification rejected',
          'Please re-submit your documents. Check notifications for the reason.',
          'Re-submit documents',
        ),
      _ => (
          'Complete your profile to start earning',
          'Upload your ID, pick your skills and service areas. Approval usually takes less than a day.',
          'Start verification',
        ),
    };
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 6),
            Text(body, style: TextStyle(color: Colors.grey.shade600)),
            if (cta != null) ...[
              const SizedBox(height: 14),
              FilledButton(onPressed: onStart, child: Text(cta)),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color, size: 22),
              const SizedBox(height: 10),
              Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20)),
              const SizedBox(height: 2),
              Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
            ],
          ),
        ),
      ),
    );
  }
}
