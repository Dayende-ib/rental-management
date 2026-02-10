import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class HomeScreenNew extends ConsumerWidget {
  const HomeScreenNew({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Votre code ici - le 'context' est maintenant disponible
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nouvel Écran'),
      ),
      body: const Center(
        child: Text('Contenu du nouvel écran'),
      ),
    );
  }
}