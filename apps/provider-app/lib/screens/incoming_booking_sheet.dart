import 'dart:async';

import 'package:flutter/material.dart';

import '../models/models.dart';
import '../theme.dart';

/// Shows a live booking offer. Returns true for Accept, false for Decline,
/// null if the timer ran out or it was dismissed.
Future<bool?> showIncomingBookingSheet(BuildContext context, ProviderJob offer) {
  return showModalBottomSheet<bool>(
    context: context,
    isDismissible: false,
    enableDrag: false,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (context) => _IncomingBookingSheet(offer: offer),
  );
}

class _IncomingBookingSheet extends StatefulWidget {
  const _IncomingBookingSheet({required this.offer});

  final ProviderJob offer;

  @override
  State<_IncomingBookingSheet> createState() => _IncomingBookingSheetState();
}

class _IncomingBookingSheetState extends State<_IncomingBookingSheet> {
  static const _offerSeconds = 30;

  int _secondsLeft = _offerSeconds;
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(const Duration(seconds: 1), (t) {
      setState(() => _secondsLeft--);
      if (_secondsLeft <= 0) {
        t.cancel();
        Navigator.of(context).pop(); // offer expired locally
      }
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final offer = widget.offer;
    final scheme = Theme.of(context).colorScheme;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: scheme.primaryContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text('New Booking',
                      style: TextStyle(
                          color: scheme.onPrimaryContainer, fontWeight: FontWeight.w800, fontSize: 13)),
                ),
                const Spacer(),
                Text('${_secondsLeft}s',
                    style: TextStyle(
                        fontWeight: FontWeight.w800,
                        color: _secondsLeft <= 10 ? Colors.red : Colors.grey.shade700)),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: _secondsLeft / _offerSeconds,
              minHeight: 4,
              borderRadius: BorderRadius.circular(2),
              color: _secondsLeft <= 10 ? Colors.red : scheme.primary,
              backgroundColor: Colors.grey.shade200,
            ),
            const SizedBox(height: 16),
            _row(Icons.person_outline, 'Customer', offer.customerName),
            _row(Icons.location_on_outlined, 'Address', offer.address),
            _row(Icons.build_circle_outlined, 'Service',
                '${offer.emoji} ${offer.serviceNames.join(', ')}'),
            _row(Icons.schedule, 'Slot', '${formatDate(offer.date)} · ${offer.timeSlot}'),
            _row(Icons.currency_rupee, 'Estimated Earnings', formatRupees(offer.earnings),
                highlight: true),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () => Navigator.of(context).pop(false),
                    child: const Text('Decline', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: Colors.green.shade600),
                    onPressed: () => Navigator.of(context).pop(true),
                    child: const Text('Accept'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(IconData icon, String label, String value, {bool highlight = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: Colors.grey.shade600),
          const SizedBox(width: 10),
          SizedBox(
            width: 140,
            child: Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontWeight: highlight ? FontWeight.w800 : FontWeight.w600,
                fontSize: highlight ? 16 : 14,
                color: highlight ? Colors.green.shade700 : null,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
