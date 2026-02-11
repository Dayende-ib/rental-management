enum ExceptionType {
  network,
  unauthorized,
  server,
  validation,
  unknown,
  offline,
}

class AppException implements Exception {
  final String message;
  final String? code;
  final ExceptionType type;
  final dynamic originalError;

  AppException(
    this.message, {
    this.code,
    this.type = ExceptionType.unknown,
    this.originalError,
  });

  @override
  String toString() => 'AppException: $message (Code: $code, Type: $type)';

  factory AppException.fromDioError(dynamic error) {
    // Si tu utilises Dio plus tard, on pourra mapper ici
    return AppException(
      'Une erreur réseau est survenue',
      type: ExceptionType.network,
      originalError: error,
    );
  }
}
