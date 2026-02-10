import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models.dart';

/// Local database helper for offline support
class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database?> get database async {
    if (kIsWeb) return null;
    if (_database != null) return _database!;
    _database = await _initDB('rental_management.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(path, version: 1, onCreate: _createDB);
  }

  Future<void> _createDB(Database db, int version) async {
    const idType = 'TEXT PRIMARY KEY';
    const textType = 'TEXT NOT NULL';
    const textTypeNullable = 'TEXT';
    const integerType = 'INTEGER NOT NULL';
    const realType = 'REAL NOT NULL';

    // Tenants table
    await db.execute('''
      CREATE TABLE tenants (
        id $idType,
        name $textType,
        email $textType,
        phone $textType,
        created_at $textType,
        updated_at $textType
      )
    ''');

    // Properties table
    await db.execute('''
      CREATE TABLE properties (
        id $idType,
        title $textType,
        address $textType,
        city $textType,
        postal_code $textType,
        surface $realType,
        rooms $integerType,
        monthly_rent $realType,
        photos $textType,
        created_at $textType,
        updated_at $textType
      )
    ''');

    // Payments table
    await db.execute('''
      CREATE TABLE payments (
        id $idType,
        contract_id $textType,
        month $textType,
        amount $realType,
        amount_paid $realType,
        due_date $textType,
        payment_date $textTypeNullable,
        status $textType,
        validation_status $textType,
        created_at $textType,
        updated_at $textType
      )
    ''');

    // Maintenance requests table
    await db.execute('''
      CREATE TABLE maintenance_requests (
        id $idType,
        property_id $textType,
        description $textType,
        status $textType,
        urgency $textType,
        created_at $textType,
        updated_at $textTypeNullable
      )
    ''');

    // Sync metadata table
    await db.execute('''
      CREATE TABLE sync_metadata (
        key $idType,
        last_sync $textType,
        status $textType
      )
    ''');
  }

  // ============================================================================
  // PAYMENTS
  // ============================================================================

  Future<void> insertPayments(List<Payment> payments) async {
    final db = await database;
    if (db == null) return;
    final batch = db.batch();

    for (final payment in payments) {
      batch.insert('payments', {
        'id': payment.id,
        'contract_id': payment.contractId,
        'month': payment.month,
        'amount': payment.amount,
        'amount_paid': payment.amountPaid,
        'due_date': payment.dueDate.toIso8601String(),
        'payment_date': payment.paidDate?.toIso8601String(),
        'status': payment.status,
        'validation_status': payment.validationStatus,
        'created_at': DateTime.now().toIso8601String(),
        'updated_at': DateTime.now().toIso8601String(),
      }, conflictAlgorithm: ConflictAlgorithm.replace);
    }

    await batch.commit(noResult: true);
  }

  Future<List<Payment>> getPayments() async {
    final db = await database;
    if (db == null) return [];
    final result = await db.query('payments', orderBy: 'due_date DESC');

    return result.map((json) {
      return Payment(
        id: json['id'] as String,
        contractId: json['contract_id'] as String,
        month: json['month'] as String,
        amount: (json['amount'] as num).toDouble(),
        amountPaid: (json['amount_paid'] as num).toDouble(),
        dueDate: DateTime.parse(json['due_date'] as String),
        paidDate: json['payment_date'] != null
            ? DateTime.parse(json['payment_date'] as String)
            : null,
        status: json['status'] as String,
        validationStatus: json['validation_status'] as String,
      );
    }).toList();
  }

  // ============================================================================
  // MAINTENANCE REQUESTS
  // ============================================================================

  Future<void> insertMaintenanceRequests(
    List<MaintenanceRequest> requests,
  ) async {
    final db = await database;
    if (db == null) return;
    final batch = db.batch();

    for (final request in requests) {
      batch.insert('maintenance_requests', {
        'id': request.id,
        'property_id': request.propertyId,
        'description': request.description,
        'status': request.status,
        'urgency': request.urgency,
        'created_at': request.createdAt.toIso8601String(),
        'updated_at': request.updatedAt?.toIso8601String(),
      }, conflictAlgorithm: ConflictAlgorithm.replace);
    }

    await batch.commit(noResult: true);
  }

