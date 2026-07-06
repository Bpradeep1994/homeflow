import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api/client.dart';
import '../data/catalog.dart';
import '../models/models.dart';
import '../theme.dart';
import 'booking_flow_screen.dart';

class BookingsScreen extends StatefulWidget {
  const BookingsScreen({super.key});

  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen> {
  late Future<(List<ApiBooking>, Map<String, Map<String, dynamic>>)> _data = _load();

  Future<(List<ApiBooking>, Map<String, Map<String, dynamic>>)> _load() async {
    final (rawBookings, rawPayments) = await (
      ApiClient.instance.myBookings(),
      ApiClient.instance.payments(),
    ).wait;
    final bookings = [for (final b in rawBookings) ApiBooking.fromJson(b as Map<String, dynamic>)];
    final payments = <String, Map<String, dynamic>>{
      for (final p in rawPayments.cast<Map<String, dynamic>>())
        (p['booking'] as Map<String, dynamic>)['id'] as String: p,
    };
    return (bookings, payments);
  }

  void _refresh() => setState(() => _data = _load());

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _act(Future<void> Function() action, String successMessage) async {
    try {
      await action();
      if (mounted) _toast(successMessage);
    } on ApiException catch (e) {
      if (mounted) _toast(e.message);
    }
    _refresh();
  }

  Future<void> _cancel(ApiBooking b) async {
    final sure = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel booking?'),
        content: Text('${b.serviceNames.join(', ')} on ${formatDate(b.date)} will be cancelled.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep it')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red, minimumSize: const Size(0, 40)),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Cancel booking'),
          ),
        ],
      ),
    );
    if (sure == true) {
      await _act(() => ApiClient.instance.cancelBooking(b.id), 'Booking cancelled');
    }
  }

  Future<void> _reschedule(ApiBooking b) async {
    final date = await showDatePicker(
      context: context,
      initialDate: b.date.isAfter(DateTime.now()) ? b.date : DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 30)),
    );
    if (date == null || !mounted) return;
    final slot = await showModalBottomSheet<String>(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Pick a new time slot',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            ),
            for (final s in timeSlots)
              ListTile(title: Text(s), onTap: () => Navigator.pop(context, s)),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (slot == null) return;
    final iso =
        '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    await _act(
      () => ApiClient.instance.rescheduleBooking(b.id, iso, slot),
      'Rescheduled to ${formatDate(date)} · $slot',
    );
  }

  Future<void> _rebook(ApiBooking b) async {
    try {
      final raw = await ApiClient.instance.catalog();
      final categories = [
        for (final (i, c) in raw.indexed) ServiceCategory.fromJson(c as Map<String, dynamic>, i),
      ];
      final ids = b.serviceIds.toSet();
      for (final category in categories) {
        final services = category.services.where((s) => ids.contains(s.id)).toList();
        if (services.isNotEmpty && mounted) {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => BookingFlowScreen(category: category, services: services),
            ),
          );
          return;
        }
      }
      _toast('These services are no longer available');
    } on ApiException catch (e) {
      _toast(e.message);
    }
  }

  Future<void> _pay(ApiBooking b) async {
    final method = await showModalBottomSheet<String>(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text('Pay ${formatRupees(b.amount)}',
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            ),
            for (final (method, icon, label) in [
              ('UPI', Icons.account_balance_rounded, 'UPI'),
              ('CARD', Icons.credit_card_rounded, 'Credit / Debit Card'),
              ('CASH', Icons.payments_rounded, 'Cash'),
            ])
              ListTile(
                leading: Icon(icon),
                title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.pop(context, method),
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (method != null) {
      await _act(() => ApiClient.instance.payBooking(b.id, method), 'Payment successful 🎉');
    }
  }

  Future<void> _review(ApiBooking b) async {
    var rating = 5;
    final comment = TextEditingController();
    final photos = <XFile>[];
    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Rate ${b.providerName ?? 'your professional'}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 1; i <= 5; i++)
                    IconButton(
                      onPressed: () => setDialogState(() => rating = i),
                      icon: Icon(
                        i <= rating ? Icons.star_rounded : Icons.star_outline_rounded,
                        color: Colors.amber.shade600,
                        size: 32,
                      ),
                    ),
                ],
              ),
              TextField(
                controller: comment,
                maxLines: 2,
                decoration: const InputDecoration(
                  hintText: 'Anything to add? (optional)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: photos.length >= 2
                      ? null
                      : () async {
                          final picked =
                              await ImagePicker().pickImage(source: ImageSource.gallery);
                          if (picked != null) setDialogState(() => photos.add(picked));
                        },
                  icon: const Icon(Icons.add_a_photo_outlined, size: 18),
                  label: Text(photos.isEmpty
                      ? 'Add photos (optional)'
                      : '${photos.length} photo(s) attached'),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Later')),
            FilledButton(
              style: FilledButton.styleFrom(minimumSize: const Size(0, 40)),
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
    if (submitted == true) {
      await _act(() async {
        final urls = <String>[];
        for (final photo in photos) {
          final bytes = await photo.readAsBytes();
          urls.add(await ApiClient.instance
              .uploadBytes(bytes, photo.name, photo.mimeType ?? 'image/jpeg'));
        }
        await ApiClient.instance
            .reviewBookingWithPhotos(b.id, rating, comment.text.trim(), urls);
      }, 'Thanks for the review ⭐');
    }
  }

  Future<void> _favorite(ApiBooking b) async {
    if (b.providerId == null) return;
    await _act(
      () => ApiClient.instance.addFavorite(b.providerId!),
      '${b.providerName} added to Favorites ❤️',
    );
  }

  Future<void> _openInvoice(Map<String, dynamic> payment) async {
    final url = ApiClient.instance.invoiceUrl(payment['id'] as String);
    if (!await launchUrl(Uri.parse(url))) _toast('Could not open the invoice');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Bookings', style: TextStyle(fontWeight: FontWeight.w700))),
      body: FutureBuilder<(List<ApiBooking>, Map<String, Map<String, dynamic>>)>(
        future: _data,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(snapshot.error.toString(), style: TextStyle(color: Colors.grey.shade600)),
                  const SizedBox(height: 8),
                  OutlinedButton(onPressed: _refresh, child: const Text('Retry')),
                ],
              ),
            );
          }
          if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
          final (all, payments) = snapshot.data!;
          final open = all.where((b) => b.isOpen).toList();
          final past = all.where((b) => !b.isOpen).toList();
          return RefreshIndicator(
            onRefresh: () async => _refresh(),
            child: all.isEmpty
                ? ListView(
                    children: [
                      const SizedBox(height: 160),
                      Center(
                        child: Text('No bookings yet.\nBook a service from Home!',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.grey.shade600)),
                      ),
                    ],
                  )
                : ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      if (open.isNotEmpty) ...[
                        Text('Active', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 10),
                        for (final b in open) ...[
                          _card(b, payments[b.id]),
                          const SizedBox(height: 12),
                        ],
                      ],
                      if (past.isNotEmpty) ...[
                        Text('Past', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 10),
                        for (final b in past) ...[
                          _card(b, payments[b.id]),
                          const SizedBox(height: 12),
                        ],
                      ],
                    ],
                  ),
          );
        },
      ),
    );
  }

  Widget _card(ApiBooking b, Map<String, dynamic>? payment) => _BookingCard(
        booking: b,
        payment: payment,
        onCancel: _cancel,
        onReschedule: _reschedule,
        onRebook: _rebook,
        onPay: _pay,
        onReview: _review,
        onFavorite: _favorite,
        onInvoice: _openInvoice,
      );
}

