import 'package:flutter/material.dart';

import '../models/models.dart';

// Static UI data. Catalog, bookings, and addresses come from the API;
// offers stay local until coupons reach the backend.

const offers = [
  Offer(
    title: 'FLAT ₹100 OFF',
    subtitle: 'On your first booking',
    code: 'WELCOME100',
    color: Color(0xFF0D9488),
  ),
  Offer(
    title: '20% OFF AC Service',
    subtitle: 'Beat the heat — this week only',
    code: 'COOL20',
    color: Color(0xFF3B82F6),
  ),
  Offer(
    title: '₹500 OFF Full Home Cleaning',
    subtitle: 'Weekend slots available',
    code: 'SPARKLE500',
    color: Color(0xFF8B5CF6),
  ),
];

const timeSlots = [
  '08:00 – 10:00',
  '10:00 – 12:00',
  '12:00 – 14:00',
  '14:00 – 16:00',
  '16:00 – 18:00',
  '18:00 – 20:00',
];
