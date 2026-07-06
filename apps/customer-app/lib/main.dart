import 'package:flutter/material.dart';

import 'api/client.dart';
import 'screens/login_screen.dart';
import 'screens/root_nav.dart';
import 'theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const HomeFlowApp());
}

class HomeFlowApp extends StatelessWidget {
  const HomeFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HomeFlow',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      home: const _AuthGate(),
    );
  }
}

class _AuthGate extends StatefulWidget {
  const _AuthGate();

  @override
  State<_AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<_AuthGate> {
  late final Future<void> _init = ApiClient.instance.init();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<void>(
      future: _init,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        return ListenableBuilder(
          listenable: ApiClient.instance,
          builder: (context, _) =>
              ApiClient.instance.isLoggedIn ? const RootNav() : const LoginScreen(),
        );
      },
    );
  }
}
