import 'package:flutter/material.dart';

const _categoryColors = {
  'electrician': Color(0xFFF59E0B),
  'ac-repair': Color(0xFF3B82F6),
  'cleaning': Color(0xFF10B981),
};
const _fallbackColors = [Color(0xFF8B5CF6), Color(0xFFEC4899), Color(0xFF14B8A6)];

class ServiceCategory {
  const ServiceCategory({
    required this.id,
    required this.name,
    required this.emoji,
    required this.color,
    required this.services,
  });

  factory ServiceCategory.fromJson(Map<String, dynamic> json, int index) {
    return ServiceCategory(
      id: json['id'] as String,
      name: json['name'] as String,
      emoji: json['emoji'] as String,
      color: _categoryColors[json['id']] ?? _fallbackColors[index % _fallbackColors.length],
      services: [
        for (final s in json['services'] as List) SubService.fromJson(s as Map<String, dynamic>),
      ],
    );
  }

  final String id;
  final String name;
  final String emoji;
  final Color color;
  final List<SubService> services;
}

class SubService {
  const SubService({
    required this.id,
    required this.name,
    required this.price,
    this.isQuoteOnVisit = false,
    this.isEmergency = false,
    this.durationMinutes = 60,
    this.description,
  });

  factory SubService.fromJson(Map<String, dynamic> json) => SubService(
        id: json['id'] as String,
        name: json['name'] as String,
        price: json['price'] as int,
        isQuoteOnVisit: json['quoteOnVisit'] as bool? ?? false,
        isEmergency: json['emergency'] as bool? ?? false,
        durationMinutes: json['durationMinutes'] as int? ?? 60,
        description: json['description'] as String?,
      );

  final String id;
  final String name;

  /// Fixed catalog price in rupees. When [isQuoteOnVisit] is true this is the
  /// visit/inspection charge and the final amount is quoted on site.
  final int price;
  final bool isQuoteOnVisit;
  final bool isEmergency;
  final int durationMinutes;
  final String? description;
}

class ApiAddress {
  const ApiAddress({required this.id, required this.label, required this.line});

  factory ApiAddress.fromJson(Map<String, dynamic> json) => ApiAddress(
        id: json['id'] as String,
        label: json['label'] as String,
        line: json['line'] as String,
      );

  final String id;
  final String label;
  final String line;

  IconData get icon => switch (label.toLowerCase()) {
        'home' => Icons.home_rounded,
        'office' || 'work' => Icons.work_rounded,
        _ => Icons.location_on_rounded,
      };
}

enum BookingStatus { searching, assigned, onTheWay, inProgress, completed, closed, cancelled }

BookingStatus bookingStatusFromApi(String s) => switch (s) {
      'PENDING' => BookingStatus.searching,
      'ASSIGNED' => BookingStatus.assigned,
      'ON_THE_WAY' => BookingStatus.onTheWay,
      'IN_PROGRESS' => BookingStatus.inProgress,
      'COMPLETED' => BookingStatus.completed,
      'CLOSED' => BookingStatus.closed,
      _ => BookingStatus.cancelled,
    };

class ApiBooking {
  const ApiBooking({
    required this.id,
    required this.serviceIds,
    required this.serviceNames,
    required this.emoji,
    required this.amount,
    required this.address,
    required this.date,
    required this.timeSlot,
    required this.status,
    this.providerName,
    this.providerId,
  });

  factory ApiBooking.fromJson(Map<String, dynamic> json) {
    final services = (json['services'] as List).cast<Map<String, dynamic>>();
    final firstId = services.isEmpty ? '' : services.first['id'] as String;
    return ApiBooking(
      id: json['id'] as String,
      serviceIds: [for (final s in services) s['id'] as String],
      serviceNames: [for (final s in services) s['name'] as String],
      emoji: firstId.startsWith('el-')
          ? '⚡'
          : firstId.startsWith('ac-')
              ? '❄️'
              : firstId.startsWith('cl-')
                  ? '🧹'
                  : '🧾',
      amount: json['amount'] as int,
      address: json['address'] as String,
      date: DateTime.parse(json['date'] as String),
      timeSlot: json['timeSlot'] as String,
      status: bookingStatusFromApi(json['status'] as String),
      providerName: (json['provider'] as Map<String, dynamic>?)?['name'] as String?,
      providerId: (json['provider'] as Map<String, dynamic>?)?['id'] as String?,
    );
  }

  final String id;
  final List<String> serviceIds;
  final List<String> serviceNames;
  final String emoji;
  final int amount;
  final String address;
  final DateTime date;
  final String timeSlot;
  final BookingStatus status;
  final String? providerName;
  final String? providerId;

  bool get isOpen => switch (status) {
        BookingStatus.searching ||
        BookingStatus.assigned ||
        BookingStatus.onTheWay ||
        BookingStatus.inProgress =>
          true,
        _ => false,
      };

  bool get canCancel => status == BookingStatus.searching || status == BookingStatus.assigned;
}

const _offerColors = [Color(0xFF0D9488), Color(0xFF3B82F6), Color(0xFF8B5CF6), Color(0xFFEC4899)];

class Offer {
  const Offer({required this.title, required this.subtitle, required this.code, required this.color});

  factory Offer.fromCoupon(Map<String, dynamic> json, int index) {
    final type = json['type'] as String;
    final value = json['value'] as int;
    return Offer(
      title: type == 'FLAT' ? 'FLAT ₹$value OFF' : '$value% OFF',
      subtitle: '${json['title']} · till ${json['expiresAt']}',
      code: json['code'] as String,
      color: _offerColors[index % _offerColors.length],
    );
  }

  final String title;
  final String subtitle;
  final String code;
  final Color color;
}
