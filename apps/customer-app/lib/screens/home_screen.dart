import 'package:flutter/material.dart';

import '../api/client.dart';
import '../models/models.dart';
import '../theme.dart';
import 'category_screen.dart';
import 'notifications_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.onNavigateToTab});

  /// Switches the root bottom-nav tab (1 = Bookings, 2 = Favorites, 3 = Support).
  final ValueChanged<int> onNavigateToTab;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<List<ServiceCategory>> _catalog = _load();
  late Future<List<Offer>> _offers = _loadOffers();

  Future<List<ServiceCategory>> _load() async {
    final raw = await ApiClient.instance.catalog();
    return [
      for (final (i, c) in raw.indexed) ServiceCategory.fromJson(c as Map<String, dynamic>, i),
    ];
  }

  Future<List<Offer>> _loadOffers() async {
    final raw = await ApiClient.instance.coupons();
    return [for (final (i, c) in raw.indexed) Offer.fromCoupon(c as Map<String, dynamic>, i)];
  }

  String get _greeting {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good Morning 👋';
    if (h < 17) return 'Good Afternoon 👋';
    return 'Good Evening 👋';
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final name = (ApiClient.instance.currentUser?['name'] as String?)?.split(' ').first;
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () async => setState(() {
          _catalog = _load();
          _offers = _loadOffers();
        }),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(name == null ? _greeting : '${_greeting.split(' 👋').first}, $name 👋',
                      style: textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                ),
                IconButton(
                  tooltip: 'Notifications',
                  icon: const Icon(Icons.notifications_outlined),
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text('What service do you need today?',
                style: textTheme.bodyLarge?.copyWith(color: Colors.grey.shade600)),
            const SizedBox(height: 16),
            FutureBuilder<List<ServiceCategory>>(
              future: _catalog,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return _ErrorCard(
                    message: snapshot.error.toString(),
                    onRetry: () => setState(() => _catalog = _load()),
                  );
                }
                if (!snapshot.hasData) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 48),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                final categories = snapshot.data!;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _SearchField(categories: categories),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        for (final (i, category) in categories.indexed) ...[
                          Expanded(child: _CategoryCard(category: category)),
                          if (i < categories.length - 1) const SizedBox(width: 12),
                        ],
                      ],
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 24),
            Card(
              child: Column(
                children: [
                  _QuickLink(
                      icon: Icons.calendar_today_rounded,
                      label: 'My Bookings',
                      onTap: () => widget.onNavigateToTab(1)),
                  const Divider(height: 1, indent: 56),
                  _QuickLink(
                      icon: Icons.star_rounded,
                      label: 'My Favorites',
                      onTap: () => widget.onNavigateToTab(2)),
                  const Divider(height: 1, indent: 56),
                  _QuickLink(
                      icon: Icons.chat_bubble_rounded,
                      label: 'Support',
                      onTap: () => widget.onNavigateToTab(3)),
                ],
              ),
            ),
            const SizedBox(height: 28),
            FutureBuilder<List<Offer>>(
              future: _offers,
              builder: (context, snapshot) {
                final offers = snapshot.data ?? [];
                if (offers.isEmpty) return const SizedBox.shrink();
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Special Offers',
                        style: textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 130,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: offers.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 12),
                        itemBuilder: (context, i) => _OfferCard(offer: offers[i]),
                      ),
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Icon(Icons.wifi_off_rounded, color: Colors.grey.shade500, size: 36),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade700)),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.categories});

  final List<ServiceCategory> categories;

  @override
  Widget build(BuildContext context) {
    return TextField(
      readOnly: true,
      onTap: () => showSearch(context: context, delegate: _ServiceSearchDelegate(categories)),
      decoration: InputDecoration(
        hintText: 'Search for a service…',
        prefixIcon: const Icon(Icons.search),
        filled: true,
        fillColor: Colors.white,
        contentPadding: EdgeInsets.zero,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
      ),
    );
  }
}

class _ServiceSearchDelegate extends SearchDelegate<void> {
  _ServiceSearchDelegate(this.categories);

  final List<ServiceCategory> categories;

  Iterable<(ServiceCategory, SubService)> _matches(String q) sync* {
    final query = q.trim().toLowerCase();
    if (query.isEmpty) return;
    for (final c in categories) {
      for (final s in c.services) {
        if (s.name.toLowerCase().contains(query) || c.name.toLowerCase().contains(query)) {
          yield (c, s);
        }
      }
    }
  }

  Widget _resultsList(BuildContext context) {
    final results = _matches(query).toList();
    if (results.isEmpty) {
      return Center(child: Text(query.trim().isEmpty ? 'Type to search services' : 'No services found'));
    }
    return ListView.builder(
      itemCount: results.length,
      itemBuilder: (context, i) {
        final (category, service) = results[i];
        return ListTile(
          leading: Text(category.emoji, style: const TextStyle(fontSize: 22)),
          title: Text(service.name),
          subtitle: Text(category.name),
          trailing: Text(
            service.isQuoteOnVisit ? 'from ${formatRupees(service.price)}' : formatRupees(service.price),
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          onTap: () {
            close(context, null);
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => CategoryScreen(category: category, preselectedServiceId: service.id),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget buildResults(BuildContext context) => _resultsList(context);

  @override
  Widget buildSuggestions(BuildContext context) => _resultsList(context);

  @override
  List<Widget> buildActions(BuildContext context) =>
      [if (query.isNotEmpty) IconButton(icon: const Icon(Icons.clear), onPressed: () => query = '')];

  @override
  Widget buildLeading(BuildContext context) =>
      IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => close(context, null));
}

class _CategoryCard extends StatelessWidget {
  const _CategoryCard({required this.category});

  final ServiceCategory category;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => CategoryScreen(category: category)),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 8),
          child: Column(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: category.color.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Text(category.emoji, style: const TextStyle(fontSize: 26)),
              ),
              const SizedBox(height: 10),
              Text(
                category.name,
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickLink extends StatelessWidget {
  const _QuickLink({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
      trailing: const Icon(Icons.chevron_right, color: Colors.grey),
      onTap: onTap,
    );
  }
}

class _OfferCard extends StatelessWidget {
  const _OfferCard({required this.offer});

  final Offer offer;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 260,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [offer.color, offer.color.withValues(alpha: 0.75)]),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(offer.title,
              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(offer.subtitle, style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 13)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.white.withValues(alpha: 0.5)),
            ),
            child: Text('Use code ${offer.code}',
                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}