class _BookingCard extends StatelessWidget {
  const _BookingCard({
    required this.booking,
    required this.payment,
    required this.onCancel,
    required this.onReschedule,
    required this.onRebook,
    required this.onPay,
    required this.onReview,
    required this.onFavorite,
    required this.onInvoice,
  });

  final ApiBooking booking;
  final Map<String, dynamic>? payment;
  final ValueChanged<ApiBooking> onCancel;
  final ValueChanged<ApiBooking> onReschedule;
  final ValueChanged<ApiBooking> onRebook;
  final ValueChanged<ApiBooking> onPay;
  final ValueChanged<ApiBooking> onReview;
  final ValueChanged<ApiBooking> onFavorite;
  final ValueChanged<Map<String, dynamic>> onInvoice;

  (String, Color) get _statusChip => switch (booking.status) {
        BookingStatus.searching => ('Searching Provider', Colors.orange),
        BookingStatus.assigned => ('Professional Assigned', Colors.teal),
        BookingStatus.onTheWay => ('On the way', Colors.blue),
        BookingStatus.inProgress => ('Work in progress', Colors.purple),
        BookingStatus.completed => ('Completed', Colors.green),
        BookingStatus.closed => ('Closed', Colors.grey),
        BookingStatus.cancelled => ('Cancelled', Colors.red),
      };

