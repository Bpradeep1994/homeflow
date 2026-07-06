import 'package:flutter/material.dart';

import '../api/client.dart';
import '../data/catalog.dart';
import '../models/models.dart';
import '../theme.dart';
import 'booking_confirmed_screen.dart';

/// Booking flow: Address → Date → Time → Price Estimate → Confirm.
/// No unnecessary steps.
class BookingFlowScreen extends StatefulWidget {
  const BookingFlowScreen({super.key, required this.category, required this.services});

  final ServiceCategory category;
  final List<SubService> services;

  @override
  State<BookingFlowScreen> createState() => _BookingFlowScreenState();
}

class _BookingFlowScreenState extends State<BookingFlowScreen> {
  static const _stepTitles = ['Address', 'Date', 'Time', 'Price', 'Confirm'];

  int _step = 0;
  ApiAddress? _address;
  DateTime? _date;
  String? _timeSlot;
  bool _submitting = false;

  bool get _canContinue => switch (_step) {
        0 => _address != null,
        1 => _date != null,
        2 => _timeSlot != null,
        _ => true,
      };

  int get _subtotal => widget.services.fold(0, (sum, s) => sum + s.price);
  bool get _hasQuoteItems => widget.services.any((s) => s.isQuoteOnVisit);

  void _next() {
    if (_step < _stepTitles.length - 1) {
      setState(() => _step++);
    } else {
      _confirmBooking();
    }
  }

  Future<void> _confirmBooking() async {
    setState(() => _submitting = true);
    try {
      final d = _date!;
      final iso =
          '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
      final json = await ApiClient.instance.createBooking(
        serviceIds: [for (final s in widget.services) s.id],
        address: '${_address!.label}: ${_address!.line}',
        date: iso,
        timeSlot: _timeSlot!,
      );
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => BookingConfirmedScreen(booking: ApiBooking.fromJson(json))),
      );
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Book ${widget.category.name}'),
        leading: _step > 0
            ? IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => setState(() => _step--))
            : null,
      ),
      body: Column(
        children: [
          _StepIndicator(step: _step, titles: _stepTitles),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: switch (_step) {
                0 => _AddressStep(selected: _address, onSelect: (a) => setState(() => _address = a)),
                1 => _DateStep(selected: _date, onSelect: (d) => setState(() => _date = d)),
                2 => _TimeStep(selected: _timeSlot, onSelect: (t) => setState(() => _timeSlot = t)),
                3 => _PriceStep(services: widget.services, subtotal: _subtotal, hasQuoteItems: _hasQuoteItems),
                _ => _ConfirmStep(
                    category: widget.category,
                    services: widget.services,
                    address: _address!,
                    date: _date!,
                    timeSlot: _timeSlot!,
                    subtotal: _subtotal,
                  ),
              },
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: FilledButton(
            onPressed: _canContinue && !_submitting ? _next : null,
            child: _submitting
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(_step == _stepTitles.length - 1 ? 'Confirm Booking' : 'Continue'),
          ),
        ),
      ),
    );
  }
}

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.step, required this.titles});

  final int step;
  final List<String> titles;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
      child: Row(
        children: [
          for (var i = 0; i < titles.length; i++) ...[
            Column(
              children: [
                CircleAvatar(
                  radius: 13,
                  backgroundColor: i <= step ? primary : Colors.grey.shade300,
                  child: i < step
                      ? const Icon(Icons.check, size: 15, color: Colors.white)
                      : Text('${i + 1}',
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: i <= step ? Colors.white : Colors.grey.shade600)),
                ),
                const SizedBox(height: 4),
                Text(titles[i],
                    style: TextStyle(
                        fontSize: 10,
                        fontWeight: i == step ? FontWeight.w700 : FontWeight.w400,
                        color: i <= step ? primary : Colors.grey)),
              ],
            ),
            if (i < titles.length - 1)
              Expanded(
                child: Container(
                  height: 2,
                  margin: const EdgeInsets.only(bottom: 16, left: 4, right: 4),
                  color: i < step ? primary : Colors.grey.shade300,
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _AddressStep extends StatefulWidget {
  const _AddressStep({required this.selected, required this.onSelect});

  final ApiAddress? selected;
  final ValueChanged<ApiAddress> onSelect;

  @override
  State<_AddressStep> createState() => _AddressStepState();
}

class _AddressStepState extends State<_AddressStep> {
  late Future<List<ApiAddress>> _addresses = _load();

  Future<List<ApiAddress>> _load() async {
    final raw = await ApiClient.instance.addresses();
    return [for (final a in raw) ApiAddress.fromJson(a as Map<String, dynamic>)];
  }

  Future<void> _addAddress() async {
    final created = await showAddAddressDialog(context);
    if (created != null) {
      setState(() => _addresses = _load());
      widget.onSelect(created);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<ApiAddress>>(
      future: _addresses,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Center(child: Text(snapshot.error.toString()));
        }
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
        final addresses = snapshot.data!;
        return ListView(
          children: [
            Text('Where do you need the service?', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            if (addresses.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text('No saved addresses yet — add your first one below.',
                    style: TextStyle(color: Colors.grey.shade600)),
              ),
            for (final address in addresses) ...[
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(
                    color: widget.selected?.id == address.id
                        ? Theme.of(context).colorScheme.primary
                        : Colors.grey.shade200,
                    width: widget.selected?.id == address.id ? 1.6 : 1,
                  ),
                ),
                child: ListTile(
                  leading: Icon(address.icon, color: Theme.of(context).colorScheme.primary),
                  title: Text(address.label, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(address.line),
                  trailing: widget.selected?.id == address.id
                      ? Icon(Icons.check_circle, color: Theme.of(context).colorScheme.primary)
                      : null,
                  onTap: () => widget.onSelect(address),
                ),
              ),
              const SizedBox(height: 10),
            ],
            OutlinedButton.icon(
              onPressed: _addAddress,
              icon: const Icon(Icons.add_location_alt_outlined),
              label: const Text('Add new address'),
            ),
          ],
        );
      },
    );
  }
}

/// Shared add-address dialog (booking flow + profile). Returns the created address.
Future<ApiAddress?> showAddAddressDialog(BuildContext context) async {
  final label = TextEditingController();
  final line = TextEditingController();
  return showDialog<ApiAddress>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Add address'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: label,
            decoration: const InputDecoration(
                labelText: 'Label (Home, Office…)', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: line,
            maxLines: 2,
            decoration: const InputDecoration(
                labelText: 'Full address', border: OutlineInputBorder()),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        FilledButton(
          style: FilledButton.styleFrom(minimumSize: const Size(0, 40)),
          onPressed: () async {
            try {
              final json = await ApiClient.instance
                  .addAddress(label.text.trim(), line.text.trim());
              if (context.mounted) Navigator.pop(context, ApiAddress.fromJson(json));
            } on ApiException catch (e) {
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
              }
            }
          },
          child: const Text('Save'),
        ),
      ],
    ),
  );
}

