import 'package:flutter/material.dart';

import '../api/client.dart';
import '../models/models.dart';
import '../theme.dart';
import 'widgets/job_card.dart';

class JobsScreen extends StatefulWidget {
  const JobsScreen({super.key});

  @override
  State<JobsScreen> createState() => _JobsScreenState();
}

class _JobsScreenState extends State<JobsScreen> {
  late Future<List<ProviderJob>> _jobs = _load();

  Future<List<ProviderJob>> _load() async {
    final raw = await ApiClient.instance.jobs();
    return [for (final j in raw) ProviderJob.fromJson(j as Map<String, dynamic>)];
  }

  void _refresh() => setState(() => _jobs = _load());

  Future<void> _advance(ProviderJob job) async {
    try {
      await ApiClient.instance.updateJobStatus(job.id, job.nextStatus!);
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
    _refresh();
  }

  Future<void> _cancel(ProviderJob job) async {
    final sure = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel this job?'),
        content: const Text(
            'The booking goes back to dispatch and another professional will take it. Frequent cancellations hurt your score.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep it')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red, minimumSize: const Size(0, 40)),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Cancel job'),
          ),
        ],
      ),
    );
    if (sure != true) return;
    try {
      await ApiClient.instance.cancelJob(job.id);
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
    _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<ProviderJob>>(
      future: _jobs,
      builder: (context, snapshot) {
        final all = snapshot.data ?? [];
        final today = all.where((j) => isToday(j.date) && j.isActive).toList();
        final upcoming =
            all.where((j) => j.date.isAfter(DateTime.now()) && !isToday(j.date) && j.isActive).toList();
        final done = all.where((j) => !j.isActive).toList();
        return DefaultTabController(
          length: 3,
          child: Scaffold(
            appBar: AppBar(
              title: const Text('My Jobs', style: TextStyle(fontWeight: FontWeight.w700)),
              bottom: TabBar(tabs: [
                Tab(text: 'Today (${today.length})'),
                Tab(text: 'Upcoming (${upcoming.length})'),
                Tab(text: 'Past (${done.length})'),
              ]),
            ),
            body: !snapshot.hasData && !snapshot.hasError
                ? const Center(child: CircularProgressIndicator())
                : TabBarView(
                    children: [
                      _JobList(jobs: today, emptyText: 'No jobs today', onAdvance: _advance, onCancel: _cancel, onRefresh: _refresh),
                      _JobList(jobs: upcoming, emptyText: 'No upcoming jobs', onAdvance: _advance, onCancel: _cancel, onRefresh: _refresh),
                      _JobList(jobs: done, emptyText: 'No past jobs yet', onRefresh: _refresh),
                    ],
                  ),
          ),
        );
      },
    );
  }
}

class _JobList extends StatelessWidget {
  const _JobList({
    required this.jobs,
    required this.emptyText,
    required this.onRefresh,
    this.onAdvance,
    this.onCancel,
  });

  final List<ProviderJob> jobs;
  final String emptyText;
  final VoidCallback onRefresh;
  final ValueChanged<ProviderJob>? onAdvance;
  final ValueChanged<ProviderJob>? onCancel;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: jobs.isEmpty
          ? ListView(
              children: [
                const SizedBox(height: 140),
                Center(child: Text(emptyText, style: TextStyle(color: Colors.grey.shade600))),
              ],
            )
          : ListView.separated(
              padding: const EdgeInsets.all(20),
              itemCount: jobs.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, i) => JobCard(
                job: jobs[i],
                onAdvance: onAdvance == null || jobs[i].nextStatus == null
                    ? null
                    : () => onAdvance!(jobs[i]),
                onCancel: onCancel == null || !jobs[i].canCancel ? null : () => onCancel!(jobs[i]),
              ),
            ),
    );
  }
}
