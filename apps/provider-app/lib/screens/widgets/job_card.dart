import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/models.dart';
import '../../theme.dart';

class JobCard extends StatelessWidget {
  const JobCard({super.key, required this.job, this.onAdvance, this.onCancel});

  final ProviderJob job;
  final VoidCallback? onAdvance;
  final VoidCallback? onCancel;

  (String, Color) get _statusChip => switch (job.status) {
        'ASSIGNED' => ('Accepted', Colors.blue),
        'ON_THE_WAY' => ('On the way', Colors.orange),
        'IN_PROGRESS' => ('In progress', Colors.purple),
        'COMPLETED' => ('Completed', Colors.green),
        'CLOSED' => ('Closed', Colors.grey),
        'CANCELLED' => ('Cancelled', Colors.red),
        _ => (job.status, Colors.grey),
      };

  void _navigate() {
    final query = Uri.encodeComponent(job.address);
    launchUrl(Uri.parse('https://www.google.com/maps/search/?api=1&query=$query'),
        mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final (label, color) = _statusChip;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(job.emoji, style: const TextStyle(fontSize: 20)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(job.serviceNames.join(', '),
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(label,
                      style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('${job.customerName} · ${formatDate(job.date)} · ${job.timeSlot}',
                style: TextStyle(color: Colors.grey.shade700, fontSize: 13, fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text(job.address,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
            const SizedBox(height: 10),
            Row(
              children: [
                Text(formatRupees(job.earnings),
                    style: TextStyle(
                        fontWeight: FontWeight.w800, fontSize: 15, color: Colors.green.shade700)),
                Text('  ·  ${job.id}', style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                const Spacer(),
              ],
            ),
            Wrap(
              spacing: 4,
              alignment: WrapAlignment.end,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                if (job.isActive)
                  TextButton.icon(
                    onPressed: _navigate,
                    icon: const Icon(Icons.navigation_outlined, size: 16),
                    label: const Text('Navigate'),
                  ),
                if (onCancel != null && job.canCancel)
                  TextButton(
                    style: TextButton.styleFrom(foregroundColor: Colors.red),
                    onPressed: onCancel,
                    child: const Text('Cancel job'),
                  ),
                if (onAdvance != null && job.nextActionLabel != null)
                  FilledButton(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(0, 36),
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    onPressed: onAdvance,
                    child: Text(job.nextActionLabel!),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
