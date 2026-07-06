import 'package:flutter/material.dart';

import '../api/client.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  late Future<List<dynamic>> _favorites = ApiClient.instance.favorites();

  void _refresh() => setState(() => _favorites = ApiClient.instance.favorites());

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('My Favorites', style: TextStyle(fontWeight: FontWeight.w700))),
      body: FutureBuilder<List<dynamic>>(
        future: _favorites,
        builder: (context, snapshot) {
          if (snapshot.hasError) return Center(child: Text(snapshot.error.toString()));
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          final items = snapshot.data!;
          if (items.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.favorite_outline, size: 64, color: Colors.grey.shade400),
                    const SizedBox(height: 16),
                    const Text('No favorites yet',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    Text(
                      'After a job is done, tap the ♡ next to your professional under My Bookings to save them here.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  ],
                ),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => _refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.all(20),
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, i) {
                final f = items[i] as Map<String, dynamic>;
                final provider = f['provider'] as Map<String, dynamic>;
                final profile = f['profile'] as Map<String, dynamic>?;
                final name = provider['name'] as String? ?? 'Professional';
                return Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: scheme.primaryContainer,
                      child: Text(name[0], style: const TextStyle(fontWeight: FontWeight.w700)),
                    ),
                    title: Text(name, style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text(profile == null
                        ? 'Verified professional'
                        : '⭐ ${profile['rating']} · ${(profile['services'] as List).join(', ')} · ${profile['jobsDone']} jobs'),
                    trailing: IconButton(
                      tooltip: 'Remove from favorites',
                      icon: const Icon(Icons.favorite, color: Colors.pink),
                      onPressed: () async {
                        await ApiClient.instance.removeFavorite(provider['id'] as String);
                        _refresh();
                      },
                    ),
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
