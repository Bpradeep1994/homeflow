import 'package:flutter/material.dart';

import '../models/models.dart';
import '../theme.dart';
import 'booking_flow_screen.dart';

class CategoryScreen extends StatefulWidget {
  const CategoryScreen({super.key, required this.category, this.preselectedServiceId});

  final ServiceCategory category;
  final String? preselectedServiceId;

  @override
  State<CategoryScreen> createState() => _CategoryScreenState();
}

class _CategoryScreenState extends State<CategoryScreen> {
  late final Set<String> _selected = {
    if (widget.preselectedServiceId != null) widget.preselectedServiceId!,
  };

  List<SubService> get _selectedServices =>
      widget.category.services.where((s) => _selected.contains(s.id)).toList();

  int get _subtotal => _selectedServices.fold(0, (sum, s) => sum + s.price);

  @override
  Widget build(BuildContext context) {
    final category = widget.category;
    return Scaffold(
      appBar: AppBar(title: Text('${category.emoji} ${category.name}')),
      body: ListView.separated(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
        itemCount: category.services.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (context, i) {
          final service = category.services[i];
          final selected = _selected.contains(service.id);
          return Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(
                color: selected ? Theme.of(context).colorScheme.primary : Colors.grey.shade200,
                width: selected ? 1.6 : 1,
              ),
            ),
            child: CheckboxListTile(
              value: selected,
              onChanged: (v) => setState(() => v! ? _selected.add(service.id) : _selected.remove(service.id)),
              controlAffinity: ListTileControlAffinity.trailing,
              title: Row(
                children: [
                  Flexible(child: Text(service.name, style: const TextStyle(fontWeight: FontWeight.w600))),
                  if (service.isEmergency) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text('24×7',
                          style: TextStyle(color: Colors.red.shade700, fontSize: 11, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ],
              ),
              subtitle: Text(
                service.isQuoteOnVisit
                    ? '${formatRupees(service.price)} visit charge · final quote on inspection'
                    : formatRupees(service.price),
                style: TextStyle(color: Colors.grey.shade600),
              ),
            ),
          );
        },
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: FilledButton(
            onPressed: _selected.isEmpty
                ? null
                : () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => BookingFlowScreen(category: category, services: _selectedServices),
                      ),
                    ),
            child: Text(_selected.isEmpty
                ? 'Select a service'
                : 'Book Now · ${_selected.length} item${_selected.length > 1 ? 's' : ''} · ${formatRupees(_subtotal)}'),
          ),
        ),
      ),
    );
  }
}
