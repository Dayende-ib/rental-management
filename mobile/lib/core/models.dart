/// Data models for the Rental Management application

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
      name: json['name'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String,
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
      address: json['address'] as String,
      city: json['city'] as String,
      postalCode: json['postalCode'] as String,
      monthlyRent: (json['monthlyRent'] as num).toDouble(),
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

  Payment({
    required this.id,
    required this.month,
    required this.amount,
    required this.status,
    required this.dueDate,
    this.paidDate,
  });

  factory Payment.fromJson(Map<String, dynamic> json) {
    return Payment(
      id: json['id'] as String,
      month: json['month'] as String,
      amount: (json['amount'] as num).toDouble(),
      status: json['status'] as String,
      dueDate: DateTime.parse(json['dueDate'] as String),
      paidDate: json['paidDate'] != null 
          ? DateTime.parse(json['paidDate'] as String) 
          : null,
    );
  }

  bool get isPaid => status == 'paid';
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
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: json['updatedAt'] != null 
          ? DateTime.parse(json['updatedAt'] as String) 
          : null,
    );
  }

  String get statusDisplay {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Terminé';
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