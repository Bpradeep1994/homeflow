import 'package:flutter/material.dart';

import '../api/client.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late Future<List<dynamic>> _items = _load();

  Future<List<dynamic>> _load() async {
    final items = await ApiClient.instance.notifications();
    // Opening the screen marks everything read.
    await ApiClient.instance.markNotificationsRead();
    return items;
  }

  String _timeAgo(String iso) {
    final diff = DateTime.now().difference(DateTime.parse(iso));
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications', style: TextStyle(fontWeight: FontWeight.w700))),
      body: FutureBuilder<List<dynamic>>(
        future: _items,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(child: Text(snapshot.error.toString()));
          }
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          final items = snapshot.data!;
          if (items.isEmpty) {
            return Center(
              child: Text('Nothing here yet', style: TextStyle(color: Colors.grey.shade600)),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => setState(() => _items = _load()),
            child: ListView.separated(
              padding: const EdgeInsets.all(20),
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final n = items[i] as Map<String, dynamic>;
                final unread = n['read'] == false;
                return Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: unread
                          ? Theme.of(context).colorScheme.primaryContainer
                          : Colors.grey.shade100,
                      child: Icon(Icons.notifications_rounded,
                          size: 20,
                          color: unread ? Theme.of(context).colorScheme.primary : Colors.grey),
                    ),
                    title: Text(n['title'] as String,
                        style: TextStyle(
                            fontWeight: unread ? FontWeight.w700 : FontWeight.w500, fontSize: 14)),
                    subtitle: Text(n['body'] as String, style: const TextStyle(fontSize: 13)),
                    trailing: Text(_timeAgo(n['createdAt'] as String),
                        style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