  @override
  Widget build(BuildContext context) {
    final (label, color) = _statusChip;
    final paymentStatus = payment?['status'] as String?;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(booking.emoji, style: const TextStyle(fontSize: 22)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(booking.serviceNames.join(', '),
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
            const SizedBox(height: 10),
            Text('${formatDate(booking.date)} · ${booking.timeSlot}',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
            const SizedBox(height: 2),
            Text('${booking.id} · ${booking.address}',
                style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
            if (booking.providerName != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  Text('👷 ${booking.providerName}',
                      style: TextStyle(color: Colors.grey.shade700, fontSize: 13)),
                  if (!booking.isOpen && booking.status != BookingStatus.cancelled)
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      tooltip: 'Add to Favorites',
                      icon: const Icon(Icons.favorite_outline, size: 18, color: Colors.pink),
                      onPressed: () => onFavorite(booking),
                    ),
                ],
              ),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                Text(formatRupees(booking.amount),
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                if (paymentStatus != null) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: (paymentStatus == 'PAID' ? Colors.green : Colors.red)
                          .withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      paymentStatus == 'PAID' ? 'Paid · ${payment!['method']}' : 'Refunded',
                      style: TextStyle(
                          color: paymentStatus == 'PAID'
                              ? Colors.green.shade700
                              : Colors.red.shade700,
                          fontSize: 11,
                          fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ],
            ),
            Wrap(
              spacing: 4,
              alignment: WrapAlignment.end,
              children: [
                if (booking.canCancel) ...[
                  TextButton(
                    onPressed: () => onReschedule(booking),
                    child: const Text('Reschedule'),
                  ),
                  TextButton(
                    style: TextButton.styleFrom(foregroundColor: Colors.red),
                    onPressed: () => onCancel(booking),
                    child: const Text('Cancel'),
                  ),
                ],
                if (!booking.isOpen) ...[
                  if (payment != null)
                    TextButton.icon(
                      onPressed: () => onInvoice(payment!),
                      icon: const Icon(Icons.receipt_long_outlined, size: 18),
                      label: const Text('Invoice'),
                    ),
                  TextButton.icon(
                    onPressed: () => onRebook(booking),
                    icon: const Icon(Icons.replay_rounded, size: 18),
                    label: const Text('Rebook'),
                  ),
                ],
                if (booking.status == BookingStatus.completed) ...[
                  TextButton.icon(
                    onPressed: () => onReview(booking),
                    icon: const Icon(Icons.star_outline_rounded, size: 18),
                    label: const Text('Review'),
                  ),
                  if (payment == null)
                    FilledButton(
                      style: FilledButton.styleFrom(
                          minimumSize: const Size(0, 36),
                          padding: const EdgeInsets.symmetric(horizontal: 16)),
                      onPressed: () => onPay(booking),
                      child: const Text('Pay'),
                    ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
