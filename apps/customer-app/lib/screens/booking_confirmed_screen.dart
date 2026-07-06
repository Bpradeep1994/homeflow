import 'package:flutter/material.dart';

import '../models/models.dart';
import '../theme.dart';

class BookingConfirmedScreen extends StatelessWidget {
  const BookingConfirmedScreen({super.key, required this.booking});

  final ApiBooking booking;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              const Spacer(),
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(color: Colors.green.shade50, shape: BoxShape.circle),
                child: Icon(Icons.check_circle, color: Colors.green.shade600, size: 64),
              ),
              const SizedBox(height: 20),
              Text('Booking Confirmed!',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Text('Booking ID ${booking.id}', style: TextStyle(color: Colors.grey.shade600)),
              const SizedBox(height: 24),
              Card(
                child: ListTile(
                  leading: const SizedBox(
                    width: 32,
                    height: 32,
                    child: CircularProgressIndicator(strokeWidth: 2.5),
                  ),
                  title: const Text('Searching for a professional…',
                      style: TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: const Text('Nearby verified professionals have been notified. '
                      'You\'ll see the assignment under My Bookings.'),
                ),
              ),
              const SizedBox(height: 10),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      const Icon(Icons.event, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                            '${booking.serviceNames.join(', ')}\n${formatDate(booking.date)} · ${booking.timeSlot} · ${formatRupees(booking.amount)}',
                            style: const TextStyle(fontWeight: FontWeight.w600, height: 1.5)),
                      ),
                    ],
                  ),
                ),
              ),
              const Spacer(),
              FilledButton(
                onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
                child: const Text('Done'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