  Future<List<MaintenanceRequest>> getMaintenanceRequests() async {
    final db = await database;
    if (db == null) return [];
    final result = await db.query(
      'maintenance_requests',
      orderBy: 'created_at DESC',
    );

    return result.map((json) {
      return MaintenanceRequest(
        id: json['id'] as String,
        propertyId: json['property_id'] as String,
        description: json['description'] as String,
        status: json['status'] as String,
        urgency: json['urgency'] as String,
        createdAt: DateTime.parse(json['created_at'] as String),
        updatedAt: json['updated_at'] != null
            ? DateTime.parse(json['updated_at'] as String)
            : null,
      );
    }).toList();
  }

  // ============================================================================
  // PROPERTIES
  // ============================================================================

  Future<void> insertProperty(Property property) async {
    final db = await database;
    if (db == null) return;

    await db.insert('properties', {
      'id': property.id,
      'title': property.title,
      'address': property.address,
      'city': property.city,
      'postal_code': property.postalCode,
      'surface': property.surface,
      'rooms': property.rooms,
      'monthly_rent': property.monthlyRent,
      'photos': property.photos.join(','),
      'created_at': DateTime.now().toIso8601String(),
      'updated_at': DateTime.now().toIso8601String(),
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<Property?> getProperty() async {
    final db = await database;
    if (db == null) return null;
    final result = await db.query('properties', limit: 1);

    if (result.isEmpty) return null;

    final json = result.first;
    return Property(
      id: json['id'] as String,
      title: json['title'] as String,
      address: json['address'] as String,
      city: json['city'] as String,
      postalCode: json['postal_code'] as String,
      surface: (json['surface'] as num).toDouble(),
      rooms: json['rooms'] as int,
      monthlyRent: (json['monthly_rent'] as num).toDouble(),
      photos: (json['photos'] as String)
          .split(',')
          .where((s) => s.isNotEmpty)
          .toList(),
    );
  }

  // ============================================================================
  // TENANT
  // ============================================================================

  Future<void> insertTenant(Tenant tenant) async {
    final db = await database;
    if (db == null) return;

    await db.insert('tenants', {
      'id': tenant.id,
      'name': tenant.name,
      'email': tenant.email,
      'phone': tenant.phone,
      'created_at': DateTime.now().toIso8601String(),
      'updated_at': DateTime.now().toIso8601String(),
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<Tenant?> getTenant() async {
    final db = await database;
    if (db == null) return null;
    final result = await db.query('tenants', limit: 1);

    if (result.isEmpty) return null;

    final json = result.first;
    return Tenant(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String,
    );
  }

  // ============================================================================
  // SYNC METADATA
  // ============================================================================

  Future<void> updateSyncMetadata(String key, DateTime lastSync) async {
    final db = await database;
    if (db == null) return;

    await db.insert('sync_metadata', {
      'key': key,
      'last_sync': lastSync.toIso8601String(),
      'status': 'completed',
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<DateTime?> getLastSync(String key) async {
    final db = await database;
    if (db == null) return null;
    final result = await db.query(
      'sync_metadata',
      where: 'key = ?',
      whereArgs: [key],
    );

    if (result.isEmpty) return null;

    return DateTime.parse(result.first['last_sync'] as String);
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  Future<void> clearAll() async {
    final db = await database;
    if (db == null) return;
    await db.delete('payments');
    await db.delete('maintenance_requests');
    await db.delete('properties');
    await db.delete('tenants');
    await db.delete('sync_metadata');
  }

  Future<void> close() async {
    final db = await database;
    if (db == null) return;
    await db.close();
  }
}

/// Provider for database helper
final databaseHelperProvider = Provider<DatabaseHelper>((ref) {
  return DatabaseHelper.instance;
});
