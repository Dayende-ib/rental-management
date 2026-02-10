import 'package:flutter/foundation.dart';

class AppTabController {
  AppTabController(int initialIndex) : index = ValueNotifier<int>(initialIndex);

  final ValueNotifier<int> index;

  void setIndex(int value) {
    if (value == index.value) return;
    index.value = value;
  }
}

final AppTabController appTabController = AppTabController(0);