class _DateStep extends StatelessWidget {
  const _DateStep({required this.selected, required this.onSelect});

  final DateTime? selected;
  final ValueChanged<DateTime> onSelect;

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final days = List.generate(14, (i) => DateTime(today.year, today.month, today.day + i));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('When should we come?', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        Expanded(
          child: GridView.builder(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 0.95,
            ),
            itemCount: days.length,
            itemBuilder: (context, i) {
              final day = days[i];
              final isSelected = selected != null &&
                  selected!.year == day.year && selected!.month == day.month && selected!.day == day.day;
              final primary = Theme.of(context).colorScheme.primary;
              return InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: () => onSelect(day),
                child: Container(
                  decoration: BoxDecoration(
                    color: isSelected ? primary : Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: isSelected ? primary : Colors.grey.shade200),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(i == 0 ? 'Today' : i == 1 ? 'Tmrw' : formatDate(day).substring(0, 3),
                          style: TextStyle(
                              fontSize: 12, color: isSelected ? Colors.white70 : Colors.grey.shade600)),
                      const SizedBox(height: 4),
                      Text('${day.day}',
                          style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: isSelected ? Colors.white : Colors.black87)),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _TimeStep extends StatelessWidget {
  const _TimeStep({required this.selected, required this.onSelect});

  final String? selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Pick a time slot', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            for (final slot in timeSlots)
              ChoiceChip(
                label: Text(slot),
                selected: selected == slot,
                selectedColor: primary,
                labelStyle: TextStyle(color: selected == slot ? Colors.white : Colors.black87),
                onSelected: (_) => onSelect(slot),
              ),
          ],
        ),
      ],
    );
  }
}

class _PriceStep extends StatelessWidget {
  const _PriceStep({required this.services, required this.subtotal, required this.hasQuoteItems});

  final List<SubService> services;
  final int subtotal;
  final bool hasQuoteItems;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        Text('Price estimate', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                for (final s in services)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      children: [
                        Expanded(child: Text(s.name)),
                        Text(
                          s.isQuoteOnVisit ? '${formatRupees(s.price)} + quote' : formatRupees(s.price),
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                const Divider(height: 24),
                Row(
                  children: [
                    const Expanded(
                        child: Text('Estimated total', style: TextStyle(fontWeight: FontWeight.w700))),
                    Text(formatRupees(subtotal),
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
                  ],
                ),
              ],
            ),
          ),
        ),
        if (hasQuoteItems) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, color: Colors.amber.shade800, size: 20),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Some items need on-site inspection. The professional will share a final quote before starting work — you only pay the visit charge if you decline.',
                    style: TextStyle(fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 12),
        Text('Pay after the service is completed. UPI, card and cash accepted.',
            style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
      ],
    );
  }
}

class _ConfirmStep extends StatelessWidget {
  const _ConfirmStep({
    required this.category,
    required this.services,
    required this.address,
    required this.date,
    required this.timeSlot,
    required this.subtotal,
  });

  final ServiceCategory category;
  final List<SubService> services;
  final ApiAddress address;
  final DateTime date;
  final String timeSlot;
  final int subtotal;

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        Text('Review your booking', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _row(Icons.build_circle_outlined, '${category.emoji} ${category.name}',
                    services.map((s) => s.name).join(', ')),
                const Divider(height: 24),
                _row(address.icon, address.label, address.line),
                const Divider(height: 24),
                _row(Icons.event, formatDate(date), timeSlot),
                const Divider(height: 24),
                _row(Icons.currency_rupee, 'Estimated total', formatRupees(subtotal)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _row(IconData icon, String title, String subtitle) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 22, color: Colors.grey.shade700),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(subtitle, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
            ],
          ),
        ),
      ],
    );
  }
}
