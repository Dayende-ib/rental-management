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
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone': phone,
    };
  }
}

/// Property model
class Property {
  final String id;
  final String address;
  final String city;
  final String postalCode;
  final double monthlyRent;

  Property({
    required this.id,
    required this.address,
    required this.city,
    required this.postalCode,
    required this.monthlyRent,
  });

  factory Property.fromJson(Map<String, dynamic> json) {
    return Property(
      id: json['id'] as String,
      address: (json['address'] ?? json['title'] ?? '').toString(),
      city: (json['city'] ?? '').toString(),
      postalCode: (json['postalCode'] ?? json['postal_code'] ?? '').toString(),
      monthlyRent: _parseDouble(
        json['monthlyRent'] ?? json['monthly_rent'] ?? json['price'],
      ),
    );
  }
}

/// Payment model
class Payment {
  final String id;
  final String month;
  final double amount;
  final String status; // 'paid' or 'unpaid'
  final DateTime dueDate;
  final DateTime? paidDate;
  final String validationStatus; // 'not_submitted', 'pending', 'validated', 'rejected'

  Payment({
    required this.id,
    required this.month,
    required this.amount,
    required this.status,
    required this.dueDate,
    this.paidDate,
    this.validationStatus = 'validated',
  });

  factory Payment.fromJson(Map<String, dynamic> json) {
    final dueDate = _parseDate(
          json['dueDate'] ??
              json['due_date'] ??
              json['payment_date'] ??
              json['paymentDate'] ??
              json['created_at'],
        ) ??
        DateTime.now();
    final status = (json['status'] ?? 'pending').toString();
    final paidDate = _parseDate(json['paidDate'] ?? json['paid_date']) ??
        (status == 'paid' ? dueDate : null);
    final month = (json['month'] ?? '').toString().isNotEmpty
        ? json['month'].toString()
        : _formatMonth(dueDate);
    final validation =
        (json['validationStatus'] ?? json['validation_status'])?.toString();

    return Payment(
      id: json['id'] as String,
      month: month,
      amount: _parseDouble(json['amount']),
      status: status,
      dueDate: dueDate,
      paidDate: paidDate,
      validationStatus: validation ?? _mapValidationFromStatus(status),
    );
  }

  bool get isPaid => status == 'paid';
  bool get isPendingValidation => validationStatus == 'pending';
  bool get isRejected => validationStatus == 'rejected';
  bool get isValidated => validationStatus == 'validated';
}

/// Maintenance request model
class MaintenanceRequest {
  final String id;
  final String description;
  final String status; // 'pending', 'in_progress', 'completed'
  final DateTime createdAt;
  final DateTime? updatedAt;

  MaintenanceRequest({
    required this.id,
    required this.description,
    required this.status,
    required this.createdAt,
    this.updatedAt,
  });

  factory MaintenanceRequest.fromJson(Map<String, dynamic> json) {
    return MaintenanceRequest(
      id: json['id'] as String,
      description: json['description'] as String,
      status: json['status'] as String,
      createdAt: _parseDate(
            json['createdAt'] ??
                json['created_at'] ??
                json['request_date'],
          ) ??
          DateTime.now(),
      updatedAt: _parseDate(
            json['updatedAt'] ??
                json['updated_at'],
          ),
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
    case 'failed':
    case 'overdue':
      return 'rejected';
    default:
      return 'not_submitted';
  }
}

