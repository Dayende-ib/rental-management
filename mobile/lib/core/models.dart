/// Data models for the Rental Management application
library;

/// Tenant profile model
class Tenant {
  final String id;
  final String name;
  final String email;
  final String phone;

  Tenant({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
  });

  factory Tenant.fromJson(Map<String, dynamic> json) {
    return Tenant(
      id: json['id'] as String,
      name: (json['full_name'] ?? json['name'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      phone: (json['phone'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {'id': id, 'name': name, 'email': email, 'phone': phone};
  }

  /// Empty tenant instance for offline use
  factory Tenant.empty() {
    return Tenant(id: '', name: '', email: '', phone: '');
  }
}

/// Property model
class Property {
  final String id;
  final String title;
  final String address;
  final String city;
  final String postalCode;
  final double monthlyRent;
  final double surface;
  final int rooms;
  final List<String> photos;

  Property({
    required this.id,
    required this.title,
    required this.address,
    required this.city,
    required this.postalCode,
    required this.monthlyRent,
    this.surface = 0,
    this.rooms = 0,
    this.photos = const [],
  });

  factory Property.fromJson(Map<String, dynamic> json) {
    final photosRaw = json['photos'];
    List<String> photos = [];
    if (photosRaw is List) {
      photos = photosRaw.whereType<String>().toList();
    } else if (photosRaw is String && photosRaw.isNotEmpty) {
      photos = [photosRaw];
    }

    return Property(
      id: json['id'] as String,
      title: (json['title'] ?? json['address'] ?? '').toString(),
      address: (json['address'] ?? json['title'] ?? '').toString(),
      city: (json['city'] ?? '').toString(),
      postalCode: (json['postalCode'] ?? json['postal_code'] ?? '').toString(),
      monthlyRent: _parseDouble(
        json['monthlyRent'] ?? json['monthly_rent'] ?? json['price'],
      ),
      surface: _parseDouble(json['surface']),
      rooms: _parseInt(json['rooms'] ?? json['pieces']),
      photos: photos,
    );
  }

  /// Empty property instance for offline use
  factory Property.empty() {
    return Property(
      id: '',
      title: '',
      address: '',
      city: '',
      postalCode: '',
      monthlyRent: 0,
      surface: 0,
      rooms: 0,
      photos: [],
    );
  }
}

/// Payment model
class Payment {
  final String id;
  final String contractId;
  final String month;
  final double amount;
  final double amountPaid;
  final String status; // 'paid' or 'unpaid'
  final DateTime dueDate;
  final DateTime? paidDate;
  final String
  validationStatus; // 'not_submitted', 'pending', 'validated', 'rejected'
  final double lateFee;

  Payment({
    required this.id,
    required this.contractId,
    required this.month,
    required this.amount,
    required this.amountPaid,
    required this.status,
    required this.dueDate,
    this.paidDate,
    this.validationStatus = 'validated',
    this.lateFee = 0.0,
  });

  factory Payment.fromJson(Map<String, dynamic> json) {
    final dueDate =
        _parseDate(
          json['dueDate'] ??
              json['due_date'] ??
              json['payment_date'] ??
              json['paymentDate'] ??
              json['created_at'],
        ) ??
        DateTime.now();
    final status = (json['status'] ?? 'pending').toString();
    final paidDate =
        _parseDate(json['paidDate'] ?? json['paid_date']) ??
        (status == 'paid' ? dueDate : null);
    final month = (json['month'] ?? '').toString().isNotEmpty
        ? json['month'].toString()
        : _formatMonth(dueDate);
    final validation = (json['validationStatus'] ?? json['validation_status'])
        ?.toString();

    return Payment(
      id: json['id'] as String,
      contractId: (json['contract_id'] ?? '').toString(),
      month: month,
      amount: _parseDouble(json['amount']),
      amountPaid: _parseDouble(json['amount_paid']),
      status: status,
      dueDate: dueDate,
      paidDate: paidDate,
      validationStatus: validation ?? _mapValidationFromStatus(status),
      lateFee: _parseDouble(json['late_fee']),
    );
  }

  bool get isPaid => status == 'paid';
  bool get isOverdue => status == 'overdue';
  bool get isPendingValidation => validationStatus == 'pending';
  bool get isRejected => validationStatus == 'rejected';
  bool get isValidated => validationStatus == 'validated';

  /// Empty payment instance for offline use
  factory Payment.empty() {
    return Payment(
      id: '',
      contractId: '',
      month: '',
      amount: 0,
      amountPaid: 0,
      status: '',
      dueDate: DateTime.now(),
      validationStatus: '',
      lateFee: 0.0,
    );
  }
}

/// Maintenance request model
class MaintenanceRequest {
  final String id;
  final String propertyId;
  final String description;
  final String status; // 'pending', 'in_progress', 'completed'
  final String urgency;
  final DateTime createdAt;
  final DateTime? updatedAt;

  MaintenanceRequest({
    required this.id,
    required this.propertyId,
    required this.description,
    required this.status,
    required this.urgency,
    required this.createdAt,
    this.updatedAt,
  });

  factory MaintenanceRequest.fromJson(Map<String, dynamic> json) {
    return MaintenanceRequest(
      id: json['id'] as String,
      propertyId: (json['property_id'] ?? '').toString(),
      description: json['description'] as String,
      status: json['status'] as String,
      urgency: (json['urgency'] ?? 'normal').toString(),
      createdAt:
          _parseDate(
            json['createdAt'] ?? json['created_at'] ?? json['request_date'],
          ) ??
          DateTime.now(),
      updatedAt: _parseDate(json['updatedAt'] ?? json['updated_at']),
    );
  }

  String get statusDisplay {
    switch (status) {
      case 'reported':
      case 'pending':
        return 'En attente';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Termine';
      case 'cancelled':
        return 'Annule';
      default:
        return status;
    }
  }

  /// Empty maintenance request instance for offline use
  factory MaintenanceRequest.empty() {
    return MaintenanceRequest(
      id: '',
      propertyId: '',
      description: '',
      status: '',
      urgency: 'normal',
      createdAt: DateTime.now(),
    );
  }
}

/// Dashboard data model combining tenant info with property and payments
class DashboardData {
  final Tenant tenant;
  final Property property;
  final List<Payment> upcomingPayments;
  final int pendingMaintenanceRequests;

  DashboardData({
    required this.tenant,
    required this.property,
    required this.upcomingPayments,
    required this.pendingMaintenanceRequests,
  });
}

DateTime? _parseDate(dynamic value) {
  if (value == null) return null;
  if (value is DateTime) return value;
  if (value is String) {
    return DateTime.tryParse(value);
  }
  return null;
}

double _parseDouble(dynamic value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0;
  return 0;
}

int _parseInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}

String _formatMonth(DateTime date) {
  const months = [
    'Janvier',
    'Fevrier',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Aout',
    'Septembre',
    'Octobre',
    'Novembre',
    'Decembre',
  ];
  final monthName = months[(date.month - 1).clamp(0, 11)];
  return '$monthName ${date.year}';
}

String _mapValidationFromStatus(String status) {
  switch (status) {
    case 'paid':
      return 'validated';
    case 'pending':
      return 'pending';
    case 'overdue':
      return 'not_submitted'; // Overdue just means late, not that valid was rejected
    case 'failed':
      return 'rejected';
    default:
      return 'not_submitted';
  }
}
